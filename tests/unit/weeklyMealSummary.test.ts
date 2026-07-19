import { describe, it, expect } from 'vitest';
import { WEEKLY_MEAL_TARGETS } from '../../packages/shared/src';
import { computeWeeklyMealSummary } from '../../packages/backend/src/lib/weeklyMealSummary';
import type { MealRow, WeightRow } from '../../packages/backend/src/lib/mcpAggregate';

const meal = (over: Partial<MealRow>): MealRow => ({
  mealType: 'lunch',
  recordedAt: '2026-07-17T12:00:00+09:00',
  calories: 500,
  totalProtein: 20,
  totalFat: 15,
  totalCarbs: 60,
  ...over,
});

const opts = {
  startDate: '2026-07-13',
  endDate: '2026-07-19',
  targets: WEEKLY_MEAL_TARGETS,
};

describe('computeWeeklyMealSummary', () => {
  it('computes the six metrics over the window', () => {
    const meals: MealRow[] = [
      // 07-17: P48 F37 C140 → macro 1085, fat% 30.7 (>30 high-fat), protein 48 (<90)
      meal({ recordedAt: '2026-07-17T12:30:00+09:00', calories: 613, totalProtein: 30, totalFat: 12, totalCarbs: 80 }),
      meal({ recordedAt: '2026-07-17T19:00:00+09:00', calories: 615, totalProtein: 18, totalFat: 25, totalCarbs: 60 }),
      // 07-18: P97 F43 C175 → fat% 26.2 (ok), protein 97 (≥90 floor day)
      meal({ recordedAt: '2026-07-18T08:00:00+09:00', calories: 400, totalProtein: 22, totalFat: 10, totalCarbs: 45 }),
      meal({ recordedAt: '2026-07-18T12:00:00+09:00', calories: 700, totalProtein: 40, totalFat: 15, totalCarbs: 70 }),
      meal({ recordedAt: '2026-07-18T19:00:00+09:00', calories: 650, totalProtein: 35, totalFat: 18, totalCarbs: 60 }),
      // 07-19: P25 F30 C40 → fat% 50.9 (>30 high-fat), protein 25 (<90)
      meal({ recordedAt: '2026-07-19T12:00:00+09:00', calories: 500, totalProtein: 25, totalFat: 30, totalCarbs: 40 }),
    ];
    const weights: WeightRow[] = [
      { weight: 71.5, recordedAt: '2026-07-10T07:00:00+09:00' }, // before window (smooths MA)
      { weight: 71.2, recordedAt: '2026-07-12T07:00:00+09:00' },
      { weight: 71.0, recordedAt: '2026-07-13T07:00:00+09:00' },
      { weight: 70.6, recordedAt: '2026-07-15T07:00:00+09:00' },
      { weight: 70.4, recordedAt: '2026-07-17T07:00:00+09:00' },
      { weight: 70.0, recordedAt: '2026-07-19T07:00:00+09:00' },
    ];

    const r = computeWeeklyMealSummary(meals, weights, opts);

    // metric 6: completeness
    expect(r.recordedMealDays).toBe(3);
    expect(r.recordedWeightDays).toBe(4); // 07-13,15,17,19 within window

    // metric 1: avg over recorded days = (1228 + 1750 + 500) / 3
    expect(r.avgCalories).toBe(1159.3);

    // metric 2: PFC on macro-kcal basis (P170 F110 C355 → macro 3090)
    expect(r.proteinPct).toBe(22.0);
    expect(r.fatPct).toBe(32.0);
    expect(r.carbsPct).toBe(46.0);

    // metric 3 & 4
    expect(r.proteinFloorDays).toBe(1); // only 07-18
    expect(r.highFatDays).toBe(2); // 07-17 and 07-19

    // metric 5: MA(07-19) < MA(07-13) → downward
    expect(r.weightDirection).toBe('down');
    expect(r.weightDeltaKg).toBeLessThan(0);

    // targets echoed for the client
    expect(r.targets.dailyCalorieLimit).toBe(1750);
    expect(r.windowDays).toBe(7);
  });

  it('handles an empty week', () => {
    const r = computeWeeklyMealSummary([], [], opts);
    expect(r.recordedMealDays).toBe(0);
    expect(r.avgCalories).toBe(0);
    expect(r.proteinPct).toBe(0);
    expect(r.highFatDays).toBe(0);
    expect(r.proteinFloorDays).toBe(0);
    expect(r.weightDirection).toBe('none');
    expect(r.weightDeltaKg).toBe(0);
  });

  it('buckets a bare-UTC "Z" meal onto its JST day inside the window', () => {
    // 20:00Z on 07-18 → 05:00 JST on 07-19 (still inside the window)
    const r = computeWeeklyMealSummary(
      [meal({ recordedAt: '2026-07-18T20:00:00Z', totalProtein: 95, totalFat: 5, totalCarbs: 10, calories: 500 })],
      [],
      opts
    );
    expect(r.recordedMealDays).toBe(1);
    expect(r.proteinFloorDays).toBe(1); // 95g ≥ 90 on 07-19
  });

  it('excludes days outside the window', () => {
    const r = computeWeeklyMealSummary(
      [meal({ recordedAt: '2026-07-12T12:00:00+09:00' })], // one day before startDate
      [],
      opts
    );
    expect(r.recordedMealDays).toBe(0);
  });
});
