import { streamText } from 'ai';
import { getAIProvider, getModelId, type AIConfig } from '../lib/ai-provider';
import type { FoodItem, ChatMessage, ChatChange } from '@lifestyle-app/shared';

// Token usage from AI SDK
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// Result type for chat streaming with usage callback
export interface ChatStreamResult {
  textStream: AsyncGenerator<string, void, unknown>;
  getUsage: () => Promise<TokenUsage | undefined>;
}

const CHAT_SYSTEM_PROMPT = `あなたは食事記録のアシスタントです。
ユーザーが**既に食べた食事**を正確に記録する手助けをしてください。

## 重要な前提
- ユーザーは既に食べたものを記録しようとしています
- ユーザーが食べ物を伝えたら、それを食事記録に追加してください
- 「これを食べるべき」「これも追加したら」などの提案は**絶対にしないでください**
- ユーザーが明示的に栄養アドバイスを求めた場合のみアドバイスしてください

## 応答ルール
- ユーザーが食べ物を伝えたら、その栄養情報を推定して追加提案してください
- **すべての変更は [CHANGE: {...}] 形式で統一してください**
- 使用可能なアクション:
  - 食材追加: [CHANGE: {"action": "add", "food": {"name": "食材名", "portion": "medium", "calories": 100, "protein": 5.0, "fat": 2.0, "carbs": 10.0}}]
  - 食材削除: [CHANGE: {"action": "remove", "foodItemId": "uuid-of-food-to-remove"}]
  - 食材更新: [CHANGE: {"action": "update", "foodItemId": "uuid-of-food", "food": {"portion": "small", "calories": 80}}]
  - **日時変更**: [CHANGE: {"action": "set_datetime", "recordedAt": "2026-01-02T12:00:00"}]
  - **食事タイプ変更**: [CHANGE: {"action": "set_meal_type", "mealType": "breakfast"}]
- **重要**: portionは必ず "small", "medium", "large" のいずれかを使用してください
- caloriesは整数で指定してください
- 日本語で応答してください

## 日付・時刻の変更（重要）
ユーザーが「昨日」「一昨日」「今朝」「昨晩」「〜に変更して」などの日時変更を要求したら:
1. **食材は変更しない**（remove/update/addは使わない）
2. **set_datetimeアクションのみ使用**

### 日時変更の形式（必須）
[CHANGE: {"action": "set_datetime", "recordedAt": "YYYY-MM-DDTHH:mm:ss"}]

### 計算ルール
- 現在の日時: {{CURRENT_DATE}}
- 「昨日」= 現在日時から1日前
- 「一昨日」= 現在日時から2日前
- 時刻は食事タイプに応じて設定:
  - 朝食/今朝 → 08:00
  - 昼食 → 12:00
  - 夕食/夕飯/昨晩 → 19:00
  - 間食 → 15:00

### 日時変更の例
ユーザー: 「昨日の夕食に変更して」
→ 応答: 記録日時を昨日の19:00に変更しました。
[CHANGE: {"action": "set_datetime", "recordedAt": "2026-01-02T19:00:00"}]

ユーザー: 「これは一昨日の昼ごはんです」
→ 応答: 記録日時を一昨日の12:00に変更しました。
[CHANGE: {"action": "set_datetime", "recordedAt": "2026-01-01T12:00:00"}]

- 未来の日付は設定できません

## 食事タイプの変更
ユーザーが「朝食として記録」「これは夕食」「昼食に変更して」などの食事タイプ変更を要求したら:
1. **食材は変更しない**（remove/update/addは使わない）
2. **set_meal_typeアクションを使用**

### 食事タイプ変更の形式（必須）
[CHANGE: {"action": "set_meal_type", "mealType": "breakfast"}]

### 有効なmealType値
- breakfast: 朝食/朝ごはん
- lunch: 昼食/昼ごはん/ランチ
- dinner: 夕食/夕ごはん/夕飯/ディナー
- snack: 間食/おやつ

### 食事タイプ変更の例
ユーザー: 「朝食として記録して」
→ 応答: 食事タイプを朝食に変更しました。
[CHANGE: {"action": "set_meal_type", "mealType": "breakfast"}]

ユーザー: 「これは夕食でした」
→ 応答: 食事タイプを夕食に変更しました。
[CHANGE: {"action": "set_meal_type", "mealType": "dinner"}]

### 日時と食事タイプの同時変更
ユーザーが「昨日の朝食として記録して」のように日時と食事タイプを同時に指定した場合、両方のアクションを出力してください。

ユーザー: 「昨日の朝食として記録して」
→ 応答: 記録日時を昨日の08:00に、食事タイプを朝食に変更しました。
[CHANGE: {"action": "set_datetime", "recordedAt": "2026-01-02T08:00:00"}]
[CHANGE: {"action": "set_meal_type", "mealType": "breakfast"}]`;

export class AIChatService {
  constructor(private config: AIConfig) {}

  /**
   * Chat with AI about the current meal.
   * Returns a streaming response with usage information.
   */
  chat(
    currentMeal: FoodItem[],
    chatHistory: ChatMessage[],
    userMessage: string,
    currentDateTime?: string
  ): ChatStreamResult {
    const provider = getAIProvider(this.config);
    const modelId = getModelId(this.config);

    const mealContext = this.formatMealContext(currentMeal);
    const now = currentDateTime ? new Date(currentDateTime) : new Date();
    const currentDateStr = now.toISOString();

    // Inject current date into prompt
    const systemPrompt = CHAT_SYSTEM_PROMPT.replace('{{CURRENT_DATE}}', currentDateStr);

    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...chatHistory.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user' as const, content: userMessage },
    ];

    const result = streamText({
      model: provider(modelId),
      system: `${systemPrompt}\n\n現在の食事:\n${mealContext}`,
      messages,
    });

    // Create async generator wrapper for textStream
    const textStreamGenerator = async function* () {
      for await (const text of result.textStream) {
        yield text;
      }
    };

    return {
      textStream: textStreamGenerator(),
      getUsage: async () => {
        try {
          const usage = await result.usage;
          if (usage) {
            return {
              promptTokens: usage.promptTokens,
              completionTokens: usage.completionTokens,
              totalTokens: usage.totalTokens,
            };
          }
          return undefined;
        } catch (error) {
          console.error('Failed to get usage:', error);
          return undefined;
        }
      },
    };
  }

  /**
   * Parse change proposals from AI response.
   * Handles nested JSON objects in [CHANGE: {...}] and [DATE_CHANGE: {...}] markers.
   */
  parseChanges(response: string): ChatChange[] {
    const changes: ChatChange[] = [];

    // Find all [CHANGE: and [DATE_CHANGE: markers and extract balanced JSON
    const markers = ['[CHANGE:', '[DATE_CHANGE:'];
    let pos = 0;

    while (pos < response.length) {
      // Find the next marker
      let nextMarkerStart = -1;
      let markerType: 'change' | 'date_change' | null = null;

      for (const marker of markers) {
        const idx = response.indexOf(marker, pos);
        if (idx !== -1 && (nextMarkerStart === -1 || idx < nextMarkerStart)) {
          nextMarkerStart = idx;
          markerType = marker === '[DATE_CHANGE:' ? 'date_change' : 'change';
        }
      }

      if (nextMarkerStart === -1) break;

      // For DATE_CHANGE, also handle simple ISO date format (not wrapped in JSON)
      if (markerType === 'date_change') {
        // Try to find a simple ISO date after the marker
        const markerEnd = nextMarkerStart + '[DATE_CHANGE:'.length;
        const closeBracketIdx = response.indexOf(']', markerEnd);
        if (closeBracketIdx !== -1) {
          const content = response.slice(markerEnd, closeBracketIdx).trim();
          // Check if it's a simple date (not JSON object)
          if (!content.startsWith('{')) {
            // Try to parse as ISO date directly
            const dateStr = content.replace(/['"]/g, '').trim();
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
              changes.push({
                action: 'set_datetime',
                recordedAt: date.toISOString(),
              });
              pos = closeBracketIdx + 1;
              continue;
            }
          }
        }
      }

      // Find the start of JSON object
      const jsonStart = response.indexOf('{', nextMarkerStart);
      if (jsonStart === -1) {
        pos = nextMarkerStart + 1;
        continue;
      }

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
        pos = nextMarkerStart + 1;
        continue;
      }

      const jsonStr = response.slice(jsonStart, jsonEnd + 1);

      try {
        const parsed = JSON.parse(jsonStr);

        if (markerType === 'date_change' && parsed.recordedAt) {
          // Validate that it's a valid date
          const date = new Date(parsed.recordedAt);
          if (!isNaN(date.getTime())) {
            changes.push({
              action: 'set_datetime',
              recordedAt: date.toISOString(),
            });
          }
        } else if (markerType === 'change') {
          if (parsed.action === 'set_datetime' && parsed.recordedAt) {
            // Handle set_datetime action in CHANGE format
            const date = new Date(parsed.recordedAt);
            if (!isNaN(date.getTime())) {
              changes.push({
                action: 'set_datetime',
                recordedAt: date.toISOString(),
              });
            }
          } else if (parsed.action === 'add' && parsed.food) {
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
            if (parsed.food.name !== undefined) normalizedFood['name'] = parsed.food.name;
            if (parsed.food.portion !== undefined) normalizedFood['portion'] = this.normalizePortion(parsed.food.portion);
            if (parsed.food.calories !== undefined) normalizedFood['calories'] = Math.round(parsed.food.calories);
            if (parsed.food.protein !== undefined) normalizedFood['protein'] = parsed.food.protein;
            if (parsed.food.fat !== undefined) normalizedFood['fat'] = parsed.food.fat;
            if (parsed.food.carbs !== undefined) normalizedFood['carbs'] = parsed.food.carbs;

            changes.push({
              action: 'update',
              foodItemId: parsed.foodItemId,
              foodItem: normalizedFood,
            });
          } else if (parsed.action === 'set_meal_type' && parsed.mealType) {
            // Handle set_meal_type action
            const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
            if (validMealTypes.includes(parsed.mealType)) {
              changes.push({
                action: 'set_meal_type',
                mealType: parsed.mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
              });
            }
          }
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

    // Remove all [CHANGE: {...}] and [DATE_CHANGE: {...}] markers with balanced braces
    const markers = ['[CHANGE:', '[DATE_CHANGE:'];

    for (const marker of markers) {
      let pos = 0;
      while (pos < result.length) {
        const markerStart = result.indexOf(marker, pos);
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
