import { describe, it, expect } from 'vitest';
import {
  extractLocalDate,
  nextLocalDate,
  toJstDisplay,
  extractJstDate,
} from '../../src/lib/localDate';

describe('extractLocalDate / nextLocalDate', () => {
  it('takes the first 10 chars as the local date', () => {
    expect(extractLocalDate('2026-07-17T08:00:00+09:00')).toBe('2026-07-17');
  });

  it('nextLocalDate returns the following day', () => {
    expect(nextLocalDate('2026-07-17')).toBe('2026-07-18');
    expect(nextLocalDate('2026-07-31T23:59:59+09:00')).toBe('2026-08-01');
  });
});

describe('toJstDisplay', () => {
  it('passes an offset-aware "+09:00" timestamp through in wall-clock terms', () => {
    expect(toJstDisplay('2026-07-19T08:43:28+09:00')).toBe('2026-07-19 08:43');
  });

  it('converts a bare-UTC "Z" timestamp to JST (+9h)', () => {
    // 03:57 UTC -> 12:57 JST, same day
    expect(toJstDisplay('2026-07-17T03:57:09.564Z')).toBe('2026-07-17 12:57');
  });

  it('converts a "Z" timestamp across the date boundary', () => {
    // 20:00 UTC on 07-16 -> 05:00 JST on 07-17
    expect(toJstDisplay('2026-07-16T20:00:00Z')).toBe('2026-07-17 05:00');
  });

  it('returns the raw input when unparseable', () => {
    expect(toJstDisplay('not-a-date')).toBe('not-a-date');
  });
});

describe('extractJstDate', () => {
  it('matches the string prefix for "+09:00" timestamps', () => {
    expect(extractJstDate('2026-07-17T22:00:00+09:00')).toBe('2026-07-17');
  });

  it('converts a "Z" timestamp to the correct JST date across the boundary', () => {
    // 20:00 UTC on 07-16 is 05:00 JST on 07-17 — extractLocalDate would wrongly say 07-16
    expect(extractLocalDate('2026-07-16T20:00:00Z')).toBe('2026-07-16');
    expect(extractJstDate('2026-07-16T20:00:00Z')).toBe('2026-07-17');
  });
});
