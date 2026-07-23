import { describe, it, expect } from 'vitest';
import {
  KCAL_PER_GRAM,
  WEEKLY_MEAL_TARGETS,
  resolvePfcGramTargets,
} from '../../packages/shared/src';

describe('resolvePfcGramTargets', () => {
  it('returns fat/carbs = null when no calorie goal is set, protein still floors', () => {
    for (const noGoal of [null, undefined]) {
      const r = resolvePfcGramTargets(noGoal);
      expect(r.fat).toBeNull();
      expect(r.carbs).toBeNull();
      // protein is a g/day floor, so it is always available
      expect(r.protein).toBe(WEEKLY_MEAL_TARGETS.proteinFloorPerDay);
    }
  });

  it('converts fat/carbs %-share into grams from the calorie goal (defaults)', () => {
    const r = resolvePfcGramTargets(1750);
    // fat: 1750 * 30% / 9kcal-per-g = 58.33...
    expect(r.fat).toBeCloseTo((1750 * WEEKLY_MEAL_TARGETS.fatPct) / 100 / KCAL_PER_GRAM.fat, 5);
    expect(r.fat).toBeCloseTo(58.33, 2);
    // carbs: 1750 * 50% / 4kcal-per-g = 218.75 (exact)
    expect(r.carbs).toBe(218.75);
    expect(r.protein).toBe(WEEKLY_MEAL_TARGETS.proteinFloorPerDay);
  });

  it('honors per-user overrides for fatPct and proteinFloorPerDay', () => {
    const r = resolvePfcGramTargets(2000, { fatPct: 25, proteinFloorPerDay: 110 });
    expect(r.fat).toBeCloseTo((2000 * 25) / 100 / KCAL_PER_GRAM.fat, 5); // 55.55...
    expect(r.protein).toBe(110);
    // carbsPct is reference-only (not overridable), so it tracks the constant
    expect(r.carbs).toBe((2000 * WEEKLY_MEAL_TARGETS.carbsPct) / 100 / KCAL_PER_GRAM.carbs);
  });

  it('treats null/undefined overrides as unset and falls back to defaults', () => {
    const r = resolvePfcGramTargets(1750, { fatPct: null, proteinFloorPerDay: undefined });
    expect(r.fat).toBeCloseTo((1750 * WEEKLY_MEAL_TARGETS.fatPct) / 100 / KCAL_PER_GRAM.fat, 5);
    expect(r.protein).toBe(WEEKLY_MEAL_TARGETS.proteinFloorPerDay);
  });
});
