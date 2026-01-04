# Implementation Plan: AI利用量トラッキング

**Branch**: `014-ai-usage-tracking` | **Date**: 2026-01-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/014-ai-usage-tracking/spec.md`

## Summary

設定ページでAI機能（食事画像分析、テキスト分析、AIチャット）のトークン使用量を表示する機能。Vercel AI SDKの`usage`オブジェクトからトークン数を取得し、新規テーブル`ai_usage_records`に記録。累計・今月のトークン量を設定ページに表示。

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: React 18+, Hono, Drizzle ORM, Zod, TanStack Query, Tailwind CSS, Vercel AI SDK
**Storage**: Cloudflare D1 (SQLite)
**Testing**: Vitest + Playwright
**Target Platform**: Cloudflare Workers (backend), Browser (frontend PWA)
**Project Type**: Web application (monorepo: packages/shared, packages/backend, packages/frontend)
**Performance Goals**: 設定ページで2秒以内にAI利用統計を表示 (SC-001)
**Constraints**: トークン量集計精度100% (SC-003)
**Scale/Scope**: 個人利用アプリ、将来的な利用制限機能の基盤

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. User Privacy First | ✅ Pass | トークン使用量はユーザー固有データ、削除時CASCADE |
| II. Simple UX | ✅ Pass | 設定ページに2つの数値を表示するだけ |
| III. Test-Driven Development | ✅ Plan | ユニットテスト・統合テスト計画済み |
| IV. Type Safety | ✅ Pass | Zod + TypeScript strict mode |
| V. Simplicity Over Cleverness | ✅ Pass | シンプルなSUM集計、キャッシュなし |

**Gate Status**: ✅ ALL PASS

## Project Structure

### Documentation (this feature)

```text
specs/014-ai-usage-tracking/
├── plan.md              # This file
├── research.md          # AI SDK token tracking research
├── data-model.md        # ai_usage_records schema
├── quickstart.md        # Implementation guide
├── contracts/           # API contracts
│   └── api.md
└── tasks.md             # Task breakdown (created by /speckit.tasks)
```

### Source Code (repository root)

```text
packages/
├── shared/src/
│   └── types/index.ts           # AIFeatureType, AIUsageSummary 型追加
├── backend/
│   ├── src/
│   │   ├── db/schema.ts         # aiUsageRecords テーブル追加
│   │   ├── services/
│   │   │   ├── ai-usage.ts      # AIUsageService (新規)
│   │   │   ├── ai-analysis.ts   # トークン記録呼び出し追加
│   │   │   └── ai-chat.ts       # トークン記録呼び出し追加
│   │   └── routes/user.ts       # /api/user/ai-usage エンドポイント追加
│   └── migrations/              # 新規マイグレーション
└── frontend/src/
    └── pages/Settings.tsx       # AI利用状況セクション追加

tests/
├── unit/
│   └── ai-usage.service.test.ts # AIUsageService テスト
└── integration/
    └── ai-usage.test.ts         # API統合テスト
```

**Structure Decision**: 既存のmonorepo構造（packages/shared, backend, frontend）を維持。新規サービス`ai-usage.ts`と新規テーブル追加のみ。

## Complexity Tracking

> No violations. Feature is straightforward with minimal new abstractions.
