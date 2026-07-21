import { describe, it, expect } from 'vitest';
import {
  extractLocalDate,
  getWeekDateRange,
  nextLocalDate,
  toJstIsoString,
} from '../../packages/backend/src/lib/localDate';

describe('extractLocalDate', () => {
  it('takes the first 10 chars (local date) of an offset-aware ISO string', () => {
    expect(extractLocalDate('2026-01-17T08:00:00+09:00')).toBe('2026-01-17');
    expect(extractLocalDate('2026-01-17T23:30:00-05:00')).toBe('2026-01-17');
    expect(extractLocalDate('2026-01-16T23:00:00Z')).toBe('2026-01-16');
    expect(extractLocalDate('2026-01-17')).toBe('2026-01-17');
  });
});

describe('toJstIsoString (writer-side format for recorded_at)', () => {
  it('renders an instant as JST wall clock with a +09:00 offset', () => {
    expect(toJstIsoString(new Date('2026-07-20T08:09:59Z'))).toBe('2026-07-20T17:09:59+09:00');
    expect(toJstIsoString(new Date('2026-01-01T00:00:00Z'))).toBe('2026-01-01T09:00:00+09:00');
  });

  it('drops sub-second precision so every stored value has one shape', () => {
    // A ".sss" variant would sort before the plain form ('+' 0x2B < '.' 0x2E)
    // and reintroduce the format mixing this whole change exists to remove.
    expect(toJstIsoString(new Date('2026-07-20T08:09:59.018Z'))).toBe('2026-07-20T17:09:59+09:00');
  });

  it('carries the JST date into the first 10 chars across a UTC day boundary', () => {
    // 15:00Z is midnight JST the next day — extractLocalDate must see the JST date.
    const iso = toJstIsoString(new Date('2026-07-19T15:00:00Z'));
    expect(iso).toBe('2026-07-20T00:00:00+09:00');
    expect(extractLocalDate(iso)).toBe('2026-07-20');
  });

  it('produces strings whose lexicographic order matches chronological order', () => {
    // The regression this change fixes: a bare-UTC "Z" value sorted as if it were
    // 9 hours early, so it landed among the wrong rows under ORDER BY recorded_at.
    const instants = [
      new Date('2026-07-20T01:16:00Z'), // 10:16 JST
      new Date('2026-07-20T02:16:00Z'), // 11:16 JST
      new Date('2026-07-20T06:03:00Z'), // 15:03 JST
      new Date('2026-07-20T06:15:00Z'), // 15:15 JST
      new Date('2026-07-20T08:09:00Z'), // 17:09 JST
      new Date('2026-07-20T10:32:00Z'), // 19:32 JST
    ];
    const rendered = instants.map(toJstIsoString);

    expect([...rendered].sort()).toEqual(rendered);
  });

  it('keeps midnight-crossing records in chronological string order', () => {
    const before = toJstIsoString(new Date('2026-07-19T14:59:00Z')); // 23:59 JST 7/19
    const after = toJstIsoString(new Date('2026-07-19T15:01:00Z')); // 00:01 JST 7/20
    expect(before < after).toBe(true);
    expect(extractLocalDate(before)).toBe('2026-07-19');
    expect(extractLocalDate(after)).toBe('2026-07-20');
  });
});

describe('getWeekDateRange', () => {
  it('returns an inclusive Sunday-through-Saturday range', () => {
    expect(getWeekDateRange('2026-01-14')).toEqual({
      startDate: '2026-01-11',
      endDate: '2026-01-17',
    });
  });

  it('keeps Sunday and Saturday in the same seven-day range', () => {
    expect(getWeekDateRange('2026-01-11')).toEqual({
      startDate: '2026-01-11',
      endDate: '2026-01-17',
    });
    expect(getWeekDateRange('2026-01-17')).toEqual({
      startDate: '2026-01-11',
      endDate: '2026-01-17',
    });
  });

  it('handles month and year boundaries', () => {
    expect(getWeekDateRange('2026-01-01')).toEqual({
      startDate: '2025-12-28',
      endDate: '2026-01-03',
    });
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
