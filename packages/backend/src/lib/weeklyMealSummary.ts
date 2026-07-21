/**
 * Pure computation for the meal tab's "この1週間" weekly evaluation card.
 *
 * Folds a week of meals + weights into the six coaching metrics the card shows.
 * Kept side-effect-free / DB-free (like mcpAggregate) so it can be unit-tested
 * directly. Day bucketing goes through extractJstDate, so legacy bare-UTC "Z"
 * rows land on the correct JST day, matching the rest of the app.
 *
 * Two different calorie bases are intentional:
 *   - metric 1 (avg calories) uses the LOGGED `calories` (what the today card shows);
 *   - metric 2 (PFC %) and metric 4 (high-fat day) use MACRO-derived kcal
 *     (P*4 + F*9 + C*4), because "what share of energy is fat" is the fatty-liver
 *     signal and should come from the macros, not a possibly-divergent calorie field.
 */
import { extractJstDate } from './localDate';
import {
  dailyWeightSeries,
  movingAverageSeries,
  type MealRow,
  type WeightRow,
} from './mcpAggregate';

export interface WeeklyMealTargets {
  windowDays: number;
  dailyCalorieLimit: number;
  proteinPct: number;
  fatPct: number;
  carbsPct: number;
  proteinFloorPerDay: number;
  highFatDaysLimit: number;
  weightMaWindow: number;
  exerciseDaysTarget: number;
}

/** Minimal shape needed from an exercise record: only its wall-clock timestamp. */
export interface ExerciseRow {
  recordedAt: string;
}

export interface WeeklyMealSummaryResult {
  startDate: string;
  endDate: string;
  windowDays: number;
  recordedMealDays: number;
  recordedWeightDays: number;
  avgCalories: number;
  proteinPct: number;
  fatPct: number;
  carbsPct: number;
  avgProteinG: number;
  avgFatG: number;
  avgCarbsG: number;
  proteinFloorDays: number;
  highFatDays: number;
  weightDirection: 'down' | 'flat' | 'up' | 'none';
  weightDeltaKg: number;
  exerciseDays: number;
  exerciseSessions: number;
  targets: {
    dailyCalorieLimit: number;
    proteinPct: number;
    fatPct: number;
    carbsPct: number;
    proteinFloorPerDay: number;
    highFatDaysLimit: number;
    exerciseDaysTarget: number;
  };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Macro-derived kcal for a day/period: protein & carbs at 4, fat at 9 kcal/g. */
const macroKcal = (p: number, f: number, c: number) => p * 4 + f * 9 + c * 4;

/**
 * @param meals   meals within [startDate, endDate] (the route filters to the window)
 * @param weights weights over a WIDER range ([startDate - weightMaWindow .. endDate])
 *                so the moving average at startDate is properly smoothed
 */
export function computeWeeklyMealSummary(
  meals: MealRow[],
  weights: WeightRow[],
  exercises: ExerciseRow[],
  opts: { startDate: string; endDate: string; targets: WeeklyMealTargets }
): WeeklyMealSummaryResult {
  const { startDate, endDate, targets } = opts;

  // ---- per-day nutrition (one bucket per JST calendar day in the window) ----
  const dayMap = new Map<string, { calories: number; protein: number; fat: number; carbs: number }>();
  for (const m of meals) {
    const date = extractJstDate(m.recordedAt);
    if (date < startDate || date > endDate) continue; // guard against out-of-window rows
    const d = dayMap.get(date) ?? { calories: 0, protein: 0, fat: 0, carbs: 0 };
    d.calories += m.calories ?? 0;
    d.protein += m.totalProtein ?? 0;
    d.fat += m.totalFat ?? 0;
    d.carbs += m.totalCarbs ?? 0;
    dayMap.set(date, d);
  }
  const days = [...dayMap.values()];
  const recordedMealDays = days.length;

  // metric 1: average daily calories over the days that HAVE a meal record.
  const totalCalories = days.reduce((s, d) => s + d.calories, 0);
  const avgCalories = recordedMealDays > 0 ? round1(totalCalories / recordedMealDays) : 0;

  // metric 2: PFC balance as % of macro-derived kcal over the whole window.
  const totalP = days.reduce((s, d) => s + d.protein, 0);
  const totalF = days.reduce((s, d) => s + d.fat, 0);
  const totalC = days.reduce((s, d) => s + d.carbs, 0);
  const weekMacro = macroKcal(totalP, totalF, totalC);
  const proteinPct = weekMacro > 0 ? round1(((totalP * 4) / weekMacro) * 100) : 0;
  const fatPct = weekMacro > 0 ? round1(((totalF * 9) / weekMacro) * 100) : 0;
  const carbsPct = weekMacro > 0 ? round1(((totalC * 4) / weekMacro) * 100) : 0;

  // Average daily macro grams over recorded days (client derives the kcal split).
  const avgProteinG = recordedMealDays > 0 ? round1(totalP / recordedMealDays) : 0;
  const avgFatG = recordedMealDays > 0 ? round1(totalF / recordedMealDays) : 0;
  const avgCarbsG = recordedMealDays > 0 ? round1(totalC / recordedMealDays) : 0;

  // metric 3: days whose total protein reached the floor.
  const proteinFloorDays = days.filter((d) => d.protein >= targets.proteinFloorPerDay).length;

  // metric 4: days whose fat share (of that day's macro-kcal) exceeded the band.
  const highFatDays = days.filter((d) => {
    const dm = macroKcal(d.protein, d.fat, d.carbs);
    return dm > 0 && ((d.fat * 9) / dm) * 100 > targets.fatPct;
  }).length;

  // ---- weight (metrics 5 & 6) ----
  const wDaily = dailyWeightSeries(weights); // ascending, one weight per JST day
  const recordedWeightDays = wDaily.filter((p) => p.date >= startDate && p.date <= endDate).length;

  // Moving average over the wider series, then restrict to the window for the
  // direction: MA at the last in-window day minus MA at the first in-window day.
  const maInWindow = movingAverageSeries(wDaily, targets.weightMaWindow).filter(
    (p) => p.date >= startDate && p.date <= endDate
  );
  let weightDirection: WeeklyMealSummaryResult['weightDirection'] = 'none';
  let weightDeltaKg = 0;
  if (maInWindow.length >= 2) {
    weightDeltaKg = round1(maInWindow[maInWindow.length - 1]!.movingAvg - maInWindow[0]!.movingAvg);
    weightDirection = Math.abs(weightDeltaKg) < 0.1 ? 'flat' : weightDeltaKg < 0 ? 'down' : 'up';
  }

  // ---- exercise (metric 7) ----
  // Bucket by JST calendar day (same as meals) so bare-UTC "Z" rows count on the
  // right day; exerciseDays = distinct active days, exerciseSessions = total rows.
  const exerciseDaySet = new Set<string>();
  let exerciseSessions = 0;
  for (const e of exercises) {
    const date = extractJstDate(e.recordedAt);
    if (date < startDate || date > endDate) continue;
    exerciseDaySet.add(date);
    exerciseSessions += 1;
  }
  const exerciseDays = exerciseDaySet.size;

  return {
    startDate,
    endDate,
    windowDays: targets.windowDays,
    recordedMealDays,
    recordedWeightDays,
    avgCalories,
    proteinPct,
    fatPct,
    carbsPct,
    avgProteinG,
    avgFatG,
    avgCarbsG,
    proteinFloorDays,
    highFatDays,
    weightDirection,
    weightDeltaKg,
    exerciseDays,
    exerciseSessions,
    targets: {
      dailyCalorieLimit: targets.dailyCalorieLimit,
      proteinPct: targets.proteinPct,
      fatPct: targets.fatPct,
      carbsPct: targets.carbsPct,
      proteinFloorPerDay: targets.proteinFloorPerDay,
      highFatDaysLimit: targets.highFatDaysLimit,
      exerciseDaysTarget: targets.exerciseDaysTarget,
    },
  };
}
