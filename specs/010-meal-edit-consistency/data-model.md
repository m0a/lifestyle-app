# Data Model: 食事編集画面の一貫性改善

**Date**: 2026-01-02
**Feature Branch**: 010-meal-edit-consistency

## Overview

本機能は既存のデータモデルを変更せず、既存エンティティ（MealRecord, MealFoodItem, MealChatMessage）をそのまま使用する。

## Existing Entities (No Changes)

### MealRecord（食事記録）

```typescript
// packages/backend/src/db/schema.ts
mealRecords {
  id: text (PK)
  userId: text (FK -> users.id, cascade delete)
  mealType: text ('breakfast'|'lunch'|'dinner'|'snack')
  content: text
  calories: integer?
  photoKey: text?                    // R2 storage key
  totalProtein: real?
  totalFat: real?
  totalCarbs: real?
  analysisSource: text? ('ai'|'manual')
  recordedAt: text (ISO datetime)
  createdAt: text
  updatedAt: text
}
```

**編集機能での使用**:
- photoKeyの更新（写真追加/変更時）
- photoKeyのnull設定（写真削除時）
- content, calories, mealType, recordedAtの更新（既存updateMealSchemaで対応済み）

### MealFoodItem（食品アイテム）

```typescript
// packages/backend/src/db/schema.ts
mealFoodItems {
  id: text (PK)
  mealId: text (FK -> mealRecords.id, cascade delete)
  name: text
  portion: text ('small'|'medium'|'large')
  calories: integer
  protein: real
  fat: real
  carbs: real
  createdAt: text
}
```

**編集機能での使用**:
- 既存のCRUD API（meal-analysis.ts）で操作
- 追加: `POST /api/meals/:mealId/food-items`
- 更新: `PATCH /api/meals/:mealId/food-items/:foodItemId`
- 削除: `DELETE /api/meals/:mealId/food-items/:foodItemId`

### MealChatMessage（チャットメッセージ）

```typescript
// packages/backend/src/db/schema.ts
mealChatMessages {
  id: text (PK)
  mealId: text (FK -> mealRecords.id, cascade delete)
  role: text ('user'|'assistant')
  content: text
  appliedChanges: text? (JSON string of FoodItemChange[])
  createdAt: text
}
```

**編集機能での使用**:
- 編集モードでもAIチャットを使用可能
- 既存のチャット履歴に追加される形で保存
- meal-chat.tsのルートをそのまま使用

## Validation Rules (Existing)

### Zod Schemas (packages/shared/src/schemas/)

```typescript
// 食事更新スキーマ（既存）
updateMealSchema = z.object({
  mealType: mealTypeSchema.optional(),
  content: z.string().optional(),
  calories: z.number().int().positive().optional(),
  recordedAt: datetimeSchema.optional(),
});

// 食品アイテムスキーマ（既存）
foodItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  portion: portionSchema,
  calories: z.number(),
  protein: z.number(),
  fat: z.number(),
  carbs: z.number(),
});

// 食品アイテム更新スキーマ（既存）
updateFoodItemSchema = z.object({
  name: z.string().optional(),
  portion: portionSchema.optional(),
  calories: z.number().optional(),
  protein: z.number().optional(),
  fat: z.number().optional(),
  carbs: z.number().optional(),
});
```

## State Transitions

### 編集モードのステート遷移

```
[表示モード] --「編集」ボタン--> [編集モード]
     ^                              |
     |                              v
     |                    [食品アイテム操作]
     |                    [AIチャット]
     |                    [写真追加/変更/削除]
     |                              |
     +----「キャンセル」------------+
     |                              |
     +----「保存」(成功)------------+
```

### 食品アイテムのライフサイクル

```
[なし] --追加--> [存在]
   ^               |
   |               v
   |           [更新可能]
   |               |
   +----削除------+
```

## Frontend State Model

### MealDetailページの編集状態

```typescript
// 編集モードの状態管理
interface MealEditState {
  isEditing: boolean;
  meal: MealRecord;
  foodItems: FoodItem[];
  chatMessages: ChatMessage[];
  totals: NutritionTotals;
  photoKey: string | null;
  isDirty: boolean;           // 未保存の変更があるか
  isSaving: boolean;
}

// アクション
type MealEditAction =
  | { type: 'ENTER_EDIT_MODE' }
  | { type: 'EXIT_EDIT_MODE' }
  | { type: 'UPDATE_FOOD_ITEM'; payload: FoodItem }
  | { type: 'ADD_FOOD_ITEM'; payload: FoodItem }
  | { type: 'DELETE_FOOD_ITEM'; payload: string }
  | { type: 'UPDATE_TOTALS'; payload: NutritionTotals }
  | { type: 'SET_PHOTO'; payload: string | null }
  | { type: 'SAVE_START' }
  | { type: 'SAVE_SUCCESS' }
  | { type: 'SAVE_ERROR'; payload: Error };
```

## Relationships

```
User (1) -----> (*) MealRecord
                      |
                      +-----> (*) MealFoodItem
                      |
                      +-----> (*) MealChatMessage
```

## Data Volume Assumptions

- 1食事あたりの食品アイテム数: 1-10個（平均5個）
- 1食事あたりのチャットメッセージ数: 0-20個（平均3個）
- 編集セッション中のAPI呼び出し: 個別更新のため、1操作1リクエスト

## No Schema Migration Required

本機能は既存のデータベーススキーマに変更を加えない。
- mealRecordsテーブル: 変更なし
- mealFoodItemsテーブル: 変更なし
- mealChatMessagesテーブル: 変更なし

すべての機能は既存のスキーマとAPIで実現可能。
