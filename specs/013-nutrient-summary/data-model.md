# Data Model: 栄養素サマリー表示

**Feature**: 013-nutrient-summary
**Date**: 2026-01-04

## エンティティ定義

### 既存エンティティ（変更なし）

#### MealRecord
食事記録。栄養素フィールドは既存。

| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | string | 主キー（UUID） |
| userId | string | ユーザーID |
| mealType | 'breakfast' \| 'lunch' \| 'dinner' \| 'snack' | 食事タイプ |
| content | string | 食事内容のテキスト |
| calories | number \| null | カロリー（kcal） |
| totalProtein | number \| null | たんぱく質合計（g） |
| totalFat | number \| null | 脂質合計（g） |
| totalCarbs | number \| null | 炭水化物合計（g） |
| analysisSource | 'ai' \| 'manual' \| null | 分析ソース |
| recordedAt | string | 記録日時（ISO8601） |
| createdAt | string | 作成日時 |
| updatedAt | string | 更新日時 |

**Validation Rules**:
- calories: 0-10000
- totalProtein: 0-500
- totalFat: 0-500
- totalCarbs: 0-1000

### 拡張エンティティ

#### MealSummary（型拡張）
食事サマリー。栄養素フィールドを追加。

| フィールド | 型 | 説明 | 変更 |
|-----------|-----|------|------|
| totalCalories | number | カロリー合計（kcal） | 既存 |
| averageCalories | number | 平均カロリー（kcal） | 既存 |
| count | number | カロリー記録数 | 既存 |
| totalProtein | number | たんぱく質合計（g） | **追加** |
| totalFat | number | 脂質合計（g） | **追加** |
| totalCarbs | number | 炭水化物合計（g） | **追加** |

**Validation Rules**:
- すべての数値フィールド: >= 0
- nullの栄養素データは0として合計に含める

#### DashboardMealSummary（バックエンド内部型）
ダッシュボードサービスで使用する内部型。

| フィールド | 型 | 説明 |
|-----------|-----|------|
| totalCalories | number | カロリー合計 |
| mealCount | number | 食事記録数 |
| averageCalories | number | 平均カロリー |
| byType | Record<string, number> | 食事タイプ別カウント |
| totalProtein | number | たんぱく質合計 |
| totalFat | number | 脂質合計 |
| totalCarbs | number | 炭水化物合計 |

## リレーションシップ

```
User 1--* MealRecord : has
MealRecord *--1 MealSummary : aggregates to
```

## 状態遷移

該当なし（サマリーは集計結果であり状態を持たない）

## データフロー

```
[DB: meal_records]
       |
       v
[DashboardService.calculateMealSummary()]
       |
       v
[API Response: MealSummary with nutrients]
       |
       v
[Frontend: CalorieSummary / MealSummaryCard]
```

## 集計ロジック

### 栄養素合計計算

```typescript
// Pseudocode
function calculateNutrientTotals(records: MealRecord[]) {
  return {
    totalProtein: records.reduce((sum, r) => sum + (r.totalProtein ?? 0), 0),
    totalFat: records.reduce((sum, r) => sum + (r.totalFat ?? 0), 0),
    totalCarbs: records.reduce((sum, r) => sum + (r.totalCarbs ?? 0), 0),
  };
}
```

### 表示形式

- 小数点以下1桁で表示
- 単位: g（グラム）
- 形式: `P: {protein}g F: {fat}g C: {carbs}g`
