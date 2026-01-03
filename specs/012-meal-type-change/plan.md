# Implementation Plan: 食事タイプの変更機能

**Branch**: `012-meal-type-change` | **Date**: 2026-01-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/012-meal-type-change/spec.md`

## Summary

AIチャットで食事タイプ（朝食/昼食/夕食/間食）を変更できる機能を追加。既存の `ChatChange` discriminated union に `set_meal_type` アクションを追加し、AIプロンプト、バックエンド処理、フロントエンド表示を拡張する。

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: React 18+, Hono, Drizzle ORM, Zod, TanStack Query
**Storage**: Cloudflare D1 (SQLite)
**Testing**: Vitest + Playwright
**Target Platform**: PWA (モバイルファースト)
**Project Type**: Web application (monorepo: frontend + backend + shared)
**Performance Goals**: 変更提案の表示から適用完了まで2秒以内
**Constraints**: 既存UIパターンに準拠、3タップ以内で操作完了
**Scale/Scope**: 食事タイプ4種類（breakfast, lunch, dinner, snack）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. User Privacy First | PASS | ユーザー自身のデータのみ変更可能 |
| II. Simple UX | PASS | 3タップ以内（メッセージ送信→適用）、既存UIパターン踏襲 |
| III. Test-Driven Development | PASS | ユニット/統合テストを実装 |
| IV. Type Safety | PASS | Zod discriminated union で型安全性を確保 |
| V. Simplicity Over Cleverness | PASS | 既存パターンの最小限の拡張のみ |

## Project Structure

### Documentation (this feature)

```text
specs/012-meal-type-change/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── chat-changes.yaml
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
packages/
├── shared/
│   └── src/
│       └── schemas/
│           └── meal-analysis.ts    # ChatChange スキーマ拡張
├── backend/
│   └── src/
│       ├── services/
│       │   └── ai-chat.ts          # AIプロンプト更新、parseChanges拡張
│       └── routes/
│           └── meal-chat.ts        # set_meal_type 処理追加
└── frontend/
    └── src/
        ├── components/
        │   └── meal/
        │       └── MealChat.tsx    # 変更提案表示追加
        └── lib/
            └── api.ts              # 型更新（mealType追加）

tests/
├── unit/
│   └── ai-chat.service.test.ts     # parseChanges テスト追加
└── integration/
    └── meal-chat.test.ts           # set_meal_type 統合テスト
```

**Structure Decision**: 既存の Web application 構造（monorepo: shared/backend/frontend）を維持。新規ファイル作成なし、既存ファイルの拡張のみ。

## Complexity Tracking

> 憲法違反なし。複雑さの追加は最小限。

| Change | Justification |
|--------|---------------|
| discriminated union 拡張 | 既存パターンの自然な拡張、後方互換性あり |
| AIプロンプト追加 | 日時変更と同じパターンで一貫性維持 |

## Phase Outputs

- **Phase 0**: [research.md](./research.md) - 技術調査完了、NEEDS CLARIFICATION なし
- **Phase 1**: [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)
- **Phase 2**: (Next step) `/speckit.tasks` で tasks.md 生成
