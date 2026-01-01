# Data Model: 筋トレ最適化運動記録

**Date**: 2026-01-01
**Feature**: 004-strength-training-optimization

## Entity Overview

```
┌─────────────────┐         ┌─────────────────────┐
│     users       │ 1    *  │  exercise_records   │
│─────────────────│─────────│─────────────────────│
│ id (PK)         │         │ id (PK)             │
│ email           │         │ user_id (FK)        │
│ passwordHash    │         │ exercise_type       │
│ goalWeight      │         │ sets                │
│ createdAt       │         │ reps                │
│ updatedAt       │         │ weight (nullable)   │
└─────────────────┘         │ recorded_at         │
                            │ created_at          │
                            │ updated_at          │
                            └─────────────────────┘
```

## exercise_records (修正)

### Schema Definition (Drizzle)

```typescript
export const exerciseRecords = sqliteTable(
  'exercise_records',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    exerciseType: text('exercise_type').notNull(),
    sets: integer('sets').notNull(),         // NEW: セット数 (1-20)
    reps: integer('reps').notNull(),         // NEW: 回数 (1-100)
    weight: real('weight'),                   // NEW: 重量kg (nullable, 自重トレ対応)
    recordedAt: text('recorded_at').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_exercise_user_date').on(table.userId, table.recordedAt),
    index('idx_exercise_user_type_date').on(table.userId, table.exerciseType, table.recordedAt), // NEW
  ]
);
```

### Field Details

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | TEXT | PK | UUID v4 |
| user_id | TEXT | FK, NOT NULL | users.id への参照 |
| exercise_type | TEXT | NOT NULL | 種目名（プリセットまたはカスタム） |
| sets | INTEGER | NOT NULL | セット数 (1-20) |
| reps | INTEGER | NOT NULL | 回数/レップ (1-100) |
| weight | REAL | NULLABLE | 重量(kg)、自重トレはNULL |
| recorded_at | TEXT | NOT NULL | 記録日時 (ISO 8601) |
| created_at | TEXT | NOT NULL | 作成日時 (ISO 8601) |
| updated_at | TEXT | NOT NULL | 更新日時 (ISO 8601) |

### Migration

```sql
-- 既存データがないため、カラム変更ではなくテーブル再作成
-- Drop existing table
DROP TABLE IF EXISTS exercise_records;

-- Create new table
CREATE TABLE exercise_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_type TEXT NOT NULL,
  sets INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  weight REAL,
  recorded_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Create indexes
CREATE INDEX idx_exercise_user_date ON exercise_records(user_id, recorded_at);
CREATE INDEX idx_exercise_user_type_date ON exercise_records(user_id, exercise_type, recorded_at);
```

## Validation Rules (Zod)

```typescript
// packages/shared/src/schemas/index.ts
export const createExerciseSchema = z.object({
  exerciseType: z.string()
    .min(1, '種目を選択してください')
    .max(100),
  sets: z.number()
    .int()
    .min(1, '1セット以上で入力してください')
    .max(20, '20セット以下で入力してください'),
  reps: z.number()
    .int()
    .min(1, '1回以上で入力してください')
    .max(100, '100回以下で入力してください'),
  weight: z.number()
    .min(0)
    .max(500)
    .nullable()
    .optional(),
  recordedAt: datetimeSchema,
});

export const updateExerciseSchema = z.object({
  exerciseType: z.string().min(1).max(100).optional(),
  sets: z.number().int().min(1).max(20).optional(),
  reps: z.number().int().min(1).max(100).optional(),
  weight: z.number().min(0).max(500).nullable().optional(),
  recordedAt: datetimeSchema.optional(),
});
```

## Exercise Presets (Constants)

```typescript
// packages/shared/src/constants.ts

export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'legs',
  'shoulders',
  'arms',
  'core',
  'other',
] as const;

export type MuscleGroup = typeof MUSCLE_GROUPS[number];

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: '胸',
  back: '背中',
  legs: '脚',
  shoulders: '肩',
  arms: '腕',
  core: '体幹',
  other: 'その他',
};

export interface ExercisePreset {
  name: string;
  muscleGroup: MuscleGroup;
}

export const EXERCISE_PRESETS: ExercisePreset[] = [
  // Chest
  { name: 'ベンチプレス', muscleGroup: 'chest' },
  { name: 'ダンベルフライ', muscleGroup: 'chest' },
  { name: 'プッシュアップ', muscleGroup: 'chest' },
  // Back
  { name: 'デッドリフト', muscleGroup: 'back' },
  { name: 'ラットプルダウン', muscleGroup: 'back' },
  { name: 'ベントオーバーロウ', muscleGroup: 'back' },
  // Legs
  { name: 'スクワット', muscleGroup: 'legs' },
  { name: 'レッグプレス', muscleGroup: 'legs' },
  { name: 'ランジ', muscleGroup: 'legs' },
  { name: 'カーフレイズ', muscleGroup: 'legs' },
  // Shoulders
  { name: 'ショルダープレス', muscleGroup: 'shoulders' },
  { name: 'サイドレイズ', muscleGroup: 'shoulders' },
  { name: 'フロントレイズ', muscleGroup: 'shoulders' },
  // Arms
  { name: 'バイセップカール', muscleGroup: 'arms' },
  { name: 'トライセップエクステンション', muscleGroup: 'arms' },
  // Core
  { name: 'プランク', muscleGroup: 'core' },
  { name: 'クランチ', muscleGroup: 'core' },
  { name: 'レッグレイズ', muscleGroup: 'core' },
];
```

## Type Definitions

```typescript
// packages/shared/src/types/index.ts

export interface ExerciseRecord {
  id: string;
  userId: string;
  exerciseType: string;
  sets: number;
  reps: number;
  weight: number | null;
  recordedAt: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;
export type UpdateExerciseInput = z.infer<typeof updateExerciseSchema>;

export interface ExerciseSummary {
  totalSets: number;      // 変更: totalMinutes → totalSets
  totalReps: number;      // 新規
  count: number;
  byType: Record<string, { sets: number; reps: number }>;  // 変更
}
```
