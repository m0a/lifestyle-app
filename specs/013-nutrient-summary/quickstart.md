# Quickstart: 栄養素サマリー表示

**Feature**: 013-nutrient-summary
**Date**: 2026-01-04

## 概要

食事一覧ページとダッシュボードに、カロリーに加えてマクロ栄養素（たんぱく質・脂質・炭水化物）の日次合計を表示する機能。

## 前提条件

- Node.js 20+
- pnpm 8+
- 既存のlifestyle-app開発環境

## セットアップ

```bash
# ブランチに切り替え
git checkout 013-nutrient-summary

# 依存関係インストール
pnpm install

# 共有パッケージビルド（型定義の更新後）
pnpm build:shared

# 開発サーバー起動
pnpm dev:all
```

## 実装ファイル一覧

| 優先度 | ファイル | 変更内容 |
|--------|---------|---------|
| 1 | `packages/shared/src/types/index.ts` | MealSummary型に栄養素フィールド追加 |
| 2 | `packages/backend/src/services/dashboard.ts` | calculateMealSummaryで栄養素を集計 |
| 3 | `packages/frontend/src/components/meal/CalorieSummary.tsx` | 栄養素表示UI追加 |
| 4 | `packages/frontend/src/components/dashboard/MealSummaryCard.tsx` | 栄養素表示UI追加 |
| 5 | `tests/unit/dashboard.service.test.ts` | 栄養素計算のテスト追加 |

## 変更の詳細

### 1. 型定義の拡張

```typescript
// packages/shared/src/types/index.ts
export interface MealSummary {
  totalCalories: number;
  averageCalories: number;
  count: number;
  totalProtein: number;  // 追加
  totalFat: number;      // 追加
  totalCarbs: number;    // 追加
}
```

### 2. バックエンド集計ロジック

```typescript
// packages/backend/src/services/dashboard.ts
private calculateMealSummary(records: MealRecord[]): MealSummary {
  // 既存のカロリー計算に加えて...
  const totalProtein = records.reduce((sum, r) => sum + (r.totalProtein ?? 0), 0);
  const totalFat = records.reduce((sum, r) => sum + (r.totalFat ?? 0), 0);
  const totalCarbs = records.reduce((sum, r) => sum + (r.totalCarbs ?? 0), 0);

  return {
    ...existingSummary,
    totalProtein,
    totalFat,
    totalCarbs,
  };
}
```

### 3. フロントエンドUI

```tsx
// CalorieSummary内に追加
<p className="mt-1 text-xs text-gray-500">
  P: {totalProtein.toFixed(1)}g F: {totalFat.toFixed(1)}g C: {totalCarbs.toFixed(1)}g
</p>
```

## テスト実行

```bash
# ユニットテスト
pnpm test tests/unit/dashboard.service.test.ts

# 全テスト
pnpm test

# E2Eテスト（オプション）
pnpm test:e2e
```

## 動作確認

1. 開発サーバー起動: `pnpm dev:all`
2. ブラウザで http://localhost:5173 を開く
3. ログイン後、食事一覧ページ (`/meals`) で栄養素表示を確認
4. ダッシュボード (`/`) で栄養素表示を確認

## 注意事項

- 手動入力の食事は栄養素データがnull → 0として表示
- 小数点以下1桁で表示
- 既存のデータベーススキーマは変更不要
