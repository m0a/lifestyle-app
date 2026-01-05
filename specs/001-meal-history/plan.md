# Implementation Plan: 食事記録の日付別表示

**Branch**: `001-meal-history` | **Date**: 2026-01-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-meal-history/spec.md`

## Summary

食事ページの「記録履歴」セクションを今日の食事のみの表示に変更し、過去の食事記録は月間カレンダーを備えた新規の履歴ページで閲覧可能にする。既存のuseMealsフックがstartDate/endDateフィルターをサポートしているため、フロントエンドの変更が中心となる。

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: React 18+, Hono, TanStack Query, Tailwind CSS
**Storage**: Cloudflare D1 (SQLite) via Drizzle ORM
**Testing**: Vitest + Playwright
**Target Platform**: PWA (モバイルファースト)
**Project Type**: Web application (monorepo: packages/frontend + packages/backend)
**Performance Goals**: 履歴ページ3秒以内表示、今日の記録2タップ以内
**Constraints**: オフライン対応（既存のIndexedDB活用）
**Scale/Scope**: 1年分の食事記録（約1000件）を想定

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Phase 0 Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. User Privacy First | ✅ PASS | 既存データのみ使用、新規データ収集なし |
| II. Simple UX | ✅ PASS | 今日の記録2タップ以内(SC-002)、過去の記録3タップ以内(SC-003) |
| III. TDD | ⏳ PENDING | 実装時にRed→Green→Refactorサイクル遵守 |
| IV. Type Safety | ✅ PASS | 既存の型定義を活用、Zod検証維持 |
| V. Simplicity Over Cleverness | ✅ PASS | カスタムカレンダーコンポーネントのみ追加 |

**Gate Result**: PASS - Phase 0に進行可能

### Post-Phase 1 Re-check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. User Privacy First | ✅ PASS | 新規API `/meals/dates` も既存ユーザーデータのみ返却 |
| II. Simple UX | ✅ PASS | カレンダーUIは直感的、1タップで日付選択可能 |
| III. TDD | ⏳ PENDING | 実装時にRed→Green→Refactorサイクル遵守 |
| IV. Type Safety | ✅ PASS | 新規スキーマ `mealDatesQuerySchema`, `mealDatesResponseSchema` をZodで定義 |
| V. Simplicity Over Cleverness | ✅ PASS | 外部ライブラリ追加なし、カスタムカレンダーはシンプルな実装 |

**Gate Result**: PASS - 実装準備完了

## Project Structure

### Documentation (this feature)

```text
specs/001-meal-history/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
packages/
├── backend/
│   └── src/
│       ├── routes/meals.ts          # 既存: 日付フィルター対応済み
│       └── services/meal.ts         # 既存: findByUserId with date filter
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Meal.tsx             # 修正: 今日の記録のみ表示
│       │   └── MealHistory.tsx      # 新規: 履歴ページ
│       ├── components/
│       │   └── meal/
│       │       ├── MealCalendar.tsx # 新規: 月間カレンダー
│       │       └── MealList.tsx     # 既存: 再利用
│       ├── hooks/
│       │   └── useMeals.ts          # 既存: startDate/endDate対応済み
│       └── router.tsx               # 修正: /meals/history ルート追加
└── shared/
    └── src/
        └── schemas/index.ts         # 既存: dateRangeSchema
```

**Structure Decision**: 既存のモノレポ構造を維持。フロントエンドの新規ページ追加とコンポーネント追加が主な変更。

## Complexity Tracking

> 特になし - 憲法違反なし
