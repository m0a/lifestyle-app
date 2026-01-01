import { generateObject } from 'ai';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { getAIProvider, getModelId, type AIConfig } from '../lib/ai-provider';
import type { FoodItem, NutritionTotals, AnalysisResult, AnalysisFailure } from '@lifestyle-app/shared';

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
  ): Promise<{ success: true; result: Omit<AnalysisResult, 'mealId' | 'photoKey'> } | { success: false; failure: AnalysisFailure }> {
    try {
      const provider = getAIProvider(this.config);
      const modelId = getModelId(this.config);

      // Convert ArrayBuffer to base64
      const base64Image = this.arrayBufferToBase64(imageData);

      const { object } = await generateObject({
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

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}
