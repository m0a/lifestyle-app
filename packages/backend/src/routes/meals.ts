import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { createMealSchema, updateMealSchema, dateRangeSchema, mealTypeSchema, mealDatesQuerySchema } from '@lifestyle-app/shared';
import { MealService } from '../services/meal';
import { MealPhotoService } from '../services/meal-photo.service';
import { PhotoStorageService } from '../services/photo-storage';
import { AIAnalysisService } from '../services/ai-analysis';
import { AIUsageService } from '../services/ai-usage';
import { getAIConfigFromEnv } from '../lib/ai-provider';
import { authMiddleware } from '../middleware/auth';
import { eq, and } from 'drizzle-orm';
import { mealRecords } from '../db/schema';
import type { Database } from '../db';
import { schema } from '../db';

type Bindings = {
  DB: D1Database;
  PHOTOS: R2Bucket;
  GOOGLE_GENERATIVE_AI_API_KEY?: string;
  AI_PROVIDER?: string;
  AI_MODEL?: string;
};

type Variables = {
  db: Database;
  user: { id: string; email: string };
};

// Query schema with mealType filter and timezone
const mealQuerySchema = dateRangeSchema.extend({
  mealType: mealTypeSchema.optional(),
  timezone: z.string().optional(),
});

// Query schema for today endpoint with timezone
const todayQuerySchema = z.object({
  timezone: z.string().optional(),
});

// Chain format for RPC type inference
// All meal routes require authentication
export const meals = new Hono<{ Bindings: Bindings; Variables: Variables }>()
  .use(authMiddleware)
  .post('/', zValidator('json', createMealSchema), async (c) => {
    const input = c.req.valid('json');
    const db = c.get('db');
    const user = c.get('user');

    const mealService = new MealService(db);
    const meal = await mealService.create(user.id, input);

    return c.json({ meal }, 201);
  })
  .get('/', zValidator('query', mealQuerySchema), async (c) => {
    const query = c.req.valid('query');
    const db = c.get('db');
    const user = c.get('user');

    const mealService = new MealService(db);
    const mealsList = await mealService.findByUserId(user.id, {
      startDate: query.startDate,
      endDate: query.endDate,
      mealType: query.mealType,
      timezone: query.timezone,
    });

    return c.json({ meals: mealsList });
  })
  .get('/summary', zValidator('query', dateRangeSchema), async (c) => {
    const query = c.req.valid('query');
    const db = c.get('db');
    const user = c.get('user');

    const mealService = new MealService(db);
    const summary = await mealService.getCalorieSummary(user.id, {
      startDate: query.startDate,
      endDate: query.endDate,
    });

    return c.json({ summary });
  })
  .get('/today', zValidator('query', todayQuerySchema), async (c) => {
    const db = c.get('db');
    const user = c.get('user');
    const { timezone } = c.req.valid('query');

    const mealService = new MealService(db);
    const summary = await mealService.getTodaysSummary(user.id, timezone);

    return c.json({ summary });
  })
  .get('/dates', zValidator('query', mealDatesQuerySchema), async (c) => {
    const { year, month, timezone } = c.req.valid('query');
    const db = c.get('db');
    const user = c.get('user');

    const mealService = new MealService(db);
    const dates = await mealService.getMealDates(user.id, year, month, timezone);

    return c.json({ dates });
  })
  .get('/:id', async (c) => {
    const id = c.req.param('id');
    const db = c.get('db');
    const user = c.get('user');

    const mealService = new MealService(db);
    const meal = await mealService.findById(id, user.id);

    return c.json({ meal });
  })
  .patch('/:id', zValidator('json', updateMealSchema), async (c) => {
    const id = c.req.param('id');
    const input = c.req.valid('json');
    const db = c.get('db');
    const user = c.get('user');

    const mealService = new MealService(db);
    const meal = await mealService.update(id, user.id, input);

    return c.json({ meal });
  })
  .delete('/:id', async (c) => {
    const id = c.req.param('id');
    const db = c.get('db');
    const user = c.get('user');

    const mealService = new MealService(db);
    await mealService.delete(id, user.id);

    return c.json({ message: 'Deleted' });
  })
  // Photo management endpoints
  .get('/:id/photos', async (c) => {
    const mealId = c.req.param('id');
    const db = c.get('db');
    const user = c.get('user');

    // Verify meal belongs to user
    const meal = await db.query.mealRecords.findFirst({
      where: and(eq(mealRecords.id, mealId), eq(mealRecords.userId, user.id)),
    });

    if (!meal) {
      return c.json({ message: 'Meal not found' }, 404);
    }

    const photoService = new MealPhotoService(db);
    const photoStorage = new PhotoStorageService(c.env.PHOTOS);

    // Get all photos from meal_photos table
    const photos = await photoService.getMealPhotos(mealId);
    const totals = photoService.calculateTotals(photos);

    // Generate presigned URLs
    const photosWithUrls = await Promise.all(
      photos.map(async (photo) => ({
        ...photo,
        photoUrl: await photoStorage.getPresignedUrl(photo.photoKey),
      }))
    );

    return c.json({ photos: photosWithUrls, totals });
  })
  .post('/:id/photos', async (c) => {
    const mealId = c.req.param('id');
    const db = c.get('db');
    const user = c.get('user');

    // Verify meal belongs to user
    const meal = await db.query.mealRecords.findFirst({
      where: and(eq(mealRecords.id, mealId), eq(mealRecords.userId, user.id)),
    });

    if (!meal) {
      return c.json({ message: 'Meal not found' }, 404);
    }

    // Parse form data
    const formData = await c.req.formData();
    const photoFile = formData.get('photo') as File;

    if (!photoFile || !(photoFile instanceof File)) {
      return c.json({ message: 'Photo file required' }, 400);
    }

    if (photoFile.size > 10 * 1024 * 1024) {
      return c.json({ message: 'Max 10MB file size', code: 'FILE_TOO_LARGE' }, 413);
    }

    const photoService = new MealPhotoService(db);
    const photoStorage = new PhotoStorageService(c.env.PHOTOS);

    try {
      // Upload to R2
      const photoId = nanoid();
      const photoKey = `photos/${user.id}/${mealId}/${photoId}.jpg`;
      await photoStorage.uploadPhoto(photoKey, photoFile);

      // Create DB record
      const photo = await photoService.addPhoto({
        mealId,
        photoKey,
      });

      // Analyze newly uploaded photo with AI
      const aiConfig = getAIConfigFromEnv(c.env);
      const aiService = new AIAnalysisService(aiConfig);
      const aiUsageService = new AIUsageService(db);
      const photoData = await photoFile.arrayBuffer();

      try {
        const analysisResult = await aiService.analyzeMealPhoto(photoData, photoFile.type);

        if (analysisResult.success) {
          // Update photo with analysis results
          await photoService.updateAnalysisResult(photo.id, analysisResult.result.totals);

          // Automatically create food items from photo analysis
          console.log(`[Photo Analysis] Creating ${analysisResult.result.foodItems.length} food items for photo ${photo.id}`);
          for (const item of analysisResult.result.foodItems) {
            const foodItemId = nanoid();
            await db.insert(schema.mealFoodItems).values({
              id: foodItemId,
              mealId,
              photoId: photo.id,
              name: item.name,
              portion: item.portion,
              calories: item.calories,
              protein: item.protein,
              fat: item.fat,
              carbs: item.carbs,
              createdAt: new Date().toISOString(),
            });
            console.log(`[Photo Analysis] Created food item: ${foodItemId} - ${item.name}`);
          }

          // Record AI usage
          if (analysisResult.usage) {
            await aiUsageService.recordUsage(user.id, 'image_analysis', analysisResult.usage);
          }
        } else {
          // Mark analysis as failed
          console.error('[Photo Analysis] Analysis failed:', analysisResult.failure);
          await photoService.markAnalysisFailed(photo.id);
        }
      } catch (analysisError) {
        // Log error but don't fail the upload
        console.error('Photo analysis failed:', analysisError);
        await photoService.markAnalysisFailed(photo.id);
      }

      // Re-analyze all pending photos and photos without food items
      const allPhotos = await photoService.getMealPhotos(mealId);

      // Get all food items for this meal to check which photos have food items
      const allFoodItems = await db.select().from(schema.mealFoodItems).where(eq(schema.mealFoodItems.mealId, mealId)).all();
      const photosWithFoodItems = new Set(allFoodItems.filter(item => item.photoId).map(item => item.photoId));

      // Re-analyze photos that are pending OR completed but have no food items
      const pendingPhotos = allPhotos.filter((p) =>
        p.analysisStatus === 'pending' ||
        (p.analysisStatus === 'complete' && !photosWithFoodItems.has(p.id))
      );

      if (pendingPhotos.length > 0) {
        console.log(`[Photo Upload] Found ${pendingPhotos.length} photos to analyze (pending or without food items)`);
      }

      for (const pendingPhoto of pendingPhotos) {
        try {
          // Get photo data from R2 using getPhotoForAnalysis
          const photoData = await photoStorage.getPhotoForAnalysis(pendingPhoto.photoKey);
          if (photoData) {
            const analysisResult = await aiService.analyzeMealPhoto(
              photoData.data,
              photoData.mimeType
            );

            if (analysisResult.success) {
              await photoService.updateAnalysisResult(pendingPhoto.id, analysisResult.result.totals);

              // Automatically create food items from pending photo analysis
              console.log(`[Pending Photo Analysis] Creating ${analysisResult.result.foodItems.length} food items for pending photo ${pendingPhoto.id}`);
              for (const item of analysisResult.result.foodItems) {
                const foodItemId = nanoid();
                await db.insert(schema.mealFoodItems).values({
                  id: foodItemId,
                  mealId,
                  photoId: pendingPhoto.id,
                  name: item.name,
                  portion: item.portion,
                  calories: item.calories,
                  protein: item.protein,
                  fat: item.fat,
                  carbs: item.carbs,
                  createdAt: new Date().toISOString(),
                });
                console.log(`[Pending Photo Analysis] Created food item: ${foodItemId} - ${item.name}`);
              }

              if (analysisResult.usage) {
                await aiUsageService.recordUsage(user.id, 'image_analysis', analysisResult.usage);
              }
            } else {
              console.error('[Pending Photo Analysis] Analysis failed:', analysisResult.failure);
              await photoService.markAnalysisFailed(pendingPhoto.id);
            }
          }
        } catch (error) {
          console.error(`Failed to analyze pending photo ${pendingPhoto.id}:`, error);
          await photoService.markAnalysisFailed(pendingPhoto.id);
        }
      }

      // Generate presigned URL
      const photoUrl = await photoStorage.getPresignedUrl(photoKey);

      return c.json({ photo: { ...photo, photoUrl } }, 201);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Maximum 10 photos')) {
        return c.json({ message: error.message, code: 'PHOTO_LIMIT_EXCEEDED' }, 400);
      }
      throw error;
    }
  })
  .delete('/:id/photos/:photoId', async (c) => {
    const mealId = c.req.param('id');
    const photoId = c.req.param('photoId');
    const db = c.get('db');
    const user = c.get('user');

    // Verify meal belongs to user
    const meal = await db.query.mealRecords.findFirst({
      where: and(eq(mealRecords.id, mealId), eq(mealRecords.userId, user.id)),
    });

    if (!meal) {
      return c.json({ message: 'Meal not found' }, 404);
    }

    const photoService = new MealPhotoService(db);
    const photoStorage = new PhotoStorageService(c.env.PHOTOS);

    try {
      const { photoKey } = await photoService.deletePhoto(photoId);

      // Delete from R2
      await photoStorage.deletePhoto(photoKey);

      // Recalculate totals
      const remainingPhotos = await photoService.getMealPhotos(mealId);
      const updatedTotals = photoService.calculateTotals(remainingPhotos);

      return c.json({
        success: true,
        remainingPhotos: remainingPhotos.length,
        updatedTotals,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('at least one')) {
        return c.json({ message: error.message, code: 'LAST_PHOTO' }, 400);
      }
      throw error;
    }
  });
