# Data Model: 筋トレのセット管理の見直し

## Entity Definitions

### ExerciseRecord (変更後)

1セット = 1レコードとして記録する。

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | text | PK | UUID |
| userId | text | FK → users.id, NOT NULL | ユーザーID |
| exerciseType | text | NOT NULL | 種目名（例: ショルダープレス） |
| muscleGroup | text | nullable | 部位（chest, back, legs, etc.） |
| setNumber | integer | NOT NULL, ≥1 | セット番号（1, 2, 3...） |
| reps | integer | NOT NULL, 1-100 | 回数 |
| weight | real | nullable, 0-500 | 重量(kg)、nullは自重 |
| variation | text | nullable | バリエーション（ワイド、ナロウ等） |
| recordedAt | text | NOT NULL | 記録日時（ISO8601） |
| createdAt | text | NOT NULL | 作成日時 |
| updatedAt | text | NOT NULL | 更新日時 |

**Indexes:**
- `idx_exercise_user_date` ON (userId, recordedAt)
- `idx_exercise_user_type_date` ON (userId, exerciseType, recordedAt)

### ExerciseGroup (表示用の仮想エンティティ)

同日・同種目のセットをグループ化した表示用オブジェクト。DBには保存しない。

| Field | Type | Description |
|-------|------|-------------|
| exerciseType | string | 種目名 |
| muscleGroup | string | null | 部位 |
| date | string | 記録日（YYYY-MM-DD） |
| sets | ExerciseSet[] | セット配列 |

### ExerciseSet (表示用)

| Field | Type | Description |
|-------|------|-------------|
| id | string | レコードID |
| setNumber | number | セット番号 |
| reps | number | 回数 |
| weight | number | null | 重量(kg) |
| weightLbs | number | null | 重量(lbs) - 計算値 |
| variation | string | null | バリエーション |
| estimatedRM | number | null | 推定1RM - 計算値 |

## Relationships

```
User (1) ─────< (n) ExerciseRecord
```

## Validation Rules

1. **exerciseType**: 1-100文字、必須
2. **muscleGroup**: chest, back, legs, shoulders, arms, core, other のいずれか
3. **setNumber**: 1以上の整数、必須
4. **reps**: 1-100の整数、必須
5. **weight**: 0-500のnullable数値
6. **variation**: 最大50文字、nullable

## State Transitions

なし（各レコードは独立）

## Migration Plan

### Step 1: Add new columns
```sql
ALTER TABLE exercise_records ADD COLUMN set_number INTEGER DEFAULT 1;
ALTER TABLE exercise_records ADD COLUMN variation TEXT;
```

### Step 2: Expand existing data
```sql
-- 既存の sets > 1 のレコードを展開
-- 例: sets=3, reps=10, weight=45
--   → 3レコード（setNumber=1,2,3、同じreps/weight）
```

### Step 3: Drop old column
```sql
ALTER TABLE exercise_records DROP COLUMN sets;
```

## Computed Values (Frontend)

### Weight in lbs
```typescript
const weightLbs = weight ? Math.round(weight * 2.20462 * 10) / 10 : null;
```

### Estimated 1RM (Epley Formula)
```typescript
const estimatedRM = weight && reps > 0
  ? Math.round(weight * (1 + reps / 30) * 10) / 10
  : null;
```
