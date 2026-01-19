# Data Model: Timezone Offset Storage

**Feature**: 020-timezone-offset-storage
**Date**: 2026-01-18

## Entity Changes

### recorded_at Format Change

**Before** (UTC format):
```
2026-01-17T08:00:00Z
2026-01-16T23:00:00.000Z
```

**After** (Offset format):
```
2026-01-17T08:00:00+09:00
2026-01-17T08:00:00-05:00
```

### Affected Tables

| Table | Column | Type | Change |
|-------|--------|------|--------|
| `weight_records` | `recorded_at` | TEXT | Value format only |
| `meal_records` | `recorded_at` | TEXT | Value format only |
| `exercise_records` | `recorded_at` | TEXT | Value format only |

**Note**: スキーマ変更なし。カラムの値形式のみ変更。

## Validation Rules

### recordedAt Field

```typescript
// Zod schema
const recordedAtSchema = z.string().refine(
  (val) => val.includes('Z') || /[+-]\d{2}:\d{2}$/.test(val),
  { message: 'Timezone offset required (e.g., +09:00 or Z)' }
);
```

**Rules**:
1. ISO 8601 形式であること
2. タイムゾーン指定子を含むこと（`Z` または `±HH:mm`）
3. 有効な日時であること

### Date Extraction

```typescript
// Local date extraction (no Date object needed)
const extractLocalDate = (recordedAt: string): string => {
  return recordedAt.slice(0, 10); // "YYYY-MM-DD"
};
```

**Invariant**: オフセット付き ISO 形式では、先頭10文字が常にローカル日付を表す。

## Migration Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     Migration Process                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Existing Data (UTC)           Migrated Data (JST Offset)   │
│  ────────────────────         ─────────────────────────────  │
│  2026-01-16T23:00:00Z    →    2026-01-17T08:00:00+09:00     │
│  2026-01-17T08:00:00Z    →    2026-01-17T17:00:00+09:00     │
│  2026-01-17T15:30:00Z    →    2026-01-18T00:30:00+09:00     │
│                                                              │
│  Formula: datetime(recorded_at, '+9 hours') || '+09:00'     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## New Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     New Record Flow                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Client (Browser)                                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 1. User enters datetime via input                      │ │
│  │ 2. toLocalISOString(date) generates offset string      │ │
│  │    e.g., "2026-01-17T08:00:00+09:00"                   │ │
│  │ 3. Send to API                                         │ │
│  └────────────────────────────────────────────────────────┘ │
│                           │                                  │
│                           ▼                                  │
│  Backend (API)                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 4. Zod validates offset presence                       │ │
│  │ 5. Store as-is in D1 (TEXT column)                     │ │
│  └────────────────────────────────────────────────────────┘ │
│                           │                                  │
│                           ▼                                  │
│  Display                                                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 6. Extract local date: slice(0, 10)                    │ │
│  │ 7. Display as recorded (no conversion needed)          │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Relationships

No relationship changes. The `recorded_at` column maintains the same relationships:

- `weight_records.user_id` → `users.id`
- `meal_records.user_id` → `users.id`
- `exercise_records.user_id` → `users.id`

## Indexes

No index changes required. Existing indexes on `recorded_at` remain valid as string comparison still works correctly with ISO 8601 format.
