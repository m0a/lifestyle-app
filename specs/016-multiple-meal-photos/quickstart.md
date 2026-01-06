# Quickstart: Multiple Photos Per Meal

**Feature**: 016-multiple-meal-photos
**Date**: 2026-01-06
**For**: Developers implementing this feature

## Overview

This guide walks you through implementing multi-photo support for meal records. You'll learn how to:
1. Run database migrations
2. Implement backend photo endpoints
3. Build frontend carousel components
4. Test the complete flow

**Estimated Time**: 4-6 hours (with tests)

---

## Prerequisites

- Node.js 20+
- pnpm installed
- Cloudflare account (for D1 + R2)
- Local development environment set up (`pnpm dev:all` runs successfully)

---

## Step 1: Database Migration (15 min)

### 1.1 Generate Migration

```bash
cd packages/backend
pnpm db:generate
```

This creates `migrations/0006_add_meal_photos.sql` (or next number).

### 1.2 Edit Migration File

Copy the following SQL to the generated migration file:

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

CREATE INDEX idx_meal_photos_meal ON meal_photos(meal_id, display_order);

-- Add photo_id to meal_food_items (optional - for linking items to specific photos)
ALTER TABLE meal_food_items ADD COLUMN photo_id TEXT REFERENCES meal_photos(id) ON DELETE SET NULL;
CREATE INDEX idx_meal_food_items_photo ON meal_food_items(photo_id);
```

### 1.3 Apply Migration Locally

```bash
pnpm --filter @lifestyle-app/backend db:migrate:local
```

Verify: Check `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/...` with `sqlite3` or DB viewer.

### 1.4 Apply to Production (after testing)

```bash
pnpm db:migrate  # Applies to production D1
```

---

## Step 2: Backend Schema + Types (20 min)

### 2.1 Update Drizzle Schema

**File**: `packages/backend/src/db/schema.ts`

Add new table definition:

```typescript
export const mealPhotos = sqliteTable(
  'meal_photos',
  {
    id: text('id').primaryKey(),
    mealId: text('meal_id')
      .notNull()
      .references(() => mealRecords.id, { onDelete: 'cascade' }),
    photoKey: text('photo_key').notNull(),
    displayOrder: integer('display_order').notNull(),
    analysisStatus: text('analysis_status'), // 'pending' | 'analyzing' | 'complete' | 'failed'
    calories: integer('calories'),
    protein: real('protein'),
    fat: real('fat'),
    carbs: real('carbs'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    idx_meal_photos_meal: index('idx_meal_photos_meal').on(table.mealId, table.displayOrder),
  })
);

export const mealPhotosRelations = relations(mealPhotos, ({ one }) => ({
  meal: one(mealRecords, {
    fields: [mealPhotos.mealId],
    references: [mealRecords.id],
  }),
}));

// Update mealRecordsRelations
export const mealRecordsRelations = relations(mealRecords, ({ one, many }) => ({
  user: one(users, {
    fields: [mealRecords.userId],
    references: [users.id],
  }),
  foodItems: many(mealFoodItems),
  chatMessages: many(mealChatMessages),
  photos: many(mealPhotos),  // NEW
}));

// Type exports
export type MealPhoto = typeof mealPhotos.$inferSelect;
export type NewMealPhoto = typeof mealPhotos.$inferInsert;
```

### 2.2 Create Shared Schemas

**File**: `packages/shared/src/schemas/photo.ts` (create new file)

```typescript
import { z } from 'zod';

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

export const addPhotoRequestSchema = z.object({
  photo: z.instanceof(File),
  displayOrder: z.number().int().min(0).max(9).optional(),
});

export const photoDeleteRequestSchema = z.object({
  photoId: z.string(),
});
```

---

## Step 3: Backend Photo Service (45 min)

### 3.1 Create Photo Service

**File**: `packages/backend/src/services/meal-photo.service.ts` (create new)

```typescript
import { nanoid } from 'nanoid';
import { eq, and, asc } from 'drizzle-orm';
import type { Database } from '../db';
import { mealPhotos, type MealPhoto } from '../db/schema';

export class MealPhotoService {
  constructor(private db: Database) {}

  async getMealPhotos(mealId: string): Promise<MealPhoto[]> {
    return this.db.query.mealPhotos.findMany({
      where: eq(mealPhotos.mealId, mealId),
      orderBy: asc(mealPhotos.displayOrder),
    });
  }

  async addPhoto(data: {
    mealId: string;
    photoKey: string;
    displayOrder?: number;
  }): Promise<MealPhoto> {
    const existing = await this.getMealPhotos(data.mealId);

    if (existing.length >= 10) {
      throw new Error('Maximum 10 photos per meal');
    }

    const displayOrder = data.displayOrder ?? existing.length;

    const [photo] = await this.db
      .insert(mealPhotos)
      .values({
        id: nanoid(),
        mealId: data.mealId,
        photoKey: data.photoKey,
        displayOrder,
        analysisStatus: 'pending',
        createdAt: new Date().toISOString(),
      })
      .returning();

    return photo;
  }

  async deletePhoto(photoId: string): Promise<{ photoKey: string }> {
    const photo = await this.db.query.mealPhotos.findFirst({
      where: eq(mealPhotos.id, photoId),
    });

    if (!photo) {
      throw new Error('Photo not found');
    }

    // Check if last photo
    const remaining = await this.getMealPhotos(photo.mealId);
    if (remaining.length === 1) {
      throw new Error('Meals must have at least one photo');
    }

    await this.db.delete(mealPhotos).where(eq(mealPhotos.id, photoId));

    return { photoKey: photo.photoKey };
  }

  calculateTotals(photos: MealPhoto[]) {
    const analyzed = photos.filter((p) => p.analysisStatus === 'complete');

    return {
      calories: analyzed.reduce((sum, p) => sum + (p.calories ?? 0), 0),
      protein: analyzed.reduce((sum, p) => sum + (p.protein ?? 0), 0),
      fat: analyzed.reduce((sum, p) => sum + (p.fat ?? 0), 0),
      carbs: analyzed.reduce((sum, p) => sum + (p.carbs ?? 0), 0),
      photoCount: photos.length,
      analyzedPhotoCount: analyzed.length,
    };
  }
}
```

---

## Step 4: Backend API Routes (60 min)

### 4.1 Add Photo Endpoints

**File**: `packages/backend/src/routes/meals.ts` (modify existing)

```typescript
import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { MealPhotoService } from '../services/meal-photo.service';
import { PhotoStorageService } from '../services/photo-storage';

// ... existing imports

const meals = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ... existing routes

// GET /api/meals/:mealId/photos
meals.get('/:mealId/photos', async (c) => {
  const { mealId } = c.req.param();
  const db = c.get('db');
  const photoService = new MealPhotoService(db);

  const photos = await photoService.getMealPhotos(mealId);
  const totals = photoService.calculateTotals(photos);

  // Generate presigned URLs
  const photoStorage = new PhotoStorageService(c.env.PHOTOS);
  const photosWithUrls = await Promise.all(
    photos.map(async (photo) => ({
      ...photo,
      photoUrl: await photoStorage.getPresignedUrl(photo.photoKey),
    }))
  );

  return c.json({ photos: photosWithUrls, totals });
});

// POST /api/meals/:mealId/photos
meals.post('/:mealId/photos', async (c) => {
  const { mealId } = c.req.param();
  const formData = await c.req.formData();
  const photoFile = formData.get('photo') as File;
  const displayOrder = formData.get('displayOrder')
    ? parseInt(formData.get('displayOrder') as string)
    : undefined;

  if (!photoFile || !(photoFile instanceof File)) {
    return c.json({ message: 'Photo file required' }, 400);
  }

  if (photoFile.size > 10 * 1024 * 1024) {
    return c.json({ message: 'Max 10MB file size', code: 'FILE_TOO_LARGE' }, 413);
  }

  const db = c.get('db');
  const userId = c.get('userId'); // From auth middleware
  const photoService = new MealPhotoService(db);
  const photoStorage = new PhotoStorageService(c.env.PHOTOS);

  // Verify meal belongs to user
  const meal = await db.query.mealRecords.findFirst({
    where: and(
      eq(mealRecords.id, mealId),
      eq(mealRecords.userId, userId)
    ),
  });

  if (!meal) {
    return c.json({ message: 'Meal not found' }, 404);
  }

  // Upload to R2
  const photoId = nanoid();
  const photoKey = `photos/${userId}/${mealId}/${photoId}.jpg`;
  await photoStorage.uploadPhoto(photoKey, photoFile);

  // Create DB record
  const photo = await photoService.addPhoto({
    mealId,
    photoKey,
    displayOrder,
  });

  // Generate presigned URL
  const photoUrl = await photoStorage.getPresignedUrl(photoKey);

  // TODO: Trigger AI analysis (async)

  return c.json({ photo: { ...photo, photoUrl } }, 201);
});

// DELETE /api/meals/:mealId/photos/:photoId
meals.delete('/:mealId/photos/:photoId', async (c) => {
  const { mealId, photoId } = c.req.param();
  const db = c.get('db');
  const photoService = new MealPhotoService(db);
  const photoStorage = new PhotoStorageService(c.env.PHOTOS);

  try {
    const { photoKey } = await photoService.deletePhoto(photoId);

    // Delete from R2
    await photoStorage.deletePhoto(photoKey);

    // Recalculate totals
    const remainingPhotos = await photoService.getMealPhotos(mealId);
    const updatedTotals = photoService.calculateTotals(remainingPhotos);

    return c.json({
      success: true,
      remainingPhotos: remainingPhotos.length,
      updatedTotals,
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes('at least one')) {
      return c.json({ message: err.message, code: 'LAST_PHOTO' }, 400);
    }
    throw err;
  }
});

export { meals };
```

---

## Step 5: Frontend Carousel Component (60 min)

### 5.1 Create PhotoCarousel Component

**File**: `packages/frontend/src/components/meal/PhotoCarousel.tsx` (create new)

```typescript
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface Photo {
  id: string;
  photoUrl: string;
  analysisStatus?: string;
}

interface PhotoCarouselProps {
  photos: Photo[];
  onPhotoClick?: (photoIndex: number) => void;
}

export function PhotoCarousel({ photos, onPhotoClick }: PhotoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollLeft = container.scrollLeft;
      const width = container.offsetWidth;
      const index = Math.round(scrollLeft / width);
      setCurrentIndex(index);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  if (photos.length === 0) {
    return <div className="text-gray-500">No photos</div>;
  }

  if (photos.length === 1) {
    // Single photo - no carousel needed
    return (
      <img
        src={photos[0].photoUrl}
        alt="Meal"
        className="w-full h-48 object-cover rounded-lg cursor-pointer"
        onClick={() => onPhotoClick?.(0)}
      />
    );
  }

  return (
    <div className="relative">
      {/* Photo scroll container */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ touchAction: 'pan-x' }}
      >
        {photos.map((photo, i) => (
          <img
            key={photo.id}
            src={photo.photoUrl}
            alt={`Meal photo ${i + 1}`}
            className="flex-shrink-0 w-full h-48 object-cover snap-center cursor-pointer"
            onClick={() => onPhotoClick?.(i)}
          />
        ))}
      </div>

      {/* Indicators */}
      <div className="flex justify-center gap-1 mt-2">
        {photos.map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-1.5 h-1.5 rounded-full transition-colors',
              i === currentIndex ? 'bg-blue-500' : 'bg-gray-300'
            )}
          />
        ))}
      </div>
    </div>
  );
}
```

### 5.2 Integrate into MealList

**File**: `packages/frontend/src/components/meal/MealList.tsx` (modify)

```typescript
import { PhotoCarousel } from './PhotoCarousel';

// ... existing code

function MealCard({ meal }: { meal: Meal }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3>{meal.mealType}</h3>

      {/* Replace single photo with carousel */}
      <PhotoCarousel
        photos={meal.photos ?? []}
        onPhotoClick={(index) => {
          // TODO: Open full-screen gallery
          console.log('Photo clicked:', index);
        }}
      />

      <div className="mt-2">
        <p>{meal.totals.calories} kcal</p>
      </div>
    </div>
  );
}
```

---

## Step 6: Testing (60 min)

### 6.1 Unit Test: Photo Service

**File**: `packages/backend/tests/unit/meal-photo.service.test.ts` (create new)

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createDb } from '../../src/db';
import { MealPhotoService } from '../../src/services/meal-photo.service';
import { nanoid } from 'nanoid';

describe('MealPhotoService', () => {
  let db: Database;
  let service: MealPhotoService;

  beforeEach(async () => {
    // Setup test DB (in-memory SQLite)
    db = createDb(/* ... test D1 */);
    service = new MealPhotoService(db);
  });

  it('should add photo to meal', async () => {
    const mealId = nanoid();
    const photo = await service.addPhoto({
      mealId,
      photoKey: 'photos/test.jpg',
    });

    expect(photo.mealId).toBe(mealId);
    expect(photo.displayOrder).toBe(0);
    expect(photo.analysisStatus).toBe('pending');
  });

  it('should throw when exceeding 10 photo limit', async () => {
    const mealId = nanoid();

    // Add 10 photos
    for (let i = 0; i < 10; i++) {
      await service.addPhoto({ mealId, photoKey: `photo${i}.jpg` });
    }

    // 11th should fail
    await expect(
      service.addPhoto({ mealId, photoKey: 'photo11.jpg' })
    ).rejects.toThrow('Maximum 10 photos');
  });

  it('should calculate totals correctly', () => {
    const photos = [
      { calories: 100, protein: 10, fat: 5, carbs: 15, analysisStatus: 'complete' },
      { calories: 200, protein: 20, fat: 10, carbs: 30, analysisStatus: 'complete' },
      { calories: null, protein: null, fat: null, carbs: null, analysisStatus: 'pending' },
    ] as MealPhoto[];

    const totals = service.calculateTotals(photos);

    expect(totals.calories).toBe(300);
    expect(totals.protein).toBe(30);
    expect(totals.analyzedPhotoCount).toBe(2);
    expect(totals.photoCount).toBe(3);
  });
});
```

### 6.2 E2E Test: Photo Upload Flow

**File**: `packages/frontend/tests/e2e/meal-photos.spec.ts` (create new)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Multi-Photo Meals', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should add multiple photos to meal', async ({ page }) => {
    // Create meal
    await page.goto('/meals/new');
    await page.selectOption('select[name="mealType"]', 'lunch');

    // Upload 3 photos
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([
      'tests/fixtures/meal1.jpg',
      'tests/fixtures/meal2.jpg',
      'tests/fixtures/meal3.jpg',
    ]);

    await page.click('button:has-text("Save")');

    // Verify carousel shows 3 dots
    await expect(page.locator('.carousel-indicator')).toHaveCount(3);
  });

  test('should swipe through carousel', async ({ page }) => {
    await page.goto('/meals');

    // Find meal with multiple photos
    const carousel = page.locator('[data-testid="photo-carousel"]').first();

    // Swipe left (simulate touch)
    await carousel.swipe({ direction: 'left' });

    // Check indicator moved
    await expect(carousel.locator('.carousel-indicator.active').nth(1)).toBeVisible();
  });
});
```

---

## Step 7: Run & Verify (15 min)

### 7.1 Start Dev Servers

```bash
# Terminal 1: Backend
pnpm dev:backend

# Terminal 2: Frontend
pnpm dev
```

### 7.2 Manual Testing Checklist

- [ ] Create meal with 2 photos → verify carousel shows 2 dots
- [ ] Swipe carousel left/right → verify smooth scrolling
- [ ] Add 3rd photo to existing meal → verify it appears at end
- [ ] Delete middle photo → verify totals recalculated
- [ ] Try adding 11th photo → verify error message
- [ ] Check meal history list → verify all carousels scroll independently

---

## Troubleshooting

### Issue: Photos not uploading

**Check**:
1. R2 bucket configured in `wrangler.toml`
2. `PHOTOS` binding present in dev environment
3. File size < 10MB

**Debug**:
```bash
wrangler r2 object get health-tracker-photos photos/user_xxx/meal_yyy/photo_zzz.jpg
```

### Issue: Carousel not scrolling

**Check**:
1. CSS `scrollbar-hide` class defined in Tailwind config
2. `touch-action: pan-x` applied to carousel container
3. Parent scroll container has `touch-action: pan-y`

### Issue: Totals not updating

**Check**:
1. `analysisStatus='complete'` for photos (not 'pending')
2. `calculateTotals()` called after photo add/delete
3. Frontend refetches meal data after mutation

---

## Next Steps

1. Run `/speckit.tasks` to generate detailed implementation tasks
2. Implement AI analysis aggregation (not covered in quickstart)
3. Add photo reorder drag-and-drop UI
4. Build full-screen photo gallery modal
5. Optimize carousel for low-end devices

---

## Resources

- [Data Model](./data-model.md)
- [API Contracts](./contracts/api-spec.md)
- [Research Findings](./research.md)
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Hono RPC](https://hono.dev/guides/rpc)
