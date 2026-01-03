# Data Model: 食事タイプの変更機能

**Date**: 2026-01-03
**Feature**: 012-meal-type-change

## Entities

### 既存エンティティ（変更なし）

#### MealRecord
食事記録を表すエンティティ。`mealType` 属性は既に存在しており、本機能で変更対象となる。

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| userId | UUID | ユーザーID (FK) |
| mealType | Enum | 食事タイプ: breakfast, lunch, dinner, snack |
| recordedAt | DateTime | 記録日時 |
| ... | ... | その他の既存フィールド |

**Validation Rules**:
- `mealType` は `breakfast`, `lunch`, `dinner`, `snack` のいずれか
- 変更時は有効な値のみ許可

### 変更エンティティ

#### ChatChange (Discriminated Union)

AIチャットからの変更提案を表す型。`set_meal_type` アクションを追加。

**現行アクション**:
- `add`: 食材追加
- `remove`: 食材削除
- `update`: 食材更新
- `set_datetime`: 日時変更

**追加アクション**:

| Action | Fields | Description |
|--------|--------|-------------|
| `set_meal_type` | `mealType: MealType` | 食事タイプを変更 |

**MealType Enum**:
```
breakfast | lunch | dinner | snack
```

## Schema Changes

### packages/shared/src/schemas/meal-analysis.ts

```typescript
// 追加: MealType変更スキーマ
export const mealTypeChangeSchema = z.object({
  action: z.literal('set_meal_type'),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
});
export type MealTypeChange = z.infer<typeof mealTypeChangeSchema>;

// 変更: chatChangeSchema に set_meal_type を追加
export const chatChangeSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('add'),
    foodItem: createFoodItemSchema,
  }),
  z.object({
    action: z.literal('update'),
    foodItemId: z.string().uuid(),
    foodItem: updateFoodItemSchema,
  }),
  z.object({
    action: z.literal('remove'),
    foodItemId: z.string().uuid(),
  }),
  z.object({
    action: z.literal('set_datetime'),
    recordedAt: z.string().datetime(),
  }),
  z.object({
    action: z.literal('set_meal_type'),
    mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  }),
]);
```

## Relationships

```
User (1) ──────< (N) MealRecord
                      │
                      │ mealType: MealType
                      │ recordedAt: DateTime
                      │
                      └──< (N) MealFoodItem
                      └──< (N) MealChatMessage
                               │
                               └── appliedChanges: ChatChange[]
```

## State Transitions

### MealType State Machine

```
┌───────────┐     set_meal_type      ┌───────────┐
│ breakfast │ ◄──────────────────────► │   lunch   │
└───────────┘                         └───────────┘
      ▲                                      ▲
      │         set_meal_type                │
      │  ┌─────────────────────────────┐     │
      └──┤                             ├─────┘
         │       set_meal_type         │
┌───────────┐ ◄───────────────────────► ┌───────────┐
│  dinner   │                          │   snack   │
└───────────┘                          └───────────┘
```

すべての状態間で双方向の遷移が可能。制約なし。

## Validation Rules

1. **mealType**:
   - 必須
   - `breakfast`, `lunch`, `dinner`, `snack` のいずれか
   - 同一値への変更は許可（警告なし、ただしAIが重複を検知して通知可能）

2. **ChatChange (set_meal_type)**:
   - `action` は `'set_meal_type'` リテラル
   - `mealType` は有効な MealType enum 値

## Migration

**なし** - 既存テーブル構造に変更は不要。スキーマレベルの型定義の追加のみ。
