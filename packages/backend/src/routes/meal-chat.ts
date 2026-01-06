import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { v4 as uuidv4 } from 'uuid';
import { nanoid } from 'nanoid';
import { eq, and, asc } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { mealRecords, mealFoodItems, mealChatMessages } from '../db/schema';
import * as schema from '../db/schema';
import { AIChatService } from '../services/ai-chat';
import { AIUsageService } from '../services/ai-usage';
import { AIAnalysisService } from '../services/ai-analysis';
import { MealPhotoService } from '../services/meal-photo.service';
import { PhotoStorageService } from '../services/photo-storage';
import { getAIConfigFromEnv } from '../lib/ai-provider';
import type { Database } from '../db';
import {
  sendChatMessageSchema,
  applyChatSuggestionSchema,
  type FoodItem,
  type ChatMessage,
  type NutritionTotals,
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

export const mealChat = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// All routes require auth
mealChat.use('/*', authMiddleware);

// GET /api/meals/:mealId/chat - Get chat history
mealChat.get('/:mealId/chat', async (c) => {
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

  const chatMessages = await db.query.mealChatMessages.findMany({
    where: eq(mealChatMessages.mealId, mealId),
    orderBy: [asc(mealChatMessages.createdAt)],
  });

  const messages: ChatMessage[] = chatMessages.map((msg) => ({
    id: msg.id,
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
    appliedChanges: msg.appliedChanges ? JSON.parse(msg.appliedChanges) : undefined,
    createdAt: msg.createdAt,
  }));

  return c.json({ messages });
});

// POST /api/meals/:mealId/chat - Send chat message (streaming)
mealChat.post(
  '/:mealId/chat',
  zValidator('json', sendChatMessageSchema),
  async (c) => {
    const mealId = c.req.param('mealId');
    const { message } = c.req.valid('json');
    const db = c.get('db');
    const userId = c.get('user').id;

    // Verify meal belongs to user
    const meal = await db.query.mealRecords.findFirst({
      where: and(eq(mealRecords.id, mealId), eq(mealRecords.userId, userId)),
    });

    if (!meal) {
      return c.json({ error: 'not_found', message: '食事記録が見つかりません' }, 404);
    }

    // Get current food items
    const foodItemsData = await db.query.mealFoodItems.findMany({
      where: eq(mealFoodItems.mealId, mealId),
    });

    const currentMeal: FoodItem[] = foodItemsData.map((item) => ({
      id: item.id,
      name: item.name,
      portion: item.portion as 'small' | 'medium' | 'large',
      calories: item.calories,
      protein: item.protein,
      fat: item.fat,
      carbs: item.carbs,
    }));

    // Get chat history
    const chatHistory = await db.query.mealChatMessages.findMany({
      where: eq(mealChatMessages.mealId, mealId),
      orderBy: [asc(mealChatMessages.createdAt)],
    });

    const history: ChatMessage[] = chatHistory.map((msg) => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      createdAt: msg.createdAt,
    }));

    // Save user message
    const userMessageId = uuidv4();
    const now = new Date().toISOString();

    await db.insert(mealChatMessages).values({
      id: userMessageId,
      mealId,
      role: 'user',
      content: message,
      createdAt: now,
    });

    // Get AI response (streaming)
    const aiConfig = getAIConfigFromEnv(c.env);
    const chatService = new AIChatService(aiConfig);
    const chatResult = chatService.chat(currentMeal, history, message);

    // Set up SSE response
    const encoder = new TextEncoder();
    let fullResponse = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of chatResult.textStream) {
            fullResponse += chunk;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
          }

          // Parse changes from full response
          const changes = chatService.parseChanges(fullResponse);
          const displayText = chatService.extractDisplayText(fullResponse);

          // Save assistant message
          const assistantMessageId = uuidv4();
          const assistantNow = new Date().toISOString();

          await db.insert(mealChatMessages).values({
            id: assistantMessageId,
            mealId,
            role: 'assistant',
            content: displayText,
            appliedChanges: changes.length > 0 ? JSON.stringify(changes) : null,
            createdAt: assistantNow,
          });

          // Record AI usage (must await to complete before stream closes)
          const usage = await chatResult.getUsage();
          if (usage) {
            const aiUsageService = new AIUsageService(db);
            await aiUsageService.recordUsage(userId, 'chat', usage);
          }

          // Send completion event with changes
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ done: true, messageId: assistantMessageId, changes })}\n\n`
            )
          );
          controller.close();
        } catch (error) {
          console.error('Chat error:', error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: 'チャット中にエラーが発生しました' })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }
);

// POST /api/meals/:mealId/chat/apply - Apply chat suggestions
mealChat.post(
  '/:mealId/chat/apply',
  zValidator('json', applyChatSuggestionSchema, (result, c) => {
    if (!result.success) {
      console.error('[Chat Apply] Validation failed:', JSON.stringify(result.error.errors, null, 2));
      console.error('[Chat Apply] Request body:', JSON.stringify(result.data, null, 2));
      return c.json({
        message: 'バリデーションエラー',
        code: 'VALIDATION_ERROR',
        errors: result.error.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
      }, 400);
    }
  }),
  async (c) => {
    const mealId = c.req.param('mealId');
    const { changes } = c.req.valid('json');
    const db = c.get('db');
    const userId = c.get('user').id;

    // Verify meal belongs to user
    const meal = await db.query.mealRecords.findFirst({
      where: and(eq(mealRecords.id, mealId), eq(mealRecords.userId, userId)),
    });

    if (!meal) {
      return c.json({ error: 'not_found', message: '食事記録が見つかりません' }, 404);
    }

    const now = new Date().toISOString();
    let newRecordedAt: string | undefined;
    let newMealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | undefined;

    // Apply each change (discriminated union - each action has specific required fields)
    for (const change of changes) {
      switch (change.action) {
        case 'add':
          // For 'add', foodItem is required by schema
          await db.insert(mealFoodItems).values({
            id: uuidv4(),
            mealId,
            name: change.foodItem.name,
            portion: change.foodItem.portion,
            calories: change.foodItem.calories,
            protein: change.foodItem.protein,
            fat: change.foodItem.fat,
            carbs: change.foodItem.carbs,
            createdAt: now,
          });
          break;
        case 'remove':
          // For 'remove', foodItemId is required by schema
          await db.delete(mealFoodItems).where(
            and(eq(mealFoodItems.id, change.foodItemId), eq(mealFoodItems.mealId, mealId))
          );
          break;
        case 'update': {
          // For 'update', foodItemId and foodItem are required by schema
          // foodItem is partial - only update fields that are defined
          const updateData: Record<string, unknown> = {};
          const item = change.foodItem;
          if (item['name'] !== undefined) updateData['name'] = item['name'];
          if (item['portion'] !== undefined) updateData['portion'] = item['portion'];
          if (item['calories'] !== undefined) updateData['calories'] = item['calories'];
          if (item['protein'] !== undefined) updateData['protein'] = item['protein'];
          if (item['fat'] !== undefined) updateData['fat'] = item['fat'];
          if (item['carbs'] !== undefined) updateData['carbs'] = item['carbs'];

          if (Object.keys(updateData).length > 0) {
            await db
              .update(mealFoodItems)
              .set(updateData)
              .where(
                and(eq(mealFoodItems.id, change.foodItemId), eq(mealFoodItems.mealId, mealId))
              );
          }
          break;
        }
        case 'set_datetime':
          // For 'set_datetime', update the recordedAt timestamp
          newRecordedAt = change.recordedAt;
          break;
        case 'set_meal_type':
          // For 'set_meal_type', update the mealType
          newMealType = change.mealType;
          break;
      }
    }

    // Get updated food items
    const updatedItems = await db.query.mealFoodItems.findMany({
      where: eq(mealFoodItems.mealId, mealId),
    });

    const foodItems: FoodItem[] = updatedItems.map((item) => ({
      id: item.id,
      name: item.name,
      portion: item.portion as 'small' | 'medium' | 'large',
      calories: item.calories,
      protein: item.protein,
      fat: item.fat,
      carbs: item.carbs,
    }));

    // Recalculate totals
    const totals: NutritionTotals = foodItems.reduce(
      (acc, item) => ({
        calories: acc.calories + item.calories,
        protein: Math.round((acc.protein + item.protein) * 10) / 10,
        fat: Math.round((acc.fat + item.fat) * 10) / 10,
        carbs: Math.round((acc.carbs + item.carbs) * 10) / 10,
      }),
      { calories: 0, protein: 0, fat: 0, carbs: 0 }
    );

    // Update meal record (including recordedAt and mealType if changed)
    const mealUpdateData: Record<string, unknown> = {
      calories: totals.calories,
      totalProtein: totals.protein,
      totalFat: totals.fat,
      totalCarbs: totals.carbs,
      content: foodItems.map((i) => i.name).join(', '),
      updatedAt: now,
    };
    if (newRecordedAt) {
      mealUpdateData['recordedAt'] = newRecordedAt;
    }
    if (newMealType) {
      mealUpdateData['mealType'] = newMealType;
    }

    await db
      .update(mealRecords)
      .set(mealUpdateData)
      .where(eq(mealRecords.id, mealId));

    return c.json({
      foodItems,
      updatedTotals: totals,
      recordedAt: newRecordedAt || meal.recordedAt,
      mealType: newMealType || meal.mealType,
    });
  }
);

// POST /api/meals/:mealId/chat/add-photo - Add photo via chat interface
mealChat.post('/:mealId/chat/add-photo', async (c) => {
  const mealId = c.req.param('mealId');
  const db = c.get('db');
  const user = c.get('user');

  // Parse multipart form data
  const formData = await c.req.formData();
  const photoFile = formData.get('photo');

  if (!photoFile || !(photoFile instanceof File)) {
    return c.json({ message: 'Photo file required', code: 'MISSING_PHOTO' }, 400);
  }

  // Verify meal belongs to user
  const meal = await db.query.mealRecords.findFirst({
    where: and(eq(mealRecords.id, mealId), eq(mealRecords.userId, user.id)),
  });

  if (!meal) {
    return c.json({ error: 'not_found', message: '食事記録が見つかりません' }, 404);
  }

  // Validate file size (10MB max)
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

    // Create acknowledgment chat message immediately
    const ackMessageId = uuidv4();
    const now = new Date().toISOString();

    await db.insert(mealChatMessages).values({
      id: ackMessageId,
      mealId,
      role: 'assistant',
      content: '写真を追加しました。AI分析を実行中です...',
      createdAt: now,
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
        console.log(`[Chat Photo] Creating ${analysisResult.result.foodItems.length} food items for photo ${photo.id}`);
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
            createdAt: now,
          });
          console.log(`[Chat Photo] Created food item: ${foodItemId} - ${item.name}`);
        }

        // Record AI usage
        if (analysisResult.usage) {
          await aiUsageService.recordUsage(user.id, 'image_analysis', analysisResult.usage);
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

        console.log(`[Chat Photo] Updated meal totals: ${totalCalories} kcal, content: ${contentNames}`);

        // Create follow-up message with analysis results
        const resultMessageId = uuidv4();
        const resultMessage = `分析が完了しました！\n\n追加された食材:\n${analysisResult.result.foodItems.map(item => `- ${item.name} (${item.calories}kcal)`).join('\n')}\n\n合計栄養素:\nカロリー: ${totalCalories}kcal\nタンパク質: ${totalProtein.toFixed(1)}g\n脂質: ${totalFat.toFixed(1)}g\n炭水化物: ${totalCarbs.toFixed(1)}g`;

        await db.insert(mealChatMessages).values({
          id: resultMessageId,
          mealId,
          role: 'assistant',
          content: resultMessage,
          createdAt: new Date().toISOString(),
        });

        // Generate presigned URL
        const photoUrl = await photoStorage.getPresignedUrl(photoKey);

        return c.json({
          photo: { ...photo, photoUrl },
          ackMessageId,
          resultMessageId,
          foodItems: analysisResult.result.foodItems,
          updatedTotals: {
            calories: totalCalories,
            protein: totalProtein,
            fat: totalFat,
            carbs: totalCarbs,
          },
        }, 201);
      } else {
        // Mark analysis as failed
        console.error('[Chat Photo] Analysis failed:', analysisResult.failure);
        await photoService.markAnalysisFailed(photo.id);

        // Update acknowledgment message to indicate failure
        await db.update(mealChatMessages)
          .set({ content: '写真を追加しましたが、AI分析に失敗しました。後で再試行できます。' })
          .where(eq(mealChatMessages.id, ackMessageId));

        const photoUrl = await photoStorage.getPresignedUrl(photoKey);

        return c.json({
          photo: { ...photo, photoUrl },
          ackMessageId,
          error: 'AI分析に失敗しました',
        }, 201);
      }
    } catch (analysisError) {
      // Log error but don't fail the upload
      console.error('[Chat Photo] Photo analysis failed:', analysisError);
      await photoService.markAnalysisFailed(photo.id);

      // Update acknowledgment message
      await db.update(mealChatMessages)
        .set({ content: '写真を追加しましたが、AI分析でエラーが発生しました。' })
        .where(eq(mealChatMessages.id, ackMessageId));

      const photoUrl = await photoStorage.getPresignedUrl(photoKey);

      return c.json({
        photo: { ...photo, photoUrl },
        ackMessageId,
        error: '分析エラー',
      }, 201);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Maximum 10 photos')) {
      return c.json({ message: error.message, code: 'PHOTO_LIMIT_EXCEEDED' }, 400);
    }
    throw error;
  }
});
