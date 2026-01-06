import { describe, it, expect } from 'vitest';
import { generateRequestId } from '../../packages/frontend/src/lib/requestId';

describe('Request ID Generation', () => {
  it('should generate a valid UUID v4', () => {
    const requestId = generateRequestId();

    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    expect(requestId).toMatch(uuidV4Regex);
  });

  it('should generate unique IDs on successive calls', () => {
    const id1 = generateRequestId();
    const id2 = generateRequestId();
    const id3 = generateRequestId();

    expect(id1).not.toBe(id2);
    expect(id2).not.toBe(id3);
    expect(id1).not.toBe(id3);
  });

  it('should return a non-empty string', () => {
    const requestId = generateRequestId();

    expect(requestId).toBeTruthy();
    expect(typeof requestId).toBe('string');
    expect(requestId.length).toBeGreaterThan(0);
  });

  it('should generate consistent format (36 characters with dashes)', () => {
    const requestId = generateRequestId();

    expect(requestId.length).toBe(36);
    expect(requestId.split('-').length).toBe(5);
  });
});
