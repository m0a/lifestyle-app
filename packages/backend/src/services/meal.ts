import { eq, desc, inArray, and, gte, lt } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import type { Database } from '../db';
import { schema } from '../db';
import { AppError } from '../middleware/error';
import type {
  CreateMealInput,
  UpdateMealInput,
  MealType,
  MealDaySummary,
} from '@lifestyle-app/shared';
import { extractLocalDate, nextLocalDate } from '../lib/localDate';
import { chunkBindings } from '../lib/d1';

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
    // Push filters into SQL so the idx_meal_user_date range scan is used instead
    // of fetching the user's whole history and filtering in JS (#103). The
    // local-date range gte(extractLocalDate(start)) + lt(nextLocalDate(end)) is
    // exactly equivalent to the previous extractLocalDate JS comparison (handles
    // both "YYYY-MM-DD" and full ISO start/end inputs and the "+09:00"/"Z" mix).
    const conditions = [eq(schema.mealRecords.userId, userId)];
    if (options?.startDate) {
      conditions.push(gte(schema.mealRecords.recordedAt, extractLocalDate(options.startDate)));
    }
    if (options?.endDate) {
      conditions.push(lt(schema.mealRecords.recordedAt, nextLocalDate(options.endDate)));
    }
    if (options?.mealType) {
      conditions.push(eq(schema.mealRecords.mealType, options.mealType));
    }

    const baseQuery = this.db
      .select()
      .from(schema.mealRecords)
      .where(and(...conditions))
      // created_at breaks ties: recorded_at alone is ambiguous when several meals
      // fall back to the same "now", and equal keys give a non-deterministic order.
      .orderBy(desc(schema.mealRecords.recordedAt), desc(schema.mealRecords.createdAt));

    const filtered = options?.limit
      ? await baseQuery.limit(options.limit).all()
      : await baseQuery.all();

    // Get photo counts, first photo keys, and photos array for all filtered meals
    const mealIds = filtered.map((m) => m.id);
    const photoCounts = new Map<string, number>();
    const firstPhotoKeys = new Map<string, string>();
    const photosArrays = new Map<string, Array<{ id: string; photoKey: string; photoUrl: string }>>();

    if (mealIds.length > 0) {
      // Fetch only this user's meal photos, filtered and ordered in the DB so
      // the idx_meal_photos_meal (meal_id, display_order) index is used —
      // instead of scanning every user's photos and filtering/sorting in JS
      // (#102).
      //
      // Chunked because inArray spends one bound parameter per id and D1 caps a
      // statement at 100 (see lib/d1.ts). mealIds is as long as the requested
      // range has meals, so a month of records blew the limit outright and made
      // the monthly calendar and the MCP period tools fail with
      // "too many SQL variables". Splitting is safe for the grouping below: we
      // chunk BY mealId, so one meal's photos never straddle two chunks and the
      // per-meal displayOrder ordering survives the concatenation.
      const photoRecords = (
        await Promise.all(
          chunkBindings(mealIds).map((chunk) =>
            this.db
              .select()
              .from(schema.mealPhotos)
              .where(inArray(schema.mealPhotos.mealId, chunk))
              .orderBy(schema.mealPhotos.mealId, schema.mealPhotos.displayOrder)
              .all()
          )
        )
      ).flat();

      // Group photos by mealId (rows are already restricted to these meals and
      // ordered by displayOrder within each meal).
      const photosByMeal = new Map<string, typeof photoRecords>();
      for (const photo of photoRecords) {
        if (!photosByMeal.has(photo.mealId)) {
          photosByMeal.set(photo.mealId, []);
        }
        photosByMeal.get(photo.mealId)!.push(photo);
      }

      // Count photos, get first photo key, and create photos array per meal
      for (const [mealId, photos] of photosByMeal.entries()) {
        photoCounts.set(mealId, photos.length);
        const firstPhoto = photos[0];
        if (firstPhoto) {
          firstPhotoKeys.set(mealId, firstPhoto.photoKey);
        }

        // Create photos array with URLs (already ordered by displayOrder)
        const photosWithUrls = photos.map((photo) => ({
          id: photo.id,
          photoKey: photo.photoKey,
          photoUrl: `/api/meals/photos/${encodeURIComponent(photo.photoKey)}`,
        }));
        photosArrays.set(mealId, photosWithUrls);
      }
    }

    // Add photo information to records
    return filtered.map((record) => {
      const photos = photosArrays.get(record.id) || [];

      return {
        ...record,
        photoCount: photoCounts.get(record.id) || 0,
        firstPhotoKey: firstPhotoKeys.get(record.id) || null,
        photos,
      };
    });
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

  /**
   * Fetch individual food items across a date range, scoped to one user.
   *
   * Food items are normally read one meal at a time (by mealId), but coaching
   * analysis needs them across a period — protein-source ranking, per-item PFC.
   * Drive from meal_food_items and INNER JOIN meal_records so the user/date
   * filter lives on meal_records (recordedAt is the offset-aware local-date
   * string, filtered with the same extractLocalDate/nextLocalDate range as the
   * other queries). Each row carries its parent meal's context (type, time).
   */
  async getFoodItemsByUserId(
    userId: string,
    options?: { startDate?: string; endDate?: string }
  ) {
    const conditions = [eq(schema.mealRecords.userId, userId)];
    if (options?.startDate) {
      conditions.push(gte(schema.mealRecords.recordedAt, extractLocalDate(options.startDate)));
    }
    if (options?.endDate) {
      conditions.push(lt(schema.mealRecords.recordedAt, nextLocalDate(options.endDate)));
    }

    return this.db
      .select({
        mealId: schema.mealRecords.id,
        mealType: schema.mealRecords.mealType,
        recordedAt: schema.mealRecords.recordedAt,
        name: schema.mealFoodItems.name,
        portion: schema.mealFoodItems.portion,
        calories: schema.mealFoodItems.calories,
        protein: schema.mealFoodItems.protein,
        fat: schema.mealFoodItems.fat,
        carbs: schema.mealFoodItems.carbs,
      })
      .from(schema.mealFoodItems)
      .innerJoin(schema.mealRecords, eq(schema.mealFoodItems.mealId, schema.mealRecords.id))
      .where(and(...conditions))
      .orderBy(desc(schema.mealRecords.recordedAt), desc(schema.mealRecords.createdAt))
      .all();
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

    // Scope by userId as well (defense in depth, #130): findById above already
    // guarantees ownership, but the SQL itself should never be able to touch
    // another user's row.
    await this.db
      .update(schema.mealRecords)
      .set(updateData)
      .where(and(eq(schema.mealRecords.id, id), eq(schema.mealRecords.userId, userId)));

    return this.findById(id, userId);
  }

  async delete(id: string, userId: string) {
    await this.findById(id, userId);

    await this.db
      .delete(schema.mealRecords)
      .where(and(eq(schema.mealRecords.id, id), eq(schema.mealRecords.userId, userId)));
  }

  /**
   * Get today's meal summary.
   * "Today" is determined by the client via the recordedAt field's local date.
   * Since recordedAt now contains the timezone offset (e.g., +09:00),
   * we simply extract the local date using slice(0, 10).
   */
  async getTodaysSummary(userId: string, clientTodayDate?: string) {
    // クライアントから渡された「今日」の日付を使用
    // フォールバック: サーバーの日付（UTCなので不正確だが後方互換性のため）
    let todayDate: string;
    if (clientTodayDate) {
      todayDate = clientTodayDate;
    } else {
      const now = new Date();
      todayDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    // Push the local-date filter into SQL so the idx_meal_user_date range scan
    // is used instead of fetching the user's whole meal history and filtering
    // in JS (#120). Because recordedAt is an offset-aware ISO string whose
    // first 10 chars are the local date, gte(todayDate) + lt(nextLocalDate) is
    // exactly equivalent to the previous extractLocalDate(...) === todayDate
    // comparison (see lib/localDate.ts). todayDate is always "YYYY-MM-DD" here
    // (validated by todayQuerySchema, or built from the server date fallback).
    const todayMeals = await this.db
      .select()
      .from(schema.mealRecords)
      .where(
        and(
          eq(schema.mealRecords.userId, userId),
          gte(schema.mealRecords.recordedAt, todayDate),
          lt(schema.mealRecords.recordedAt, nextLocalDate(todayDate))
        )
      )
      .all();

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
  /**
   * Per-day nutrition totals for a month, for the meal-history calendar.
   *
   * The month's records were already being fetched here to derive the set of
   * dates; folding them into per-day totals costs no extra query. Bucketing goes
   * through extractLocalDate rather than Date#getDate because recorded_at mixes
   * "+09:00" and bare-UTC "Z" rows and Workers run in UTC.
   */
  async getMealDaySummaries(
    userId: string,
    year: number,
    month: number
  ): Promise<MealDaySummary[]> {
    // 月の範囲を計算（ローカル日付形式）
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // 日付範囲内の食事を取得
    const meals = await this.findByUserId(userId, { startDate, endDate });

    // ローカル日付ごとに栄養素を合算（null は 0 として扱う）
    const dayMap = new Map<string, MealDaySummary>();
    for (const meal of meals) {
      const date = extractLocalDate(meal.recordedAt);
      const day =
        dayMap.get(date) ??
        { date, calories: 0, protein: 0, fat: 0, carbs: 0, mealCount: 0 };
      day.calories += meal.calories ?? 0;
      day.protein += meal.totalProtein ?? 0;
      day.fat += meal.totalFat ?? 0;
      day.carbs += meal.totalCarbs ?? 0;
      day.mealCount += 1;
      dayMap.set(date, day);
    }

    return Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }
}
