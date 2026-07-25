/**
 * Per-day nutrition verdict — the "was this day good?" judgement the meal-history
 * calendar renders as three dots per cell.
 *
 * This is NOT a new set of rules. The weekly card (`この1週間`) already judges
 * each day individually in order to count `proteinFloorDays` and `highFatDays`
 * (`backend/src/lib/weeklyMealSummary.ts`); the calendar just surfaces that same
 * per-day verdict. Keeping one implementation here — in shared, reachable from
 * both the Workers backend and the React frontend — is what stops the calendar
 * from disagreeing with the weekly card it sits next to.
 *
 * Calorie basis, deliberately split (same rationale as weeklyMealSummary):
 *   - the calorie check uses the LOGGED `calories` (what the day summary shows);
 *   - the fat check uses MACRO-derived kcal (P*4 + F*9 + C*4), because "what
 *     share of energy came from fat" is the fatty-liver signal and must come
 *     from the macros rather than a possibly-divergent calorie field.
 */
import { KCAL_PER_GRAM } from '../constants';

/** A day's summed nutrition, as aggregated from that day's meal records. */
export interface DayNutritionTotals {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  /** How many meal records the day has — drives the `sparse` flag. */
  mealCount: number;
}

/**
 * The three thresholds the verdict is measured against. Structurally a subset of
 * the resolved weekly targets, so callers pass `resolveWeeklyMealTargets(...)`
 * directly and per-user overrides (#170) flow through untouched.
 */
export interface DayNutritionTargets {
  dailyCalorieLimit: number;
  fatPct: number;
  proteinFloorPerDay: number;
}

export interface DayNutritionVerdict {
  calorieOk: boolean;
  fatOk: boolean;
  proteinOk: boolean;
  /** Fat's share of macro-derived kcal (%), rounded to 1 decimal. 0 when no macros. */
  fatPct: number;
  /** How many of the three checks passed (0-3) — the calendar's dot fill count. */
  score: number;
  /**
   * True when the day has too few records to judge fairly. A day with a single
   * 400 kcal entry passes the calorie check trivially, but that is a logging
   * gap, not a good day — the calendar greys such days out rather than
   * flattering them.
   */
  sparse: boolean;
}

/** A day with at most this many records is treated as "not enough to judge". */
export const SPARSE_MEAL_COUNT_MAX = 1;

/** Macro-derived kcal for a day: protein & carbs at 4, fat at 9 kcal/g. */
export function macroKcal(protein: number, fat: number, carbs: number): number {
  return (
    protein * KCAL_PER_GRAM.protein + fat * KCAL_PER_GRAM.fat + carbs * KCAL_PER_GRAM.carbs
  );
}

/**
 * Judge one day against the three targets.
 *
 * Boundary directions must match the weekly card, which counts a high-fat day as
 * `fatShare > targets.fatPct` (strictly above) and a protein day as
 * `protein >= targets.proteinFloorPerDay`. A day sitting exactly on the fat band
 * is therefore NOT high-fat.
 */
export function evaluateDayNutrition(
  totals: DayNutritionTotals,
  targets: DayNutritionTargets
): DayNutritionVerdict {
  const macro = macroKcal(totals.protein, totals.fat, totals.carbs);

  // A day can carry logged calories with no macro breakdown at all (older
  // hand-typed entries). Treat that as 0% fat rather than NaN, which would
  // otherwise make every comparison false and silently zero the score.
  const rawFatPct = macro > 0 ? ((totals.fat * KCAL_PER_GRAM.fat) / macro) * 100 : 0;

  const calorieOk = totals.calories <= targets.dailyCalorieLimit;
  // Compared against the RAW share, not the rounded one: the weekly card counts
  // a high-fat day as `share > fatPct` un-rounded, so rounding first would let a
  // 30.04% day read as "within band" here while the card counts it as high-fat.
  const fatOk = rawFatPct <= targets.fatPct;
  const proteinOk = totals.protein >= targets.proteinFloorPerDay;

  return {
    calorieOk,
    fatOk,
    proteinOk,
    fatPct: Math.round(rawFatPct * 10) / 10, // display value only
    score: [calorieOk, fatOk, proteinOk].filter(Boolean).length,
    // The checks above still run for a sparse day — the flag only tells the UI
    // to grey the dots out, and discarding the verdict would lose that detail.
    sparse: totals.mealCount <= SPARSE_MEAL_COUNT_MAX,
  };
}
