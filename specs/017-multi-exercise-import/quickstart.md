# Quickstart: Multi-Exercise Import Implementation

**Feature**: 017-multi-exercise-import
**Date**: 2026-01-08

## Prerequisites

- Node.js 20+
- pnpm 8+
- Running local development environment (`pnpm dev:all`)
- Existing exercise records in database for testing

## Development Setup

### 1. Install Dependencies

```bash
# From project root
pnpm install

# Add react-window for virtualization (only if needed for 50+ items)
pnpm --filter @lifestyle-app/frontend add react-window
pnpm --filter @lifestyle-app/frontend add -D @types/react-window
```

### 2. Start Development Servers

```bash
# Terminal 1: Backend (Wrangler)
pnpm dev:backend
# → http://localhost:8787

# Terminal 2: Frontend (Vite)
pnpm dev
# → http://localhost:5173
```

### 3. Test Data Setup

Create test exercises for development:

```typescript
// Run in browser console or via API tool
const testDates = ['2026-01-05', '2026-01-06', '2026-01-07'];
const exercises = ['ベンチプレス', 'スクワット', 'デッドリフト'];

for (const date of testDates) {
  for (const exercise of exercises) {
    await fetch('http://localhost:8787/api/exercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exerciseType: exercise,
        sets: [
          { setNumber: 1, reps: 10, weight: 50 },
          { setNumber: 2, reps: 10, weight: 50 },
          { setNumber: 3, reps: 8, weight: 55 },
        ],
        recordedAt: `${date}T14:30:00Z`,
      }),
      credentials: 'include',
    });
  }
}
```

## Implementation Order

### Phase 1: Backend API (TDD)

#### 1.1 Add Types to Shared Package

```bash
# Edit: packages/shared/src/types/exercise.ts
```

```typescript
export interface ExerciseSummary {
  id: string;
  exerciseType: string;
  muscleGroup: string | null;
  totalSets: number;
  displaySets: string;
  timestamp: string;
  recordedAt: string;
}

export interface RecentExerciseItem {
  id: string;
  exerciseType: string;
  muscleGroup: string | null;
  lastPerformedDate: string;
  lastPerformedTime: string;
  preview: string;
}
```

```bash
# Rebuild shared package
pnpm build:shared
```

#### 1.2 Write Integration Tests

```bash
# Create: tests/integration/exercise-import-api.test.ts
```

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { createTestContext } from './helpers';

describe('GET /api/exercises/by-date', () => {
  it('returns exercises for specific date', async () => {
    const { client, userId } = await createTestContext();

    const res = await client.exercises['by-date'].$get({
      query: { date: '2026-01-05' },
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.exercises).toHaveLength(3);
    expect(data.exercises[0]).toMatchObject({
      exerciseType: expect.any(String),
      totalSets: expect.any(Number),
      timestamp: expect.stringMatching(/^\d{2}:\d{2}$/),
    });
  });

  it('returns empty array for date with no exercises', async () => {
    const { client } = await createTestContext();

    const res = await client.exercises['by-date'].$get({
      query: { date: '2026-01-01' },
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.exercises).toHaveLength(0);
  });
});

describe('GET /api/exercises/recent', () => {
  it('returns 10 most recent unique exercises', async () => {
    const { client } = await createTestContext();

    const res = await client.exercises.recent.$get({
      query: { limit: '10' },
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.exercises.length).toBeLessThanOrEqual(10);

    // Verify uniqueness
    const types = data.exercises.map(e => e.exerciseType);
    expect(new Set(types).size).toBe(types.length);
  });
});
```

```bash
# Run tests (should fail - RED phase)
pnpm test:integration exercise-import
```

#### 1.3 Implement Backend Routes

```bash
# Edit: packages/backend/src/routes/exercises.ts
```

```typescript
// Add new routes
app.get('/by-date', async (c) => {
  const { date } = c.req.query();
  const userId = c.get('userId');

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return c.json({ message: 'Invalid date format' }, 400);
  }

  // Query exercises for date
  const startOfDay = `${date}T00:00:00Z`;
  const endOfDay = `${date}T23:59:59Z`;

  const records = await c.get('db')
    .select()
    .from(schema.exerciseRecords)
    .where(
      and(
        eq(schema.exerciseRecords.userId, userId),
        gte(schema.exerciseRecords.recordedAt, startOfDay),
        lte(schema.exerciseRecords.recordedAt, endOfDay)
      )
    )
    .orderBy(desc(schema.exerciseRecords.recordedAt));

  // Aggregate by exercise type
  const summaries = aggregateExerciseSets(records);

  return c.json({
    exercises: summaries,
    count: summaries.length,
  });
});

app.get('/recent', async (c) => {
  const limit = parseInt(c.req.query('limit') || '10');
  const userId = c.get('userId');

  // Query recent exercises (over-fetch for uniqueness)
  const records = await c.get('db')
    .select()
    .from(schema.exerciseRecords)
    .where(eq(schema.exerciseRecords.userId, userId))
    .orderBy(desc(schema.exerciseRecords.recordedAt))
    .limit(limit * 5); // Over-fetch to ensure uniqueness

  // Get unique recent exercises
  const recentUnique = getRecentUniqueExercises(records, limit);

  return c.json({
    exercises: recentUnique,
    count: recentUnique.length,
  });
});
```

```bash
# Run tests (should pass - GREEN phase)
pnpm test:integration exercise-import
```

### Phase 2: Frontend Components (TDD)

#### 2.1 Write Component Tests

```bash
# Create: packages/frontend/src/components/exercise/__tests__/ExerciseImportDialog.test.tsx
```

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExerciseImportDialog } from '../ExerciseImportDialog';

describe('ExerciseImportDialog', () => {
  it('renders dialog when open', () => {
    render(
      <ExerciseImportDialog
        isOpen={true}
        exercises={[]}
        onClose={vi.fn()}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Import from History')).toBeInTheDocument();
  });

  it('calls onSelect when exercise clicked', () => {
    const onSelect = vi.fn();
    const exercises = [
      {
        id: '1',
        exerciseType: 'ベンチプレス',
        totalSets: 3,
        displaySets: '3セット × 10回',
        timestamp: '14:30',
        recordedAt: '2026-01-05T14:30:00Z',
      },
    ];

    render(
      <ExerciseImportDialog
        isOpen={true}
        exercises={exercises}
        onClose={vi.fn()}
        onSelect={onSelect}
      />
    );

    fireEvent.click(screen.getByText('ベンチプレス'));
    expect(onSelect).toHaveBeenCalledWith(exercises[0]);
  });
});
```

```bash
# Run tests (should fail - RED)
pnpm test ExerciseImportDialog
```

#### 2.2 Implement Components

```bash
# Create: packages/frontend/src/components/exercise/ExerciseImportDialog.tsx
```

```typescript
import { useEffect, useRef } from 'react';
import { ExerciseSummary } from '@lifestyle-app/shared';
import { ExerciseImportList } from './ExerciseImportList';

interface Props {
  isOpen: boolean;
  exercises: ExerciseSummary[];
  onClose: () => void;
  onSelect: (exercise: ExerciseSummary) => void;
  isLoading?: boolean;
}

export function ExerciseImportDialog({
  isOpen,
  exercises,
  onClose,
  onSelect,
  isLoading = false,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      className="w-full max-w-md rounded-lg p-0 backdrop:bg-black/50"
      onClose={onClose}
      aria-labelledby="import-dialog-title"
    >
      <div className="flex h-[80vh] flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <h2 id="import-dialog-title" className="text-lg font-semibold">
            過去のトレーニングから取り込み
          </h2>
          <button
            onClick={onClose}
            className="rounded p-2 hover:bg-gray-100"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <ExerciseListSkeleton count={5} />
          ) : exercises.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <p>この日はエクササイズが記録されていません</p>
            </div>
          ) : (
            <ExerciseImportList exercises={exercises} onSelect={onSelect} />
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4">
          <button
            onClick={onClose}
            className="w-full rounded-md bg-gray-100 py-2 font-medium hover:bg-gray-200"
          >
            キャンセル
          </button>
        </div>
      </div>
    </dialog>
  );
}
```

```bash
# Run tests (should pass - GREEN)
pnpm test ExerciseImportDialog
```

### Phase 3: E2E Tests

```bash
# Create: tests/e2e/exercise-import.spec.ts
```

```typescript
import { test, expect } from '@playwright/test';

test.describe('Exercise Import', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    await page.goto('http://localhost:5173/exercises');
  });

  test('can import exercise from date selection', async ({ page }) => {
    // Open import dialog
    await page.click('text=過去から取り込み');

    // Select date
    await page.fill('[type="date"]', '2026-01-05');
    await page.click('text=選択');

    // Verify exercises displayed
    await expect(page.locator('text=ベンチプレス')).toBeVisible();

    // Select exercise
    await page.click('text=ベンチプレス');

    // Verify form populated
    await expect(page.locator('[name="exerciseType"]')).toHaveValue('ベンチプレス');
  });

  test('shows recent exercises for quick access', async ({ page }) => {
    await page.click('text=過去から取り込み');

    // Verify recent exercises section
    await expect(page.locator('text=最近のトレーニング')).toBeVisible();

    // Should show up to 10 recent exercises
    const recentItems = page.locator('[data-testid="recent-exercise-item"]');
    const count = await recentItems.count();
    expect(count).toBeLessThanOrEqual(10);
  });
});
```

```bash
# Run E2E tests
pnpm test:e2e
```

## Testing Checklist

- [ ] Integration tests pass for `/by-date` endpoint
- [ ] Integration tests pass for `/recent` endpoint
- [ ] Unit tests pass for `ExerciseImportDialog`
- [ ] Unit tests pass for `ExerciseImportList`
- [ ] E2E test: Import from date selection
- [ ] E2E test: Recent exercises quick access
- [ ] E2E test: Empty state handling
- [ ] E2E test: Skeleton loading state
- [ ] E2E test: Workout-in-progress dialog

## Performance Validation

```bash
# Use Chrome DevTools Performance tab
# Target: List render <200ms for 50 items

# Test queries with EXPLAIN QUERY PLAN
wrangler d1 execute health-tracker-db --local \
  --command="EXPLAIN QUERY PLAN SELECT * FROM exercise_records WHERE userId = 'test' AND recordedAt >= '2026-01-01'"
```

## Common Issues

### Issue: Dialog not opening

**Solution**: Verify browser support for `<dialog>` element. Add polyfill if needed:
```bash
pnpm --filter @lifestyle-app/frontend add dialog-polyfill
```

### Issue: Slow list rendering

**Solution**: Enable react-window virtualization for 50+ items (see research.md #5)

### Issue: Cache not invalidating

**Solution**: Check query key structure and invalidation logic in mutation handlers

## Next Steps

After completing implementation:
1. Run `/speckit.tasks` to generate task breakdown
2. Implement tasks in priority order
3. Create PR with completed E2E tests
4. Request code review
