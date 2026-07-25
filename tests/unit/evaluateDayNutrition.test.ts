import { describe, it, expect } from 'vitest';
import {
  evaluateDayNutrition,
  macroKcal,
  resolveWeeklyMealTargets,
  SPARSE_MEAL_COUNT_MAX,
  type DayNutritionTargets,
  type DayNutritionTotals,
} from '../../packages/shared/src';

const TARGETS: DayNutritionTargets = resolveWeeklyMealTargets(); // 1750 kcal / 30% / 90g

/** Build a day, defaulting to enough records that it is not treated as sparse. */
const day = (t: Partial<DayNutritionTotals>): DayNutritionTotals => ({
  calories: 0,
  protein: 0,
  fat: 0,
  carbs: 0,
  mealCount: SPARSE_MEAL_COUNT_MAX + 1,
  ...t,
});

describe('macroKcal', () => {
  it('weights protein and carbs at 4 kcal/g and fat at 9', () => {
    expect(macroKcal(10, 10, 10)).toBe(170);
    expect(macroKcal(0, 0, 0)).toBe(0);
  });
});

describe('evaluateDayNutrition', () => {
  it('scores a day that meets all three targets', () => {
    // 2026-07-23 (real data): 1400 kcal, P122.6 F43.6 C128.2 → fat share 28.1%
    const v = evaluateDayNutrition(
      day({ calories: 1400, protein: 122.6, fat: 43.6, carbs: 128.2, mealCount: 3 }),
      TARGETS
    );
    expect(v.calorieOk).toBe(true);
    expect(v.fatOk).toBe(true);
    expect(v.proteinOk).toBe(true);
    expect(v.score).toBe(3);
    expect(v.sparse).toBe(false);
    expect(v.fatPct).toBeCloseTo(28.1, 1);
  });

  it('fails the fat check when fat share runs high, even on a low-calorie day', () => {
    // 2026-07-20 (real data): protein floor met, but 48% of energy from fat
    const v = evaluateDayNutrition(
      day({ calories: 1690, protein: 96.8, fat: 90.4, carbs: 122.7, mealCount: 6 }),
      TARGETS
    );
    expect(v.calorieOk).toBe(true);
    expect(v.proteinOk).toBe(true);
    expect(v.fatOk).toBe(false);
    expect(v.score).toBe(2);
    expect(v.fatPct).toBeCloseTo(48.1, 1);
  });

  it('matches the weekly card at the boundaries: fat is strict, protein is inclusive', () => {
    // Exactly 30% fat share: weeklyMealSummary counts a high-fat day as
    // `share > fatPct`, so sitting on the band is NOT a failure.
    // P=25g(100kcal) F=10g(90kcal) C=27.5g(110kcal) → 300 kcal, fat share 30.0%
    const onBand = evaluateDayNutrition(
      day({ calories: 300, protein: 25, fat: 10, carbs: 27.5 }),
      TARGETS
    );
    expect(onBand.fatPct).toBeCloseTo(30, 5);
    expect(onBand.fatOk).toBe(true);

    // Protein exactly at the floor passes (`>=`), matching proteinFloorDays.
    const atFloor = evaluateDayNutrition(day({ protein: 90 }), TARGETS);
    expect(atFloor.proteinOk).toBe(true);
    expect(evaluateDayNutrition(day({ protein: 89.9 }), TARGETS).proteinOk).toBe(false);

    // Calories exactly at the limit pass (`<=`), as the weekly limit reads.
    expect(evaluateDayNutrition(day({ calories: 1750 }), TARGETS).calorieOk).toBe(true);
    expect(evaluateDayNutrition(day({ calories: 1751 }), TARGETS).calorieOk).toBe(false);
  });

  it('does not divide by zero when a day has calories but no macro breakdown', () => {
    const v = evaluateDayNutrition(day({ calories: 500 }), TARGETS);
    expect(v.fatPct).toBe(0);
    expect(Number.isNaN(v.fatPct)).toBe(false);
    expect(v.fatOk).toBe(true); // 0% fat is within the band
  });

  it('flags a day with a single record as sparse', () => {
    // A lone 400 kcal entry clears the calorie bar trivially — that is a logging
    // gap, not a good day, so the calendar greys it out instead.
    const v = evaluateDayNutrition(
      day({ calories: 400, protein: 22, fat: 3.9, carbs: 66.3, mealCount: 1 }),
      TARGETS
    );
    expect(v.sparse).toBe(true);
    expect(v.calorieOk).toBe(true); // the checks still compute; the flag is what UI keys on
  });

  it('is not sparse once the day has more than one record', () => {
    expect(evaluateDayNutrition(day({ mealCount: 2 }), TARGETS).sparse).toBe(false);
  });

  it('honors per-user target overrides', () => {
    const strict = resolveWeeklyMealTargets({ proteinFloorPerDay: 130, fatPct: 25 });
    const totals = day({ calories: 1400, protein: 122.6, fat: 43.6, carbs: 128.2, mealCount: 3 });

    // Same day that scored 3/3 against the defaults now misses both raised bars.
    const v = evaluateDayNutrition(totals, strict);
    expect(v.proteinOk).toBe(false); // 122.6 < 130
    expect(v.fatOk).toBe(false); // 28.1% > 25%
    expect(v.score).toBe(1);
  });
});
