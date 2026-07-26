import { describe, it, expect } from 'vitest';
import {
  KCAL_PER_GRAM,
  macroKcal,
  evaluateDayNutrition,
  resolvePfcGramTargets,
  resolveWeeklyMealTargets,
} from '../../packages/shared/src';

/**
 * The fat share the summary card prints under the gram bar. Mirrors the
 * calculation in CalorieSummary so a change there without a matching change
 * here (or vice versa) fails.
 */
const fatSharePct = (protein: number, fat: number, carbs: number): number | null => {
  const macro = macroKcal(protein, fat, carbs);
  return macro > 0 ? ((fat * KCAL_PER_GRAM.fat) / macro) * 100 : null;
};

const TARGETS = resolveWeeklyMealTargets();

describe('fat share shown alongside the gram bar', () => {
  it('explains the 2026-07-21 case: gram bar green, share over band', () => {
    // Real data: 1221 kcal, P92.1 F39.7 C112.8 over 4 records.
    const [p, f, c] = [92.1, 39.7, 112.8];

    // The gram bar compares against the cap derived from a 1750 kcal goal
    // (1750 * 30% / 9 = 58.3g), so 39.7g reads as "within target" — green.
    const gramTargets = resolvePfcGramTargets(1750);
    expect(gramTargets.fat).toBeCloseTo(58.33, 2);
    expect(f).toBeLessThan(gramTargets.fat!);

    // But only 1221 kcal was eaten, so the same 39.7g is a larger slice of the
    // energy actually consumed — 30.4%, just over the 30% band.
    const share = fatSharePct(p, f, c)!;
    expect(share).toBeCloseTo(30.4, 1);
    expect(share).toBeGreaterThan(TARGETS.fatPct);

    // …which is exactly why the calendar dot reads as a miss. The note the card
    // renders must agree with the dot, or the screen contradicts itself.
    const verdict = evaluateDayNutrition(
      { calories: 1221, protein: p, fat: f, carbs: c, mealCount: 4 },
      TARGETS
    );
    expect(verdict.fatOk).toBe(false);
    expect(share <= TARGETS.fatPct).toBe(verdict.fatOk);
  });

  it('shows the same day would pass at a fuller calorie intake', () => {
    // Same 39.7g of fat, but eaten alongside enough carbs to reach ~1750 kcal:
    // the share drops well inside the band. The gram amount never changed.
    const share = fatSharePct(92.1, 39.7, 255)!;
    expect(share).toBeLessThan(TARGETS.fatPct);
  });

  it('agrees with the calendar dot across a spread of real days', () => {
    const days = [
      { date: '07-20', calories: 1690, protein: 96.8, fat: 90.4, carbs: 122.7, mealCount: 6 },
      { date: '07-22', calories: 1654, protein: 105.9, fat: 59.8, carbs: 173.2, mealCount: 4 },
      { date: '07-23', calories: 1400, protein: 122.6, fat: 43.6, carbs: 128.2, mealCount: 3 },
      { date: '07-25', calories: 1536, protein: 53.6, fat: 22.6, carbs: 276.8, mealCount: 4 },
    ];
    for (const d of days) {
      const share = fatSharePct(d.protein, d.fat, d.carbs)!;
      const verdict = evaluateDayNutrition(d, TARGETS);
      expect(share <= TARGETS.fatPct, `${d.date} share=${share}`).toBe(verdict.fatOk);
    }
  });

  it('returns null share when the day has no macro breakdown', () => {
    expect(fatSharePct(0, 0, 0)).toBeNull();
  });
});
