# API Contracts: 食事記録の日付別表示

**Branch**: `001-meal-history` | **Date**: 2026-01-05

## New Endpoint

### GET /api/meals/dates

指定した月の食事記録がある日付リストを取得する。

**Purpose**: 月間カレンダーで記録がある日にマーカーを表示するため

**Request**:
```
GET /api/meals/dates?year=2026&month=1&timezoneOffset=-540
Authorization: Bearer <token>
```

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| year | number | Yes | 年（例: 2026） |
| month | number | Yes | 月（1-12） |
| timezoneOffset | number | No | タイムゾーンオフセット（分）。デフォルト: 0 |

**Response (200 OK)**:
```json
{
  "dates": ["2026-01-01", "2026-01-03", "2026-01-05", "2026-01-10"]
}
```

**Response Schema (Zod)**:
```typescript
const mealDatesResponseSchema = z.object({
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
});
```

**Error Responses**:
- 400 Bad Request: 無効なyear/month
- 401 Unauthorized: 認証エラー

## Existing Endpoints (Usage Change Only)

### GET /api/meals

既存のエンドポイント。日付フィルター使用を変更。

**Current Usage** (All meals):
```
GET /api/meals
```

**New Usage** (Today's meals only):
```
GET /api/meals?startDate=2026-01-05&endDate=2026-01-05
```

**New Usage** (Specific date):
```
GET /api/meals?startDate=2026-01-03&endDate=2026-01-03
```

**Query Parameters** (既存):
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | string | No | 開始日（YYYY-MM-DD） |
| endDate | string | No | 終了日（YYYY-MM-DD） |
| mealType | string | No | 食事種別フィルター |

**Response (既存、変更なし)**:
```json
{
  "meals": [
    {
      "id": "uuid",
      "userId": "uuid",
      "mealType": "breakfast",
      "content": "サンドイッチ",
      "calories": 450,
      "recordedAt": "2026-01-05T08:30:00.000Z",
      ...
    }
  ]
}
```

## Frontend API Client Usage

### Today's Meals (Meal.tsx)

```typescript
// Before
const { meals } = useMeals();

// After
const today = new Date().toISOString().split('T')[0];
const { meals } = useMeals({ startDate: today, endDate: today });
```

### Selected Date's Meals (MealHistory.tsx)

```typescript
const { meals } = useMeals({
  startDate: selectedDate,
  endDate: selectedDate
});
```

### Dates with Records (MealCalendar.tsx)

```typescript
const { data } = useQuery({
  queryKey: ['meals', 'dates', year, month],
  queryFn: async () => {
    const res = await api.meals.dates.$get({
      query: { year, month, timezoneOffset: new Date().getTimezoneOffset() }
    });
    return res.json();
  }
});
```

## Type Definitions (Shared Package)

```typescript
// packages/shared/src/schemas/index.ts (追加)

export const mealDatesQuerySchema = z.object({
  year: z.coerce.number().int().min(1970).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  timezoneOffset: z.coerce.number().optional(),
});

export const mealDatesResponseSchema = z.object({
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
});

export type MealDatesQuery = z.infer<typeof mealDatesQuerySchema>;
export type MealDatesResponse = z.infer<typeof mealDatesResponseSchema>;
```
