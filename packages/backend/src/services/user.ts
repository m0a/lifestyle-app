import { eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { users, weights, meals, exercises } from '../db/schema';

interface ExportData {
  user: {
    id: string;
    email: string;
    createdAt: string;
  };
  weights: Array<{
    id: string;
    weight: number;
    recordedAt: string;
    createdAt: string;
  }>;
  meals: Array<{
    id: string;
    mealType: string;
    content: string;
    calories: number | null;
    recordedAt: string;
    createdAt: string;
  }>;
  exercises: Array<{
    id: string;
    exerciseType: string;
    muscleGroup: string | null;
    setNumber: number;
    reps: number;
    weight: number | null;
    recordedAt: string;
    createdAt: string;
  }>;
  exportedAt: string;
}

export class UserService {
  constructor(private db: DrizzleD1Database) {}

  async getProfile(userId: string) {
    const user = await this.db
      .select({
        id: users.id,
        email: users.email,
        goalWeight: users.goalWeight,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .get();

    return user;
  }

  async exportData(userId: string): Promise<ExportData> {
    // Get user profile
    const user = await this.db
      .select({
        id: users.id,
        email: users.email,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .get();

    if (!user) {
      throw new Error('User not found');
    }

    // Get all weight records
    const weightRecords = await this.db
      .select({
        id: weights.id,
        weight: weights.weight,
        recordedAt: weights.recordedAt,
        createdAt: weights.createdAt,
      })
      .from(weights)
      .where(eq(weights.userId, userId))
      .all();

    // Get all meal records
    const mealRecords = await this.db
      .select({
        id: meals.id,
        mealType: meals.mealType,
        content: meals.content,
        calories: meals.calories,
        recordedAt: meals.recordedAt,
        createdAt: meals.createdAt,
      })
      .from(meals)
      .where(eq(meals.userId, userId))
      .all();

    // Get all exercise records
    const exerciseRecords = await this.db
      .select({
        id: exercises.id,
        exerciseType: exercises.exerciseType,
        muscleGroup: exercises.muscleGroup,
        setNumber: exercises.setNumber,
        reps: exercises.reps,
        weight: exercises.weight,
        recordedAt: exercises.recordedAt,
        createdAt: exercises.createdAt,
      })
      .from(exercises)
      .where(eq(exercises.userId, userId))
      .all();

    return {
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      },
      weights: weightRecords,
      meals: mealRecords,
      exercises: exerciseRecords,
      exportedAt: new Date().toISOString(),
    };
  }

  async exportDataAsCSV(userId: string): Promise<string> {
    const data = await this.exportData(userId);
    const lines: string[] = [];

    // Header
    lines.push('# Health Tracker Data Export');
    lines.push(`# User: ${data.user.email}`);
    lines.push(`# Exported: ${data.exportedAt}`);
    lines.push('');

    // Weight records
    lines.push('## Weight Records');
    lines.push('date,weight_kg');
    for (const record of data.weights) {
      lines.push(`${record.recordedAt},${record.weight}`);
    }
    lines.push('');

    // Meal records
    lines.push('## Meal Records');
    lines.push('date,meal_type,content,calories');
    for (const record of data.meals) {
      const content = record.content.replace(/"/g, '""');
      lines.push(
        `${record.recordedAt},${record.mealType},"${content}",${record.calories ?? ''}`
      );
    }
    lines.push('');

    // Exercise records
    lines.push('## Exercise Records');
    lines.push('date,exercise_type,muscle_group,set_number,reps,weight_kg');
    for (const record of data.exercises) {
      lines.push(`${record.recordedAt},${record.exerciseType},${record.muscleGroup ?? ''},${record.setNumber},${record.reps},${record.weight ?? ''}`);
    }

    return lines.join('\n');
  }

  async deleteAccount(userId: string): Promise<void> {
    // Delete all user data in order (due to foreign key constraints)
    await this.db.delete(weights).where(eq(weights.userId, userId));
    await this.db.delete(meals).where(eq(meals.userId, userId));
    await this.db.delete(exercises).where(eq(exercises.userId, userId));

    // Finally delete the user
    await this.db.delete(users).where(eq(users.id, userId));
  }

  async getStats(userId: string) {
    const weightCount = await this.db
      .select()
      .from(weights)
      .where(eq(weights.userId, userId))
      .all();

    const mealCount = await this.db
      .select()
      .from(meals)
      .where(eq(meals.userId, userId))
      .all();

    const exerciseCount = await this.db
      .select()
      .from(exercises)
      .where(eq(exercises.userId, userId))
      .all();

    return {
      weightRecords: weightCount.length,
      mealRecords: mealCount.length,
      exerciseRecords: exerciseCount.length,
      totalRecords: weightCount.length + mealCount.length + exerciseCount.length,
    };
  }
}
