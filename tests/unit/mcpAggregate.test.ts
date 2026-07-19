import { describe, it, expect } from 'vitest';
import {
  rankProteinSources,
  proteinGap,
  dailyWeightSeries,
  movingAverageSeries,
  weeklyWeightAverages,
  nutritionTrend,
  exerciseBreakdown,
  type FoodItemRow,
  type MealRow,
  type WeightRow,
  type ExerciseRow,
} from '../../packages/backend/src/lib/mcpAggregate';

const foodItem = (over: Partial<FoodItemRow>): FoodItemRow => ({
  mealType: 'lunch',
  recordedAt: '2026-07-17T12:00:00+09:00',
  name: 'x',
  calories: 100,
  protein: 10,
  fat: 5,
  carbs: 20,
  ...over,
});

const meal = (over: Partial<MealRow>): MealRow => ({
  mealType: 'lunch',
  recordedAt: '2026-07-17T12:00:00+09:00',
  calories: 500,
  totalProtein: 20,
  totalFat: 15,
  totalCarbs: 60,
  ...over,
});

describe('rankProteinSources', () => {
  it('aggregates by name and ranks by total protein desc', () => {
    const items = [
      foodItem({ name: '蒸し鶏', protein: 25, calories: 200 }),
      foodItem({ name: '蒸し鶏', protein: 25, calories: 200 }),
      foodItem({ name: 'ゆで卵', protein: 6, calories: 70 }),
    ];
    const ranked = rankProteinSources(items, 10);
    expect(ranked).toHaveLength(2);
    expect(ranked[0]).toMatchObject({ name: '蒸し鶏', count: 2, totalProtein: 50, avgProtein: 25, totalCalories: 400 });
    expect(ranked[1]!.name).toBe('ゆで卵');
  });

  it('trims names, skips blank, and honors the top cap', () => {
    const items = [
      foodItem({ name: ' 鮭 ', protein: 22 }),
      foodItem({ name: '鮭', protein: 22 }),
      foodItem({ name: '   ', protein: 99 }),
      foodItem({ name: '豆腐', protein: 8 }),
    ];
    const ranked = rankProteinSources(items, 1);
    expect(ranked).toHaveLength(1);
    expect(ranked[0]).toMatchObject({ name: '鮭', count: 2, totalProtein: 44 });
  });
});

describe('proteinGap', () => {
  it('computes per-meal gap and met flag against the per-meal target', () => {
    const meals = [
      meal({ mealType: 'lunch', totalProtein: 25 }),
      meal({ mealType: 'dinner', totalProtein: 18 }),
    ];
    const { byMeal } = proteinGap(meals, 25);
    expect(byMeal[0]).toMatchObject({ mealType: 'lunch', protein: 25, gap: 0, met: true });
    expect(byMeal[1]).toMatchObject({ mealType: 'dinner', protein: 18, gap: -7, met: false });
  });

  it('treats null protein as 0 (an un-analyzed meal still missed the goal)', () => {
    const { byMeal, byDay } = proteinGap([meal({ totalProtein: null })], 25);
    expect(byMeal[0]).toMatchObject({ protein: 0, gap: -25, met: false });
    expect(byDay[0]).toMatchObject({ totalProtein: 0, dayTarget: 25, gap: -25, mealsMetTarget: 0 });
  });

  it('rolls up per day with dayTarget = target × meals that day', () => {
    const meals = [
      meal({ recordedAt: '2026-07-17T08:00:00+09:00', totalProtein: 30 }),
      meal({ recordedAt: '2026-07-17T19:00:00+09:00', totalProtein: 20 }),
      meal({ recordedAt: '2026-07-18T12:00:00+09:00', totalProtein: 25 }),
    ];
    const { byDay } = proteinGap(meals, 25);
    expect(byDay).toHaveLength(2);
    expect(byDay[0]).toMatchObject({ date: '2026-07-17', mealCount: 2, totalProtein: 50, dayTarget: 50, gap: 0, mealsMetTarget: 1 });
    expect(byDay[1]).toMatchObject({ date: '2026-07-18', mealCount: 1, dayTarget: 25, mealsMetTarget: 1 });
  });

  it('buckets a bare-UTC "Z" meal onto the correct JST day', () => {
    // 20:00Z on 07-16 => 05:00 JST on 07-17
    const { byDay } = proteinGap([meal({ recordedAt: '2026-07-16T20:00:00Z', totalProtein: 10 })], 25);
    expect(byDay[0]!.date).toBe('2026-07-17');
  });
});

describe('dailyWeightSeries', () => {
  it('keeps the latest weigh-in per day and sorts ascending', () => {
    // Input arrives newest-first (as WeightService.findByUserId returns it).
    const records: WeightRow[] = [
      { weight: 70.1, recordedAt: '2026-07-18T21:00:00+09:00' },
      { weight: 70.5, recordedAt: '2026-07-18T07:00:00+09:00' },
      { weight: 71.0, recordedAt: '2026-07-17T07:00:00+09:00' },
    ];
    const daily = dailyWeightSeries(records);
    expect(daily).toEqual([
      { date: '2026-07-17', weight: 71.0 },
      { date: '2026-07-18', weight: 70.1 },
    ]);
  });
});

describe('movingAverageSeries', () => {
  it('averages over the trailing calendar window, with partial leading windows', () => {
    const daily = [
      { date: '2026-07-01', weight: 70 },
      { date: '2026-07-02', weight: 72 },
      { date: '2026-07-03', weight: 71 },
    ];
    const ma = movingAverageSeries(daily, 3);
    expect(ma[0]!.movingAvg).toBeCloseTo(70); // only itself
    expect(ma[1]!.movingAvg).toBeCloseTo(71); // (70+72)/2
    expect(ma[2]!.movingAvg).toBeCloseTo(71); // (70+72+71)/3
  });

  it('counts the window in calendar days, so a gap shortens the sample', () => {
    // 07-01 then a 3-day gap to 07-05; with window=3 the 07-05 point only sees itself.
    const daily = [
      { date: '2026-07-01', weight: 70 },
      { date: '2026-07-05', weight: 74 },
    ];
    const ma = movingAverageSeries(daily, 3);
    expect(ma[1]!.movingAvg).toBeCloseTo(74);
  });
});

describe('weeklyWeightAverages', () => {
  it('averages within Sun–Sat weeks', () => {
    // 2026-07-13 is a Monday; its week starts Sun 2026-07-12.
    const daily = [
      { date: '2026-07-13', weight: 70 },
      { date: '2026-07-15', weight: 72 },
    ];
    const weekly = weeklyWeightAverages(daily);
    expect(weekly).toHaveLength(1);
    expect(weekly[0]).toMatchObject({ weekStart: '2026-07-12', avg: 71, count: 2 });
  });
});

describe('nutritionTrend', () => {
  it('buckets by month and counts distinct logged days', () => {
    const meals = [
      meal({ recordedAt: '2026-06-30T12:00:00+09:00', calories: 500, totalProtein: 20 }),
      meal({ recordedAt: '2026-07-01T12:00:00+09:00', calories: 600, totalProtein: 30 }),
      meal({ recordedAt: '2026-07-01T19:00:00+09:00', calories: 400, totalProtein: 10 }),
    ];
    const buckets = nutritionTrend(meals, 'month');
    expect(buckets.map((b) => b.label)).toEqual(['2026-06', '2026-07']);
    expect(buckets[1]).toMatchObject({ label: '2026-07', days: 1, meals: 2, totalCalories: 1000, totalProtein: 40, avgCalories: 1000 });
  });

  it('buckets by week using the Sun-start label', () => {
    const buckets = nutritionTrend([meal({ recordedAt: '2026-07-13T12:00:00+09:00' })], 'week');
    expect(buckets[0]!.label).toBe('2026-07-12');
  });
});

describe('exerciseBreakdown', () => {
  const ex = (over: Partial<ExerciseRow>): ExerciseRow => ({
    exerciseType: 'ベンチプレス',
    muscleGroup: 'chest',
    reps: 10,
    weight: 60,
    recordedAt: '2026-07-17T20:00:00+09:00',
    ...over,
  });

  it('groups by muscle with volume = Σ reps×weight, sorted by sets desc', () => {
    const records = [
      ex({ muscleGroup: 'chest', reps: 10, weight: 60 }),
      ex({ muscleGroup: 'chest', reps: 8, weight: 60 }),
      ex({ muscleGroup: 'legs', reps: 12, weight: 100 }),
    ];
    const groups = exerciseBreakdown(records, 'muscle');
    expect(groups[0]).toMatchObject({ key: 'chest', sets: 2, reps: 18, volume: 10 * 60 + 8 * 60 });
    expect(groups[1]).toMatchObject({ key: 'legs', sets: 1, volume: 1200 });
  });

  it('bodyweight sets (null weight) add reps but no volume; null muscle → other', () => {
    const groups = exerciseBreakdown([ex({ muscleGroup: null, weight: null, reps: 15 })], 'muscle');
    expect(groups[0]).toMatchObject({ key: 'other', sets: 1, reps: 15, volume: 0 });
  });
});
