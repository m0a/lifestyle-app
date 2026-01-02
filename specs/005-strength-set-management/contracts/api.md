# API Contracts: 筋トレのセット管理

## Endpoints

### POST /api/exercises
複数セットを一括作成

**Request:**
```typescript
{
  exerciseType: string;       // 種目名（必須）
  muscleGroup?: MuscleGroup;  // 部位
  sets: Array<{
    reps: number;             // 回数（必須、1-100）
    weight?: number | null;   // 重量kg（nullable、0-500）
    variation?: string;       // バリエーション
  }>;
  recordedAt: string;         // 記録日時（ISO8601）
}
```

**Response (201):**
```typescript
{
  exercises: Array<{
    id: string;
    userId: string;
    exerciseType: string;
    muscleGroup: string | null;
    setNumber: number;
    reps: number;
    weight: number | null;
    variation: string | null;
    recordedAt: string;
    createdAt: string;
    updatedAt: string;
  }>
}
```

### GET /api/exercises
運動記録一覧取得（フラット形式）

**Query Parameters:**
- `startDate?: string` - 開始日
- `endDate?: string` - 終了日
- `exerciseType?: string` - 種目でフィルタ
- `limit?: number` - 件数制限

**Response (200):**
```typescript
{
  exercises: ExerciseRecord[]
}
```

### GET /api/exercises/grouped
種目・日付でグループ化した運動記録取得

**Query Parameters:**
- `startDate?: string` - 開始日
- `endDate?: string` - 終了日

**Response (200):**
```typescript
{
  groups: Array<{
    exerciseType: string;
    muscleGroup: string | null;
    date: string;            // YYYY-MM-DD
    sets: Array<{
      id: string;
      setNumber: number;
      reps: number;
      weight: number | null;
      variation: string | null;
    }>
  }>
}
```

### PATCH /api/exercises/:id
セット更新

**Request:**
```typescript
{
  reps?: number;
  weight?: number | null;
  variation?: string | null;
  recordedAt?: string;
}
```

**Response (200):**
```typescript
{
  exercise: ExerciseRecord
}
```

### DELETE /api/exercises/:id
セット削除

**Response (200):**
```typescript
{
  message: "Deleted"
}
```

### POST /api/exercises/:exerciseType/add-set
既存の種目グループにセットを追加

**URL Parameters:**
- `exerciseType`: 種目名（URLエンコード）

**Request:**
```typescript
{
  date: string;               // 日付（YYYY-MM-DD）
  reps: number;
  weight?: number | null;
  variation?: string;
}
```

**Response (201):**
```typescript
{
  exercise: ExerciseRecord
}
```

### GET /api/exercises/recent-sessions
過去のトレーニングセッション一覧を取得（取り込み用、ページネーション対応）

**Query Parameters:**
- `limit?: number` - 1ページあたりのセッション数（デフォルト: 10、最大: 50）
- `cursor?: string` - ページネーションカーソル（前回レスポンスのnextCursor）

**Response (200):**
```typescript
{
  sessions: Array<{
    date: string;              // YYYY-MM-DD
    summary: string;           // 種目サマリー（例: "ショルダープレス, レッグプレス 他1種目"）
    totalSets: number;         // 総セット数
    groups: Array<{
      exerciseType: string;
      muscleGroup: string | null;
      sets: Array<{
        setNumber: number;
        reps: number;
        weight: number | null;
        variation: string | null;
      }>
    }>
  }>;
  nextCursor: string | null;   // 次ページがある場合のカーソル
}
```

### POST /api/exercises/import
過去のトレーニングを取り込んで新規記録として作成

**Request:**
```typescript
{
  sourceDate: string;         // 取り込み元の日付（YYYY-MM-DD）
  targetDate: string;         // 記録する日付（YYYY-MM-DD）
  exerciseTypes?: string[];   // 取り込む種目（省略時は全種目）
}
```

**Response (201):**
```typescript
{
  exercises: ExerciseRecord[]
}
```

## Types

### MuscleGroup
```typescript
type MuscleGroup = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'other';
```

### ExerciseRecord
```typescript
interface ExerciseRecord {
  id: string;
  userId: string;
  exerciseType: string;
  muscleGroup: string | null;
  setNumber: number;
  reps: number;
  weight: number | null;
  variation: string | null;
  recordedAt: string;
  createdAt: string;
  updatedAt: string;
}
```

## Zod Schemas (shared package)

### createExerciseSetsSchema
```typescript
const createExerciseSetsSchema = z.object({
  exerciseType: z.string().min(1).max(100),
  muscleGroup: muscleGroupSchema.optional(),
  sets: z.array(z.object({
    reps: z.number().int().min(1).max(100),
    weight: z.number().min(0).max(500).nullable().optional(),
    variation: z.string().max(50).optional(),
  })).min(1, '1セット以上入力してください'),
  recordedAt: datetimeSchema,
});
```

### addSetSchema
```typescript
const addSetSchema = z.object({
  date: z.string().date(),
  reps: z.number().int().min(1).max(100),
  weight: z.number().min(0).max(500).nullable().optional(),
  variation: z.string().max(50).optional(),
});
```
