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

// Query schema with mealType filter
const mealQuerySchema = dateRangeSchema.extend({
  mealType: mealTypeSchema.optional(),
});

// Query schema for today endpoint - client sends local today date
const todayQuerySchema = z.object({
  todayDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// Chain format for RPC type inference
// All meal routes require authentication
export const meals = new Hono<{ Bindings: Bindings; Variables: Variables }>()
  .use(authMiddleware)
  .post('/', async (c) => {
    const contentType = c.req.header('content-type') || '';

    // Support both JSON (legacy) and multipart/form-data (User Story 4)
    if (contentType.includes('multipart/form-data')) {
      // T055-T057: Multi-photo meal creation
      const formData = await c.req.formData();
      const db = c.get('db');
      const user = c.get('user');

      // Extract form fields
      const mealTypeRaw = formData.get('mealType') as string;
      const content = formData.get('content') as string;
      const recordedAt = formData.get('recordedAt') as string;

      // Extract photos
      const photos: File[] = [];
      for (const [key, value] of formData.entries()) {
        if (key.startsWith('photos[') && value instanceof File) {
          photos.push(value);
        }
      }

      // Validate required fields
      if (!mealTypeRaw || !content || !recordedAt) {
        return c.json({ message: 'Missing required fields' }, 400);
      }

      // Validate mealType
      const mealTypeValidation = z.enum(['breakfast', 'lunch', 'dinner', 'snack']).safeParse(mealTypeRaw);
      if (!mealTypeValidation.success) {
        return c.json({ message: 'Invalid mealType' }, 400);
      }
      const mealType = mealTypeValidation.data;

      // Validate photos
      if (photos.length === 0) {
        return c.json({ message: 'At least one photo is required' }, 400);
      }

      if (photos.length > 10) {
        return c.json({ message: 'Maximum 10 photos per meal', code: 'PHOTO_LIMIT_EXCEEDED' }, 400);
      }

      // Validate each photo
      for (const photo of photos) {
        if (!photo.type.startsWith('image/')) {
          return c.json({ message: 'Only JPEG and PNG images are supported' }, 400);
        }
        if (photo.size > 10 * 1024 * 1024) {
          return c.json({ message: 'File size exceeds 10MB limit' }, 400);
        }
      }

      // Create meal record (T056)
      const mealService = new MealService(db);
      const meal = await mealService.create(user.id, {
        mealType,
        content,
        recordedAt,
      });

      // Upload photos and create meal_photos records (T056)
      const photoStorage = new PhotoStorageService(c.env.PHOTOS);
      const photoService = new MealPhotoService(db);
      const aiConfig = getAIConfigFromEnv(c.env);
      const aiService = new AIAnalysisService(aiConfig);
      const aiUsageService = new AIUsageService(db);

      const uploadedPhotos: Array<{
        id: string;
        mealId: string;
        photoKey: string;
        displayOrder: number;
        analysisStatus: string;
        photoUrl: string;
      }> = [];

      // Collect all food names for generating meal content
      const allFoodNames: string[] = [];

      // Process each photo (T057: Trigger AI analysis)
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        if (!photo) continue;

        const photoData = await photo.arrayBuffer();

        // Upload to R2 - generate permanent key
        const photoId = nanoid();
        const photoKey = `photos/${user.id}/${meal.id}/${photoId}.jpg`;
        await photoStorage.uploadPhoto(photoKey, photoData);

        // Create meal_photo record
        const mealPhoto = await photoService.addPhoto({
          mealId: meal.id,
          photoKey,
          displayOrder: i,
        });

        // Trigger AI analysis (synchronous for now)
        try {
          const analysisResult = await aiService.analyzeMealPhoto(photoData, photo.type);

          if (analysisResult.success) {
            // Update photo with analysis results
            await photoService.updateAnalysisResult(mealPhoto.id, analysisResult.result.totals);

            // Create food items for this photo
            console.log(`[Multi-Photo Upload] Creating ${analysisResult.result.foodItems.length} food items for photo ${mealPhoto.id}`);
            const now = new Date().toISOString();
            for (const item of analysisResult.result.foodItems) {
              await db.insert(schema.mealFoodItems).values({
                id: nanoid(),
                mealId: meal.id,
                photoId: mealPhoto.id,
                name: item.name,
                portion: item.portion,
                calories: item.calories,
                protein: item.protein,
                fat: item.fat,
                carbs: item.carbs,
                createdAt: now,
              });

              // Collect food name for content generation
              allFoodNames.push(item.name);
            }

            // Record AI usage
            if (analysisResult.usage) {
              await aiUsageService.recordUsage(user.id, 'image_analysis', analysisResult.usage);
            }
          } else {
            console.error(`[Multi-Photo Upload] AI analysis failed for photo ${mealPhoto.id}`);
          }
        } catch (error) {
          console.error(`[Multi-Photo Upload] Failed to analyze photo ${mealPhoto.id}:`, error);
          // Continue with other photos even if one fails
        }

        uploadedPhotos.push({
          id: mealPhoto.id,
          mealId: meal.id,
          photoKey,
          displayOrder: i,
          analysisStatus: 'complete',
          photoUrl: `/api/meals/photos/${encodeURIComponent(photoKey)}`,
        });
      }

      // Generate meal content from AI-detected food items
      const generatedContent = allFoodNames.length > 0
        ? allFoodNames.join(', ')
        : content; // Fallback to user-provided content if no items detected

      // Recalculate meal totals and update content
      const allPhotos = await photoService.getMealPhotos(meal.id);
      const totals = photoService.calculateTotals(allPhotos);
      await db.update(schema.mealRecords)
        .set({
          content: generatedContent,
          calories: totals.calories,
          totalProtein: totals.protein,
          totalFat: totals.fat,
          totalCarbs: totals.carbs,
          analysisSource: 'ai',
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.mealRecords.id, meal.id));

      return c.json({
        meal: {
          ...meal,
          calories: totals.calories,
          totalProtein: totals.protein,
          totalFat: totals.fat,
          totalCarbs: totals.carbs,
        },
        photos: uploadedPhotos,
      }, 201);
    } else {
      // Legacy JSON format
      const body = await c.req.json();
      const validationResult = createMealSchema.safeParse(body);

      if (!validationResult.success) {
        return c.json({ message: 'Validation error', errors: validationResult.error.errors }, 400);
      }

      const db = c.get('db');
      const user = c.get('user');

      const mealService = new MealService(db);
      const meal = await mealService.create(user.id, validationResult.data);

      return c.json({ meal }, 201);
    }
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
    const { todayDate } = c.req.valid('query');
    const db = c.get('db');
    const user = c.get('user');

    const mealService = new MealService(db);
    const summary = await mealService.getTodaysSummary(user.id, todayDate);

    return c.json({ summary });
  })
  .get('/dates', zValidator('query', mealDatesQuerySchema), async (c) => {
    const { year, month } = c.req.valid('query');
    const db = c.get('db');
    const user = c.get('user');

    const mealService = new MealService(db);
    const dates = await mealService.getMealDates(user.id, year, month);

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

    // Calculate totals from food items, not photos
    const foodItems = await db.query.mealFoodItems.findMany({
      where: eq(schema.mealFoodItems.mealId, mealId),
    });

    const totals = {
      calories: foodItems.reduce((sum, item) => sum + item.calories, 0),
      protein: foodItems.reduce((sum, item) => sum + item.protein, 0),
      fat: foodItems.reduce((sum, item) => sum + item.fat, 0),
      carbs: foodItems.reduce((sum, item) => sum + item.carbs, 0),
    };

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

      // Re-analyze all pending photos (including legacy photo if pending)
      const allPhotos = await photoService.getMealPhotos(mealId);
      const pendingPhotos = allPhotos.filter((p) => p.analysisStatus === 'pending');

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

      // Update meal totals and content from all food items
      const allFoodItems = await db.query.mealFoodItems.findMany({
        where: eq(schema.mealFoodItems.mealId, mealId),
      });

      const totalCalories = allFoodItems.reduce((sum, item) => sum + item.calories, 0);
      const totalProtein = allFoodItems.reduce((sum, item) => sum + item.protein, 0);
      const totalFat = allFoodItems.reduce((sum, item) => sum + item.fat, 0);
      const totalCarbs = allFoodItems.reduce((sum, item) => sum + item.carbs, 0);
      const contentNames = allFoodItems.map(item => item.name).join('、');

      await db.update(mealRecords)
        .set({
          content: contentNames,
          calories: totalCalories,
          totalProtein,
          totalFat,
          totalCarbs,
        })
        .where(eq(mealRecords.id, mealId));

      console.log(`[Photo Upload] Updated meal totals: ${totalCalories} kcal, content: ${contentNames}`);

      // Generate presigned URL
      const photoUrl = await photoStorage.getPresignedUrl(photoKey);

      return c.json({
        photo: { ...photo, photoUrl },
        meal: { calories: totalCalories, totalProtein, totalFat, totalCarbs },
      }, 201);
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
      // Delete food items associated with this photo
      await db.delete(schema.mealFoodItems)
        .where(eq(schema.mealFoodItems.photoId, photoId));

      const { photoKey } = await photoService.deletePhoto(photoId);

      // Delete from R2
      await photoStorage.deletePhoto(photoKey);

      // Recalculate totals from remaining food items
      const remainingFoodItems = await db.query.mealFoodItems.findMany({
        where: eq(schema.mealFoodItems.mealId, mealId),
      });

      const totalCalories = remainingFoodItems.reduce((sum, item) => sum + item.calories, 0);
      const totalProtein = remainingFoodItems.reduce((sum, item) => sum + item.protein, 0);
      const totalFat = remainingFoodItems.reduce((sum, item) => sum + item.fat, 0);
      const totalCarbs = remainingFoodItems.reduce((sum, item) => sum + item.carbs, 0);
      const contentNames = remainingFoodItems.map(item => item.name).join('、');

      await db.update(mealRecords)
        .set({
          content: contentNames,
          calories: totalCalories,
          totalProtein,
          totalFat,
          totalCarbs,
        })
        .where(eq(mealRecords.id, mealId));

      const updatedTotals = {
        calories: totalCalories,
        protein: totalProtein,
        fat: totalFat,
        carbs: totalCarbs,
      };

      const remainingPhotos = await photoService.getMealPhotos(mealId);

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
  })
  // T071: Photo reorder endpoint
  .patch('/:id/photos/reorder', async (c) => {
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

    // Expected body: { photoIds: string[] } - array of photo IDs in new order
    const body = await c.req.json();
    const { photoIds } = body;

    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      return c.json({ message: 'photoIds must be a non-empty array' }, 400);
    }

    const photoService = new MealPhotoService(db);

    // Update display_order for each photo
    for (let i = 0; i < photoIds.length; i++) {
      await db.update(schema.mealPhotos)
        .set({ displayOrder: i })
        .where(and(
          eq(schema.mealPhotos.id, photoIds[i]),
          eq(schema.mealPhotos.mealId, mealId)
        ));
    }

    const updatedPhotos = await photoService.getMealPhotos(mealId);

    return c.json({
      success: true,
      photos: updatedPhotos,
    });
  })
  // T072: Retry photo analysis endpoint
  .post('/:id/photos/:photoId/analyze', async (c) => {
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

    // Get photo
    const photo = await db.query.mealPhotos.findFirst({
      where: and(
        eq(schema.mealPhotos.id, photoId),
        eq(schema.mealPhotos.mealId, mealId)
      ),
    });

    if (!photo) {
      return c.json({ message: 'Photo not found' }, 404);
    }

    // Update status to analyzing
    await db.update(schema.mealPhotos)
      .set({ analysisStatus: 'analyzing' })
      .where(eq(schema.mealPhotos.id, photoId));

    // Trigger background analysis (similar to photo upload flow)
    const photoStorage = new PhotoStorageService(c.env.PHOTOS);
    const photoService = new MealPhotoService(db);
    const aiConfig = getAIConfigFromEnv(c.env);
    const aiService = new AIAnalysisService(aiConfig);

    // Start analysis in background (fire and forget)
    c.executionCtx.waitUntil((async () => {
      try {
        // Get photo data from R2
        const photoData = await photoStorage.getPhotoForAnalysis(photo.photoKey);

        if (!photoData) {
          throw new Error('Failed to retrieve photo from storage');
        }

        const analysisResult = await aiService.analyzeMealPhoto(photoData.data, photoData.mimeType);

        if (analysisResult.success) {
          // Delete old food items for this photo
          await db.delete(schema.mealFoodItems)
            .where(eq(schema.mealFoodItems.photoId, photoId));

          // Update photo with analysis results
          await photoService.updateAnalysisResult(photoId, analysisResult.result.totals);

          // Insert new food items
          for (const item of analysisResult.result.foodItems) {
            await db.insert(schema.mealFoodItems).values({
              id: nanoid(),
              mealId: mealId,
              photoId: photoId,
              name: item.name,
              portion: item.portion,
              calories: item.calories,
              protein: item.protein,
              fat: item.fat,
              carbs: item.carbs,
              createdAt: new Date().toISOString(),
            });
          }

          // Update photo status
          await db.update(schema.mealPhotos)
            .set({ analysisStatus: 'complete' })
            .where(eq(schema.mealPhotos.id, photoId));

          // Recalculate meal totals
          const allFoodItems = await db.query.mealFoodItems.findMany({
            where: eq(schema.mealFoodItems.mealId, mealId),
          });

          const totalCalories = allFoodItems.reduce((sum, item) => sum + item.calories, 0);
          const totalProtein = allFoodItems.reduce((sum, item) => sum + item.protein, 0);
          const totalFat = allFoodItems.reduce((sum, item) => sum + item.fat, 0);
          const totalCarbs = allFoodItems.reduce((sum, item) => sum + item.carbs, 0);
          const contentNames = allFoodItems.map(item => item.name).join('、');

          await db.update(mealRecords)
            .set({
              content: contentNames,
              calories: totalCalories,
              totalProtein,
              totalFat,
              totalCarbs,
            })
            .where(eq(mealRecords.id, mealId));
        } else {
          // Analysis failed
          await db.update(schema.mealPhotos)
            .set({ analysisStatus: 'failed' })
            .where(eq(schema.mealPhotos.id, photoId));
        }
      } catch (error) {
        // Update photo status to failed
        await db.update(schema.mealPhotos)
          .set({ analysisStatus: 'failed' })
          .where(eq(schema.mealPhotos.id, photoId));
      }
    })());

    return c.json({
      success: true,
      message: 'Analysis started',
      photoId,
      status: 'analyzing',
    });
  })
  // T073: Photo analysis status polling endpoint
  .get('/:id/photos/:photoId/status', async (c) => {
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

    // Get photo with food items
    const photo = await db.query.mealPhotos.findFirst({
      where: and(
        eq(schema.mealPhotos.id, photoId),
        eq(schema.mealPhotos.mealId, mealId)
      ),
    });

    if (!photo) {
      return c.json({ message: 'Photo not found' }, 404);
    }

    // Get associated food items
    const foodItems = await db.query.mealFoodItems.findMany({
      where: eq(schema.mealFoodItems.photoId, photoId),
    });

    return c.json({
      photoId: photo.id,
      status: photo.analysisStatus,
      foodItems: foodItems.map(item => ({
        name: item.name,
        calories: item.calories,
        protein: item.protein,
        fat: item.fat,
        carbs: item.carbs,
      })),
    });
  });
