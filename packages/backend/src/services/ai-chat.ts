import { streamText } from 'ai';
import { getAIProvider, getModelId, type AIConfig } from '../lib/ai-provider';
import type { FoodItem, ChatMessage, FoodItemChange } from '@lifestyle-app/shared';

const CHAT_SYSTEM_PROMPT = `あなたは食事記録のアシスタントです。
ユーザーが**既に食べた食事**を正確に記録する手助けをしてください。

## 重要な前提
- ユーザーは既に食べたものを記録しようとしています
- ユーザーが食べ物を伝えたら、それを食事記録に追加してください
- 「これを食べるべき」「これも追加したら」などの提案は**絶対にしないでください**
- ユーザーが明示的に栄養アドバイスを求めた場合のみアドバイスしてください

## 応答ルール
- ユーザーが食べ物を伝えたら、その栄養情報を推定して追加提案してください
- 変更提案は以下の形式で含めてください:
  [CHANGE: {"action": "add", "food": {"name": "食材名", "portion": "medium", "calories": 100, "protein": 5.0, "fat": 2.0, "carbs": 10.0}}]
  [CHANGE: {"action": "remove", "foodItemId": "uuid-of-food-to-remove"}]
  [CHANGE: {"action": "update", "foodItemId": "uuid-of-food", "food": {"portion": "small", "calories": 80}}]
- **重要**: portionは必ず "small", "medium", "large" のいずれかを使用してください。"3つ"や"1パック"などの表現は使用しないでください。
- caloriesは整数で指定してください
- 栄養バランスについて質問された場合は、具体的な数値で説明してください
- 食事と無関係な質問には、食事内容の調整に関する質問のみ対応可能であることを案内してください
- 日本語で応答してください`;

export class AIChatService {
  constructor(private config: AIConfig) {}

  /**
   * Chat with AI about the current meal.
   * Returns a streaming response.
   */
  async *chat(
    currentMeal: FoodItem[],
    chatHistory: ChatMessage[],
    userMessage: string
  ): AsyncGenerator<string, void, unknown> {
    const provider = getAIProvider(this.config);
    const modelId = getModelId(this.config);

    const mealContext = this.formatMealContext(currentMeal);

    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...chatHistory.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user' as const, content: userMessage },
    ];

    const { textStream } = streamText({
      model: provider(modelId),
      system: `${CHAT_SYSTEM_PROMPT}\n\n現在の食事:\n${mealContext}`,
      messages,
    });

    for await (const text of textStream) {
      yield text;
    }
  }

  /**
   * Parse change proposals from AI response.
   * Handles nested JSON objects in [CHANGE: {...}] markers.
   */
  parseChanges(response: string): FoodItemChange[] {
    const changes: FoodItemChange[] = [];

    // Find all [CHANGE: markers and extract balanced JSON
    let pos = 0;
    while (pos < response.length) {
      const markerStart = response.indexOf('[CHANGE:', pos);
      if (markerStart === -1) break;

      // Find the start of JSON object
      const jsonStart = response.indexOf('{', markerStart);
      if (jsonStart === -1) break;

      // Find balanced closing brace
      let braceCount = 0;
      let jsonEnd = -1;
      for (let i = jsonStart; i < response.length; i++) {
        if (response[i] === '{') braceCount++;
        else if (response[i] === '}') {
          braceCount--;
          if (braceCount === 0) {
            jsonEnd = i;
            break;
          }
        }
      }

      if (jsonEnd === -1) {
        pos = markerStart + 1;
        continue;
      }

      const jsonStr = response.slice(jsonStart, jsonEnd + 1);

      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.action === 'add' && parsed.food) {
          changes.push({
            action: 'add',
            foodItem: {
              name: parsed.food.name,
              portion: this.normalizePortion(parsed.food.portion),
              calories: Math.round(parsed.food.calories || 0),
              protein: parsed.food.protein || 0,
              fat: parsed.food.fat || 0,
              carbs: parsed.food.carbs || 0,
            },
          });
        } else if (parsed.action === 'remove' && parsed.foodItemId) {
          changes.push({
            action: 'remove',
            foodItemId: parsed.foodItemId,
          });
        } else if (parsed.action === 'update' && parsed.foodItemId && parsed.food) {
          // Normalize update foodItem fields
          const normalizedFood: Record<string, unknown> = {};
          if (parsed.food.name !== undefined) normalizedFood.name = parsed.food.name;
          if (parsed.food.portion !== undefined) normalizedFood.portion = this.normalizePortion(parsed.food.portion);
          if (parsed.food.calories !== undefined) normalizedFood.calories = Math.round(parsed.food.calories);
          if (parsed.food.protein !== undefined) normalizedFood.protein = parsed.food.protein;
          if (parsed.food.fat !== undefined) normalizedFood.fat = parsed.food.fat;
          if (parsed.food.carbs !== undefined) normalizedFood.carbs = parsed.food.carbs;

          changes.push({
            action: 'update',
            foodItemId: parsed.foodItemId,
            foodItem: normalizedFood,
          });
        }
      } catch (e) {
        // Skip invalid JSON
        console.warn('Failed to parse change:', jsonStr);
      }

      pos = jsonEnd + 1;
    }

    return changes;
  }

  /**
   * Extract display text from AI response (without change markers).
   * Handles nested JSON objects.
   */
  extractDisplayText(response: string): string {
    let result = response;

    // Remove all [CHANGE: {...}] markers with balanced braces
    let pos = 0;
    while (pos < result.length) {
      const markerStart = result.indexOf('[CHANGE:', pos);
      if (markerStart === -1) break;

      const jsonStart = result.indexOf('{', markerStart);
      if (jsonStart === -1) break;

      // Find balanced closing brace
      let braceCount = 0;
      let jsonEnd = -1;
      for (let i = jsonStart; i < result.length; i++) {
        if (result[i] === '{') braceCount++;
        else if (result[i] === '}') {
          braceCount--;
          if (braceCount === 0) {
            jsonEnd = i;
            break;
          }
        }
      }

      if (jsonEnd === -1) {
        pos = markerStart + 1;
        continue;
      }

      // Find closing ]
      const closeBracket = result.indexOf(']', jsonEnd);
      if (closeBracket !== -1) {
        result = result.slice(0, markerStart) + result.slice(closeBracket + 1);
      } else {
        pos = jsonEnd + 1;
      }
    }

    return result.trim();
  }

  /**
   * Normalize portion value to valid enum.
   * AI sometimes returns custom portion descriptions instead of enum values.
   */
  private normalizePortion(portion: unknown): 'small' | 'medium' | 'large' {
    if (portion === 'small' || portion === 'medium' || portion === 'large') {
      return portion;
    }
    // Default to medium for any invalid or missing value
    return 'medium';
  }

  private formatMealContext(foods: FoodItem[]): string {
    if (foods.length === 0) {
      return '(食材なし)';
    }

    const totalCalories = foods.reduce((sum, f) => sum + f.calories, 0);
    const totalProtein = foods.reduce((sum, f) => sum + f.protein, 0);
    const totalFat = foods.reduce((sum, f) => sum + f.fat, 0);
    const totalCarbs = foods.reduce((sum, f) => sum + f.carbs, 0);

    const foodList = foods
      .map(
        (f) =>
          `- ${f.name} (${f.portion}): ${f.calories}kcal, P${f.protein}g, F${f.fat}g, C${f.carbs}g [id: ${f.id}]`
      )
      .join('\n');

    return `${foodList}\n\n合計: ${totalCalories}kcal, タンパク質${totalProtein.toFixed(1)}g, 脂質${totalFat.toFixed(1)}g, 炭水化物${totalCarbs.toFixed(1)}g`;
  }
}
