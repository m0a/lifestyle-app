# Research: Multiple Photos Per Meal

**Feature**: 016-multiple-meal-photos
**Date**: 2026-01-06
**Status**: Phase 0 Complete

## Overview

This document consolidates research findings for implementing multiple photo support for meal records, including database schema design, carousel UI patterns, gesture handling, and AI analysis aggregation.

## Key Research Areas

### 1. Database Schema Design for Multiple Photos

**Decision**: Create separate `meal_photos` table with 1:N relationship to `meal_records`

**Rationale**:
- **Flexibility**: Allows independent photo metadata (upload time, analysis status, R2 key)
- **Migration safety**: Existing `meal_records.photo_key` can remain for backward compatibility during transition
- **Query efficiency**: Can fetch photos separately from meal summary data
- **Cascade delete**: ON DELETE CASCADE ensures orphaned photos are cleaned up

**Schema**:
```sql
CREATE TABLE meal_photos (
  id TEXT PRIMARY KEY,
  meal_id TEXT NOT NULL REFERENCES meal_records(id) ON DELETE CASCADE,
  photo_key TEXT NOT NULL,              -- R2 storage key
  display_order INTEGER NOT NULL,       -- 0-based order for carousel
  analysis_status TEXT,                 -- 'pending' | 'analyzing' | 'complete' | 'failed'
  calories INTEGER,                     -- Individual photo analysis
  protein REAL,
  fat REAL,
  carbs REAL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (meal_id) REFERENCES meal_records(id) ON DELETE CASCADE
);
CREATE INDEX idx_meal_photos_meal ON meal_photos(meal_id, display_order);
```

**Alternatives Considered**:
- **JSON array in meal_records**: Rejected because SQLite JSON functions are limited; hard to query individual photos
- **Separate R2 metadata**: Rejected because D1 is source of truth for app data; R2 is just blob storage

---

### 2. AI Analysis Aggregation Strategy

**Decision**: Store individual photo analysis in `meal_photos`, aggregate in application layer

**Rationale**:
- **Transparency**: Users can see which food items came from which photo
- **Recalculation**: When photos added/removed, easy to recompute totals
- **Chat context**: AI can reference specific photos ("the rice in photo 2")
- **Debugging**: Failed analysis for one photo doesn't invalidate others

**Aggregation Logic**:
```typescript
function aggregateMealNutrition(photos: MealPhoto[]): MealNutrition {
  return photos
    .filter(p => p.analysis_status === 'complete')
    .reduce(
      (total, photo) => ({
        calories: total.calories + (photo.calories ?? 0),
        protein: total.protein + (photo.protein ?? 0),
        fat: total.fat + (photo.fat ?? 0),
        carbs: total.carbs + (photo.carbs ?? 0),
      }),
      { calories: 0, protein: 0, fat: 0, carbs: 0 }
    );
}
```

**Alternatives Considered**:
- **Pre-computed totals in meal_records**: Rejected because requires triggers or app-level sync logic; error-prone
- **Database triggers**: Rejected because adds complexity; TypeScript aggregation is simpler and testable

---

### 3. Carousel UI Pattern (React + Tailwind)

**Decision**: Use native CSS scroll-snap with Tailwind utilities

**Rationale**:
- **No new dependencies**: Tailwind already included; no Swiper/Embla needed
- **Performance**: Native browser scroll is GPU-accelerated; handles touch gestures automatically
- **Accessibility**: Keyboard navigation works out-of-box
- **Bundle size**: Zero JS overhead for basic carousel

**Implementation**:
```tsx
<div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide">
  {photos.map((photo, i) => (
    <img
      key={photo.id}
      src={photo.url}
      className="flex-shrink-0 w-full snap-center"
    />
  ))}
</div>
```

**Indicators**:
```tsx
<div className="flex justify-center gap-1 mt-2">
  {photos.map((_, i) => (
    <div
      key={i}
      className={cn(
        "w-1.5 h-1.5 rounded-full",
        i === currentIndex ? "bg-blue-500" : "bg-gray-300"
      )}
    />
  ))}
</div>
```

**Alternatives Considered**:
- **Swiper.js**: Rejected because 40KB gzipped; overkill for simple horizontal scroll
- **Embla Carousel**: Rejected because adds dependency; native scroll-snap is sufficient

---

### 4. Horizontal vs Vertical Scroll Gesture Detection

**Decision**: Use CSS `touch-action: pan-y` on parent scroll container + `touch-action: pan-x` on carousel

**Rationale**:
- **Browser-native**: `touch-action` tells browser which gestures to handle natively
- **No JS required**: Eliminates need for custom touch event handlers
- **Reliable**: Works across iOS Safari, Android Chrome

**Implementation**:
```tsx
// Parent (vertical scroll list)
<div className="overflow-y-auto" style={{ touchAction: 'pan-y' }}>
  {meals.map(meal => (
    <MealCard key={meal.id}>
      {/* Horizontal carousel */}
      <div
        className="overflow-x-auto snap-x"
        style={{ touchAction: 'pan-x' }}
      >
        {meal.photos.map(photo => <img key={photo.id} />)}
      </div>
    </MealCard>
  ))}
</div>
```

**Alternatives Considered**:
- **Custom touch handlers**: Rejected because complex; prone to bugs; poor accessibility
- **Prevent default + manual scroll**: Rejected because breaks native momentum scrolling

---

### 5. Photo Upload Queue (Offline Support)

**Decision**: Use IndexedDB with `idb` library for offline photo queue

**Rationale**:
- **Already in use**: `idb` is existing dependency for offline meal sync
- **Large blobs**: IndexedDB handles photo Blobs better than localStorage (5MB limit)
- **Transactional**: Can atomically update queue state (pending → uploading → complete)

**Queue Schema**:
```typescript
interface PhotoUploadTask {
  id: string;
  mealId: string;
  photoBlob: Blob;
  displayOrder: number;
  status: 'pending' | 'uploading' | 'complete' | 'failed';
  retryCount: number;
  createdAt: number;
}
```

**Background Sync**:
- Listen for `online` event
- Process queue in FIFO order
- Max 3 retries with exponential backoff

**Alternatives Considered**:
- **Service Worker Background Sync API**: Rejected because limited browser support; Cloudflare Workers don't need SW
- **LocalStorage**: Rejected because 5MB limit; can't store multiple photos

---

### 6. Chat Integration: Photo Upload During Conversation

**Decision**: Add file input button in chat UI; upload to R2 first, then send analysis request

**Rationale**:
- **Non-blocking**: Upload photo while user continues typing
- **Progress feedback**: Show upload progress in chat bubble
- **Failure recovery**: If upload fails, photo not added to meal; chat shows error

**Flow**:
1. User clicks "Add Photo" in chat
2. File input opens → user selects photo
3. Photo uploads to R2 (show progress)
4. On success, create `meal_photos` record with status='pending'
5. Trigger AI analysis in background
6. AI assistant responds: "I've added the photo and I'm analyzing it now..."
7. When analysis completes, send follow-up message with updated nutrition

**Alternatives Considered**:
- **Inline photo in chat message**: Rejected because chat messages are ephemeral; photos are permanent meal data
- **Block chat until analysis complete**: Rejected because violates "background upload" requirement

---

### 7. Migration Strategy for Existing Meals

**Decision**: Keep existing `meal_records.photo_key`; lazily migrate to `meal_photos` on first edit

**Rationale**:
- **Zero downtime**: Existing meals continue to work
- **Lazy migration**: Only convert when user adds second photo
- **Fallback**: Display logic checks `meal_photos` first, falls back to `photo_key`

**Migration Logic**:
```typescript
async function ensureMealPhotos(mealId: string, db: Database) {
  const photos = await db.query.mealPhotos.findMany({
    where: eq(mealPhotos.mealId, mealId)
  });

  if (photos.length === 0) {
    // Check if old photo_key exists
    const meal = await db.query.mealRecords.findFirst({
      where: eq(mealRecords.id, mealId)
    });

    if (meal?.photoKey) {
      // Migrate old photo to new table
      await db.insert(mealPhotos).values({
        id: nanoid(),
        mealId,
        photoKey: meal.photoKey,
        displayOrder: 0,
        analysisStatus: 'complete',
        calories: meal.calories,
        protein: meal.totalProtein,
        fat: meal.totalFat,
        carbs: meal.totalCarbs,
        createdAt: meal.createdAt,
      });
    }
  }

  return photos;
}
```

**Alternatives Considered**:
- **Bulk migration script**: Rejected because requires downtime; risky for production data
- **Dual-write**: Rejected because adds complexity; lazy migration is simpler

---

## Best Practices Applied

### React Performance
- **Lazy load images**: Use `loading="lazy"` for carousel images
- **Virtual scrolling**: Not needed (10 photos max; all fit in viewport)
- **Memoization**: Memoize photo aggregation function to avoid recalculating on every render

### Cloudflare Workers
- **R2 presigned URLs**: Generate time-limited URLs for photo display; avoid proxying blobs through Workers
- **Batch analysis**: If multiple photos uploaded at once, batch AI requests to reduce latency

### Type Safety
- **Zod schemas**: Define `MealPhotoSchema` in `packages/shared`
- **Drizzle types**: Export `MealPhoto` type from schema
- **API contracts**: Use Hono RPC for type-safe client calls

### Testing Strategy
- **Unit tests**: Test photo aggregation logic, queue operations
- **Integration tests**: Test photo upload → analysis → aggregation flow
- **E2E tests**: Test carousel interaction, chat photo upload, delete flow

---

## Open Questions Resolved

1. **Q**: Should we limit photo size?
   **A**: Yes, enforce 10MB max client-side; reject larger files with helpful error

2. **Q**: How to handle duplicate photos?
   **A**: Allow duplicates; user may intentionally re-photograph the same item (e.g., before/after eating)

3. **Q**: What if user deletes all photos?
   **A**: Meal record remains; shows "No photos" state; allows adding new photos

4. **Q**: Should carousel be infinite loop?
   **A**: No, finite scroll (1st photo → last photo); simpler UX for small sets

---

## Dependencies Confirmed

- **Existing**: `idb`, `@ai-sdk/google`, `nanoid`, `drizzle-orm`, `zod`
- **No new dependencies required**

---

## Next Steps (Phase 1)

1. Generate `data-model.md` with detailed entity schemas
2. Generate API contracts in `contracts/`
3. Create `quickstart.md` for developer onboarding
4. Update `.specify/memory/context-claude.md` with research findings
