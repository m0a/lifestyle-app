# Implementation Plan: 食事入力フローの改善

**Branch**: `003-meal-input-flow` | **Date**: 2026-01-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-meal-input-flow/spec.md`

## Summary

現在の複雑な6ステップ食事入力フロー（Meal.tsx → MealAnalysis.tsx → チャット → 保存）を、2ステップ（入力 → 保存）に簡略化する。メインの食事ページでテキスト入力するとAIがカロリー・栄養素を自動計算し、食事タイプも自動判定する。

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: React 18+, Hono, Drizzle ORM, @ai-sdk/google (gemini-3-flash-preview)
**Storage**: Cloudflare D1 (SQLite), Cloudflare R2 (photos)
**Testing**: Vitest + Playwright
**Target Platform**: Web (Cloudflare Workers) - モバイル・デスクトップ両対応
**Project Type**: web (monorepo: packages/frontend, packages/backend, packages/shared)
**Performance Goals**: AI応答10秒以内（タイムアウト）、入力〜保存完了30秒以内
**Constraints**: ローディング表示必須、オフライン時は手動入力のみ
**Scale/Scope**: 既存ユーザーベース、既存データモデル変更なし

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. User Privacy First | ✅ Pass | 既存のデータ収集範囲内、新たな個人情報収集なし |
| II. Simple UX | ✅ Pass | 6ステップ→2ステップ、3タップ以内で完了可能 |
| III. Test-Driven Development | ⚠️ Pending | テスト実装時に確認 |
| IV. Type Safety | ✅ Pass | 既存のZodスキーマ、共有型定義を活用 |
| V. Simplicity Over Cleverness | ✅ Pass | 既存コンポーネント再利用、新規抽象化最小限 |

## Project Structure

### Documentation (this feature)

```text
specs/003-meal-input-flow/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
packages/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── meal/
│   │   │       ├── SmartMealInput.tsx    # NEW: 統合入力コンポーネント
│   │   │       ├── MealInput.tsx         # MODIFY: AIボタン追加
│   │   │       ├── MealChat.tsx          # REUSE: チャット機能
│   │   │       ├── AnalysisResult.tsx    # REUSE: 結果表示
│   │   │       └── PhotoCapture.tsx      # REUSE: 写真撮影
│   │   ├── pages/
│   │   │   ├── Meal.tsx                  # MODIFY: 統合UI
│   │   │   └── MealAnalysis.tsx          # DELETE
│   │   └── router.tsx                    # MODIFY: /meals/analyze削除
│   └── tests/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── meal-analysis.ts          # MODIFY: テキスト分析API追加
│   │   │   └── meal-chat.ts              # REUSE
│   │   └── services/
│   │       ├── ai-analysis.ts            # MODIFY: テキスト分析追加
│   │       └── ai-chat.ts                # REUSE
│   └── tests/
└── shared/
    └── src/
        └── types.ts                      # MODIFY: 新しいAPI型追加
```

**Structure Decision**: 既存のmonorepo構造を維持。新規コンポーネントは最小限（SmartMealInput.tsx）で、既存コンポーネントを再利用。

## Complexity Tracking

> No violations - feature simplifies existing complexity.

## Key Changes Summary

### Frontend Changes

1. **SmartMealInput.tsx** (新規): テキスト入力 + 写真添付 + AI分析を統合
2. **Meal.tsx** (変更): AI食事分析リンク削除、SmartMealInput統合
3. **MealAnalysis.tsx** (削除): 機能をMeal.tsxに統合
4. **router.tsx** (変更): /meals/analyzeルート削除

### Backend Changes

1. **meal-analysis.ts** (変更): POST /api/meals/analyze-text エンドポイント追加
2. **ai-analysis.ts** (変更): テキストからカロリー・食事タイプ推定メソッド追加

### Shared Changes

1. **types.ts** (変更): TextAnalysisRequest/Response型追加
