import { nanoid } from 'nanoid';
import { eq, asc } from 'drizzle-orm';
import type { Database } from '../db';
import { mealPhotos, mealFoodItems, mealRecords, type MealPhoto } from '../db/schema';
import { MEAL_CONTENT_DELIMITER, type NutritionTotals } from '@lifestyle-app/shared';
import type { PhotoStorageService } from './photo-storage';

export class MealPhotoService {
  constructor(private db: Database) {}

  async getMealPhotos(mealId: string): Promise<MealPhoto[]> {
    return this.db.query.mealPhotos.findMany({
      where: eq(mealPhotos.mealId, mealId),
      orderBy: asc(mealPhotos.displayOrder),
    });
  }

  async addPhoto(data: {
    mealId: string;
    photoKey: string;
    displayOrder?: number;
  }): Promise<MealPhoto> {
    const existing = await this.getMealPhotos(data.mealId);

    if (existing.length >= 10) {
      throw new Error('Maximum 10 photos per meal');
    }

    const displayOrder = data.displayOrder ?? existing.length;

    const [photo] = await this.db
      .insert(mealPhotos)
      .values({
        id: nanoid(),
        mealId: data.mealId,
        photoKey: data.photoKey,
        displayOrder,
        analysisStatus: 'analyzing',
        createdAt: new Date().toISOString(),
      })
      .returning();

    if (!photo) {
      throw new Error('Failed to create photo record');
    }

    return photo;
  }

  async updateAnalysisResult(
    photoId: string,
    result: {
      calories: number;
      protein: number;
      fat: number;
      carbs: number;
    }
  ): Promise<MealPhoto> {
    const [updated] = await this.db
      .update(mealPhotos)
      .set({
        analysisStatus: 'complete',
        calories: result.calories,
        protein: result.protein,
        fat: result.fat,
        carbs: result.carbs,
      })
      .where(eq(mealPhotos.id, photoId))
      .returning();

    if (!updated) {
      throw new Error('Failed to update photo analysis');
    }

    return updated;
  }

  async markAnalysisFailed(photoId: string): Promise<void> {
    await this.db
      .update(mealPhotos)
      .set({
        analysisStatus: 'failed',
      })
      .where(eq(mealPhotos.id, photoId));
  }

  calculateTotals(photos: MealPhoto[]) {
    const analyzed = photos.filter((p) => p.analysisStatus === 'complete');

    return {
      calories: analyzed.reduce((sum, p) => sum + (p.calories ?? 0), 0),
      protein: analyzed.reduce((sum, p) => sum + (p.protein ?? 0), 0),
      fat: analyzed.reduce((sum, p) => sum + (p.fat ?? 0), 0),
      carbs: analyzed.reduce((sum, p) => sum + (p.carbs ?? 0), 0),
      photoCount: photos.length,
      analyzedPhotoCount: analyzed.length,
    };
  }
}

/**
 * Recalculate a meal's stored totals from its food items and persist them.
 *
 * meal_food_items is the single source of truth for meal_records.calories /
 * total_* — every edit path (chat, manual, photo delete) converges here so the
 * stored totals never drift (#100/#101). Protein/fat/carbs are rounded to one
 * decimal to match the other recompute call sites.
 */
export async function recalculateMealTotals(
  db: Database,
  mealId: string
): Promise<NutritionTotals> {
  const items = await db.query.mealFoodItems.findMany({
    where: eq(mealFoodItems.mealId, mealId),
  });

  const totals: NutritionTotals = items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: Math.round((acc.protein + item.protein) * 10) / 10,
      fat: Math.round((acc.fat + item.fat) * 10) / 10,
      carbs: Math.round((acc.carbs + item.carbs) * 10) / 10,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );

  await db
    .update(mealRecords)
    .set({
      calories: totals.calories,
      totalProtein: totals.protein,
      totalFat: totals.fat,
      totalCarbs: totals.carbs,
      content: items.map((i) => i.name).join(MEAL_CONTENT_DELIMITER),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(mealRecords.id, mealId));

  return totals;
}

/**
 * Delete the given photos for a meal and reconcile state in one place (#101):
 * for each photo, remove its meal_food_items (so they don't orphan), the
 * meal_photos row, and the R2 object (best-effort), then recompute the meal
 * totals from the remaining food items. All photo-deletion paths funnel through
 * this so food items never orphan and meal_records totals never drift.
 */
export async function deletePhotosWithFoodItems(
  db: Database,
  photoStorage: PhotoStorageService,
  mealId: string,
  photos: { id: string; photoKey: string }[]
): Promise<NutritionTotals> {
  for (const photo of photos) {
    // Remove food items captured from this photo. (The FK is ON DELETE CASCADE
    // since #101, so deleting the photo row would also clear them; doing it
    // explicitly keeps the behavior correct regardless of FK enforcement.)
    await db.delete(mealFoodItems).where(eq(mealFoodItems.photoId, photo.id));
    await db.delete(mealPhotos).where(eq(mealPhotos.id, photo.id));
    try {
      await photoStorage.deletePhoto(photo.photoKey);
    } catch (error) {
      console.error('Failed to delete photo from storage:', error);
      // Continue even if storage deletion fails — DB state is the source of truth.
    }
  }

  return recalculateMealTotals(db, mealId);
}
