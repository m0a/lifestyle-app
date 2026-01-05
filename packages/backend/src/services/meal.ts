import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { parseISO, startOfDay, endOfDay, startOfMonth, endOfMonth, addMinutes, format } from 'date-fns';
import type { Database } from '../db';
import { schema } from '../db';
import { AppError } from '../middleware/error';
import type { CreateMealInput, UpdateMealInput, MealType } from '@lifestyle-app/shared';

/**
 * タイムゾーンオフセット（分）からUTC日時をユーザーのローカル日時に変換
 * @param utcDate UTC日時
 * @param offsetMinutes タイムゾーンオフセット（分）。JST=-540
 */
function toLocalTime(utcDate: Date, offsetMinutes: number): Date {
  return addMinutes(utcDate, -offsetMinutes);
}

/**
 * ユーザーのローカル日時をUTCに変換
 * @param localDate ローカル日時
 * @param offsetMinutes タイムゾーンオフセット（分）。JST=-540
 */
function toUtcTime(localDate: Date, offsetMinutes: number): Date {
  return addMinutes(localDate, offsetMinutes);
}

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
    options?: { startDate?: string; endDate?: string; mealType?: MealType; limit?: number; timezoneOffset?: number }
  ) {
    const records = await this.db
      .select()
      .from(schema.mealRecords)
      .where(eq(schema.mealRecords.userId, userId))
      .orderBy(desc(schema.mealRecords.recordedAt))
      .all();

    let filtered = records;

    const offset = options?.timezoneOffset ?? 0;

    if (options?.startDate) {
      // ISO形式（'T'を含む）の場合はそのまま使用、YYYY-MM-DD形式の場合はタイムゾーン変換
      const isIsoFormat = options.startDate.includes('T');
      if (isIsoFormat) {
        filtered = filtered.filter((r) => r.recordedAt >= options.startDate!);
      } else {
        // ローカル日付の開始時刻をUTCに変換
        const localStart = startOfDay(parseISO(options.startDate));
        const utcStart = toUtcTime(localStart, offset).toISOString();
        filtered = filtered.filter((r) => r.recordedAt >= utcStart);
      }
    }

    if (options?.endDate) {
      const isIsoFormat = options.endDate.includes('T');
      if (isIsoFormat) {
        filtered = filtered.filter((r) => r.recordedAt <= options.endDate!);
      } else {
        // ローカル日付の終了時刻をUTCに変換
        const localEnd = endOfDay(parseISO(options.endDate));
        const utcEnd = toUtcTime(localEnd, offset).toISOString();
        filtered = filtered.filter((r) => r.recordedAt <= utcEnd);
      }
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
    const offset = timezoneOffset ?? 0;

    // ユーザーのローカル時間での「今日」を取得
    const userNow = toLocalTime(new Date(), offset);
    const userTodayStart = startOfDay(userNow);
    const userTodayEnd = endOfDay(userNow);

    // UTCに変換
    const startDate = toUtcTime(userTodayStart, offset).toISOString();
    const endDate = toUtcTime(userTodayEnd, offset).toISOString();

    return this.getCalorieSummary(userId, { startDate, endDate });
  }

  async getMealDates(
    userId: string,
    year: number,
    month: number,
    timezoneOffset?: number
  ): Promise<string[]> {
    const offset = timezoneOffset ?? 0;

    // ユーザーのローカル時間での月の開始・終了を計算
    const localMonthStart = startOfMonth(new Date(year, month - 1, 1));
    const localMonthEnd = endOfMonth(new Date(year, month - 1, 1));

    // UTCに変換
    const startDate = toUtcTime(localMonthStart, offset).toISOString();
    const endDate = toUtcTime(localMonthEnd, offset).toISOString();

    // 日付範囲内の食事を取得
    const meals = await this.findByUserId(userId, { startDate, endDate });

    // ユーザーのローカル日付でユニークな日付を抽出
    const dateSet = new Set<string>();
    for (const meal of meals) {
      const recordedAt = parseISO(meal.recordedAt);
      const localDate = toLocalTime(recordedAt, offset);
      const dateStr = format(localDate, 'yyyy-MM-dd');
      dateSet.add(dateStr);
    }

    return Array.from(dateSet).sort();
  }
}
