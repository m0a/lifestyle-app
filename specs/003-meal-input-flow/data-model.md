# Data Model: 食事入力フローの改善

**Date**: 2026-01-01
**Feature**: 003-meal-input-flow

## Overview

既存のデータモデルに変更はなし。新規API型のみ追加。

## Existing Entities (No Changes)

### meal_records
既存のテーブル。変更なし。

| Field | Type | Description |
|-------|------|-------------|
| id | TEXT | Primary key (UUID) |
| userId | TEXT | Foreign key to users |
| mealType | TEXT | 'breakfast' \| 'lunch' \| 'dinner' \| 'snack' |
| content | TEXT | 食事内容のテキスト |
| calories | INTEGER | 総カロリー |
| photoKey | TEXT | R2の写真キー（nullable） |
| totalProtein | REAL | 総タンパク質(g) |
| totalFat | REAL | 総脂質(g) |
| totalCarbs | REAL | 総炭水化物(g) |
| analysisSource | TEXT | 'ai' \| 'manual' |
| recordedAt | TEXT | 記録日時 (ISO8601) |
| createdAt | TEXT | 作成日時 |
| updatedAt | TEXT | 更新日時 |

### meal_food_items
既存のテーブル。変更なし。

| Field | Type | Description |
|-------|------|-------------|
| id | TEXT | Primary key (UUID) |
| mealId | TEXT | Foreign key to meal_records |
| name | TEXT | 食材名 |
| portion | TEXT | 'small' \| 'medium' \| 'large' |
| calories | INTEGER | カロリー |
| protein | REAL | タンパク質(g) |
| fat | REAL | 脂質(g) |
| carbs | REAL | 炭水化物(g) |
| createdAt | TEXT | 作成日時 |

## New API Types (packages/shared)

### TextAnalysisRequest

```typescript
export interface TextAnalysisRequest {
  text: string;           // ユーザー入力テキスト（例: "昼にラーメン食べた"）
  currentTime?: string;   // ISO8601形式、省略時はサーバー時刻
}

export const textAnalysisRequestSchema = z.object({
  text: z.string().min(1).max(500),
  currentTime: z.string().datetime().optional(),
});
```

### TextAnalysisResponse

```typescript
export interface TextAnalysisResponse {
  mealId: string;                    // 作成されたmeal_recordのID
  foodItems: FoodItem[];             // 推定された食材リスト
  totals: NutritionTotals;           // 栄養素合計
  inferredMealType: MealType;        // 推定された食事タイプ
  mealTypeSource: 'text' | 'time';   // 推定ソース
}
```

### TextAnalysisError

```typescript
export interface TextAnalysisError {
  error: 'analysis_failed' | 'timeout' | 'invalid_input';
  message: string;
}
```

## State Transitions

### 食事入力フロー状態

```
[idle]
  ↓ ユーザー入力送信
[analyzing] (ローディング表示)
  ↓ AI応答成功
[result] (結果表示、編集可能)
  ↓ 保存ボタンクリック
[saving]
  ↓ 保存成功
[idle] (リストに追加)

エラーパス:
[analyzing] → タイムアウト/エラー → [error] → フォールバック → [manual_input]
```

## Validation Rules

1. **text**: 1-500文字、空白のみ不可
2. **mealType**: 'breakfast' | 'lunch' | 'dinner' | 'snack' のいずれか
3. **foodItems**: 各アイテムのcaloriesは0以上の整数
4. **portion**: 'small' | 'medium' | 'large' のいずれか
