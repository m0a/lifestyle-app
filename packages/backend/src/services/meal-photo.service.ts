import { nanoid } from 'nanoid';
import { eq, asc } from 'drizzle-orm';
import type { Database } from '../db';
import { mealPhotos, type MealPhoto } from '../db/schema';

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
        analysisStatus: 'pending',
        createdAt: new Date().toISOString(),
      })
      .returning();

    if (!photo) {
      throw new Error('Failed to create photo record');
    }

    return photo;
  }

  async deletePhoto(photoId: string): Promise<{ photoKey: string }> {
    const photo = await this.db.query.mealPhotos.findFirst({
      where: eq(mealPhotos.id, photoId),
    });

    if (!photo) {
      throw new Error('Photo not found');
    }

    // Check if last photo
    const remaining = await this.getMealPhotos(photo.mealId);
    if (remaining.length === 1) {
      throw new Error('Meals must have at least one photo');
    }

    await this.db.delete(mealPhotos).where(eq(mealPhotos.id, photoId));

    return { photoKey: photo.photoKey };
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

  // T074: Lazy migration for legacy photo_key meals
  async migrateLegacyPhoto(mealId: string, photoKey: string): Promise<MealPhoto | null> {
    // Check if meal already has photos in meal_photos table
    const existingPhotos = await this.getMealPhotos(mealId);

    if (existingPhotos.length > 0) {
      // Already migrated
      return null;
    }

    // Create meal_photos record from legacy photo_key
    const photo = await this.addPhoto({
      mealId,
      photoKey,
      displayOrder: 0,
    });

    return photo;
  }
}
