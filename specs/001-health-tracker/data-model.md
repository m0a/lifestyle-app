# Data Model: Health Tracker

**Feature**: 001-health-tracker
**Date**: 2025-12-27
**Database**: Cloudflare D1 (SQLite)

## Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────────┐
│    User      │       │   WeightRecord   │
├──────────────┤       ├──────────────────┤
│ id (PK)      │──┐    │ id (PK)          │
│ email        │  │    │ userId (FK)      │──┐
│ passwordHash │  │    │ weight           │  │
│ goalWeight   │  ├───<│ recordedAt       │  │
│ createdAt    │  │    │ createdAt        │  │
│ updatedAt    │  │    │ updatedAt        │  │
└──────────────┘  │    └──────────────────┘  │
                  │                          │
                  │    ┌──────────────────┐  │
                  │    │   MealRecord     │  │
                  │    ├──────────────────┤  │
                  │    │ id (PK)          │  │
                  ├───<│ userId (FK)      │──┤
                  │    │ mealType         │  │
                  │    │ content          │  │
                  │    │ calories         │  │
                  │    │ recordedAt       │  │
                  │    │ createdAt        │  │
                  │    │ updatedAt        │  │
                  │    └──────────────────┘  │
                  │                          │
                  │    ┌──────────────────┐  │
                  │    │ ExerciseRecord   │  │
                  │    ├──────────────────┤  │
                  │    │ id (PK)          │  │
                  └───<│ userId (FK)      │──┘
                       │ exerciseType     │
                       │ durationMinutes  │
                       │ recordedAt       │
                       │ createdAt        │
                       │ updatedAt        │
                       └──────────────────┘
```

## Entities

### User

ユーザーアカウント情報と設定を保持する。

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | TEXT | PK, UUID | ユニーク識別子 |
| email | TEXT | UNIQUE, NOT NULL | メールアドレス |
| passwordHash | TEXT | NOT NULL | bcryptハッシュ化パスワード |
| goalWeight | REAL | NULL | 目標体重（kg） |
| createdAt | TEXT | NOT NULL | ISO8601形式 |
| updatedAt | TEXT | NOT NULL | ISO8601形式 |

**Indexes**:
- `idx_user_email` ON email (UNIQUE)

**Validation Rules**:
- email: 有効なメールアドレス形式
- passwordHash: bcrypt形式
- goalWeight: 20.0 <= x <= 300.0 (kg)

### WeightRecord

体重記録を保持する。

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | TEXT | PK, UUID | ユニーク識別子 |
| userId | TEXT | FK, NOT NULL | User.id への参照 |
| weight | REAL | NOT NULL | 体重（kg、小数点1桁） |
| recordedAt | TEXT | NOT NULL | 記録日時（ISO8601） |
| createdAt | TEXT | NOT NULL | 作成日時 |
| updatedAt | TEXT | NOT NULL | 更新日時 |

**Indexes**:
- `idx_weight_user_date` ON (userId, recordedAt)

**Validation Rules**:
- weight: 20.0 <= x <= 300.0 (kg)
- recordedAt: 過去または現在の日時

### MealRecord

食事記録を保持する。

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | TEXT | PK, UUID | ユニーク識別子 |
| userId | TEXT | FK, NOT NULL | User.id への参照 |
| mealType | TEXT | NOT NULL | 'breakfast' / 'lunch' / 'dinner' / 'snack' |
| content | TEXT | NOT NULL | 食事内容（自由テキスト） |
| calories | INTEGER | NULL | カロリー（kcal、任意） |
| recordedAt | TEXT | NOT NULL | 記録日時（ISO8601） |
| createdAt | TEXT | NOT NULL | 作成日時 |
| updatedAt | TEXT | NOT NULL | 更新日時 |

**Indexes**:
- `idx_meal_user_date` ON (userId, recordedAt)

**Validation Rules**:
- mealType: enum値のみ許可
- content: 1文字以上、1000文字以下
- calories: 0 <= x <= 10000 (kcal)

### ExerciseRecord

運動記録を保持する。

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | TEXT | PK, UUID | ユニーク識別子 |
| userId | TEXT | FK, NOT NULL | User.id への参照 |
| exerciseType | TEXT | NOT NULL | 運動種目（自由テキスト） |
| durationMinutes | INTEGER | NOT NULL | 運動時間（分） |
| recordedAt | TEXT | NOT NULL | 記録日時（ISO8601） |
| createdAt | TEXT | NOT NULL | 作成日時 |
| updatedAt | TEXT | NOT NULL | 更新日時 |

**Indexes**:
- `idx_exercise_user_date` ON (userId, recordedAt)

**Validation Rules**:
- exerciseType: 1文字以上、100文字以下
- durationMinutes: 1 <= x <= 1440 (24時間)

## Drizzle Schema (TypeScript)

```typescript
// packages/backend/src/db/schema.ts
import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  goalWeight: real('goal_weight'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const weightRecords = sqliteTable('weight_records', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  weight: real('weight').notNull(),
  recordedAt: text('recorded_at').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const mealRecords = sqliteTable('meal_records', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  mealType: text('meal_type').notNull(), // 'breakfast' | 'lunch' | 'dinner' | 'snack'
  content: text('content').notNull(),
  calories: integer('calories'),
  recordedAt: text('recorded_at').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const exerciseRecords = sqliteTable('exercise_records', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  exerciseType: text('exercise_type').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  recordedAt: text('recorded_at').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
```

## Zod Schemas (Shared)

```typescript
// packages/shared/src/schemas/index.ts
import { z } from 'zod';

export const mealTypeSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);

export const weightRecordSchema = z.object({
  weight: z.number().min(20).max(300),
  recordedAt: z.string().datetime(),
});

export const mealRecordSchema = z.object({
  mealType: mealTypeSchema,
  content: z.string().min(1).max(1000),
  calories: z.number().int().min(0).max(10000).optional(),
  recordedAt: z.string().datetime(),
});

export const exerciseRecordSchema = z.object({
  exerciseType: z.string().min(1).max(100),
  durationMinutes: z.number().int().min(1).max(1440),
  recordedAt: z.string().datetime(),
});

export const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  goalWeight: z.number().min(20).max(300).optional(),
});
```

## Data Lifecycle

### Creation
- レコード作成時に `createdAt` と `updatedAt` を現在時刻で設定
- `id` はUUIDv4を生成

### Update
- 更新時に `updatedAt` を現在時刻で更新
- `createdAt` は変更不可

### Deletion
- ユーザー削除時、CASCADE で関連レコードを全削除
- 個別レコードは物理削除（論理削除は不要、シンプルさ優先）

### Export
- FR-008対応: ユーザーの全データをJSON形式でエクスポート
- 構造: `{ user: {...}, weights: [...], meals: [...], exercises: [...] }`
