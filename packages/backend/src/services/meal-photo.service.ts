import { nanoid } from 'nanoid';
import { eq, and, asc } from 'drizzle-orm';
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
