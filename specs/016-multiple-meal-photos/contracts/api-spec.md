# API Contracts: Multiple Photos Per Meal

**Feature**: 016-multiple-meal-photos
**Date**: 2026-01-06
**Base URL**: `/api`

## Overview

This document defines the HTTP API contracts for multi-photo meal functionality. All endpoints follow RESTful conventions and return JSON responses. Type-safe client access via Hono RPC is available through `packages/frontend/src/lib/client.ts`.

---

## Endpoints

### 1. Add Photo to Meal

**Purpose**: Upload a new photo for an existing meal

**Endpoint**: `POST /api/meals/:mealId/photos`

**Authentication**: Required (JWT)

**Path Parameters**:
- `mealId` (string): Meal record ID

**Request Body** (multipart/form-data):
```typescript
{
  photo: File;  // JPEG/PNG, max 10MB
  displayOrder?: number;  // Optional, defaults to next available order
}
```

**Request Validation** (Zod):
```typescript
const addPhotoRequestSchema = z.object({
  photo: z.instanceof(File)
    .refine(f => f.size <= 10 * 1024 * 1024, 'Max 10MB')
    .refine(f => ['image/jpeg', 'image/png'].includes(f.type), 'JPEG/PNG only'),
  displayOrder: z.number().int().min(0).max(9).optional(),
});
```

**Response** (200 OK):
```typescript
{
  photo: {
    id: string;
    mealId: string;
    photoKey: string;
    displayOrder: number;
    analysisStatus: 'pending';
    createdAt: string;  // ISO 8601
  };
  photoUrl: string;  // Presigned R2 URL (1h expiry)
}
```

**Error Responses**:
- `400 Bad Request`: Invalid file format, size exceeded, or meal already has 10 photos
  ```json
  { "message": "Maximum 10 photos per meal", "code": "PHOTO_LIMIT_EXCEEDED" }
  ```
- `404 Not Found`: Meal not found or doesn't belong to user
- `413 Payload Too Large`: File > 10MB

**Side Effects**:
- Photo uploaded to R2 at `photos/{userId}/{mealId}/{photoId}.jpg`
- `meal_photos` record created with `analysis_status='pending'`
- Background AI analysis triggered (async)

---

### 2. Get Meal Photos

**Purpose**: Retrieve all photos for a meal with presigned URLs

**Endpoint**: `GET /api/meals/:mealId/photos`

**Authentication**: Required (JWT)

**Path Parameters**:
- `mealId` (string): Meal record ID

**Query Parameters**: None

**Response** (200 OK):
```typescript
{
  photos: Array<{
    id: string;
    mealId: string;
    photoKey: string;
    displayOrder: number;
    analysisStatus: 'pending' | 'analyzing' | 'complete' | 'failed';
    calories: number | null;
    protein: number | null;
    fat: number | null;
    carbs: number | null;
    createdAt: string;
    photoUrl: string;  // Presigned URL
  }>;
  totals: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    photoCount: number;
    analyzedPhotoCount: number;
  };
}
```

**Notes**:
- Photos sorted by `display_order` ASC
- `totals` calculated from photos with `analysisStatus='complete'`
- Legacy meals: if no `meal_photos` exist, falls back to `meal_records.photo_key`

**Error Responses**:
- `404 Not Found`: Meal not found or doesn't belong to user

---

### 3. Delete Photo

**Purpose**: Remove a photo from a meal and recalculate totals

**Endpoint**: `DELETE /api/meals/:mealId/photos/:photoId`

**Authentication**: Required (JWT)

**Path Parameters**:
- `mealId` (string): Meal record ID
- `photoId` (string): Photo record ID

**Request Body**: None

**Response** (200 OK):
```typescript
{
  success: true;
  remainingPhotos: number;
  updatedTotals: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  };
}
```

**Error Responses**:
- `400 Bad Request`: Cannot delete last photo (meals must have at least 1 photo)
  ```json
  { "message": "Meals must have at least one photo", "code": "LAST_PHOTO" }
  ```
- `404 Not Found`: Photo not found or doesn't belong to user's meal

**Side Effects**:
- `meal_photos` record deleted (cascade deletes `meal_food_items` with this `photo_id`)
- R2 object deleted at `photoKey`
- Remaining photos keep their `display_order` (no reordering needed)

---

### 4. Reorder Photos

**Purpose**: Change display order of photos in carousel

**Endpoint**: `PATCH /api/meals/:mealId/photos/reorder`

**Authentication**: Required (JWT)

**Path Parameters**:
- `mealId` (string): Meal record ID

**Request Body**:
```typescript
{
  photoOrders: Array<{
    photoId: string;
    displayOrder: number;  // 0-9
  }>;
}
```

**Request Validation**:
```typescript
const reorderPhotosSchema = z.object({
  photoOrders: z.array(z.object({
    photoId: z.string(),
    displayOrder: z.number().int().min(0).max(9),
  })).min(1).max(10),
});
```

**Response** (200 OK):
```typescript
{
  success: true;
  photos: Array<{
    id: string;
    displayOrder: number;
  }>;
}
```

**Error Responses**:
- `400 Bad Request`: Duplicate `displayOrder` values or invalid photo IDs
- `404 Not Found`: Meal not found

**Side Effects**:
- Updates `display_order` for each photo in transaction
- No impact on analysis or totals

---

### 5. Retry Photo Analysis

**Purpose**: Re-trigger AI analysis for a failed photo

**Endpoint**: `POST /api/meals/:mealId/photos/:photoId/analyze`

**Authentication**: Required (JWT)

**Path Parameters**:
- `mealId` (string): Meal record ID
- `photoId` (string): Photo record ID

**Request Body**: None

**Response** (202 Accepted):
```typescript
{
  photo: {
    id: string;
    analysisStatus: 'pending';
  };
  message: 'Analysis queued';
}
```

**Error Responses**:
- `400 Bad Request`: Photo not in `failed` status
  ```json
  { "message": "Photo analysis is already complete", "code": "INVALID_STATUS" }
  ```
- `404 Not Found`: Photo not found

**Side Effects**:
- Updates `analysis_status` to `'pending'`
- Background AI analysis triggered (async)

---

### 6. Get Photo Analysis Status

**Purpose**: Poll analysis status for pending photos (used for real-time updates)

**Endpoint**: `GET /api/meals/:mealId/photos/:photoId/status`

**Authentication**: Required (JWT)

**Path Parameters**:
- `mealId` (string): Meal record ID
- `photoId` (string): Photo record ID

**Response** (200 OK):
```typescript
{
  id: string;
  analysisStatus: 'pending' | 'analyzing' | 'complete' | 'failed';
  calories: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
  errorMessage?: string;  // If failed
}
```

**Error Responses**:
- `404 Not Found`: Photo not found

**Notes**:
- Client should poll this endpoint every 5s when photo status is `'pending'` or `'analyzing'`
- Once `'complete'`, client refetches full meal to update totals

---

## Modified Endpoints

### 7. Create Meal (Modified)

**Endpoint**: `POST /api/meals`

**Changes**:
- **Request body** now accepts `photos: File[]` (multiple photos)
- **Response** includes `photos` array

**Request Body** (multipart/form-data):
```typescript
{
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  content: string;
  recordedAt: string;  // ISO 8601
  photos: File[];  // 1-10 photos (at least 1 required)
}
```

**Response** (201 Created):
```typescript
{
  meal: {
    id: string;
    userId: string;
    mealType: string;
    content: string;
    recordedAt: string;
    createdAt: string;
    updatedAt: string;
  };
  photos: Array<{
    id: string;
    mealId: string;
    photoKey: string;
    displayOrder: number;
    analysisStatus: 'pending';
    photoUrl: string;
  }>;
}
```

**Side Effects**:
- Creates 1 `meal_records` record
- Creates N `meal_photos` records (one per photo)
- Triggers AI analysis for each photo (async, aggregates results when all complete)

---

### 8. Get Meal (Modified)

**Endpoint**: `GET /api/meals/:mealId`

**Changes**:
- **Response** now includes `photos` array and `totals` object

**Response** (200 OK):
```typescript
{
  meal: {
    id: string;
    userId: string;
    mealType: string;
    content: string;
    recordedAt: string;
    createdAt: string;
    updatedAt: string;
  };
  photos: Array<{
    id: string;
    photoKey: string;
    displayOrder: number;
    analysisStatus: string;
    calories: number | null;
    protein: number | null;
    fat: number | null;
    carbs: number | null;
    photoUrl: string;
  }>;
  totals: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    photoCount: number;
    analyzedPhotoCount: number;
  };
  foodItems: Array<{  // Existing
    id: string;
    name: string;
    portion: string;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    photoId: string | null;  // NEW: links item to specific photo
  }>;
}
```

---

### 9. List Meals (Modified)

**Endpoint**: `GET /api/meals?date=YYYY-MM-DD`

**Changes**:
- Each meal in response includes `photoCount` and first photo URL for carousel thumbnail

**Response** (200 OK):
```typescript
{
  meals: Array<{
    id: string;
    mealType: string;
    content: string;
    recordedAt: string;
    totals: {
      calories: number;
      protein: number;
      fat: number;
      carbs: number;
    };
    photoCount: number;
    firstPhotoUrl: string | null;  // For thumbnail
  }>;
}
```

**Notes**:
- `photoCount` used to show "({photoCount} photos)" in UI
- `firstPhotoUrl` used for thumbnail; full photo list fetched on-demand

---

## Chat Integration Endpoints

### 10. Add Photo via Chat (NEW)

**Purpose**: Upload photo during AI chat conversation, triggering analysis and chat response

**Endpoint**: `POST /api/meal-chat/:mealId/add-photo`

**Authentication**: Required (JWT)

**Path Parameters**:
- `mealId` (string): Meal record ID

**Request Body** (multipart/form-data):
```typescript
{
  photo: File;  // JPEG/PNG, max 10MB
  userMessage?: string;  // Optional context (e.g., "I also ate this")
}
```

**Response** (200 OK):
```typescript
{
  photo: {
    id: string;
    photoUrl: string;
    analysisStatus: 'pending';
  };
  chatMessage: {
    id: string;
    role: 'assistant';
    content: string;  // AI acknowledges photo ("I've added the photo and analyzing it now...")
    createdAt: string;
  };
}
```

**Side Effects**:
- Photo uploaded to R2
- `meal_photos` record created
- `meal_chat_messages` record created (AI acknowledgment)
- AI analysis triggered in background
- When analysis completes, another chat message sent with updated totals

**Error Responses**:
- `400 Bad Request`: Photo limit exceeded
- `404 Not Found`: Meal not found

---

## Type-Safe Client Usage (Hono RPC)

### Example: Add Photo

```typescript
import { client } from '@/lib/client';

const formData = new FormData();
formData.append('photo', photoFile);
formData.append('displayOrder', '0');

const res = await client.api.meals[':mealId'].photos.$post({
  param: { mealId: 'meal_123' },
  form: formData,
});

if (res.ok) {
  const data = await res.json();
  console.log('Photo added:', data.photo.id);
}
```

### Example: Get Photos

```typescript
const res = await client.api.meals[':mealId'].photos.$get({
  param: { mealId: 'meal_123' },
});

const { photos, totals } = await res.json();
console.log(`${photos.length} photos, ${totals.calories} total calories`);
```

---

## Error Response Format

All errors follow consistent format:

```typescript
{
  message: string;      // Human-readable error
  code: string;         // Machine-readable code (e.g., 'PHOTO_LIMIT_EXCEEDED')
  details?: unknown;    // Optional additional context
}
```

**Common Error Codes**:
- `PHOTO_LIMIT_EXCEEDED`: Meal already has 10 photos
- `LAST_PHOTO`: Cannot delete last remaining photo
- `INVALID_STATUS`: Operation not valid for current photo status
- `FILE_TOO_LARGE`: Photo exceeds 10MB
- `INVALID_FILE_TYPE`: Not JPEG/PNG
- `MEAL_NOT_FOUND`: Meal doesn't exist or doesn't belong to user

---

## WebSocket Events (Future Enhancement)

**Note**: Not in MVP scope, but considered for future

**Event**: `photo_analysis_complete`
```typescript
{
  photoId: string;
  mealId: string;
  analysis: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  };
  updatedTotals: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  };
}
```

**Purpose**: Real-time updates instead of polling `/status` endpoint

---

## Rate Limits

- **Photo Upload**: 10 requests/minute per user (prevents abuse)
- **Analysis Retry**: 3 retries max per photo (prevents infinite loops)
- **Presigned URLs**: Cached 1 hour; regenerated on-demand

---

## Summary

- **6 new endpoints**: Add/get/delete/reorder/retry photos, chat photo upload
- **3 modified endpoints**: Create/get/list meals (include photos)
- **Type-safe**: Zod validation + Hono RPC
- **RESTful**: Follows standard HTTP conventions
- **Error handling**: Consistent error format with actionable codes

Next: Generate `quickstart.md`.
