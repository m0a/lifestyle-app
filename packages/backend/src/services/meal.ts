import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import type { Database } from '../db';
import { schema } from '../db';
import { AppError } from '../middleware/error';
import type { CreateMealInput, UpdateMealInput, MealType } from '@lifestyle-app/shared';
import { extractLocalDate } from './dashboard';

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
      // recordedAtのオフセット付きISO形式から直接ローカル日付を抽出して比較
      // 例: "2026-01-17T08:00:00+09:00" → "2026-01-17"
      const isIsoFormat = options.startDate.includes('T');
      if (isIsoFormat) {
        // ISO形式の場合は日付部分を抽出して比較
        const startLocalDate = extractLocalDate(options.startDate);
        filtered = filtered.filter((r) => extractLocalDate(r.recordedAt) >= startLocalDate);
      } else {
        // YYYY-MM-DD形式の場合はそのまま比較
        filtered = filtered.filter((r) => extractLocalDate(r.recordedAt) >= options.startDate!);
      }
    }

    if (options?.endDate) {
      const isIsoFormat = options.endDate.includes('T');
      if (isIsoFormat) {
        const endLocalDate = extractLocalDate(options.endDate);
        filtered = filtered.filter((r) => extractLocalDate(r.recordedAt) <= endLocalDate);
      } else {
        filtered = filtered.filter((r) => extractLocalDate(r.recordedAt) <= options.endDate!);
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

  /**
   * Get today's meal summary.
   * "Today" is determined by the client via the recordedAt field's local date.
   * Since recordedAt now contains the timezone offset (e.g., +09:00),
   * we simply extract the local date using slice(0, 10).
   */
  async getTodaysSummary(userId: string) {
    // 全ての食事を取得し、今日のローカル日付でフィルタ
    const records = await this.db
      .select()
      .from(schema.mealRecords)
      .where(eq(schema.mealRecords.userId, userId))
      .all();

    // 今日の日付を取得（フロントエンドと同じロジック）
    // 注: サーバー側では正確な「今日」を判定するのが難しいため、
    // フロントエンドから今日の日付を渡すことを検討すべき
    // 暫定的に、recordedAtのローカル日付で最新の日を「今日」とする
    // または、全期間のサマリーを返す

    // recordedAtから今日の日付を取得できないため、
    // クライアントが今日の日付を指定する新しいアプローチに変更
    // 今は全てのレコードを取得し、クライアントが渡したtodayDateでフィルタする
    // TODO: この関数はクライアントからの todayDate パラメータを受け取るように変更すべき

    // 暫定対応: 現在の日時から今日の日付を取得（サーバーのタイムゾーンに依存）
    const now = new Date();
    const todayDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const todayMeals = records.filter((r) => extractLocalDate(r.recordedAt) === todayDate);

    const mealsWithCalories = todayMeals.filter((m) => m.calories !== null);
    const totalCalories = mealsWithCalories.reduce((sum, m) => sum + (m.calories ?? 0), 0);
    const count = mealsWithCalories.length;
    const averageCalories = count > 0 ? Math.round(totalCalories / count) : 0;

    const totalProtein = todayMeals.reduce((sum, m) => sum + (m.totalProtein ?? 0), 0);
    const totalFat = todayMeals.reduce((sum, m) => sum + (m.totalFat ?? 0), 0);
    const totalCarbs = todayMeals.reduce((sum, m) => sum + (m.totalCarbs ?? 0), 0);

    return {
      totalCalories,
      averageCalories,
      count,
      totalMeals: todayMeals.length,
      totalProtein,
      totalFat,
      totalCarbs,
    };
  }

  /**
   * Get dates with meals for a given month.
   * Since recordedAt contains timezone offset, we extract local dates directly.
   */
  async getMealDates(
    userId: string,
    year: number,
    month: number
  ): Promise<string[]> {
    // 月の範囲を計算（ローカル日付形式）
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // 日付範囲内の食事を取得
    const meals = await this.findByUserId(userId, { startDate, endDate });

    // ローカル日付でユニークな日付を抽出
    const dateSet = new Set<string>();
    for (const meal of meals) {
      const dateStr = extractLocalDate(meal.recordedAt);
      dateSet.add(dateStr);
    }

    return Array.from(dateSet).sort();
  }
}
