import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cleanupOrphanedPhotos } from '../../packages/backend/src/cron/cleanup';

const NOW = Date.parse('2026-07-31T02:00:00.000Z');
const HOUR_MS = 60 * 60 * 1000;

const object = (key: string, ageMs: number) => ({ key, uploaded: new Date(NOW - ageMs) });

const createMockR2Bucket = () => ({
  list: vi.fn(),
  delete: vi.fn().mockResolvedValue(undefined),
});

/** Minimal D1 stub: only `prepare(...).all()` is used, to read photo_key rows. */
const createMockDb = (keys: string[]) => ({
  prepare: vi.fn().mockReturnValue({
    all: vi.fn().mockResolvedValue({ results: keys.map((photo_key) => ({ photo_key })) }),
  }),
});

describe('cleanupOrphanedPhotos', () => {
  let mockR2: ReturnType<typeof createMockR2Bucket>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockR2 = createMockR2Bucket();
  });

  const run = (referenced: string[]) =>
    cleanupOrphanedPhotos(
      mockR2 as unknown as R2Bucket,
      createMockDb(referenced) as unknown as D1Database,
      NOW
    );

  it('deletes photo objects no meal_photos row references', async () => {
    mockR2.list.mockResolvedValueOnce({
      objects: [
        object('photos/u1/m1/kept.webp', 48 * HOUR_MS),
        object('photos/u1/m2/orphan.jpg', 48 * HOUR_MS),
      ],
      truncated: false,
    });

    const deleted = await run(['photos/u1/m1/kept.webp']);

    expect(deleted).toBe(1);
    expect(mockR2.delete).toHaveBeenCalledWith(['photos/u1/m2/orphan.jpg']);
  });

  it('never deletes an object a row still points at', async () => {
    mockR2.list.mockResolvedValueOnce({
      objects: [object('photos/u1/m1/live.webp', 90 * 24 * HOUR_MS)],
      truncated: false,
    });

    const deleted = await run(['photos/u1/m1/live.webp']);

    expect(deleted).toBe(0);
    expect(mockR2.delete).not.toHaveBeenCalled();
  });

  it('spares recent objects — a photo is written to R2 before its row exists', async () => {
    // Mid-save: the object is unreferenced right now but must survive.
    mockR2.list.mockResolvedValueOnce({
      objects: [
        object('photos/u1/m1/just-uploaded.webp', 2 * HOUR_MS),
        object('photos/u1/m1/yesterday.webp', 23 * HOUR_MS),
        object('photos/u1/m1/stale.webp', 25 * HOUR_MS),
      ],
      truncated: false,
    });

    const deleted = await run([]);

    expect(deleted).toBe(1);
    expect(mockR2.delete).toHaveBeenCalledWith(['photos/u1/m1/stale.webp']);
  });

  it('leaves temp/ alone — cleanupTempPhotos owns that prefix', async () => {
    mockR2.list.mockResolvedValueOnce({
      objects: [
        object('temp/abandoned-uuid', 48 * HOUR_MS),
        object('photos/u1/m1/orphan.webp', 48 * HOUR_MS),
      ],
      truncated: false,
    });

    const deleted = await run([]);

    expect(deleted).toBe(1);
    expect(mockR2.delete).toHaveBeenCalledWith(['photos/u1/m1/orphan.webp']);
  });

  it('collects the legacy meals/<id>/photo.jpg layout too', async () => {
    mockR2.list.mockResolvedValueOnce({
      objects: [object('meals/m-old/photo.jpg', 200 * 24 * HOUR_MS)],
      truncated: false,
    });

    const deleted = await run([]);

    expect(deleted).toBe(1);
    expect(mockR2.delete).toHaveBeenCalledWith(['meals/m-old/photo.jpg']);
  });

  it('follows the cursor across pages', async () => {
    mockR2.list
      .mockResolvedValueOnce({
        objects: [object('photos/u1/m1/a.webp', 48 * HOUR_MS)],
        truncated: true,
        cursor: 'page-2',
      })
      .mockResolvedValueOnce({
        objects: [object('photos/u1/m2/b.webp', 48 * HOUR_MS)],
        truncated: false,
      });

    const deleted = await run([]);

    expect(deleted).toBe(2);
    expect(mockR2.list).toHaveBeenNthCalledWith(2, { cursor: 'page-2' });
  });

  it('does not call delete when nothing is orphaned', async () => {
    mockR2.list.mockResolvedValueOnce({ objects: [], truncated: false });

    expect(await run([])).toBe(0);
    expect(mockR2.delete).not.toHaveBeenCalled();
  });
});
