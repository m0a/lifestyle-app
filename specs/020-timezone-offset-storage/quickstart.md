# Quickstart: Timezone Offset Storage

**Feature**: 020-timezone-offset-storage
**Date**: 2026-01-18

## Prerequisites

- Node.js 20+
- pnpm
- Existing lifestyle-app development environment

## Setup

```bash
# 1. Switch to feature branch
git checkout 020-timezone-offset-storage

# 2. Install dependencies (including date-fns-tz for frontend)
pnpm install

# 3. Build shared package
pnpm build:shared

# 4. Run local migration (preview DB)
pnpm --filter @lifestyle-app/backend db:migrate:local

# 5. Start development servers
pnpm dev:all
```

## Key Files to Modify

### 1. Shared Schema (packages/shared/src/schemas/index.ts)

```typescript
// Change datetimeSchema to require offset
const datetimeSchema = z.string().refine(
  (val) => val.includes('Z') || /[+-]\d{2}:\d{2}$/.test(val),
  { message: 'Timezone offset required' }
);
```

### 2. Frontend Datetime Utility (packages/frontend/src/lib/datetime.ts)

```typescript
import { formatInTimeZone } from 'date-fns-tz';

export const toLocalISOString = (date: Date): string => {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return formatInTimeZone(date, tz, "yyyy-MM-dd'T'HH:mm:ssXXX");
};
```

### 3. Backend Date Extraction (packages/backend/src/services/dashboard.ts)

```typescript
// Replace toZonedTime with simple slice
const extractLocalDate = (recordedAt: string): string => {
  return recordedAt.slice(0, 10);
};
```

### 4. Migration SQL (packages/backend/migrations/XXXX_timezone_offset.sql)

```sql
UPDATE weight_records
SET recorded_at = strftime('%Y-%m-%dT%H:%M:%S', datetime(recorded_at, '+9 hours')) || '+09:00'
WHERE recorded_at LIKE '%Z';

UPDATE meal_records
SET recorded_at = strftime('%Y-%m-%dT%H:%M:%S', datetime(recorded_at, '+9 hours')) || '+09:00'
WHERE recorded_at LIKE '%Z';

UPDATE exercise_records
SET recorded_at = strftime('%Y-%m-%dT%H:%M:%S', datetime(recorded_at, '+9 hours')) || '+09:00'
WHERE recorded_at LIKE '%Z';
```

## Testing

```bash
# Run unit tests
pnpm test tests/unit/datetime.test.ts

# Run integration tests
pnpm test tests/integration/timezone.test.ts

# Run all tests
pnpm test
```

## Verification Checklist

- [ ] New records saved with offset (e.g., `+09:00`)
- [ ] Dashboard shows correct dates for morning records
- [ ] Existing data migrated to JST offset format
- [ ] No `timezone` parameter in API calls
- [ ] All tests pass

## Common Issues

### Issue: "Timezone offset required" error

**Cause**: Frontend sending datetime without offset

**Solution**: Use `toLocalISOString()` instead of `toISOString()`

### Issue: Existing data not migrated

**Cause**: Migration not run on target DB

**Solution**: Run `pnpm db:migrate` for production, `pnpm db:migrate:local` for preview

### Issue: Wrong date displayed

**Cause**: Using `Date.toISOString()` which converts to UTC

**Solution**: Use `formatInTimeZone()` from date-fns-tz
