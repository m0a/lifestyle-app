import { streamText } from 'ai';
import { getAIProvider, getModelId, type AIConfig } from '../lib/ai-provider';
import type { FoodItem, ChatMessage, FoodItemChange } from '@lifestyle-app/shared';

const CHAT_SYSTEM_PROMPT = `あなたは食事の栄養アドバイザーです。
現在の食事内容を参照して、ユーザーの質問や調整リクエストに応答してください。

## 応答ルール
- 変更を提案する場合は、具体的な食材と量を示してください
- 変更提案は以下の形式で含めてください:
  [CHANGE: {"action": "add", "food": {"name": "食材名", "portion": "medium", "calories": 100, "protein": 5.0, "fat": 2.0, "carbs": 10.0}}]
  [CHANGE: {"action": "remove", "foodItemId": "uuid-of-food-to-remove"}]
  [CHANGE: {"action": "update", "foodItemId": "uuid-of-food", "food": {"portion": "small", "calories": 80}}]
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
   */
  parseChanges(response: string): FoodItemChange[] {
    const changes: FoodItemChange[] = [];
    const changePattern = /\[CHANGE:\s*({[^}]+})\]/g;
    let match;

    while ((match = changePattern.exec(response)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed.action === 'add' && parsed.food) {
          changes.push({
            action: 'add',
            foodItem: {
              name: parsed.food.name,
              portion: parsed.food.portion || 'medium',
              calories: parsed.food.calories || 0,
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
          changes.push({
            action: 'update',
            foodItemId: parsed.foodItemId,
            foodItem: parsed.food,
          });
        }
      } catch (e) {
        // Skip invalid JSON
        console.warn('Failed to parse change:', match[1]);
      }
    }

    return changes;
  }

  /**
   * Extract display text from AI response (without change markers).
   */
  extractDisplayText(response: string): string {
    return response.replace(/\[CHANGE:\s*{[^}]+}\]/g, '').trim();
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
