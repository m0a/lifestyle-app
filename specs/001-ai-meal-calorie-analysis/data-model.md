# Data Model: AI食事写真カロリー分析

**Date**: 2026-01-01
**Feature**: 001-ai-meal-calorie-analysis

## Entity Relationship Diagram

```
┌─────────────┐       ┌──────────────────┐       ┌────────────────────┐
│   users     │       │   meal_records   │       │  meal_food_items   │
├─────────────┤       ├──────────────────┤       ├────────────────────┤
│ id (PK)     │──┐    │ id (PK)          │──┐    │ id (PK)            │
│ email       │  │    │ user_id (FK)     │  │    │ meal_id (FK)       │
│ ...         │  └───>│ meal_type        │  └───>│ name               │
└─────────────┘       │ content          │       │ portion            │
                      │ calories         │       │ calories           │
                      │ photo_key        │       │ protein            │
                      │ total_protein    │       │ fat                │
                      │ total_fat        │       │ carbs              │
                      │ total_carbs      │       │ created_at         │
                      │ analysis_source  │       └────────────────────┘
                      │ recorded_at      │
                      │ created_at       │       ┌────────────────────┐
                      │ updated_at       │       │ meal_chat_messages │
                      └──────────────────┘       ├────────────────────┤
                              │                  │ id (PK)            │
                              └─────────────────>│ meal_id (FK)       │
                                                 │ role               │
                                                 │ content            │
                                                 │ applied_changes    │
                                                 │ created_at         │
                                                 └────────────────────┘
```

## Entities

### 1. meal_records (既存テーブル拡張)

食事記録のメインテーブル。AI分析対応のため列を追加。

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | UUID |
| user_id | TEXT | FK → users.id, NOT NULL | ユーザーID |
| meal_type | TEXT | NOT NULL | 'breakfast' \| 'lunch' \| 'dinner' \| 'snack' |
| content | TEXT | NOT NULL | 食事内容（テキスト、従来互換） |
| calories | INTEGER | NULL | 合計カロリー |
| **photo_key** | TEXT | NULL | R2写真キー（新規） |
| **total_protein** | REAL | NULL | 合計タンパク質g（新規） |
| **total_fat** | REAL | NULL | 合計脂質g（新規） |
| **total_carbs** | REAL | NULL | 合計炭水化物g（新規） |
| **analysis_source** | TEXT | NULL | 'ai' \| 'manual'（新規） |
| recorded_at | TEXT | NOT NULL | 記録日時 |
| created_at | TEXT | NOT NULL | 作成日時 |
| updated_at | TEXT | NOT NULL | 更新日時 |

**Indexes**:
- `idx_meal_user_date` on (user_id, recorded_at) - 既存

### 2. meal_food_items (新規テーブル)

AI分析で識別された個々の食材。

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | UUID |
| meal_id | TEXT | FK → meal_records.id, NOT NULL, CASCADE DELETE | 食事記録ID |
| name | TEXT | NOT NULL | 食材名（日本語） |
| portion | TEXT | NOT NULL | 'small' \| 'medium' \| 'large' |
| calories | INTEGER | NOT NULL | カロリー |
| protein | REAL | NOT NULL | タンパク質g |
| fat | REAL | NOT NULL | 脂質g |
| carbs | REAL | NOT NULL | 炭水化物g |
| created_at | TEXT | NOT NULL | 作成日時 |

**Indexes**:
- `idx_food_items_meal` on (meal_id)

### 3. meal_chat_messages (新規テーブル)

食事記録に関するチャット履歴。

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PK | UUID |
| meal_id | TEXT | FK → meal_records.id, NOT NULL, CASCADE DELETE | 食事記録ID |
| role | TEXT | NOT NULL | 'user' \| 'assistant' |
| content | TEXT | NOT NULL | メッセージ内容 |
| applied_changes | TEXT | NULL | JSON: 適用された変更内容 |
| created_at | TEXT | NOT NULL | 作成日時 |

**Indexes**:
- `idx_chat_messages_meal` on (meal_id, created_at)

## Validation Rules

### meal_records

```typescript
const mealTypeSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);
const analysisSourceSchema = z.enum(['ai', 'manual']);

const mealRecordSchema = z.object({
  mealType: mealTypeSchema,
  content: z.string().min(1).max(500),
  calories: z.number().int().min(0).max(10000).optional(),
  photoKey: z.string().optional(),
  totalProtein: z.number().min(0).max(500).optional(),
  totalFat: z.number().min(0).max(500).optional(),
  totalCarbs: z.number().min(0).max(1000).optional(),
  analysisSource: analysisSourceSchema.optional(),
  recordedAt: z.string().datetime(),
});
```

### meal_food_items

```typescript
const portionSchema = z.enum(['small', 'medium', 'large']);

const foodItemSchema = z.object({
  name: z.string().min(1).max(100),
  portion: portionSchema,
  calories: z.number().int().min(0).max(5000),
  protein: z.number().min(0).max(200),
  fat: z.number().min(0).max(200),
  carbs: z.number().min(0).max(500),
});
```

### meal_chat_messages

```typescript
const chatRoleSchema = z.enum(['user', 'assistant']);

const chatMessageSchema = z.object({
  role: chatRoleSchema,
  content: z.string().min(1).max(5000),
  appliedChanges: z.object({
    action: z.enum(['add', 'remove', 'update']),
    foodItem: foodItemSchema.optional(),
    foodItemId: z.string().optional(),
  }).array().optional(),
});
```

## State Transitions

### 食事記録のライフサイクル

```
[新規作成] ──> [AI分析中] ──> [分析完了・編集可能] ──> [保存済み]
                  │                    │
                  │                    v
                  │              [チャット調整中]
                  │                    │
                  v                    v
            [分析失敗] ──> [手動入力] ──> [保存済み]
```

### 写真のライフサイクル

```
[アップロード] ──> [一時保存(R2 temp/)] ──> [AI分析]
                                               │
                     ┌─────────────────────────┤
                     v                         v
              [リサイズ保存]            [分析失敗・削除]
              [meals/{id}/photo.jpg]
                     │
                     v
              [記録削除時に連動削除]
```

## Migration Strategy

### 既存データへの影響

- 既存の`meal_records`レコードは新規列がNULLのまま維持
- `analysis_source`がNULLの場合は従来の手動入力として扱う
- 後方互換性を維持し、既存APIは引き続き動作

### Migration SQL

```sql
-- Migration: 001_add_ai_analysis_columns.sql
ALTER TABLE meal_records ADD COLUMN photo_key TEXT;
ALTER TABLE meal_records ADD COLUMN total_protein REAL;
ALTER TABLE meal_records ADD COLUMN total_fat REAL;
ALTER TABLE meal_records ADD COLUMN total_carbs REAL;
ALTER TABLE meal_records ADD COLUMN analysis_source TEXT;

-- Migration: 002_create_food_items_table.sql
CREATE TABLE meal_food_items (
  id TEXT PRIMARY KEY,
  meal_id TEXT NOT NULL REFERENCES meal_records(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  portion TEXT NOT NULL CHECK (portion IN ('small', 'medium', 'large')),
  calories INTEGER NOT NULL,
  protein REAL NOT NULL,
  fat REAL NOT NULL,
  carbs REAL NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_food_items_meal ON meal_food_items(meal_id);

-- Migration: 003_create_chat_messages_table.sql
CREATE TABLE meal_chat_messages (
  id TEXT PRIMARY KEY,
  meal_id TEXT NOT NULL REFERENCES meal_records(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  applied_changes TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_chat_messages_meal ON meal_chat_messages(meal_id, created_at);
```

