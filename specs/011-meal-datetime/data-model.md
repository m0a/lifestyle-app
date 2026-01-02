# Data Model: 食事日時コントロール

**Date**: 2026-01-03
**Feature**: 011-meal-datetime

## エンティティ

### MealRecord（既存・変更なし）

食事記録エンティティ。`recordedAt`フィールドが日時を管理。

| Field | Type | Description |
|-------|------|-------------|
| id | string (UUID) | プライマリキー |
| userId | string | ユーザーID（外部キー） |
| mealType | 'breakfast' \| 'lunch' \| 'dinner' \| 'snack' | 食事タイプ |
| content | string | 食事内容 |
| calories | number \| null | カロリー |
| photoKey | string \| null | 写真のR2キー |
| totalProtein | number \| null | タンパク質合計(g) |
| totalFat | number \| null | 脂質合計(g) |
| totalCarbs | number \| null | 炭水化物合計(g) |
| analysisSource | 'ai' \| 'manual' \| null | 分析ソース |
| **recordedAt** | string (ISO 8601) | **記録日時（ユーザー指定可）** |
| createdAt | string (ISO 8601) | 作成日時 |
| updatedAt | string (ISO 8601) | 更新日時 |

### 関連エンティティ（影響なし）

- **MealFoodItem**: 食材情報。mealIdで紐付け。日時変更の影響なし。
- **MealChatMessage**: AIチャット履歴。mealIdで紐付け。日時変更の影響なし。

## バリデーションルール

### recordedAt

| ルール | 詳細 |
|--------|------|
| 必須 | 新規作成時は必須（デフォルト: 現在日時） |
| フォーマット | ISO 8601形式（datetime-local形式からの変換も許可） |
| 未来禁止 | 現在日時より未来の日時は許可しない（FR-005） |
| 過去制限 | なし（任意の過去日時を許可） |

### 入力スキーマ（既存・変更なし）

```typescript
// packages/shared/src/schemas/index.ts

// createMealSchema
{
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
  content: string,  // 1-1000文字
  calories?: number,  // 0-10000
  recordedAt: string,  // ISO 8601
}

// updateMealSchema
{
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack',
  content?: string,
  calories?: number,
  recordedAt?: string,  // ← この機能で使用
}
```

## 状態遷移

### 日時変更フロー

```
[食事記録] ─── recordedAt: "2026-01-02T19:30:00.000Z"
     │
     │ ユーザーが日時を変更
     │ PATCH /api/meals/:id { recordedAt: "2026-01-01T12:00:00.000Z" }
     ▼
[食事記録] ─── recordedAt: "2026-01-01T12:00:00.000Z"
                updatedAt: 更新される
```

## インデックス（既存・変更なし）

```sql
-- 日付によるクエリを最適化
CREATE INDEX idx_meal_user_date ON meal_records(user_id, recorded_at);
```

## データ整合性

| 制約 | 詳細 |
|------|------|
| 外部キー | mealId → meal_records.id（CASCADE DELETE） |
| 関連データ保持 | 日時変更してもMealFoodItem、MealChatMessageは保持（FR-006） |
