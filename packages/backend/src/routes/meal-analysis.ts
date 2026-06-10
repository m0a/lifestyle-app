import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { v4 as uuidv4 } from 'uuid';
import { eq, and } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { mealRecords, mealFoodItems, mealPhotos } from '../db/schema';
import { PhotoStorageService } from '../services/photo-storage';
import {
  MealPhotoService,
  recalculateMealTotals,
  deletePhotosWithFoodItems,
} from '../services/meal-photo.service';
import { AIAnalysisService } from '../services/ai-analysis';
import { AIUsageService } from '../services/ai-usage';
import { aiUsageLimitCheck } from '../middleware/ai-usage-limit';
import { getAIConfigFromEnv } from '../lib/ai-provider';
import type { Database } from '../db';
import {
  createFoodItemSchema,
  updateFoodItemSchema,
  saveMealAnalysisSchema,
  textAnalysisRequestSchema,
  ANALYSIS_SOURCE,
  MEAL_CONTENT_DELIMITER,
  type FoodItem,
} from '@lifestyle-app/shared';

type Bindings = {
  DB: D1Database;
  PHOTOS: R2Bucket;
  GOOGLE_GENERATIVE_AI_API_KEY?: string;
  AI_PROVIDER?: string;
  AI_MODEL?: string;
};

type Variables = {
  db: Database;
  userId: string;
};

export const mealAnalysis = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// All meal-analysis routes require authentication — including photo serving.
// Photos were previously served with no auth and no owner check, so any leaked
// key (DB value, client response, log, Referer) let anyone view another user's
// meal photo (IDOR, #97). The session cookie is httpOnly + same-origin
// (SameSite=Lax), so <img> requests still carry it and image display is
// unaffected by requiring auth here.
mealAnalysis.use('*', authMiddleware);

// GET /api/meals/photos/* - Serve a meal photo to its owner only.
// The wildcard captures keys whose slashes the client percent-encodes.
mealAnalysis.get('/photos/*', async (c) => {
  const userId = c.get('user').id;
  const db = c.get('db');

  const key = c.req.path.replace('/api/meals/photos/', '');
  const decodedKey = decodeURIComponent(key);

  // Ownership check: the requested key must belong to a photo on one of the
  // caller's meals. meal_photos always stores the currently-served key (a
  // temp/<uuid> key during the analysis review flow, a photos/<userId>/... key
  // after save), linked via meal_id to meal_records.user_id — so this single
  // lookup covers both temp and permanent keys without trusting the key format.
  const owner = await db
    .select({ userId: mealRecords.userId })
    .from(mealPhotos)
    .innerJoin(mealRecords, eq(mealPhotos.mealId, mealRecords.id))
    .where(eq(mealPhotos.photoKey, decodedKey))
    .get();

  // Use the same 404 for "missing" and "not yours" so the response never
  // reveals whether a key exists for a different user.
  if (!owner || owner.userId !== userId) {
    return c.json({ error: 'not_found', message: '写真が見つかりません' }, 404);
  }

  const photoStorage = new PhotoStorageService(c.env.PHOTOS);
  const result = await photoStorage.getPhotoForServing(decodedKey);
  if (!result) {
    return c.json({ error: 'not_found', message: '写真が見つかりません' }, 404);
  }

  return new Response(result.body, {
    headers: {
      'Content-Type': result.contentType,
      // Per-user private content: keep it out of shared/CDN caches. A short
      // browser cache still avoids re-fetching within a viewing session.
      'Cache-Control': 'private, max-age=3600',
    },
  });
});

// POST /api/meals/analyze - Analyze meal photo
mealAnalysis.post('/analyze', async (c) => {
  // Check AI usage limit
  const limitCheck = await aiUsageLimitCheck(c);
  if (limitCheck) return limitCheck;

  const formData = await c.req.formData();
  const photo = formData.get('photo') as File | null;
  // Optional: client can send recordedAt with timezone offset
  const clientRecordedAt = formData.get('recordedAt') as string | null;

  if (!photo) {
    return c.json({ error: 'invalid_request', message: '写真が必要です' }, 400);
  }

  // Validate file type
  if (!photo.type.startsWith('image/')) {
    return c.json({ error: 'invalid_request', message: '画像ファイルを選択してください' }, 400);
  }

  // Validate file size (10MB max)
  if (photo.size > 10 * 1024 * 1024) {
    return c.json({ error: 'invalid_request', message: 'ファイルサイズは10MB以下にしてください' }, 400);
  }

  const db = c.get('db');
  const userId = c.get('user').id;
  const photoStorage = new PhotoStorageService(c.env.PHOTOS);

  // Upload photo for analysis
  const photoData = await photo.arrayBuffer();
  const tempPhotoKey = await photoStorage.uploadForAnalysis(photoData, photo.type);

  try {
    // Analyze with AI
    const aiConfig = getAIConfigFromEnv(c.env);
    const aiService = new AIAnalysisService(aiConfig);
    const analysisResult = await aiService.analyzeMealPhoto(photoData, photo.type);

    if (!analysisResult.success) {
      // Delete temp photo on failure
      await photoStorage.deleteTempPhoto(tempPhotoKey);
      return c.json(analysisResult.failure, 422);
    }

    // Create meal record
    const mealId = uuidv4();
    const now = new Date().toISOString();
    // Use client-provided recordedAt if available (with timezone offset)
    const recordedAt = clientRecordedAt || now;

    await db.insert(mealRecords).values({
      id: mealId,
      userId,
      mealType: 'lunch', // Default, will be set when saving
      content: analysisResult.result.foodItems.map((f) => f.name).join(MEAL_CONTENT_DELIMITER),
      calories: analysisResult.result.totals.calories,
      totalProtein: analysisResult.result.totals.protein,
      totalFat: analysisResult.result.totals.fat,
      totalCarbs: analysisResult.result.totals.carbs,
      analysisSource: ANALYSIS_SOURCE.ai,
      recordedAt,
      createdAt: now,
      updatedAt: now,
    });

    // Insert food items
    for (const item of analysisResult.result.foodItems) {
      await db.insert(mealFoodItems).values({
        id: item.id,
        mealId,
        name: item.name,
        portion: item.portion,
        calories: item.calories,
        protein: item.protein,
        fat: item.fat,
        carbs: item.carbs,
        createdAt: now,
      });
    }

    // Add photo to meal_photos table
    const photoService = new MealPhotoService(db);
    const mealPhoto = await photoService.addPhoto({
      mealId,
      photoKey: tempPhotoKey,
    });

    // Update photo with analysis results
    await photoService.updateAnalysisResult(mealPhoto.id, analysisResult.result.totals);

    // Record AI usage
    if (analysisResult.usage) {
      const aiUsageService = new AIUsageService(db);
      await aiUsageService.recordUsage(userId, 'image_analysis', analysisResult.usage);
    }

    return c.json({
      mealId,
      photoKey: tempPhotoKey,
      foodItems: analysisResult.result.foodItems,
      totals: analysisResult.result.totals,
    });
  } catch (error) {
    // Delete temp photo on error
    await photoStorage.deleteTempPhoto(tempPhotoKey);
    throw error;
  }
});

// POST /api/meals/analyze-text - Analyze meal from text input (T007)
mealAnalysis.post(
  '/analyze-text',
  zValidator('json', textAnalysisRequestSchema),
  async (c) => {
    // Check AI usage limit
    const limitCheck = await aiUsageLimitCheck(c);
    if (limitCheck) return limitCheck;

    const data = c.req.valid('json');
    const db = c.get('db');
    const userId = c.get('user').id;

    const aiConfig = getAIConfigFromEnv(c.env);
    const aiService = new AIAnalysisService(aiConfig);
    const analysisResult = await aiService.analyzeMealText(data.text, data.currentTime);

    if (!analysisResult.success) {
      return c.json(analysisResult.failure, 422);
    }

    // Create meal record with inferred date/time
    const mealId = uuidv4();
    const now = new Date().toISOString();
    const recordedAt = analysisResult.result.inferredRecordedAt;

    await db.insert(mealRecords).values({
      id: mealId,
      userId,
      mealType: analysisResult.result.inferredMealType,
      content: analysisResult.result.foodItems.map((f) => f.name).join(MEAL_CONTENT_DELIMITER),
      calories: analysisResult.result.totals.calories,
      totalProtein: analysisResult.result.totals.protein,
      totalFat: analysisResult.result.totals.fat,
      totalCarbs: analysisResult.result.totals.carbs,
      analysisSource: ANALYSIS_SOURCE.ai,
      recordedAt,
      createdAt: now,
      updatedAt: now,
    });

    // Insert food items
    for (const item of analysisResult.result.foodItems) {
      await db.insert(mealFoodItems).values({
        id: item.id,
        mealId,
        name: item.name,
        portion: item.portion,
        calories: item.calories,
        protein: item.protein,
        fat: item.fat,
        carbs: item.carbs,
        createdAt: now,
      });
    }

    // Record AI usage
    if (analysisResult.usage) {
      const aiUsageService = new AIUsageService(db);
      await aiUsageService.recordUsage(userId, 'text_analysis', analysisResult.usage);
    }

    return c.json({
      mealId,
      foodItems: analysisResult.result.foodItems,
      totals: analysisResult.result.totals,
      inferredMealType: analysisResult.result.inferredMealType,
      mealTypeSource: analysisResult.result.mealTypeSource,
      inferredRecordedAt: analysisResult.result.inferredRecordedAt,
      dateTimeSource: analysisResult.result.dateTimeSource,
    });
  }
);

// Schema for create-empty endpoint
const createEmptySchema = z.object({
  recordedAt: z.string().regex(/^.+([+-]\d{2}:\d{2}|Z)$/).optional(),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional(),
  content: z.string().optional(),
});

// POST /api/meals/create-empty - Create empty meal for manual input
mealAnalysis.post('/create-empty', zValidator('json', createEmptySchema), async (c) => {
  const db = c.get('db');
  const userId = c.get('user').id;
  const data = c.req.valid('json');

  const mealId = uuidv4();
  const now = new Date().toISOString();
  // Use client-provided recordedAt if available (with timezone offset)
  const recordedAt = data.recordedAt || now;

  await db.insert(mealRecords).values({
    id: mealId,
    userId,
    mealType: data.mealType || 'lunch',
    content: data.content || '',
    calories: 0,
    totalProtein: 0,
    totalFat: 0,
    totalCarbs: 0,
    analysisSource: ANALYSIS_SOURCE.manual,
    recordedAt,
    createdAt: now,
    updatedAt: now,
  });

  return c.json({ mealId });
});

// GET /api/meals/:mealId/food-items - Get food items for a meal
mealAnalysis.get('/:mealId/food-items', async (c) => {
  const mealId = c.req.param('mealId');
  const db = c.get('db');
  const userId = c.get('user').id;

  // Verify meal belongs to user
  const meal = await db.query.mealRecords.findFirst({
    where: and(eq(mealRecords.id, mealId), eq(mealRecords.userId, userId)),
  });

  if (!meal) {
    return c.json({ error: 'not_found', message: '食事記録が見つかりません' }, 404);
  }

  const items = await db.query.mealFoodItems.findMany({
    where: eq(mealFoodItems.mealId, mealId),
  });

  const foodItems: FoodItem[] = items.map((item) => ({
    id: item.id,
    name: item.name,
    portion: item.portion as 'small' | 'medium' | 'large',
    calories: item.calories,
    protein: item.protein,
    fat: item.fat,
    carbs: item.carbs,
  }));

  return c.json({ foodItems });
});

// POST /api/meals/:mealId/food-items - Add food item
mealAnalysis.post(
  '/:mealId/food-items',
  zValidator('json', createFoodItemSchema),
  async (c) => {
    const mealId = c.req.param('mealId');
    const data = c.req.valid('json');
    const db = c.get('db');
    const userId = c.get('user').id;

    // Verify meal belongs to user
    const meal = await db.query.mealRecords.findFirst({
      where: and(eq(mealRecords.id, mealId), eq(mealRecords.userId, userId)),
    });

    if (!meal) {
      return c.json({ error: 'not_found', message: '食事記録が見つかりません' }, 404);
    }

    const itemId = uuidv4();
    const now = new Date().toISOString();

    await db.insert(mealFoodItems).values({
      id: itemId,
      mealId,
      name: data.name,
      portion: data.portion,
      calories: data.calories,
      protein: data.protein,
      fat: data.fat,
      carbs: data.carbs,
      createdAt: now,
    });

    const foodItem: FoodItem = {
      id: itemId,
      ...data,
    };

    // Recalculate totals
    const updatedTotals = await recalculateMealTotals(db, mealId);

    return c.json({ foodItem, updatedTotals }, 201);
  }
);

// PATCH /api/meals/:mealId/food-items/:foodItemId - Update food item
mealAnalysis.patch(
  '/:mealId/food-items/:foodItemId',
  zValidator('json', updateFoodItemSchema),
  async (c) => {
    const mealId = c.req.param('mealId');
    const foodItemId = c.req.param('foodItemId');
    const data = c.req.valid('json');
    const db = c.get('db');
    const userId = c.get('user').id;

    // Verify meal belongs to user
    const meal = await db.query.mealRecords.findFirst({
      where: and(eq(mealRecords.id, mealId), eq(mealRecords.userId, userId)),
    });

    if (!meal) {
      return c.json({ error: 'not_found', message: '食事記録が見つかりません' }, 404);
    }

    // Verify food item exists
    const existingItem = await db.query.mealFoodItems.findFirst({
      where: and(eq(mealFoodItems.id, foodItemId), eq(mealFoodItems.mealId, mealId)),
    });

    if (!existingItem) {
      return c.json({ error: 'not_found', message: '食材が見つかりません' }, 404);
    }

    await db
      .update(mealFoodItems)
      .set(data)
      .where(eq(mealFoodItems.id, foodItemId));

    const updated = await db.query.mealFoodItems.findFirst({
      where: eq(mealFoodItems.id, foodItemId),
    });

    const foodItem: FoodItem = {
      id: updated!.id,
      name: updated!.name,
      portion: updated!.portion as 'small' | 'medium' | 'large',
      calories: updated!.calories,
      protein: updated!.protein,
      fat: updated!.fat,
      carbs: updated!.carbs,
    };

    // Recalculate totals
    const updatedTotals = await recalculateMealTotals(db, mealId);

    return c.json({ foodItem, updatedTotals });
  }
);

// DELETE /api/meals/:mealId/food-items/:foodItemId - Delete food item
mealAnalysis.delete('/:mealId/food-items/:foodItemId', async (c) => {
  const mealId = c.req.param('mealId');
  const foodItemId = c.req.param('foodItemId');
  const db = c.get('db');
  const userId = c.get('user').id;

  // Verify meal belongs to user
  const meal = await db.query.mealRecords.findFirst({
    where: and(eq(mealRecords.id, mealId), eq(mealRecords.userId, userId)),
  });

  if (!meal) {
    return c.json({ error: 'not_found', message: '食事記録が見つかりません' }, 404);
  }

  await db.delete(mealFoodItems).where(
    and(eq(mealFoodItems.id, foodItemId), eq(mealFoodItems.mealId, mealId))
  );

  // Recalculate totals
  const updatedTotals = await recalculateMealTotals(db, mealId);

  return c.json({ message: '削除しました', updatedTotals });
});

// DELETE /api/meals/:mealId/photo - Delete meal photo (T032)
// Note: This is a legacy endpoint for single-photo deletion.
// For multi-photo support, use DELETE /api/meals/:mealId/photos/:photoId instead.
mealAnalysis.delete('/:mealId/photo', async (c) => {
  const mealId = c.req.param('mealId');
  const db = c.get('db');
  const userId = c.get('user').id;
  const photoStorage = new PhotoStorageService(c.env.PHOTOS);
  const photoService = new MealPhotoService(db);

  // Verify meal belongs to user
  const meal = await db.query.mealRecords.findFirst({
    where: and(eq(mealRecords.id, mealId), eq(mealRecords.userId, userId)),
  });

  if (!meal) {
    return c.json({ error: 'not_found', message: '食事記録が見つかりません' }, 404);
  }

  // Get photos from meal_photos table
  const photos = await photoService.getMealPhotos(mealId);
  if (photos.length === 0) {
    return c.json({ error: 'not_found', message: '写真が設定されていません' }, 404);
  }

  // Delete all photos + their food items, then recompute totals (#101).
  // Previously this only removed meal_photos rows, leaving orphaned food items
  // and stale meal_records totals.
  await deletePhotosWithFoodItems(db, photoStorage, mealId, photos);

  return c.json({ success: true, message: '写真を削除しました' });
});

// POST /api/meals/:mealId/photo - Add/replace meal photo (T033)
// Note: This is a legacy endpoint for single-photo replacement.
// For multi-photo support, use POST /api/meals/:mealId/photos instead.
mealAnalysis.post('/:mealId/photo', async (c) => {
  const mealId = c.req.param('mealId');
  const db = c.get('db');
  const userId = c.get('user').id;
  const photoStorage = new PhotoStorageService(c.env.PHOTOS);
  const photoService = new MealPhotoService(db);

  // Verify meal belongs to user
  const meal = await db.query.mealRecords.findFirst({
    where: and(eq(mealRecords.id, mealId), eq(mealRecords.userId, userId)),
  });

  if (!meal) {
    return c.json({ error: 'not_found', message: '食事記録が見つかりません' }, 404);
  }

  const formData = await c.req.formData();
  const photo = formData.get('photo') as File | null;

  if (!photo) {
    return c.json({ error: 'invalid_request', message: '写真が必要です' }, 400);
  }

  // Validate file type
  if (!photo.type.startsWith('image/')) {
    return c.json({ error: 'invalid_request', message: '画像ファイルを選択してください' }, 400);
  }

  // Validate file size (10MB max)
  if (photo.size > 10 * 1024 * 1024) {
    return c.json({ error: 'invalid_request', message: 'ファイルサイズは10MB以下にしてください' }, 400);
  }

  // Delete old photos (+ their food items) and reconcile totals before adding
  // the replacement (legacy single-photo behavior). Previously this left
  // orphaned food items and stale totals (#101).
  const existingPhotos = await photoService.getMealPhotos(mealId);
  if (existingPhotos.length > 0) {
    await deletePhotosWithFoodItems(db, photoStorage, mealId, existingPhotos);
  }

  // Upload new photo directly as permanent (not temp)
  const photoData = await photo.arrayBuffer();
  const permanentPhotoKey = await photoStorage.saveForRecord(
    await photoStorage.uploadForAnalysis(photoData, photo.type),
    mealId,
    userId
  );

  // Create meal_photos record
  await photoService.addPhoto({
    mealId,
    photoKey: permanentPhotoKey,
  });

  return c.json({
    success: true,
    photoKey: permanentPhotoKey,
    message: '写真をアップロードしました',
  });
});

// POST /api/meals/:mealId/save - Save meal record
mealAnalysis.post(
  '/:mealId/save',
  zValidator('json', saveMealAnalysisSchema),
  async (c) => {
    const mealId = c.req.param('mealId');
    const data = c.req.valid('json');
    const db = c.get('db');
    const userId = c.get('user').id;
    const photoStorage = new PhotoStorageService(c.env.PHOTOS);
    const photoService = new MealPhotoService(db);

    // Verify meal belongs to user
    const meal = await db.query.mealRecords.findFirst({
      where: and(eq(mealRecords.id, mealId), eq(mealRecords.userId, userId)),
    });

    if (!meal) {
      return c.json({ error: 'not_found', message: '食事記録が見つかりません' }, 404);
    }

    // Move photos from temp to permanent storage
    const photos = await photoService.getMealPhotos(mealId);
    for (const photo of photos) {
      if (photo.photoKey.startsWith('temp/')) {
        const permanentPhotoKey = await photoStorage.saveForRecord(photo.photoKey, mealId, userId);
        await db
          .update(mealPhotos)
          .set({ photoKey: permanentPhotoKey })
          .where(eq(mealPhotos.id, photo.id));
      }
    }

    const now = new Date().toISOString();
    const recordedAt = data.recordedAt || now;

    // Get food items for content
    const items = await db.query.mealFoodItems.findMany({
      where: eq(mealFoodItems.mealId, mealId),
    });
    const content = items.map((i) => i.name).join(MEAL_CONTENT_DELIMITER);

    await db
      .update(mealRecords)
      .set({
        mealType: data.mealType,
        content,
        recordedAt,
        updatedAt: now,
      })
      .where(eq(mealRecords.id, mealId));

    const updatedMeal = await db.query.mealRecords.findFirst({
      where: eq(mealRecords.id, mealId),
    });

    return c.json({
      meal: {
        id: updatedMeal!.id,
        mealType: updatedMeal!.mealType,
        content: updatedMeal!.content,
        calories: updatedMeal!.calories,
        totalProtein: updatedMeal!.totalProtein,
        totalFat: updatedMeal!.totalFat,
        totalCarbs: updatedMeal!.totalCarbs,
        analysisSource: updatedMeal!.analysisSource,
        recordedAt: updatedMeal!.recordedAt,
      },
    });
  }
);

// recalculateTotals was consolidated into recalculateMealTotals in
// services/meal-photo.service.ts (the single source of truth for meal totals, #101).
