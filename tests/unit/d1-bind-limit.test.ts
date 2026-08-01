import { describe, it, expect } from 'vitest';
import { chunkBindings, D1_MAX_BOUND_PARAMS } from '../../packages/backend/src/lib/d1';

describe('chunkBindings', () => {
  it('keeps every chunk within D1 bound-parameter limit', () => {
    const chunks = chunkBindings(Array.from({ length: 250 }, (_, i) => i));
    expect(chunks.map((c) => c.length)).toEqual([100, 100, 50]);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(D1_MAX_BOUND_PARAMS);
    }
  });

  it('preserves order and loses nothing', () => {
    const values = Array.from({ length: 205 }, (_, i) => `id-${i}`);
    expect(chunkBindings(values).flat()).toEqual(values);
  });

  it('leaves room for the bindings the rest of the statement uses', () => {
    // e.g. userId + two date bounds already spent 3 of the 100.
    const chunks = chunkBindings(Array.from({ length: 200 }, (_, i) => i), 3);
    expect(chunks[0]!.length).toBe(97);
    for (const chunk of chunks) {
      expect(chunk.length + 3).toBeLessThanOrEqual(D1_MAX_BOUND_PARAMS);
    }
  });

  it('returns no chunks for an empty list so the caller skips the query', () => {
    expect(chunkBindings([])).toEqual([]);
  });

  it('never emits a zero-length chunk, even if reserved exceeds the limit', () => {
    // A zero-length chunk would loop forever; degrade to one value per query.
    const chunks = chunkBindings([1, 2, 3], D1_MAX_BOUND_PARAMS + 10);
    expect(chunks).toEqual([[1], [2], [3]]);
  });

  it('does not split a list that already fits', () => {
    const values = Array.from({ length: D1_MAX_BOUND_PARAMS }, (_, i) => i);
    expect(chunkBindings(values)).toHaveLength(1);
  });
});
