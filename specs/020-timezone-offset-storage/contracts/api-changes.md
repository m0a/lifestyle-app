# API Contract Changes: Timezone Offset Storage

**Feature**: 020-timezone-offset-storage
**Date**: 2026-01-18

## Overview

本機能は既存APIのパラメータを変更する。新規エンドポイント追加なし。

## Request Changes

### 全記録API共通

**Before**:
```typescript
{
  recordedAt: "2026-01-17T08:00" | "2026-01-17T08:00:00Z"
}
```

**After**:
```typescript
{
  recordedAt: "2026-01-17T08:00:00+09:00" // Offset REQUIRED
}
```

**Validation Error** (if offset missing):
```json
{
  "error": "Timezone offset required (e.g., +09:00 or Z)"
}
```

### POST /api/weights

```typescript
// Request Body
{
  weight: number;           // Required
  recordedAt: string;       // Required, MUST include offset
}

// Example
{
  "weight": 70.5,
  "recordedAt": "2026-01-17T08:00:00+09:00"
}
```

### POST /api/meals

```typescript
// Request Body
{
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  recordedAt: string;       // Required, MUST include offset
  // ... other fields unchanged
}

// Example
{
  "mealType": "lunch",
  "recordedAt": "2026-01-17T12:30:00+09:00"
}
```

### POST /api/exercises

```typescript
// Request Body
{
  exerciseType: string;
  recordedAt: string;       // Required, MUST include offset
  // ... other fields unchanged
}

// Example
{
  "exerciseType": "squat",
  "recordedAt": "2026-01-17T18:00:00+09:00"
}
```

## Query Parameter Removals

### GET /api/dashboard/activity

**Before**:
```
GET /api/dashboard/activity?days=800&timezone=Asia/Tokyo
```

**After**:
```
GET /api/dashboard/activity?days=800
```

**Removed Parameters**:
- `timezone` - No longer needed

### GET /api/meals

**Before**:
```
GET /api/meals?startDate=2026-01-01&endDate=2026-01-31&timezone=Asia/Tokyo
```

**After**:
```
GET /api/meals?startDate=2026-01-01&endDate=2026-01-31
```

**Removed Parameters**:
- `timezone` - No longer needed

### GET /api/meals/today

**Before**:
```
GET /api/meals/today?timezone=Asia/Tokyo
```

**After**:
```
GET /api/meals/today
```

**Note**: "Today" determination is now based on client's local date, sent as query parameter if needed.

## Response Changes

### All Record Responses

**Before**:
```json
{
  "id": "xxx",
  "recordedAt": "2026-01-16T23:00:00.000Z",
  ...
}
```

**After**:
```json
{
  "id": "xxx",
  "recordedAt": "2026-01-17T08:00:00+09:00",
  ...
}
```

## Backward Compatibility

### Migration Period (Optional)

During migration, the API could accept both formats:
1. `Z` format (legacy) - Auto-convert to JST offset on backend
2. Offset format (new) - Accept as-is

**Recommendation**: Clean break (reject legacy format after migration)

## Schema Definitions

### Zod Schema

```typescript
// packages/shared/src/schemas/index.ts

// BEFORE
const datetimeSchema = z.string().transform((val, ctx) => {
  if (val.includes('Z') || val.includes('+') || /[+-]\d{2}:\d{2}$/.test(val)) {
    return val;
  }
  const date = new Date(val);
  return date.toISOString(); // Converts to UTC
});

// AFTER
const datetimeSchema = z.string().refine(
  (val) => val.includes('Z') || /[+-]\d{2}:\d{2}$/.test(val),
  { message: 'Timezone offset required (e.g., +09:00 or Z)' }
);
```
