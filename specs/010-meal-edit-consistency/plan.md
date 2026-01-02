# Implementation Plan: 食事編集画面の一貫性改善

**Branch**: `010-meal-edit-consistency` | **Date**: 2026-01-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/010-meal-edit-consistency/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

MealDetailページに編集モードを追加し、登録時と同じUI（AnalysisResult、MealChat）を使って食品アイテムの編集・追加・削除、AIチャット支援、写真の追加・変更・削除を可能にする。既存のSmartMealInputの機能を編集モードで再利用し、UIの一貫性を確保する。

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: React 18+, Hono, Drizzle ORM, Zod, TanStack Query, Tailwind CSS
**Storage**: Cloudflare D1 (SQLite) + R2 (photos)
**Testing**: Vitest + Playwright
**Target Platform**: PWA (モバイルブラウザ最適化)
**Project Type**: Web (pnpm monorepo: shared, backend, frontend)
**Performance Goals**: 食品アイテム編集操作5秒以内、栄養素再計算1秒以内
**Constraints**: オフライン対応（既存IndexedDB活用）、3タップ以内で操作完了
**Scale/Scope**: 個人利用アプリ、既存のMealDetailページを拡張

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. User Privacy First | ✅ PASS | 既存データのみ使用、新規データ収集なし |
| II. Simple UX | ✅ PASS | 登録画面と同じUI再利用、3タップ以内で編集可能 |
| III. Test-Driven Development | ⚠️ REQUIRED | 編集機能のテストを先に書く必要あり |
| IV. Type Safety | ✅ PASS | 既存の型定義を再利用、strictモード維持 |
| V. Simplicity Over Cleverness | ✅ PASS | 既存コンポーネント再利用、新規抽象化最小限 |

**Gate Result**: PASS - 全原則に準拠。TDDは実装フェーズで遵守。

## Project Structure

### Documentation (this feature)

```text
specs/010-meal-edit-consistency/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
packages/
├── shared/src/
│   ├── schemas/
│   │   ├── index.ts           # 既存: updateMealSchema
│   │   └── meal-analysis.ts   # 既存: foodItemSchema等
│   └── types/
│       └── index.ts           # 既存: MealRecord, FoodItem等
│
├── backend/src/
│   ├── routes/
│   │   ├── meals.ts           # 既存: PATCH /api/meals/:id
│   │   ├── meal-analysis.ts   # 既存: food-items CRUD, recalculateTotals
│   │   └── meal-chat.ts       # 既存: chat routes
│   └── services/
│       └── meal.ts            # 既存: MealService
│
└── frontend/src/
    ├── components/meal/
    │   ├── SmartMealInput.tsx # 既存: 参照用（パターン）
    │   ├── AnalysisResult.tsx # 既存: 再利用（編集モードで使用）
    │   ├── MealChat.tsx       # 既存: 再利用（編集モードで使用）
    │   ├── PhotoCapture.tsx   # 既存: 再利用（写真追加/変更）
    │   └── MealEditMode.tsx   # 新規: 編集モードコンポーネント
    ├── pages/
    │   └── MealDetail.tsx     # 変更: 編集モード追加
    └── lib/
        └── api.ts             # 既存: mealAnalysisApi

tests/
├── unit/
│   └── meal.service.test.ts   # 既存: 拡張
├── integration/
│   ├── meals.test.ts          # 既存: 編集テスト追加
│   └── meal-analysis.test.ts  # 既存
└── e2e/
    └── meal-edit.spec.ts      # 新規: 編集E2Eテスト
```

**Structure Decision**: 既存のpnpmモノレポ構造を維持。MealDetailページを拡張し、新規コンポーネントはMealEditMode.tsxのみ。既存のAnalysisResult、MealChat、PhotoCaptureを編集モードで再利用。

## Complexity Tracking

> No violations to justify. All gates passed.
