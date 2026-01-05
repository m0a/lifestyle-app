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
      // Append end-of-day time to include all records on the endDate
      const endDateTime = options.endDate + 'T23:59:59.999Z';
      filtered = filtered.filter((r) => r.recordedAt <= endDateTime);
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
      updateData['mealType'] = input.mealType;
    }

    if (input.content !== undefined) {
      updateData['content'] = input.content;
    }

    if (input.calories !== undefined) {
      updateData['calories'] = input.calories;
    }

    if (input.recordedAt !== undefined) {
      updateData['recordedAt'] = input.recordedAt;
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

  async getTodaysSummary(userId: string, timezoneOffset?: number) {
    // timezoneOffset: minutes offset from UTC (e.g., -540 for JST)
    // If not provided, defaults to UTC
    const offset = timezoneOffset ?? 0;

    // Get current time in user's timezone
    const now = new Date();
    const userNow = new Date(now.getTime() - offset * 60 * 1000);

    // Calculate start of today in user's timezone, then convert back to UTC
    const userToday = new Date(userNow);
    userToday.setUTCHours(0, 0, 0, 0);
    const startDate = new Date(userToday.getTime() + offset * 60 * 1000).toISOString();

    // Calculate start of tomorrow in user's timezone, then convert back to UTC
    const userTomorrow = new Date(userToday);
    userTomorrow.setUTCDate(userTomorrow.getUTCDate() + 1);
    const endDate = new Date(userTomorrow.getTime() + offset * 60 * 1000).toISOString();

    return this.getCalorieSummary(userId, { startDate, endDate });
  }

  async getMealDates(
    userId: string,
    year: number,
    month: number,
    timezoneOffset?: number
  ): Promise<string[]> {
    // timezoneOffset: minutes offset from UTC (e.g., -540 for JST)
    const offset = timezoneOffset ?? 0;

    // Calculate start of month in user's timezone
    const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
    const startDate = new Date(startOfMonth.getTime() + offset * 60 * 1000).toISOString();

    // Calculate start of next month in user's timezone
    const startOfNextMonth = new Date(Date.UTC(year, month, 1));
    const endDate = new Date(startOfNextMonth.getTime() + offset * 60 * 1000).toISOString();

    // Get all meals in the date range
    const meals = await this.findByUserId(userId, { startDate, endDate });

    // Extract unique dates (in user's local timezone)
    const dateSet = new Set<string>();
    for (const meal of meals) {
      // Convert recordedAt to user's local date
      const recordedAt = new Date(meal.recordedAt);
      const localDate = new Date(recordedAt.getTime() - offset * 60 * 1000);
      const dateStr = localDate.toISOString().split('T')[0] as string;
      dateSet.add(dateStr);
    }

    // Return sorted array of dates
    return Array.from(dateSet).sort();
  }
}
