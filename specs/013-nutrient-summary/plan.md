# Implementation Plan: 栄養素サマリー表示

**Branch**: `013-nutrient-summary` | **Date**: 2026-01-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/013-nutrient-summary/spec.md`

## Summary

食事一覧ページとダッシュボードで、カロリーに加えてマクロ栄養素（たんぱく質・脂質・炭水化物）の日次合計を表示する機能。既存のデータベーススキーマ（totalProtein, totalFat, totalCarbs）を活用し、CalorieSummaryコンポーネントとMealSummaryCardコンポーネントにコンパクトに栄養素情報を統合表示する。

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: React 18+, Hono, Drizzle ORM, Zod, TanStack Query, Tailwind CSS
**Storage**: Cloudflare D1 (SQLite) - 既存のmeal_recordsテーブルにtotalProtein, totalFat, totalCarbsフィールドあり
**Testing**: Vitest + Playwright
**Target Platform**: Web (PWA) on Cloudflare Workers
**Project Type**: Monorepo (packages/frontend, packages/backend, packages/shared)
**Performance Goals**: 3秒以内に栄養素合計を表示（SC-001）
**Constraints**: 既存のUIレイアウトに統合、データベーススキーマ変更なし
**Scale/Scope**: 個人利用アプリ、既存ユーザーデータとの互換性維持

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. User Privacy First | ✅ PASS | 既存データのみ使用、新規データ収集なし |
| II. Simple UX | ✅ PASS | 既存カードにコンパクト統合、情報過多を避ける |
| III. Test-Driven Development | ✅ PASS | 計算ロジックとUI表示のテストを追加予定 |
| IV. Type Safety | ✅ PASS | NutrientSummary型を定義、Zodスキーマで検証 |
| V. Simplicity Over Cleverness | ✅ PASS | 既存パターンを踏襲、新規抽象化なし |

**Gate Status**: ✅ PASSED - Phase 0に進行可能

## Project Structure

### Documentation (this feature)

```text
specs/013-nutrient-summary/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
packages/
├── shared/
│   └── src/
│       ├── types/index.ts           # MealSummary型を拡張
│       └── schemas/meal-analysis.ts # NutritionTotals既存
├── backend/
│   └── src/
│       ├── services/dashboard.ts    # calculateMealSummary拡張
│       └── routes/dashboard.ts      # レスポンス型更新
└── frontend/
    └── src/
        ├── components/
        │   ├── meal/CalorieSummary.tsx      # 栄養素表示追加
        │   └── dashboard/MealSummaryCard.tsx # 栄養素表示追加
        └── hooks/
            └── useDashboard.ts              # 型更新

tests/
├── unit/
│   └── dashboard.service.test.ts    # 栄養素計算テスト追加
└── integration/
    └── dashboard.route.test.ts      # API応答テスト追加
```

**Structure Decision**: 既存のモノレポ構造を維持。shared/types/index.tsのMealSummary型を拡張し、backend/frontend両方で型安全に栄養素データを扱う。

## Complexity Tracking

該当なし - すべての憲法チェックに適合。新規の複雑さを追加しない。
