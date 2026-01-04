import { generateObject } from 'ai';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { getAIProvider, getModelId, type AIConfig } from '../lib/ai-provider';
import type {
  FoodItem,
  NutritionTotals,
  AnalysisResult,
  AnalysisFailure,
  TextAnalysisResponse,
  TextAnalysisError,
  MealTypeSource,
  DateTimeSource,
} from '@lifestyle-app/shared';

// Token usage (normalized from AI SDK's inputTokens/outputTokens)
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// Helper to normalize AI SDK usage to our format
function normalizeUsage(usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number } | undefined): TokenUsage | undefined {
  console.log('normalizeUsage input:', JSON.stringify(usage));
  if (!usage || usage.inputTokens === undefined || usage.outputTokens === undefined) {
    console.log('normalizeUsage returning undefined - missing required fields');
    return undefined;
  }
  const inputTokens = usage.inputTokens;
  const outputTokens = usage.outputTokens;
  // Calculate totalTokens if not provided
  const totalTokens = usage.totalTokens ?? (inputTokens + outputTokens);
  const result = {
    promptTokens: inputTokens,
    completionTokens: outputTokens,
    totalTokens,
  };
  console.log('normalizeUsage result:', JSON.stringify(result));
  return result;
}

// Schema for AI response validation
const aiResponseSchema = z.object({
  foods: z.array(
    z.object({
      name: z.string(),
      portion: z.enum(['small', 'medium', 'large']),
      calories: z.number().int(),
      protein: z.number(),
      fat: z.number(),
      carbs: z.number(),
    })
  ),
  isFood: z.boolean(),
  message: z.string().optional(),
});

// Schema for text-based AI response validation (T005)
const aiTextResponseSchema = z.object({
  foods: z.array(
    z.object({
      name: z.string(),
      portion: z.enum(['small', 'medium', 'large']),
      calories: z.number().int(),
      protein: z.number(),
      fat: z.number(),
      carbs: z.number(),
    })
  ),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).nullable(),
  mealTypeFromText: z.boolean(),
  // Date/time inference from text (e.g., "昨日", "今朝", "先週")
  dateOffset: z.object({
    days: z.number().int(), // days ago (0 = today, 1 = yesterday, -1 = tomorrow)
    timeOfDay: z.enum(['morning', 'noon', 'evening', 'night']).nullable(),
  }).nullable(),
  dateFromText: z.boolean(),
});

const TEXT_ANALYSIS_PROMPT = `あなたは食事の栄養分析の専門家です。
ユーザーが入力したテキストから食事内容を分析し、以下のJSON形式で結果を返してください。

## 出力形式
{
  "foods": [
    {
      "name": "食材名（日本語）",
      "portion": "small" | "medium" | "large",
      "calories": 推定カロリー（整数）,
      "protein": タンパク質g（小数点1桁）,
      "fat": 脂質g（小数点1桁）,
      "carbs": 炭水化物g（小数点1桁）
    }
  ],
  "mealType": "breakfast" | "lunch" | "dinner" | "snack" | null,
  "mealTypeFromText": true/false,
  "dateOffset": {
    "days": 何日前か（0=今日、1=昨日、2=一昨日...）,
    "timeOfDay": "morning" | "noon" | "evening" | "night" | null
  } | null,
  "dateFromText": true/false
}

## ルール
- テキストから全ての食材を識別してください
- カロリーと栄養素は一般的な量を基準に推定してください
- portion は「大盛り」「小さめ」などのテキストがあれば反映、なければ medium
- 「朝ごはん」「昼食」「ランチ」「夕飯」「夜食」「おやつ」などのキーワードがあれば mealType を設定し mealTypeFromText を true に
- キーワードがなければ mealType は null、mealTypeFromText は false
- 「昨日」「一昨日」「今朝」「昨日の夜」「先週の金曜」などの日時表現があれば dateOffset を設定し dateFromText を true に
  - days: 0=今日、1=昨日、2=一昨日、7=先週...（正の数=過去、負の数は使わない）
  - timeOfDay: morning(朝/午前)、noon(昼/正午)、evening(夕方/夕食)、night(夜/深夜)
- 日時表現がなければ dateOffset は null、dateFromText は false
- 日本の食事に対応してください（和食、洋食、中華等）`;

const MEAL_ANALYSIS_PROMPT = `あなたは食事の栄養分析の専門家です。
提供された食事の写真を分析し、以下のJSON形式で結果を返してください。

## 出力形式
{
  "foods": [
    {
      "name": "食材名（日本語）",
      "portion": "small" | "medium" | "large",
      "calories": 推定カロリー（整数）,
      "protein": タンパク質g（小数点1桁）,
      "fat": 脂質g（小数点1桁）,
      "carbs": 炭水化物g（小数点1桁）
    }
  ],
  "isFood": true/false,
  "message": "食事が認識できない場合のメッセージ"
}

## ルール
- 写真に写っている全ての食材を識別してください
- カロリーと栄養素は一般的な量を基準に推定してください
- portion は見た目から small/medium/large で判断してください
- 食事以外の写真の場合は isFood: false を返してください
- 日本の食事に対応してください（和食、洋食、中華等）`;

export class AIAnalysisService {
  constructor(private config: AIConfig) {}

  /**
   * Analyze a meal photo and return identified foods with nutritional info.
   */
  async analyzeMealPhoto(
    imageData: ArrayBuffer,
    mimeType: string
  ): Promise<{ success: true; result: Omit<AnalysisResult, 'mealId' | 'photoKey'>; usage?: TokenUsage } | { success: false; failure: AnalysisFailure }> {
    try {
      const provider = getAIProvider(this.config);
      const modelId = getModelId(this.config);

      // Convert ArrayBuffer to base64
      const base64Image = this.arrayBufferToBase64(imageData);

      const { object, usage } = await generateObject({
        model: provider(modelId),
        schema: aiResponseSchema,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: MEAL_ANALYSIS_PROMPT },
              {
                type: 'image',
                image: `data:${mimeType};base64,${base64Image}`,
              },
            ],
          },
        ],
      });

      if (!object.isFood) {
        return {
          success: false,
          failure: {
            error: 'not_food',
            message: object.message || '食事を識別できませんでした。食事の写真を撮影してください。',
          },
        };
      }

      // Convert AI response to FoodItem format with UUIDs
      const foodItems: FoodItem[] = object.foods.map((food) => ({
        id: uuidv4(),
        name: food.name,
        portion: food.portion,
        calories: food.calories,
        protein: Math.round(food.protein * 10) / 10,
        fat: Math.round(food.fat * 10) / 10,
        carbs: Math.round(food.carbs * 10) / 10,
      }));

      // Calculate totals
      const totals = this.calculateTotals(foodItems);

      return {
        success: true,
        result: {
          foodItems,
          totals,
        },
        usage: normalizeUsage(usage),
      };
    } catch (error) {
      console.error('AI analysis error:', error);
      return {
        success: false,
        failure: {
          error: 'analysis_failed',
          message: '分析中にエラーが発生しました。しばらくしてからお試しください。',
        },
      };
    }
  }

  /**
   * Calculate nutrition totals from food items.
   */
  calculateTotals(foodItems: FoodItem[]): NutritionTotals {
    return foodItems.reduce(
      (totals, item) => ({
        calories: totals.calories + item.calories,
        protein: Math.round((totals.protein + item.protein) * 10) / 10,
        fat: Math.round((totals.fat + item.fat) * 10) / 10,
        carbs: Math.round((totals.carbs + item.carbs) * 10) / 10,
      }),
      { calories: 0, protein: 0, fat: 0, carbs: 0 }
    );
  }

  /**
   * Analyze meal from text input and return nutritional info with meal type (T005).
   */
  async analyzeMealText(
    text: string,
    currentTime?: string
  ): Promise<
    | { success: true; result: Omit<TextAnalysisResponse, 'mealId'>; usage?: TokenUsage }
    | { success: false; failure: TextAnalysisError }
  > {
    try {
      const provider = getAIProvider(this.config);
      const modelId = getModelId(this.config);

      const { object, usage } = await generateObject({
        model: provider(modelId),
        schema: aiTextResponseSchema,
        messages: [
          {
            role: 'user',
            content: `${TEXT_ANALYSIS_PROMPT}\n\n入力テキスト: ${text}`,
          },
        ],
      });

      // Debug: Log raw usage from AI SDK
      console.log('AI SDK raw usage:', JSON.stringify(usage));

      if (object.foods.length === 0) {
        return {
          success: false,
          failure: {
            error: 'analysis_failed',
            message: '食事内容を識別できませんでした。もう一度入力してください。',
          },
        };
      }

      // Convert AI response to FoodItem format with UUIDs
      const foodItems: FoodItem[] = object.foods.map((food) => ({
        id: uuidv4(),
        name: food.name,
        portion: food.portion,
        calories: food.calories,
        protein: Math.round(food.protein * 10) / 10,
        fat: Math.round(food.fat * 10) / 10,
        carbs: Math.round(food.carbs * 10) / 10,
      }));

      // Calculate totals
      const totals = this.calculateTotals(foodItems);

      // Determine meal type and source
      let inferredMealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
      let mealTypeSource: MealTypeSource;

      if (object.mealTypeFromText && object.mealType) {
        inferredMealType = object.mealType;
        mealTypeSource = 'text';
      } else {
        inferredMealType = inferMealType(currentTime);
        mealTypeSource = 'time';
      }

      // Determine date/time and source
      const now = currentTime ? new Date(currentTime) : new Date();
      let inferredRecordedAt: string;
      let dateTimeSource: DateTimeSource;

      if (object.dateFromText && object.dateOffset) {
        // Calculate date from offset
        const targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() - object.dateOffset.days);

        // Set time based on timeOfDay
        if (object.dateOffset.timeOfDay) {
          switch (object.dateOffset.timeOfDay) {
            case 'morning':
              targetDate.setHours(8, 0, 0, 0);
              break;
            case 'noon':
              targetDate.setHours(12, 0, 0, 0);
              break;
            case 'evening':
              targetDate.setHours(18, 0, 0, 0);
              break;
            case 'night':
              targetDate.setHours(21, 0, 0, 0);
              break;
          }
        } else {
          // Use meal type to infer time if not specified
          switch (inferredMealType) {
            case 'breakfast':
              targetDate.setHours(8, 0, 0, 0);
              break;
            case 'lunch':
              targetDate.setHours(12, 0, 0, 0);
              break;
            case 'dinner':
              targetDate.setHours(19, 0, 0, 0);
              break;
            case 'snack':
              targetDate.setHours(15, 0, 0, 0);
              break;
          }
        }

        inferredRecordedAt = targetDate.toISOString();
        dateTimeSource = 'text';
      } else {
        inferredRecordedAt = now.toISOString();
        dateTimeSource = 'now';
      }

      return {
        success: true,
        result: {
          foodItems,
          totals,
          inferredMealType,
          mealTypeSource,
          inferredRecordedAt,
          dateTimeSource,
        },
        usage: normalizeUsage(usage),
      };
    } catch (error) {
      console.error('AI text analysis error:', error);
      return {
        success: false,
        failure: {
          error: 'analysis_failed',
          message: '分析中にエラーが発生しました。しばらくしてからお試しください。',
        },
      };
    }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

/**
 * Infer meal type from current time (T006).
 * 6-10 → breakfast, 11-14 → lunch, 17-21 → dinner, else → snack
 */
export function inferMealType(currentTime?: string): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  const date = currentTime ? new Date(currentTime) : new Date();
  const hour = date.getHours();

  if (hour >= 6 && hour < 10) {
    return 'breakfast';
  } else if (hour >= 11 && hour < 14) {
    return 'lunch';
  } else if (hour >= 17 && hour < 21) {
    return 'dinner';
  } else {
    return 'snack';
  }
}
