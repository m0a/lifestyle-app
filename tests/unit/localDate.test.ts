import { describe, it, expect } from 'vitest';
import { extractLocalDate, nextLocalDate } from '../../packages/backend/src/lib/localDate';

describe('extractLocalDate', () => {
  it('takes the first 10 chars (local date) of an offset-aware ISO string', () => {
    expect(extractLocalDate('2026-01-17T08:00:00+09:00')).toBe('2026-01-17');
    expect(extractLocalDate('2026-01-16T23:00:00Z')).toBe('2026-01-16');
    expect(extractLocalDate('2026-01-17')).toBe('2026-01-17');
  });
});

describe('nextLocalDate (exclusive upper bound for #103 range filters)', () => {
  it('returns the next calendar day', () => {
    expect(nextLocalDate('2026-01-17')).toBe('2026-01-18');
  });

  it('rolls over month boundaries', () => {
    expect(nextLocalDate('2026-01-31')).toBe('2026-02-01');
    expect(nextLocalDate('2026-04-30')).toBe('2026-05-01');
  });

  it('rolls over year boundaries', () => {
    expect(nextLocalDate('2026-12-31')).toBe('2027-01-01');
  });

  it('handles leap years', () => {
    expect(nextLocalDate('2024-02-28')).toBe('2024-02-29');
    expect(nextLocalDate('2024-02-29')).toBe('2024-03-01');
    expect(nextLocalDate('2026-02-28')).toBe('2026-03-01'); // non-leap
  });

  it('accepts a full ISO string and uses only its local date', () => {
    expect(nextLocalDate('2026-01-17T23:30:00+09:00')).toBe('2026-01-18');
  });

  it('is consistent with the local-date range equivalence', () => {
    // extractLocalDate(r) <= end   <=>   r < nextLocalDate(end)
    const end = '2026-01-17';
    const exclusive = nextLocalDate(end);
    // A same-day record (any time/offset) is < the exclusive bound...
    expect('2026-01-17T23:59:59+09:00' < exclusive).toBe(true);
    // ...and a next-day record is not.
    expect('2026-01-18T00:00:00+09:00' < exclusive).toBe(false);
  });
});
