import { describe, it, expect } from 'vitest';
import { WEEKLY_MEAL_TARGETS, resolveWeeklyMealTargets } from '../../packages/shared/src';

describe('resolveWeeklyMealTargets (#170)', () => {
  it('returns the global defaults when no overrides are given', () => {
    expect(resolveWeeklyMealTargets()).toEqual(WEEKLY_MEAL_TARGETS);
    expect(resolveWeeklyMealTargets({})).toEqual(WEEKLY_MEAL_TARGETS);
  });

  it('applies a partial override and leaves the rest at default', () => {
    const r = resolveWeeklyMealTargets({ proteinFloorPerDay: 75, exerciseDaysTarget: 4 });
    expect(r.proteinFloorPerDay).toBe(75);
    expect(r.exerciseDaysTarget).toBe(4);
    // untouched fields keep the defaults
    expect(r.fatPct).toBe(WEEKLY_MEAL_TARGETS.fatPct);
    expect(r.dailyCalorieLimit).toBe(WEEKLY_MEAL_TARGETS.dailyCalorieLimit);
  });

  it('treats null / undefined as "unset" and falls back to the default', () => {
    const r = resolveWeeklyMealTargets({
      proteinPct: null,
      fatPct: undefined,
      dailyCalorieLimit: 1500,
    });
    expect(r.proteinPct).toBe(WEEKLY_MEAL_TARGETS.proteinPct); // null → default
    expect(r.fatPct).toBe(WEEKLY_MEAL_TARGETS.fatPct); // undefined → default
    expect(r.dailyCalorieLimit).toBe(1500); // real value wins
  });

  it('never lets structural/reference fields be overridden', () => {
    // windowDays / weightMaWindow / carbsPct are not part of the override type,
    // so they always come from the constant.
    const r = resolveWeeklyMealTargets({ proteinFloorPerDay: 120 });
    expect(r.windowDays).toBe(WEEKLY_MEAL_TARGETS.windowDays);
    expect(r.weightMaWindow).toBe(WEEKLY_MEAL_TARGETS.weightMaWindow);
    expect(r.carbsPct).toBe(WEEKLY_MEAL_TARGETS.carbsPct);
  });

  it('accepts 0 as a real override (not treated as unset)', () => {
    const r = resolveWeeklyMealTargets({ highFatDaysLimit: 0, exerciseDaysTarget: 0 });
    expect(r.highFatDaysLimit).toBe(0);
    expect(r.exerciseDaysTarget).toBe(0);
  });
});
