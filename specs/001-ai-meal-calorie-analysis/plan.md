# Implementation Plan: AI食事写真カロリー分析

**Branch**: `001-ai-meal-calorie-analysis` | **Date**: 2026-01-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-ai-meal-calorie-analysis/spec.md`

## Summary

食事の写真をアップロードし、マルチモーダルLLMで食事内容を識別してカロリー・栄養素を自動推定する機能。チャット形式での調整機能も含む。外部AIサービスを利用し、モデル切り替え可能な抽象化層を設ける。コスト最適化と習慣化のためのカジュアルなUXを重視。

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**:
- Frontend: React 18+, Vite, TanStack Query, Zustand, Tailwind CSS
- Backend: Hono on Cloudflare Workers, Drizzle ORM
- AI: マルチモーダルLLM SDK（Vercel AI SDK等、モデル切り替え可能）
**Storage**: Cloudflare D1 (SQLite) + Cloudflare R2 (写真)
**Testing**: Vitest + Playwright
**Target Platform**: Web (PWA) - モバイルブラウザ最適化
**Project Type**: pnpm monorepo (packages/frontend, packages/backend, packages/shared)
**Performance Goals**:
- 写真アップロード〜分析結果表示: 10秒以内
- チャット応答: 5秒以内
**Constraints**:
- AIサービスコスト最適化（低解像度での分析、プロンプト最適化）
- 写真は低解像度で永続保存、分析用高解像度は即時破棄
**Scale/Scope**: 個人利用想定、同時接続数は限定的

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. User Privacy First | ✅ PASS | 写真は低解像度で保存、記録削除時に連動削除。外部AI送信は分析時のみ |
| II. Simple UX | ✅ PASS | 相対サイズ入力、3タップ以内の操作、習慣化優先の設計 |
| III. Test-Driven Development | ✅ PASS | Vitest/Playwrightでテスト予定 |
| IV. Type Safety | ✅ PASS | Zod検証、shared packageでの型共有 |
| V. Simplicity Over Cleverness | ✅ PASS | AIの内蔵知識利用（外部DB不使用）、信頼度非表示でシンプル化 |

## Project Structure

### Documentation (this feature)

```text
specs/001-ai-meal-calorie-analysis/
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
├── backend/
│   └── src/
│       ├── db/
│       │   └── schema.ts          # 既存 + 新規テーブル追加
│       ├── routes/
│       │   ├── meals.ts           # 既存
│       │   ├── meal-analysis.ts   # 新規: AI分析エンドポイント
│       │   └── meal-chat.ts       # 新規: チャットエンドポイント
│       ├── services/
│       │   ├── meal.ts            # 既存
│       │   ├── ai-analysis.ts     # 新規: AI分析サービス
│       │   ├── ai-chat.ts         # 新規: チャットサービス
│       │   └── photo-storage.ts   # 新規: R2写真管理
│       └── lib/
│           └── ai-provider.ts     # 新規: AIプロバイダー抽象化層
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── meal/
│       │   │   ├── PhotoCapture.tsx      # 新規: 写真撮影/選択
│       │   │   ├── AnalysisResult.tsx    # 新規: 分析結果表示
│       │   │   ├── FoodItemEditor.tsx    # 新規: 食材編集
│       │   │   └── MealChat.tsx          # 新規: チャットUI
│       │   └── common/
│       │       └── LoadingIndicator.tsx  # 既存or新規
│       ├── pages/
│       │   └── MealAnalysis.tsx          # 新規: 分析ページ
│       └── services/
│           └── meal-api.ts               # 拡張: AI分析API呼び出し
│
└── shared/
    └── src/
        ├── schemas/
        │   ├── meal.ts                   # 既存
        │   └── meal-analysis.ts          # 新規: 分析関連スキーマ
        └── types/
            └── meal-analysis.ts          # 新規: 分析関連型

tests/
├── unit/
│   ├── ai-analysis.test.ts       # AI分析サービステスト
│   └── photo-storage.test.ts     # 写真ストレージテスト
├── integration/
│   └── meal-analysis.test.ts     # 分析フロー統合テスト
└── e2e/
    └── meal-photo-flow.spec.ts   # E2Eテスト
```

**Structure Decision**: 既存のmonorepo構造を踏襲。backend/frontend/sharedの3パッケージ構成を維持し、新規機能は各パッケージ内に追加。

## Complexity Tracking

> No violations requiring justification.

