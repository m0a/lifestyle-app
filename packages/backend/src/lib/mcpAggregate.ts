/**
 * Pure aggregation helpers for the coaching-oriented MCP tools.
 *
 * These take rows straight from the service layer and fold them into the
 * compact, LLM-friendly shapes the MCP tools expose (protein-source ranking,
 * protein gap vs target, weight moving average, period nutrition, exercise by
 * muscle group). Kept side-effect-free and DB-free so they can be unit-tested
 * in isolation. All date bucketing goes through extractJstDate so the legacy
 * bare-UTC "Z" rows (pre-#159) land on the correct JST day, matching the
 * display normalization in the MCP tools themselves.
 */
import { extractJstDate, getWeekDateRange } from './localDate';

// ---- Input row shapes (subsets of the service-layer returns) ----

export interface FoodItemRow {
  mealType: string;
  recordedAt: string;
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface MealRow {
  mealType: string;
  recordedAt: string;
  calories: number | null;
  totalProtein: number | null;
  totalFat: number | null;
  totalCarbs: number | null;
}

export interface WeightRow {
  weight: number;
  recordedAt: string;
}

export interface ExerciseRow {
  exerciseType: string;
  muscleGroup: string | null;
  reps: number;
  weight: number | null;
  recordedAt: string;
}

// ---- Protein-source ranking (request ①) ----

export interface ProteinSource {
  name: string;
  count: number;
  totalProtein: number;
  avgProtein: number;
  totalCalories: number;
}

/**
 * Rank food items by the total protein they contributed over the period,
 * aggregating by (case-insensitive, trimmed) name so "蒸し鶏" logged five times
 * collapses into one ranked row. `top` caps the returned rows.
 */
export function rankProteinSources(items: FoodItemRow[], top: number): ProteinSource[] {
  const byName = new Map<string, ProteinSource>();
  for (const item of items) {
    const key = item.name.trim();
    if (key === '') continue;
    const existing = byName.get(key);
    if (existing) {
      existing.count += 1;
      existing.totalProtein += item.protein;
      existing.totalCalories += item.calories;
    } else {
      byName.set(key, {
        name: key,
        count: 1,
        totalProtein: item.protein,
        avgProtein: 0,
        totalCalories: item.calories,
      });
    }
  }
  const ranked = [...byName.values()].map((s) => ({
    ...s,
    avgProtein: s.totalProtein / s.count,
  }));
  ranked.sort((a, b) => b.totalProtein - a.totalProtein);
  return ranked.slice(0, top);
}

// ---- Protein gap vs target (request ②) ----

export interface MealProteinGap {
  date: string;
  mealType: string;
  protein: number;
  gap: number;
  met: boolean;
}

export interface DayProteinGap {
  date: string;
  mealCount: number;
  totalProtein: number;
  dayTarget: number;
  gap: number;
  mealsMetTarget: number;
}

/**
 * Compare each meal's protein against a per-meal `target` (grams). Meals with no
 * analyzed protein (totalProtein null) are treated as 0 — an un-analyzed meal is
 * still a meal that fell short of the protein goal, which is the signal the user
 * cares about. Returns per-meal gaps plus a per-day rollup whose daily target is
 * target × (meals that day), so the day gap is the summed per-meal shortfall.
 */
export function proteinGap(
  meals: MealRow[],
  target: number
): { byMeal: MealProteinGap[]; byDay: DayProteinGap[] } {
  const byMeal: MealProteinGap[] = meals.map((m) => {
    const protein = m.totalProtein ?? 0;
    return {
      date: extractJstDate(m.recordedAt),
      mealType: m.mealType,
      protein,
      gap: protein - target,
      met: protein >= target,
    };
  });

  const dayMap = new Map<string, DayProteinGap>();
  for (const meal of byMeal) {
    const day = dayMap.get(meal.date) ?? {
      date: meal.date,
      mealCount: 0,
      totalProtein: 0,
      dayTarget: 0,
      gap: 0,
      mealsMetTarget: 0,
    };
    day.mealCount += 1;
    day.totalProtein += meal.protein;
    day.dayTarget += target;
    day.gap += meal.gap;
    if (meal.met) day.mealsMetTarget += 1;
    dayMap.set(meal.date, day);
  }
  const byDay = [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date));

  return { byMeal, byDay };
}

// ---- Weight moving average (request ③) ----

export interface DailyWeight {
  date: string;
  weight: number;
}

export interface MovingAveragePoint {
  date: string;
  weight: number;
  movingAvg: number;
}

/**
 * Collapse raw weight records to one value per JST calendar day, ascending by
 * date. When a day has several weigh-ins we keep the LATEST one (records arrive
 * newest-first from WeightService.findByUserId, so the first seen per day wins);
 * this matches how the app's weekly trend picks "the latest weight in the week".
 */
export function dailyWeightSeries(records: WeightRow[]): DailyWeight[] {
  const seen = new Map<string, number>();
  for (const r of records) {
    const date = extractJstDate(r.recordedAt);
    if (!seen.has(date)) seen.set(date, r.weight); // newest-first ⇒ first = latest
  }
  return [...seen.entries()]
    .map(([date, weight]) => ({ date, weight }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Trailing simple moving average over a daily weight series (ascending by date).
 *
 * The daily series is already deduped to one weight per calendar day. For each
 * day the moving average is the mean of the weigh-ins whose date falls in the
 * `window`-day calendar span ending on that day (inclusive) — this is the
 * "keystone" smoothing that cancels day-to-day ±1kg noise so a real trend is
 * visible. Design choices, all tunable via `window`:
 *   - the window is counted in CALENDAR days, not data points, so a missed
 *     weigh-in shortens the sample rather than reaching further back in time;
 *   - a short leading window (fewer than `window` days of history) averages
 *     whatever days exist, so the series starts smoothing immediately.
 */
export function movingAverageSeries(
  daily: DailyWeight[],
  window: number
): MovingAveragePoint[] {
  const DAY_MS = 24 * 60 * 60 * 1000;
  return daily.map((point, i) => {
    const cutoffMs = Date.parse(`${point.date}T00:00:00Z`) - (window - 1) * DAY_MS;
    let sum = 0;
    let count = 0;
    // daily is ascending, so scan backwards from i and stop once we fall out of
    // the calendar window.
    for (let j = i; j >= 0; j--) {
      if (Date.parse(`${daily[j]!.date}T00:00:00Z`) < cutoffMs) break;
      sum += daily[j]!.weight;
      count += 1;
    }
    return { date: point.date, weight: point.weight, movingAvg: sum / count };
  });
}

export interface WeeklyWeightAverage {
  weekStart: string;
  weekEnd: string;
  avg: number;
  count: number;
}

/**
 * Calendar-week (Sun–Sat) averages of the daily weight series. Complements the
 * moving average with a coarser, fixed-bucket view of the same smoothing intent.
 */
export function weeklyWeightAverages(daily: DailyWeight[]): WeeklyWeightAverage[] {
  const buckets = new Map<string, { weekStart: string; weekEnd: string; sum: number; count: number }>();
  for (const d of daily) {
    const { startDate, endDate } = getWeekDateRange(d.date);
    const bucket = buckets.get(startDate) ?? { weekStart: startDate, weekEnd: endDate, sum: 0, count: 0 };
    bucket.sum += d.weight;
    bucket.count += 1;
    buckets.set(startDate, bucket);
  }
  return [...buckets.values()]
    .map((b) => ({ weekStart: b.weekStart, weekEnd: b.weekEnd, avg: b.sum / b.count, count: b.count }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

// ---- Period nutrition aggregation (request ④) ----

export type NutritionGrouping = 'week' | 'month';

export interface NutritionTotals {
  days: number;
  meals: number;
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
  avgCalories: number;
  avgProtein: number;
  avgFat: number;
  avgCarbs: number;
}

export interface NutritionBucket extends NutritionTotals {
  label: string;
}

/**
 * Sum calories/PFC over an already-selected set of meals.
 *
 * `days` counts distinct JST dates that carry a meal, so the per-day averages
 * divide by LOGGED days rather than the calendar length of the period — a week
 * with 3 logged days reports the average of those 3 days instead of a figure
 * diluted across 7. Nulls count as 0: an un-analyzed meal contributes nothing
 * but still marks the day as logged.
 *
 * Split out of nutritionTrend so callers that bucket meals themselves — the
 * dashboard's rolling 7-day weeks, which do not line up with calendar weeks —
 * reuse this arithmetic instead of re-summing PFC on their own.
 */
export function sumNutrition(meals: MealRow[]): NutritionTotals {
  const dates = new Set<string>();
  let cal = 0;
  let p = 0;
  let f = 0;
  let c = 0;
  for (const m of meals) {
    dates.add(extractJstDate(m.recordedAt));
    cal += m.calories ?? 0;
    p += m.totalProtein ?? 0;
    f += m.totalFat ?? 0;
    c += m.totalCarbs ?? 0;
  }
  const days = dates.size;
  const perDay = (total: number): number => (days > 0 ? total / days : 0);
  return {
    days,
    meals: meals.length,
    totalCalories: cal,
    totalProtein: p,
    totalFat: f,
    totalCarbs: c,
    avgCalories: perDay(cal),
    avgProtein: perDay(p),
    avgFat: perDay(f),
    avgCarbs: perDay(c),
  };
}

/**
 * Bucket meals into weeks (Sun–Sat start date as label) or calendar months
 * (YYYY-MM) and sum calories/PFC per bucket via sumNutrition.
 */
export function nutritionTrend(meals: MealRow[], groupBy: NutritionGrouping): NutritionBucket[] {
  const buckets = new Map<string, MealRow[]>();
  for (const m of meals) {
    const date = extractJstDate(m.recordedAt);
    const label = groupBy === 'week' ? getWeekDateRange(date).startDate : date.slice(0, 7);
    const group = buckets.get(label);
    if (group) group.push(m);
    else buckets.set(label, [m]);
  }
  return [...buckets.entries()]
    .map(([label, group]) => ({ label, ...sumNutrition(group) }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

// ---- Exercise breakdown (request ⑤) ----

export type ExerciseGrouping = 'muscle' | 'type';

export interface ExerciseGroup {
  key: string;
  sets: number;
  reps: number;
  volume: number;
}

/**
 * Group exercise records by muscle group or exercise type. Each record is one
 * set (matching ExerciseService.getSummary). `volume` is Σ(reps × weight) over
 * sets that carry a weight — bodyweight sets (weight null) contribute reps but
 * no volume.
 */
export function exerciseBreakdown(records: ExerciseRow[], groupBy: ExerciseGrouping): ExerciseGroup[] {
  const groups = new Map<string, ExerciseGroup>();
  for (const r of records) {
    const key = groupBy === 'muscle' ? r.muscleGroup ?? 'other' : r.exerciseType;
    const g = groups.get(key) ?? { key, sets: 0, reps: 0, volume: 0 };
    g.sets += 1;
    g.reps += r.reps;
    g.volume += r.weight != null ? r.reps * r.weight : 0;
    groups.set(key, g);
  }
  return [...groups.values()].sort((a, b) => b.sets - a.sets);
}
