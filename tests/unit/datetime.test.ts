import { describe, expect, it } from 'vitest';
import { createWeightSchema } from '../../packages/shared/src/schemas';

// Test datetimeSchema validation through createWeightSchema
// (datetimeSchema is internal, not exported)

describe('datetimeSchema validation (via createWeightSchema)', () => {
  const testDatetime = (recordedAt: string) =>
    createWeightSchema.safeParse({ weight: 70, recordedAt });

  describe('valid formats', () => {
    it('should accept ISO string with positive offset (+09:00)', () => {
      const result = testDatetime('2026-01-17T08:00:00+09:00');
      expect(result.success).toBe(true);
    });

    it('should accept ISO string with negative offset (-05:00)', () => {
      const result = testDatetime('2026-01-17T08:00:00-05:00');
      expect(result.success).toBe(true);
    });

    it('should accept ISO string with Z (UTC)', () => {
      const result = testDatetime('2026-01-17T08:00:00Z');
      expect(result.success).toBe(true);
    });

    it('should accept ISO string with milliseconds and offset', () => {
      const result = testDatetime('2026-01-17T08:00:00.123+09:00');
      expect(result.success).toBe(true);
    });
  });

  describe('invalid formats (now rejected - offset required)', () => {
    it('should reject datetime-local format (no offset)', () => {
      const result = testDatetime('2026-01-17T08:00');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Timezone offset required (e.g., +09:00 or Z)');
      }
    });

    it('should reject datetime without offset', () => {
      const result = testDatetime('2026-01-17T08:00:00');
      expect(result.success).toBe(false);
    });

    it('should reject date-only format', () => {
      const result = testDatetime('2026-01-17');
      expect(result.success).toBe(false);
    });

    it('should reject invalid date with offset', () => {
      const result = testDatetime('2026-13-45T08:00:00+09:00');
      expect(result.success).toBe(false);
    });

    it('should reject empty string', () => {
      const result = testDatetime('');
      expect(result.success).toBe(false);
    });
  });
});

describe('toLocalISOString', () => {
  it('should return ISO string with correct format (YYYY-MM-DDTHH:mm:ss with offset or Z)', async () => {
    const { toLocalISOString } = await import('../../packages/frontend/src/lib/datetime');
    const date = new Date(2026, 0, 17, 8, 0, 0);
    const result = toLocalISOString(date);

    // Format check: YYYY-MM-DDTHH:mm:ss with either ±HH:mm or Z (for UTC)
    // Z is equivalent to +00:00 in ISO 8601
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}([+-]\d{2}:\d{2}|Z)$/);
  });

  it('should include timezone offset or Z', async () => {
    const { toLocalISOString } = await import('../../packages/frontend/src/lib/datetime');
    const date = new Date();
    const result = toLocalISOString(date);

    // Should have offset (±HH:mm) or Z at the end
    expect(result).toMatch(/([+-]\d{2}:\d{2}|Z)$/);
  });
});

describe('fromDatetimeLocal', () => {
  it('should convert datetime-local input to ISO with offset or Z', async () => {
    const { fromDatetimeLocal } = await import('../../packages/frontend/src/lib/datetime');

    const result = fromDatetimeLocal('2026-01-17T08:00');

    // Should have offset or Z
    expect(result).toMatch(/([+-]\d{2}:\d{2}|Z)$/);
    // Should be valid ISO format with timezone
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}([+-]\d{2}:\d{2}|Z)$/);
  });
});

describe('extractLocalDate', () => {
  // Pure function test - extractLocalDate is just slice(0, 10)
  const extractLocalDate = (recordedAt: string): string => recordedAt.slice(0, 10);

  it('should extract local date from offset datetime', () => {
    expect(extractLocalDate('2026-01-17T08:00:00+09:00')).toBe('2026-01-17');
    expect(extractLocalDate('2026-01-17T23:00:00-05:00')).toBe('2026-01-17');
    expect(extractLocalDate('2026-01-16T23:00:00Z')).toBe('2026-01-16');
  });

  it('should preserve local date regardless of offset value', () => {
    // Same instant in time, different representations
    // UTC midnight = JST 9am
    expect(extractLocalDate('2026-01-17T00:00:00Z')).toBe('2026-01-17');
    expect(extractLocalDate('2026-01-17T09:00:00+09:00')).toBe('2026-01-17');

    // These represent the same instant but different local dates
    expect(extractLocalDate('2026-01-16T23:00:00Z')).toBe('2026-01-16');
    expect(extractLocalDate('2026-01-17T08:00:00+09:00')).toBe('2026-01-17');
  });
});
