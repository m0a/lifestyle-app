import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { parseISO, startOfDay, endOfDay, startOfMonth, endOfMonth, format } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import type { Database } from '../db';
import { schema } from '../db';
import { AppError } from '../middleware/error';
import type { CreateMealInput, UpdateMealInput, MealType } from '@lifestyle-app/shared';

const DEFAULT_TIMEZONE = 'UTC';

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
    options?: { startDate?: string; endDate?: string; mealType?: MealType; limit?: number; timezone?: string }
  ) {
    const records = await this.db
      .select()
      .from(schema.mealRecords)
      .where(eq(schema.mealRecords.userId, userId))
      .orderBy(desc(schema.mealRecords.recordedAt))
      .all();

    let filtered = records;

    const tz = options?.timezone ?? DEFAULT_TIMEZONE;

    if (options?.startDate) {
      // ISO形式（'T'を含む）の場合はそのまま使用、YYYY-MM-DD形式の場合はタイムゾーン変換
      const isIsoFormat = options.startDate.includes('T');
      if (isIsoFormat) {
        filtered = filtered.filter((r) => r.recordedAt >= options.startDate!);
      } else {
        // ローカル日付の開始時刻をUTCに変換
        const localStart = startOfDay(parseISO(options.startDate));
        const utcStart = fromZonedTime(localStart, tz).toISOString();
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
        const utcEnd = fromZonedTime(localEnd, tz).toISOString();
        filtered = filtered.filter((r) => r.recordedAt <= utcEnd);
      }
    }

    if (options?.mealType) {
      filtered = filtered.filter((r) => r.mealType === options.mealType);
    }

    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    // Get photo counts, first photo keys, and photos array for all filtered meals
    const mealIds = filtered.map((m) => m.id);
    const photoCounts = new Map<string, number>();
    const firstPhotoKeys = new Map<string, string>();
    const photosArrays = new Map<string, Array<{ id: string; photoKey: string; photoUrl: string }>>();

    if (mealIds.length > 0) {
      // Query all photos
      const photoRecords = await this.db
        .select()
        .from(schema.mealPhotos)
        .all();

      // Group photos by mealId
      const photosByMeal = new Map<string, typeof photoRecords>();
      for (const photo of photoRecords) {
        if (mealIds.includes(photo.mealId)) {
          if (!photosByMeal.has(photo.mealId)) {
            photosByMeal.set(photo.mealId, []);
          }
          photosByMeal.get(photo.mealId)!.push(photo);
        }
      }

      // Count photos, get first photo key, and create photos array per meal
      for (const [mealId, photos] of photosByMeal.entries()) {
        photoCounts.set(mealId, photos.length);
        // Sort by displayOrder
        const sortedPhotos = photos.sort((a, b) => a.displayOrder - b.displayOrder);
        const firstPhoto = sortedPhotos[0];
        if (firstPhoto) {
          firstPhotoKeys.set(mealId, firstPhoto.photoKey);
        }

        // Create photos array with URLs
        const photosWithUrls = sortedPhotos.map((photo) => ({
          id: photo.id,
          photoKey: photo.photoKey,
          photoUrl: `/api/meals/photos/${encodeURIComponent(photo.photoKey)}`,
        }));
        photosArrays.set(mealId, photosWithUrls);
      }
    }

    // Add photo information to records
    return filtered.map((record) => ({
      ...record,
      photoCount: photoCounts.get(record.id) || 0,
      firstPhotoKey: firstPhotoKeys.get(record.id) || null,
      photos: photosArrays.get(record.id) || [],
    }));
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

  async getTodaysSummary(userId: string, timezone?: string) {
    const tz = timezone ?? DEFAULT_TIMEZONE;

    // ユーザーのローカル時間での「今日」を取得
    const userNow = toZonedTime(new Date(), tz);
    const userTodayStart = startOfDay(userNow);
    const userTodayEnd = endOfDay(userNow);

    // UTCに変換
    const startDate = fromZonedTime(userTodayStart, tz).toISOString();
    const endDate = fromZonedTime(userTodayEnd, tz).toISOString();

    return this.getCalorieSummary(userId, { startDate, endDate });
  }

  async getMealDates(
    userId: string,
    year: number,
    month: number,
    timezone?: string
  ): Promise<string[]> {
    const tz = timezone ?? DEFAULT_TIMEZONE;

    // ユーザーのローカル時間での月の開始・終了を計算
    const localMonthStart = startOfMonth(new Date(year, month - 1, 1));
    const localMonthEnd = endOfMonth(new Date(year, month - 1, 1));

    // UTCに変換
    const startDate = fromZonedTime(localMonthStart, tz).toISOString();
    const endDate = fromZonedTime(localMonthEnd, tz).toISOString();

    // 日付範囲内の食事を取得
    const meals = await this.findByUserId(userId, { startDate, endDate });

    // ユーザーのローカル日付でユニークな日付を抽出
    const dateSet = new Set<string>();
    for (const meal of meals) {
      const recordedAt = parseISO(meal.recordedAt);
      const localDate = toZonedTime(recordedAt, tz);
      const dateStr = format(localDate, 'yyyy-MM-dd');
      dateSet.add(dateStr);
    }

    return Array.from(dateSet).sort();
  }
}
