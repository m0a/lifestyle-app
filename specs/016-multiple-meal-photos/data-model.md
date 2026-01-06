# Data Model: Multiple Photos Per Meal

**Feature**: 016-multiple-meal-photos
**Date**: 2026-01-06
**Status**: Phase 1 Design

## Entity Relationship Diagram

```
┌─────────────────┐
│  meal_records   │
│─────────────────│
│ id (PK)         │───┐
│ user_id (FK)    │   │
│ meal_type       │   │ 1:N
│ content         │   │
│ calories*       │   │
│ photo_key*      │   │ (legacy)
│ total_protein*  │   │
│ total_fat*      │   │
│ total_carbs*    │   │
│ recorded_at     │   │
│ created_at      │   │
│ updated_at      │   │
└─────────────────┘   │
                      │
                      ↓
             ┌─────────────────┐
             │  meal_photos    │
             │─────────────────│
             │ id (PK)         │
             │ meal_id (FK)    │
             │ photo_key       │
             │ display_order   │
             │ analysis_status │
             │ calories        │
             │ protein         │
             │ fat             │
             │ carbs           │
             │ created_at      │
             └─────────────────┘

* Fields in meal_records marked with asterisk are computed/aggregated from meal_photos
* photo_key in meal_records is kept for backward compatibility (legacy meals)
```

## Entities

### meal_photos (NEW)

**Purpose**: Store individual photos for a meal with their analysis results

**Fields**:

| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| id | TEXT | NO | - | Primary key (nanoid) |
| meal_id | TEXT | NO | - | Foreign key to meal_records.id |
| photo_key | TEXT | NO | - | R2 storage key (e.g., "photos/{userId}/{mealId}/{photoId}.jpg") |
| display_order | INTEGER | NO | - | 0-based order for carousel display (0 = first photo) |
| analysis_status | TEXT | YES | NULL | 'pending' \| 'analyzing' \| 'complete' \| 'failed' \| NULL (manual entry) |
| calories | INTEGER | YES | NULL | Calories identified in this photo |
| protein | REAL | YES | NULL | Protein (g) identified in this photo |
| fat | REAL | YES | NULL | Fat (g) identified in this photo |
| carbs | REAL | YES | NULL | Carbs (g) identified in this photo |
| created_at | TEXT | NO | - | ISO 8601 timestamp |

**Indexes**:
- `idx_meal_photos_meal` on (meal_id, display_order) - for ordered photo retrieval

**Constraints**:
- `FOREIGN KEY (meal_id) REFERENCES meal_records(id) ON DELETE CASCADE`
- `CHECK (display_order >= 0)`
- `CHECK (display_order < 10)` - enforce 10 photo limit at DB level

**Validation Rules** (Zod):
```typescript
const mealPhotoSchema = z.object({
  id: z.string().min(1),
  mealId: z.string().min(1),
  photoKey: z.string().min(1),
  displayOrder: z.number().int().min(0).max(9),
  analysisStatus: z.enum(['pending', 'analyzing', 'complete', 'failed']).nullable(),
  calories: z.number().int().min(0).nullable(),
  protein: z.number().min(0).nullable(),
  fat: z.number().min(0).nullable(),
  carbs: z.number().min(0).nullable(),
  createdAt: z.string().datetime(),
});
```

---

### meal_records (MODIFIED)

**Changes**:
- **NO schema changes** - keeps existing columns for backward compatibility
- `photo_key` becomes nullable and optional (legacy field)
- `calories`, `total_protein`, `total_fat`, `total_carbs` are computed from `meal_photos` aggregation

**Behavior**:
- **Read**: If `meal_photos` exist, use those; otherwise fall back to `photo_key` (legacy)
- **Write**: New meals always use `meal_photos`; never write to `photo_key` for new records
- **Migration**: On first photo addition to legacy meal, migrate `photo_key` to `meal_photos[0]`

---

### meal_food_items (MODIFIED - Conceptual)

**Changes**:
- **Add optional photo_id reference** to link food items to specific photos

**New Field**:
| Field | Type | Nullable | Default | Description |
|-------|------|----------|---------|-------------|
| photo_id | TEXT | YES | NULL | Foreign key to meal_photos.id (which photo identified this item) |

**Rationale**: Allows AI chat to say "The rice in the second photo has 200 calories"

**Migration**: Existing food items have `photo_id = NULL` (unknown source)

---

## State Transitions

### Photo Analysis Status

```
NULL (manual entry - no photo)
  ↓
pending (photo uploaded, awaiting AI)
  ↓
analyzing (AI request in progress)
  ↓
complete (analysis finished) OR failed (AI error)
```

**Retry Logic**:
- `failed` → back to `pending` on manual retry (max 3 attempts)
- Background worker retries `pending` photos older than 5 minutes

---

## Data Aggregation

### Meal Totals Calculation

```typescript
interface MealTotals {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  photoCount: number;
  analyzedPhotoCount: number;
}

function calculateMealTotals(photos: MealPhoto[]): MealTotals {
  const analyzed = photos.filter(p => p.analysisStatus === 'complete');

  return {
    calories: analyzed.reduce((sum, p) => sum + (p.calories ?? 0), 0),
    protein: analyzed.reduce((sum, p) => sum + (p.protein ?? 0), 0),
    fat: analyzed.reduce((sum, p) => sum + (p.fat ?? 0), 0),
    carbs: analyzed.reduce((sum, p) => sum + (p.carbs ?? 0), 0),
    photoCount: photos.length,
    analyzedPhotoCount: analyzed.length,
  };
}
```

**Display Logic**:
- If `analyzedPhotoCount < photoCount`, show "Analyzing... ({analyzedPhotoCount}/{photoCount} photos)"
- If all failed, show "Analysis failed" with retry button
- If mix of complete/failed, show partial totals + warning icon

---

## Storage Strategy

### Photo Files (R2)

**Key Structure**: `photos/{userId}/{mealId}/{photoId}.jpg`

**Metadata** (R2 Custom Metadata):
```json
{
  "userId": "user_abc123",
  "mealId": "meal_xyz789",
  "photoId": "photo_def456",
  "uploadedAt": "2026-01-06T12:00:00Z"
}
```

**Presigned URLs**:
- Generate time-limited URLs (1 hour expiry) for photo display
- Cache presigned URLs client-side to reduce R2 API calls

**Deletion**:
- When `meal_photos` record deleted → delete R2 object
- When meal deleted → cascade deletes all `meal_photos` → R2 cleanup in background job

---

## IndexedDB Schema (Frontend Offline Queue)

### photoUploadQueue Store

```typescript
interface PhotoUploadTask {
  id: string;              // nanoid
  mealId: string;
  photoBlob: Blob;         // Actual photo data
  displayOrder: number;
  status: 'pending' | 'uploading' | 'complete' | 'failed';
  retryCount: number;
  errorMessage?: string;
  createdAt: number;       // Unix timestamp
  lastAttemptAt?: number;
}
```

**Indexes**:
- `status` - for filtering pending uploads
- `mealId` - for meal-specific queue view

**Lifecycle**:
1. User uploads photo → insert task with `status='pending'`
2. Background sync picks up task → update `status='uploading'`
3. Upload succeeds → `status='complete'` → delete from queue after 24h (for debugging)
4. Upload fails → `status='failed'`, increment `retryCount`, store error

---

## Query Patterns

### Fetch Meal with Photos

```typescript
// Backend (Drizzle)
const meal = await db.query.mealRecords.findFirst({
  where: eq(mealRecords.id, mealId),
  with: {
    photos: {
      orderBy: asc(mealPhotos.displayOrder),
    },
  },
});

// Aggregate totals
const totals = calculateMealTotals(meal.photos ?? []);
```

### Add Photo to Meal

```typescript
// 1. Validate meal doesn't have 10 photos already
const existingPhotos = await db.query.mealPhotos.findMany({
  where: eq(mealPhotos.mealId, mealId),
});

if (existingPhotos.length >= 10) {
  throw new Error('Maximum 10 photos per meal');
}

// 2. Insert new photo
const newPhoto = await db.insert(mealPhotos).values({
  id: nanoid(),
  mealId,
  photoKey,
  displayOrder: existingPhotos.length, // Append to end
  analysisStatus: 'pending',
  createdAt: new Date().toISOString(),
}).returning();

// 3. Trigger AI analysis (async)
analyzePhotoInBackground(newPhoto.id);
```

### Delete Photo

```typescript
// 1. Fetch photo to get R2 key
const photo = await db.query.mealPhotos.findFirst({
  where: eq(mealPhotos.id, photoId),
});

// 2. Delete from DB (cascade deletes meal_food_items with photo_id)
await db.delete(mealPhotos).where(eq(mealPhotos.id, photoId));

// 3. Delete from R2
await env.PHOTOS.delete(photo.photoKey);

// 4. Reorder remaining photos (optional - can leave gaps)
// ... (not strictly necessary; display_order just determines sort)
```

---

## Migration Scripts

### 0006_add_meal_photos.sql

```sql
-- Create meal_photos table
CREATE TABLE meal_photos (
  id TEXT PRIMARY KEY,
  meal_id TEXT NOT NULL,
  photo_key TEXT NOT NULL,
  display_order INTEGER NOT NULL CHECK (display_order >= 0 AND display_order < 10),
  analysis_status TEXT CHECK (analysis_status IN ('pending', 'analyzing', 'complete', 'failed')),
  calories INTEGER CHECK (calories >= 0),
  protein REAL CHECK (protein >= 0),
  fat REAL CHECK (fat >= 0),
  carbs REAL CHECK (carbs >= 0),
  created_at TEXT NOT NULL,
  FOREIGN KEY (meal_id) REFERENCES meal_records(id) ON DELETE CASCADE
);

-- Create index for efficient photo retrieval
CREATE INDEX idx_meal_photos_meal ON meal_photos(meal_id, display_order);

-- Optional: Add photo_id to meal_food_items for linking items to specific photos
ALTER TABLE meal_food_items ADD COLUMN photo_id TEXT REFERENCES meal_photos(id) ON DELETE SET NULL;
CREATE INDEX idx_meal_food_items_photo ON meal_food_items(photo_id);
```

---

## Backwards Compatibility

### Legacy Meal Display

```typescript
function getMealPhotos(meal: MealRecord): MealPhoto[] {
  if (meal.photos && meal.photos.length > 0) {
    // New multi-photo meal
    return meal.photos;
  } else if (meal.photoKey) {
    // Legacy single-photo meal - convert on-the-fly
    return [{
      id: 'legacy',
      mealId: meal.id,
      photoKey: meal.photoKey,
      displayOrder: 0,
      analysisStatus: 'complete',
      calories: meal.calories ?? null,
      protein: meal.totalProtein ?? null,
      fat: meal.totalFat ?? null,
      carbs: meal.totalCarbs ?? null,
      createdAt: meal.createdAt,
    }];
  } else {
    // No photos
    return [];
  }
}
```

---

## Type Exports (packages/shared)

```typescript
// packages/shared/src/schemas/photo.ts
export const mealPhotoSchema = z.object({
  id: z.string(),
  mealId: z.string(),
  photoKey: z.string(),
  displayOrder: z.number().int().min(0).max(9),
  analysisStatus: z.enum(['pending', 'analyzing', 'complete', 'failed']).nullable(),
  calories: z.number().int().nullable(),
  protein: z.number().nullable(),
  fat: z.number().nullable(),
  carbs: z.number().nullable(),
  createdAt: z.string(),
});

export type MealPhoto = z.infer<typeof mealPhotoSchema>;

export const photoUploadRequestSchema = z.object({
  mealId: z.string(),
  displayOrder: z.number().int().min(0).max(9).optional(),
});

export const photoDeleteRequestSchema = z.object({
  photoId: z.string(),
});
```

---

## Summary

- **New table**: `meal_photos` (1:N with meal_records)
- **No breaking changes**: Existing schema intact; legacy `photo_key` supported
- **Lazy migration**: Convert old meals only when adding second photo
- **Type-safe**: Zod schemas in shared package
- **Performant**: Indexed queries, aggregation in-memory, presigned URLs

Next: Generate API contracts in `contracts/`.
