# Data Model: 食事記録の日付別表示

**Branch**: `001-meal-history` | **Date**: 2026-01-05

## Existing Entities (No Changes Required)

### MealRecord

既存の食事記録エンティティ。本機能では変更不要。

| Field | Type | Description |
|-------|------|-------------|
| id | string (UUID) | 一意識別子 |
| userId | string | ユーザーID（外部キー） |
| mealType | 'breakfast' \| 'lunch' \| 'dinner' \| 'snack' | 食事種別 |
| content | string | 食事内容 |
| calories | number \| null | カロリー |
| photoKey | string \| null | R2写真キー |
| totalProtein | number \| null | タンパク質(g) |
| totalFat | number \| null | 脂質(g) |
| totalCarbs | number \| null | 炭水化物(g) |
| analysisSource | 'ai' \| 'manual' \| null | 分析ソース |
| **recordedAt** | string (ISO8601) | **記録日時（フィルタリングキー）** |
| createdAt | string (ISO8601) | 作成日時 |
| updatedAt | string (ISO8601) | 更新日時 |

**Filtering Pattern**:
- recordedAt を使用して日付範囲でフィルタリング
- 既存のインデックス `idx_meal_user_date` を活用

## New Value Objects

### DateFilter (Frontend State)

フロントエンドで日付フィルタリングに使用する状態オブジェクト。

```typescript
interface DateFilter {
  startDate: string;  // ISO8601 date (YYYY-MM-DD)
  endDate: string;    // ISO8601 date (YYYY-MM-DD)
}
```

**Usage**:
- 今日の食事: `{ startDate: today, endDate: today }`
- 特定日の食事: `{ startDate: selectedDate, endDate: selectedDate }`

### MealDatesResponse (API Response)

記録がある日付のリストを返すAPIレスポンス。

```typescript
interface MealDatesResponse {
  dates: string[];  // ISO8601 dates ["2026-01-01", "2026-01-03", ...]
}
```

## Database Queries

### 今日の食事取得（既存）

```sql
SELECT * FROM meal_records
WHERE user_id = ?
  AND date(recorded_at) = date('now', ?)  -- timezone offset applied
ORDER BY recorded_at DESC;
```

### 特定日の食事取得（既存機能の拡張利用）

```sql
SELECT * FROM meal_records
WHERE user_id = ?
  AND recorded_at >= ? AND recorded_at < ?
ORDER BY recorded_at DESC;
```

### 月間の記録日リスト取得（新規）

```sql
SELECT DISTINCT date(recorded_at, ?) as record_date
FROM meal_records
WHERE user_id = ?
  AND recorded_at >= ? AND recorded_at < ?
ORDER BY record_date;
```

## State Management

### Calendar State (New)

```typescript
interface CalendarState {
  currentYear: number;
  currentMonth: number;  // 0-11 (JavaScript Date convention)
  selectedDate: string | null;  // ISO8601 or null
  datesWithRecords: Set<string>;  // Quick lookup for markers
}
```

### Meal Page State (Modified)

```typescript
// Before: 全期間の食事を取得
// After: 今日の食事のみを取得
const { meals } = useMeals({
  startDate: todayString,
  endDate: todayString
});
```

## Validation Rules

- `recordedAt` は有効なISO8601日時文字列であること
- 日付範囲は `startDate <= endDate` であること
- 年月は妥当な範囲内（1970年〜現在+10年程度）

## Performance Considerations

- 既存インデックス `idx_meal_user_date ON (user_id, recorded_at)` を活用
- 月間日付リストは軽量（最大31日分のstring配列）
- カレンダー表示は1ヶ月分のみ、ページネーション不要
