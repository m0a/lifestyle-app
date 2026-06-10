import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cleanupTempPhotos } from '../../packages/backend/src/cron/cleanup';

const NOW = Date.parse('2026-06-11T02:00:00.000Z');
const HOUR_MS = 60 * 60 * 1000;

const tempObject = (key: string, ageMs: number) => ({
  key,
  uploaded: new Date(NOW - ageMs),
});

// Mock R2Bucket (list/delete only; cleanupTempPhotos uses nothing else)
const createMockR2Bucket = () => ({
  list: vi.fn(),
  delete: vi.fn().mockResolvedValue(undefined),
});

describe('cleanupTempPhotos', () => {
  let mockR2: ReturnType<typeof createMockR2Bucket>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockR2 = createMockR2Bucket();
  });

  const run = () => cleanupTempPhotos(mockR2 as unknown as R2Bucket, NOW);

  it('should delete temp objects older than 24 hours', async () => {
    mockR2.list.mockResolvedValueOnce({
      objects: [
        tempObject('temp/old-1', 25 * HOUR_MS),
        tempObject('temp/old-2', 48 * HOUR_MS),
      ],
      truncated: false,
    });

    const deleted = await run();

    expect(deleted).toBe(2);
    expect(mockR2.list).toHaveBeenCalledWith({ prefix: 'temp/', cursor: undefined });
    expect(mockR2.delete).toHaveBeenCalledTimes(1);
    expect(mockR2.delete).toHaveBeenCalledWith(['temp/old-1', 'temp/old-2']);
  });

  it('should keep temp objects younger than 24 hours', async () => {
    mockR2.list.mockResolvedValueOnce({
      objects: [
        tempObject('temp/fresh', 1 * HOUR_MS),
        tempObject('temp/almost', 23 * HOUR_MS),
        tempObject('temp/old', 25 * HOUR_MS),
      ],
      truncated: false,
    });

    const deleted = await run();

    expect(deleted).toBe(1);
    expect(mockR2.delete).toHaveBeenCalledWith(['temp/old']);
  });

  it('should not call delete when there is nothing to delete', async () => {
    mockR2.list.mockResolvedValueOnce({
      objects: [tempObject('temp/fresh', 1 * HOUR_MS)],
      truncated: false,
    });

    const deleted = await run();

    expect(deleted).toBe(0);
    expect(mockR2.delete).not.toHaveBeenCalled();
  });

  it('should paginate through truncated list results via cursor', async () => {
    mockR2.list
      .mockResolvedValueOnce({
        objects: [tempObject('temp/page1-old', 30 * HOUR_MS)],
        truncated: true,
        cursor: 'cursor-1',
      })
      .mockResolvedValueOnce({
        objects: [tempObject('temp/page2-old', 30 * HOUR_MS)],
        truncated: false,
      });

    const deleted = await run();

    expect(deleted).toBe(2);
    expect(mockR2.list).toHaveBeenCalledTimes(2);
    expect(mockR2.list).toHaveBeenNthCalledWith(1, { prefix: 'temp/', cursor: undefined });
    expect(mockR2.list).toHaveBeenNthCalledWith(2, { prefix: 'temp/', cursor: 'cursor-1' });
    expect(mockR2.delete).toHaveBeenCalledWith(['temp/page1-old', 'temp/page2-old']);
  });

  it('should split deletes into batches of 1000 keys', async () => {
    const objects = Array.from({ length: 1500 }, (_, i) =>
      tempObject(`temp/old-${i}`, 25 * HOUR_MS)
    );
    mockR2.list.mockResolvedValueOnce({ objects, truncated: false });

    const deleted = await run();

    expect(deleted).toBe(1500);
    expect(mockR2.delete).toHaveBeenCalledTimes(2);
    expect(mockR2.delete.mock.calls[0][0]).toHaveLength(1000);
    expect(mockR2.delete.mock.calls[1][0]).toHaveLength(500);
  });
});
