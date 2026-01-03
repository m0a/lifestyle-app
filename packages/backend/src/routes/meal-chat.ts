import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { v4 as uuidv4 } from 'uuid';
import { eq, and, asc } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { mealRecords, mealFoodItems, mealChatMessages } from '../db/schema';
import { AIChatService } from '../services/ai-chat';
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

    // Set up SSE response
    const encoder = new TextEncoder();
    let fullResponse = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of chatService.chat(currentMeal, history, message)) {
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

    // Update meal record (including recordedAt if changed)
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

    await db
      .update(mealRecords)
      .set(mealUpdateData)
      .where(eq(mealRecords.id, mealId));

    return c.json({
      foodItems,
      updatedTotals: totals,
      recordedAt: newRecordedAt || meal.recordedAt,
    });
  }
);
