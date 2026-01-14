import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { weights, meals, exercises } from '../db/schema';
import type { Database } from '../db';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface WeightSummary {
  startWeight: number | null;
  endWeight: number | null;
  change: number | null;
  minWeight: number | null;
  maxWeight: number | null;
  recordCount: number;
}

interface MealSummary {
  totalCalories: number;
  mealCount: number;
  averageCalories: number;
  byType: Record<string, number>;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
}

interface ExerciseSummary {
  totalSets: number;
  totalReps: number;
  sessionCount: number;
  byType: Record<string, { sets: number; reps: number }>;
}

// Record types for summary calculations
interface WeightRecord {
  weight: number;
}

interface MealRecord {
  mealType: string;
  calories: number | null;
  totalProtein: number | null;
  totalFat: number | null;
  totalCarbs: number | null;
}

interface ExerciseRecord {
  exerciseType: string;
  setNumber: number;
  reps: number;
}

interface DashboardSummary {
  weight: WeightSummary;
  meals: MealSummary;
  exercises: ExerciseSummary;
  period: {
    startDate: string;
    endDate: string;
  };
}

interface WeeklyTrendItem {
  weekStart: string;
  weekEnd: string;
  weight: number | null;
  totalCalories: number;
  exerciseSets: number;
}

interface GoalProgress {
  weight: {
    current: number | null;
    target: number;
    progress: number;
    remaining: number | null;
  };
  exercise: {
    currentSets: number;
    targetSets: number;
    progress: number;
  };
  calories: {
    average: number;
    target: number;
    difference: number;
  };
}

interface DailyActivity {
  date: string;
  hasMeal: boolean;
  hasWeight: boolean;
  hasExercise: boolean;
  level: number;
}

interface DailyActivityResponse {
  activities: DailyActivity[];
  startDate: string;
  endDate: string;
}

export class DashboardService {
  constructor(private db: Database) {}

  async getSummary(userId: string, options: DateRange): Promise<DashboardSummary> {
    const { startDate, endDate } = options;
    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();

    // Get weight data for the period
    const weightRecords = await this.db
      .select()
      .from(weights)
      .where(
        and(
          eq(weights.userId, userId),
          gte(weights.recordedAt, startISO),
          lte(weights.recordedAt, endISO)
        )
      )
      .orderBy(weights.recordedAt)
      .all();

    // Get meal data for the period
    const mealRecords = await this.db
      .select()
      .from(meals)
      .where(
        and(
          eq(meals.userId, userId),
          gte(meals.recordedAt, startISO),
          lte(meals.recordedAt, endISO)
        )
      )
      .all();

    // Get exercise data for the period
    const exerciseRecords = await this.db
      .select()
      .from(exercises)
      .where(
        and(
          eq(exercises.userId, userId),
          gte(exercises.recordedAt, startISO),
          lte(exercises.recordedAt, endISO)
        )
      )
      .all();

    // Calculate weight summary
    const weightSummary = this.calculateWeightSummary(weightRecords);

    // Calculate meal summary
    const mealSummary = this.calculateMealSummary(mealRecords);

    // Calculate exercise summary
    const exerciseSummary = this.calculateExerciseSummary(exerciseRecords);

    return {
      weight: weightSummary,
      meals: mealSummary,
      exercises: exerciseSummary,
      period: {
        startDate: startISO,
        endDate: endISO,
      },
    };
  }

  private calculateWeightSummary(records: WeightRecord[]): WeightSummary {
    if (records.length === 0) {
      return {
        startWeight: null,
        endWeight: null,
        change: null,
        minWeight: null,
        maxWeight: null,
        recordCount: 0,
      };
    }

    const weightValues = records.map((r) => r.weight);
    const startWeight = records[0]?.weight ?? 0;
    const endWeight = records[records.length - 1]?.weight ?? 0;

    return {
      startWeight,
      endWeight,
      change: endWeight - startWeight,
      minWeight: Math.min(...weightValues),
      maxWeight: Math.max(...weightValues),
      recordCount: records.length,
    };
  }

  private calculateMealSummary(records: MealRecord[]): MealSummary {
    if (records.length === 0) {
      return {
        totalCalories: 0,
        mealCount: 0,
        averageCalories: 0,
        byType: {},
        totalProtein: 0,
        totalFat: 0,
        totalCarbs: 0,
      };
    }

    const caloriesWithValue = records.filter((r) => r.calories != null);
    const totalCalories = caloriesWithValue.reduce((sum, r) => sum + (r.calories ?? 0), 0);

    // Calculate nutrient totals (null values are treated as 0)
    const totalProtein = records.reduce((sum, r) => sum + (r.totalProtein ?? 0), 0);
    const totalFat = records.reduce((sum, r) => sum + (r.totalFat ?? 0), 0);
    const totalCarbs = records.reduce((sum, r) => sum + (r.totalCarbs ?? 0), 0);

    // Group by meal type
    const byType: Record<string, number> = {};
    for (const record of records) {
      const type = record.mealType;
      if (!byType[type]) {
        byType[type] = 0;
      }
      byType[type]++;
    }

    return {
      totalCalories,
      mealCount: records.length,
      averageCalories: caloriesWithValue.length > 0 ? totalCalories / caloriesWithValue.length : 0,
      byType,
      totalProtein,
      totalFat,
      totalCarbs,
    };
  }

  private calculateExerciseSummary(records: ExerciseRecord[]): ExerciseSummary {
    if (records.length === 0) {
      return {
        totalSets: 0,
        totalReps: 0,
        sessionCount: 0,
        byType: {},
      };
    }

    // Each record is now 1 set
    const totalSets = records.length;
    const totalReps = records.reduce((sum, r) => sum + r.reps, 0);

    // Group by exercise type
    const byType: Record<string, { sets: number; reps: number }> = {};
    for (const record of records) {
      const type = record.exerciseType;
      if (!byType[type]) {
        byType[type] = { sets: 0, reps: 0 };
      }
      byType[type]!.sets += 1;
      byType[type]!.reps += record.reps;
    }

    return {
      totalSets,
      totalReps,
      sessionCount: records.length,
      byType,
    };
  }

  async getWeeklyTrend(userId: string, weeks: number = 4): Promise<WeeklyTrendItem[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - weeks * 7);

    const result: WeeklyTrendItem[] = [];

    for (let i = 0; i < weeks; i++) {
      const weekEnd = new Date(endDate);
      weekEnd.setDate(weekEnd.getDate() - i * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);

      // Get latest weight for this week
      const weekWeights = await this.db
        .select()
        .from(weights)
        .where(
          and(
            eq(weights.userId, userId),
            gte(weights.recordedAt, weekStart.toISOString()),
            lte(weights.recordedAt, weekEnd.toISOString())
          )
        )
        .orderBy(desc(weights.recordedAt))
        .limit(1)
        .all();

      // Get total calories for this week
      const weekMeals = await this.db
        .select()
        .from(meals)
        .where(
          and(
            eq(meals.userId, userId),
            gte(meals.recordedAt, weekStart.toISOString()),
            lte(meals.recordedAt, weekEnd.toISOString())
          )
        )
        .all();

      // Get total exercise minutes for this week
      const weekExercises = await this.db
        .select()
        .from(exercises)
        .where(
          and(
            eq(exercises.userId, userId),
            gte(exercises.recordedAt, weekStart.toISOString()),
            lte(exercises.recordedAt, weekEnd.toISOString())
          )
        )
        .all();

      const totalCalories = weekMeals
        .filter((m) => m.calories != null)
        .reduce((sum, m) => sum + (m.calories || 0), 0);

      // Each record is 1 set
      const exerciseSets = weekExercises.length;

      result.unshift({
        weekStart: weekStart.toISOString().split('T')[0] ?? '',
        weekEnd: weekEnd.toISOString().split('T')[0] ?? '',
        weight: weekWeights.length > 0 ? weekWeights[0]?.weight ?? null : null,
        totalCalories,
        exerciseSets,
      });
    }

    return result;
  }

  async getGoalProgress(
    userId: string,
    goals: {
      targetWeight?: number;
      weeklyExerciseMinutes?: number;
      dailyCalories?: number;
    }
  ): Promise<GoalProgress> {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);

    // Get latest weight
    const latestWeight = await this.db
      .select()
      .from(weights)
      .where(eq(weights.userId, userId))
      .orderBy(desc(weights.recordedAt))
      .limit(1)
      .all();

    // Get weekly exercise total
    const weeklyExercises = await this.db
      .select()
      .from(exercises)
      .where(
        and(
          eq(exercises.userId, userId),
          gte(exercises.recordedAt, weekStart.toISOString())
        )
      )
      .all();

    // Get weekly meal average
    const weeklyMeals = await this.db
      .select()
      .from(meals)
      .where(
        and(
          eq(meals.userId, userId),
          gte(meals.recordedAt, weekStart.toISOString())
        )
      )
      .all();

    const currentWeight = latestWeight.length > 0 ? latestWeight[0]?.weight ?? null : null;
    const targetWeight = goals.targetWeight || 65;
    // Each record is 1 set
    const weeklyExerciseSets = weeklyExercises.length;
    const targetExerciseSets = 30; // Default weekly target: 30 sets

    const mealsWithCalories = weeklyMeals.filter((m) => m.calories != null);
    const totalCalories = mealsWithCalories.reduce((sum, m) => sum + (m.calories || 0), 0);
    const daysWithMeals = new Set(
      weeklyMeals.map((m) => new Date(m.recordedAt).toDateString())
    ).size;
    const averageCalories = daysWithMeals > 0 ? totalCalories / daysWithMeals : 0;
    const targetCalories = goals.dailyCalories || 2000;

    return {
      weight: {
        current: currentWeight,
        target: targetWeight,
        progress:
          currentWeight !== null
            ? Math.max(0, 100 - ((currentWeight - targetWeight) / targetWeight) * 100)
            : 0,
        remaining: currentWeight !== null ? currentWeight - targetWeight : null,
      },
      exercise: {
        currentSets: weeklyExerciseSets,
        targetSets: targetExerciseSets,
        progress: Math.min(100, (weeklyExerciseSets / targetExerciseSets) * 100),
      },
      calories: {
        average: Math.round(averageCalories),
        target: targetCalories,
        difference: Math.round(averageCalories - targetCalories),
      },
    };
  }

  /**
   * Get daily activity data for the specified number of days.
   * Returns an array of daily activities with hasMeal, hasWeight, hasExercise flags.
   * Level is calculated as the sum of flags (0-3).
   */
  async getDailyActivity(userId: string, days: number = 800): Promise<DailyActivityResponse> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));

    // Format dates as YYYY-MM-DD
    const formatDate = (d: Date) => d.toISOString().split('T')[0]!;
    const startDateStr = formatDate(startDate);
    const endDateStr = formatDate(endDate);

    // Generate all dates in range
    const allDates: string[] = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      allDates.push(formatDate(current));
      current.setDate(current.getDate() + 1);
    }

    // Get dates with weight records
    const weightRecords = await this.db
      .select({ recordedAt: weights.recordedAt })
      .from(weights)
      .where(
        and(
          eq(weights.userId, userId),
          gte(weights.recordedAt, startDate.toISOString()),
          lte(weights.recordedAt, endDate.toISOString())
        )
      )
      .all();

    const weightDates = new Set(
      weightRecords.map((r) => r.recordedAt.split('T')[0])
    );

    // Get dates with meal records
    const mealRecords = await this.db
      .select({ recordedAt: meals.recordedAt })
      .from(meals)
      .where(
        and(
          eq(meals.userId, userId),
          gte(meals.recordedAt, startDate.toISOString()),
          lte(meals.recordedAt, endDate.toISOString())
        )
      )
      .all();

    const mealDates = new Set(
      mealRecords.map((r) => r.recordedAt.split('T')[0])
    );

    // Get dates with exercise records
    const exerciseRecords = await this.db
      .select({ recordedAt: exercises.recordedAt })
      .from(exercises)
      .where(
        and(
          eq(exercises.userId, userId),
          gte(exercises.recordedAt, startDate.toISOString()),
          lte(exercises.recordedAt, endDate.toISOString())
        )
      )
      .all();

    const exerciseDates = new Set(
      exerciseRecords.map((r) => r.recordedAt.split('T')[0])
    );

    // Build activities array
    const activities: DailyActivity[] = allDates.map((date) => {
      const hasMeal = mealDates.has(date);
      const hasWeight = weightDates.has(date);
      const hasExercise = exerciseDates.has(date);
      const level = (hasMeal ? 1 : 0) + (hasWeight ? 1 : 0) + (hasExercise ? 1 : 0);

      return {
        date,
        hasMeal,
        hasWeight,
        hasExercise,
        level,
      };
    });

    return {
      activities,
      startDate: startDateStr,
      endDate: endDateStr,
    };
  }
}
