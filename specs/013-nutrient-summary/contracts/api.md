# API Contracts: 栄養素サマリー表示

**Feature**: 013-nutrient-summary
**Date**: 2026-01-04

## 変更対象エンドポイント

### GET /api/dashboard/summary

ダッシュボードサマリーを取得。レスポンスのmealsフィールドに栄養素を追加。

#### Request

変更なし

```
GET /api/dashboard/summary?period=week
Authorization: Bearer {token}
```

**Query Parameters**:
| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| period | 'week' \| 'month' \| 'quarter' \| 'year' | No | 期間（デフォルト: week） |

#### Response

**Status**: 200 OK

```typescript
{
  weight: WeightSummary;
  meals: {
    totalCalories: number;      // 既存
    mealCount: number;          // 既存
    averageCalories: number;    // 既存
    byType: Record<string, number>; // 既存
    totalProtein: number;       // 追加
    totalFat: number;           // 追加
    totalCarbs: number;         // 追加
  };
  exercises: ExerciseSummary;
  period: {
    startDate: string;
    endDate: string;
  };
}
```

**Example Response**:
```json
{
  "weight": { ... },
  "meals": {
    "totalCalories": 5230,
    "mealCount": 9,
    "averageCalories": 581,
    "byType": {
      "breakfast": 3,
      "lunch": 3,
      "dinner": 3
    },
    "totalProtein": 156.5,
    "totalFat": 87.2,
    "totalCarbs": 412.8
  },
  "exercises": { ... },
  "period": {
    "startDate": "2026-01-01T00:00:00.000Z",
    "endDate": "2026-01-04T23:59:59.999Z"
  }
}
```

---

## 変更対象の共有型

### MealSummary (packages/shared/src/types/index.ts)

```typescript
// Before
export interface MealSummary {
  totalCalories: number;
  averageCalories: number;
  count: number;
}

// After
export interface MealSummary {
  totalCalories: number;
  averageCalories: number;
  count: number;
  totalProtein: number;  // 追加
  totalFat: number;      // 追加
  totalCarbs: number;    // 追加
}
```

---

## フロントエンドコンポーネントProps

### CalorieSummaryProps

```typescript
// Before
interface CalorieSummaryProps {
  totalCalories: number;
  averageCalories: number;
  count: number;
  totalMeals: number;
  targetCalories?: number;
}

// After
interface CalorieSummaryProps {
  totalCalories: number;
  averageCalories: number;
  count: number;
  totalMeals: number;
  targetCalories?: number;
  totalProtein: number;   // 追加
  totalFat: number;       // 追加
  totalCarbs: number;     // 追加
}
```

### MealSummaryCardProps

```typescript
// Before
interface MealSummaryCardProps {
  totalCalories: number;
  mealCount: number;
  averageCalories: number;
  byType: Record<string, number>;
}

// After
interface MealSummaryCardProps {
  totalCalories: number;
  mealCount: number;
  averageCalories: number;
  byType: Record<string, number>;
  totalProtein: number;   // 追加
  totalFat: number;       // 追加
  totalCarbs: number;     // 追加
}
```

---

## エラーレスポンス

変更なし（既存のエラーハンドリングを継承）

```typescript
{
  error: string;
  message: string;
}
```

---

## 後方互換性

- 新しい栄養素フィールドは常に数値（nullではなく0）
- 既存のクライアントは新フィールドを無視可能
- 破壊的変更なし
