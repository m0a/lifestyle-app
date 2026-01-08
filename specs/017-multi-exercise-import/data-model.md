# Data Model: Multi-Exercise Import

**Feature**: 017-multi-exercise-import
**Date**: 2026-01-08

## Overview

This feature reuses the existing `exercise_records` table without schema changes. All data structures focus on read operations and UI state management.

## Database Schema (Existing)

```typescript
// packages/backend/src/db/schema.ts (lines 115-136)
export const exerciseRecords = sqliteTable(
  'exercise_records',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    exerciseType: text('exercise_type').notNull(),
    muscleGroup: text('muscle_group'),
    setNumber: integer('set_number').notNull().default(1),
    reps: integer('reps').notNull(),
    weight: real('weight'),
    variation: text('variation'),
    recordedAt: text('recorded_at').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    idx_exercise_user_date: index('idx_exercise_user_date').on(
      table.userId,
      table.recordedAt
    ),
    idx_exercise_user_type_date: index('idx_exercise_user_type_date').on(
      table.userId,
      table.exerciseType,
      table.recordedAt
    ),
  })
);
```

**Key Indexes**:
- `idx_exercise_user_date`: Optimized for date-based queries
- `idx_exercise_user_type_date`: Optimized for type + date queries

## Type Definitions

### 1. Exercise Import List Item

```typescript
// packages/shared/src/types/exercise.ts
export interface ExerciseImportItem {
  id: string;
  exerciseType: string;
  muscleGroup: string | null;
  setNumber: number;
  reps: number;
  weight: number | null;
  variation: string | null;
  recordedAt: string; // ISO 8601
  createdAt: string;
}
```

**Usage**: Display in selection list with distinguishing details.

### 2. Exercise Group (by Date)

```typescript
export interface ExerciseGroup {
  date: string; // YYYY-MM-DD
  dayOfWeek: string; // 'Monday', 'Tuesday', etc.
  exercises: ExerciseImportItem[];
}
```

**Usage**: Group exercises by date for organized display.

### 3. Exercise Summary (for List Display)

```typescript
export interface ExerciseSummary {
  id: string;
  exerciseType: string;
  totalSets: number; // Count of all sets for this exercise
  displaySets: string; // e.g., "3 sets × 12 reps @ 50kg"
  timestamp: string; // Time portion of recordedAt (HH:mm)
  recordedAt: string; // Full ISO timestamp
}
```

**Usage**: Condensed view for list items (1 row per exercise type per session).

### 4. Recent Exercise Item

```typescript
export interface RecentExerciseItem {
  id: string; // Most recent record ID
  exerciseType: string;
  muscleGroup: string | null;
  lastPerformedDate: string; // YYYY-MM-DD
  lastPerformedTime: string; // HH:mm
  preview: string; // e.g., "3 sets, 50kg"
}
```

**Usage**: Recent workouts quick access list (10 items).

## Validation Schemas (Zod)

```typescript
// packages/shared/src/schemas/exercise.ts

export const exerciseImportQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  userId: z.string().uuid(),
});

export const recentExercisesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(10),
  userId: z.string().uuid(),
});

export const exerciseImportSelectionSchema = z.object({
  exerciseId: z.string().uuid(),
  action: z.enum(['add', 'replace']).optional(), // For workout-in-progress
});
```

## Data Transformations

### 1. Group Exercises by Date

```typescript
function groupExercisesByDate(
  exercises: ExerciseRecord[]
): ExerciseGroup[] {
  const groups = new Map<string, ExerciseImportItem[]>();

  for (const ex of exercises) {
    const date = ex.recordedAt.split('T')[0];
    if (!groups.has(date)) {
      groups.set(date, []);
    }
    groups.get(date)!.push(ex);
  }

  return Array.from(groups.entries())
    .map(([date, exercises]) => ({
      date,
      dayOfWeek: new Date(date).toLocaleDateString('ja-JP', { weekday: 'long' }),
      exercises,
    }))
    .sort((a, b) => b.date.localeCompare(a.date)); // Most recent first
}
```

### 2. Aggregate Sets into Summary

```typescript
function aggregateExerciseSets(
  exercises: ExerciseRecord[]
): ExerciseSummary[] {
  const byType = new Map<string, ExerciseRecord[]>();

  // Group by exercise type
  for (const ex of exercises) {
    const key = ex.exerciseType;
    if (!byType.has(key)) {
      byType.set(key, []);
    }
    byType.get(key)!.push(ex);
  }

  // Create summaries
  return Array.from(byType.entries()).map(([type, sets]) => {
    const firstSet = sets[0];
    const totalSets = sets.length;
    const avgReps = Math.round(
      sets.reduce((sum, s) => sum + s.reps, 0) / totalSets
    );
    const avgWeight = sets[0].weight
      ? Math.round(sets.reduce((sum, s) => sum + (s.weight || 0), 0) / totalSets)
      : null;

    return {
      id: firstSet.id,
      exerciseType: type,
      totalSets,
      displaySets: avgWeight
        ? `${totalSets}セット × ${avgReps}回 @ ${avgWeight}kg`
        : `${totalSets}セット × ${avgReps}回`,
      timestamp: new Date(firstSet.recordedAt).toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      recordedAt: firstSet.recordedAt,
    };
  });
}
```

### 3. Get Recent Unique Exercises

```typescript
function getRecentUniqueExercises(
  exercises: ExerciseRecord[],
  limit: number = 10
): RecentExerciseItem[] {
  const seen = new Set<string>();
  const recent: RecentExerciseItem[] = [];

  // Sort by date descending
  const sorted = [...exercises].sort(
    (a, b) => b.recordedAt.localeCompare(a.recordedAt)
  );

  for (const ex of sorted) {
    if (seen.has(ex.exerciseType)) continue;
    seen.add(ex.exerciseType);

    const date = new Date(ex.recordedAt);
    recent.push({
      id: ex.id,
      exerciseType: ex.exerciseType,
      muscleGroup: ex.muscleGroup,
      lastPerformedDate: date.toISOString().split('T')[0],
      lastPerformedTime: date.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      preview: ex.weight
        ? `${ex.reps}回 @ ${ex.weight}kg`
        : `${ex.reps}回`,
    });

    if (recent.length >= limit) break;
  }

  return recent;
}
```

## State Management

### UI State (React)

```typescript
// Component state for import dialog
interface ExerciseImportState {
  isOpen: boolean;
  selectedDate: string | null;
  exercises: ExerciseSummary[];
  isLoading: boolean;
  error: string | null;
  workoutInProgress: boolean; // If current form has data
}

// Action state for workout-in-progress dialog
interface ImportActionState {
  showActionDialog: boolean;
  selectedExercise: ExerciseSummary | null;
  action: 'add' | 'replace' | null;
}
```

### Cache Keys (TanStack Query)

```typescript
export const exerciseImportKeys = {
  all: ['exercises', 'import'] as const,
  byDate: (date: string) => [...exerciseImportKeys.all, 'byDate', date] as const,
  recent: (limit: number) => [...exerciseImportKeys.all, 'recent', limit] as const,
};
```

## Data Flow

### 1. Import from Date Selection

```
User selects date
  → GET /api/exercises/by-date?date=2026-01-05
  → Backend queries: WHERE userId = ? AND DATE(recordedAt) = ?
  → Transform: aggregateExerciseSets()
  → Display: ExerciseImportList
  → User selects exercise
  → If workout in progress: Show action dialog
  → Populate form with selected exercise data
```

### 2. Recent Workouts Quick Access

```
User opens import UI
  → GET /api/exercises/recent?limit=10
  → Backend queries: ORDER BY recordedAt DESC
  → Transform: getRecentUniqueExercises()
  → Display: RecentExercises component
  → User clicks recent exercise
  → If single record: Auto-import
  → If multiple on same date: Show selection dialog
```

## Performance Considerations

### Query Optimization

```sql
-- Optimized query for date range (uses idx_exercise_user_date)
SELECT * FROM exercise_records
WHERE userId = ? AND recordedAt BETWEEN ? AND ?
ORDER BY recordedAt DESC;

-- Optimized query for recent unique (uses idx_exercise_user_date)
SELECT * FROM exercise_records
WHERE userId = ?
ORDER BY recordedAt DESC
LIMIT 100; -- Over-fetch for uniqueness filtering
```

### Caching Strategy

- **By-date queries**: Cache for 5 minutes (historical data rarely changes)
- **Recent queries**: Cache for 5 minutes, invalidate on new exercise creation
- **List transforms**: Memoize with `useMemo` based on exercise array reference

## Assumptions

1. **Date format**: All `recordedAt` values use ISO 8601 format
2. **Timezone**: Dates compared in user's local timezone
3. **Uniqueness**: Exercise type is the primary distinguishing factor for "recent unique"
4. **Set ordering**: `setNumber` field maintains set order within an exercise session
5. **No schema changes**: Feature works entirely with existing table structure
