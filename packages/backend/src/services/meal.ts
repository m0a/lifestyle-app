import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import type { Database } from '../db';
import { schema } from '../db';
import { AppError } from '../middleware/error';
import type { CreateMealInput, UpdateMealInput, MealType } from '@lifestyle-app/shared';

export class MealService {
  constructor(private db: Database) {}

  async create(userId: string, input: CreateMealInput) {
    const now = new Date().toISOString();
    const id = uuidv4();

    await this.db.insert(schema.mealRecords).values({
      id,
      userId,
      mealType: input.mealType,
      content: input.content,
      calories: input.calories ?? null,
      recordedAt: input.recordedAt,
      createdAt: now,
      updatedAt: now,
    });

    return {
      id,
      userId,
      mealType: input.mealType,
      content: input.content,
      calories: input.calories ?? null,
      recordedAt: input.recordedAt,
      createdAt: now,
      updatedAt: now,
    };
  }

  async findById(id: string, userId: string) {
    const record = await this.db
      .select()
      .from(schema.mealRecords)
      .where(eq(schema.mealRecords.id, id))
      .get();

    if (!record) {
      throw new AppError('食事記録が見つかりません', 404, 'MEAL_NOT_FOUND');
    }

    if (record.userId !== userId) {
      throw new AppError('この記録にアクセスする権限がありません', 403, 'FORBIDDEN');
    }

    return record;
  }

  async findByUserId(
    userId: string,
    options?: { startDate?: string; endDate?: string; mealType?: MealType; limit?: number }
  ) {
    const records = await this.db
      .select()
      .from(schema.mealRecords)
      .where(eq(schema.mealRecords.userId, userId))
      .orderBy(desc(schema.mealRecords.recordedAt))
      .all();

    let filtered = records;

    if (options?.startDate) {
      filtered = filtered.filter((r) => r.recordedAt >= options.startDate!);
    }

    if (options?.endDate) {
      filtered = filtered.filter((r) => r.recordedAt <= options.endDate!);
    }

    if (options?.mealType) {
      filtered = filtered.filter((r) => r.mealType === options.mealType);
    }

    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  async getCalorieSummary(
    userId: string,
    options?: { startDate?: string; endDate?: string }
  ) {
    const meals = await this.findByUserId(userId, options);

    const mealsWithCalories = meals.filter((m) => m.calories !== null);
    const totalCalories = mealsWithCalories.reduce((sum, m) => sum + (m.calories ?? 0), 0);
    const count = mealsWithCalories.length;
    const averageCalories = count > 0 ? Math.round(totalCalories / count) : 0;

    // Calculate nutrient totals (null values are treated as 0)
    const totalProtein = meals.reduce((sum, m) => sum + (m.totalProtein ?? 0), 0);
    const totalFat = meals.reduce((sum, m) => sum + (m.totalFat ?? 0), 0);
    const totalCarbs = meals.reduce((sum, m) => sum + (m.totalCarbs ?? 0), 0);

    return {
      totalCalories,
      averageCalories,
      count,
      totalMeals: meals.length,
      totalProtein,
      totalFat,
      totalCarbs,
    };
  }

  async update(id: string, userId: string, input: UpdateMealInput) {
    await this.findById(id, userId);

    const now = new Date().toISOString();

    const updateData: Record<string, unknown> = {
      updatedAt: now,
    };

    if (input.mealType !== undefined) {
      updateData.mealType = input.mealType;
    }

    if (input.content !== undefined) {
      updateData.content = input.content;
    }

    if (input.calories !== undefined) {
      updateData.calories = input.calories;
    }

    if (input.recordedAt !== undefined) {
      updateData.recordedAt = input.recordedAt;
    }

    await this.db
      .update(schema.mealRecords)
      .set(updateData)
      .where(eq(schema.mealRecords.id, id));

    return this.findById(id, userId);
  }

  async delete(id: string, userId: string) {
    await this.findById(id, userId);

    await this.db.delete(schema.mealRecords).where(eq(schema.mealRecords.id, id));
  }

  async getTodaysSummary(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = today.toISOString();

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const endDate = tomorrow.toISOString();

    return this.getCalorieSummary(userId, { startDate, endDate });
  }
}
