import { describe, it, expect } from 'vitest';
import { inferMealTypeFromHour } from '../../packages/shared/src';

describe('inferMealTypeFromHour', () => {
  it('maps morning hours to breakfast (6–9)', () => {
    expect(inferMealTypeFromHour(6)).toBe('breakfast');
    expect(inferMealTypeFromHour(8)).toBe('breakfast');
    expect(inferMealTypeFromHour(9)).toBe('breakfast');
  });

  it('maps midday hours to lunch (11–13)', () => {
    expect(inferMealTypeFromHour(11)).toBe('lunch');
    expect(inferMealTypeFromHour(12)).toBe('lunch');
    expect(inferMealTypeFromHour(13)).toBe('lunch');
  });

  it('maps evening hours to dinner (17–20)', () => {
    expect(inferMealTypeFromHour(17)).toBe('dinner');
    // 19:00 is the case that regressed in the photo flow — must be dinner, not lunch.
    expect(inferMealTypeFromHour(19)).toBe('dinner');
    expect(inferMealTypeFromHour(20)).toBe('dinner');
  });

  it('maps the between-meal and late-night gaps to snack', () => {
    expect(inferMealTypeFromHour(10)).toBe('snack'); // brunch gap
    expect(inferMealTypeFromHour(14)).toBe('snack'); // afternoon gap
    expect(inferMealTypeFromHour(16)).toBe('snack');
    expect(inferMealTypeFromHour(21)).toBe('snack'); // late dinner → snack
    expect(inferMealTypeFromHour(3)).toBe('snack'); // middle of the night
  });
});
