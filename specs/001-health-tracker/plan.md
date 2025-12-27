# Implementation Plan: Health Tracker

**Branch**: `001-health-tracker` | **Date**: 2025-12-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-health-tracker/spec.md`

## Summary

運動・食事・体重管理のトラッキングアプリ。ユーザーはリアルタイムで記録を入力し、振り返りダッシュボードで進捗を確認できる。Cloudflare Workers + D1によるサーバーレスアーキテクチャで、オフライン対応とプライバシー重視の設計を実現する。

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: React 18+, Hono, Drizzle ORM, Zod, Tailwind CSS
**Storage**: Cloudflare D1 (SQLite) + IndexedDB (オフライン用)
**Testing**: Vitest + Playwright
**Target Platform**: Web (モバイルファースト、PWA対応)
**Project Type**: Web application (frontend + backend)
**Performance Goals**: 1000同時接続、レスポンス<200ms、週間レポート<2秒
**Constraints**: オフライン対応必須、3タップ以内で記録完了
**Scale/Scope**: 1000ユーザー、4画面（記録×3 + ダッシュボード）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. User Privacy First | ✅ Pass | データ削除機能(FR-009)、最小限のデータ収集、D1暗号化 |
| II. Simple UX | ✅ Pass | 3タップ以内(SC-001)、1画面1目的の設計 |
| III. Test-Driven Development | ✅ Pass | Vitest + Playwright、E2Eテスト計画済み |
| IV. Type Safety | ✅ Pass | TypeScript strict、Zodバリデーション、型共有 |
| V. Simplicity Over Cleverness | ✅ Pass | YAGNI適用、4エンティティのみ、標準REST API |

**Gate Result**: ✅ All principles satisfied - proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/001-health-tracker/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api.yaml         # OpenAPI spec
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
packages/
├── shared/              # 共有型定義・Zodスキーマ
│   └── src/
│       ├── types/
│       └── schemas/
├── backend/             # Hono on Cloudflare Workers
│   └── src/
│       ├── db/          # Drizzle schema & migrations
│       ├── routes/      # API endpoints
│       └── services/    # Business logic
└── frontend/            # React + Vite
    └── src/
        ├── components/  # UI components
        ├── pages/       # Route pages
        ├── hooks/       # Custom hooks
        ├── stores/      # State management
        └── lib/         # Utilities

tests/
├── e2e/                 # Playwright tests
├── integration/         # API integration tests
└── unit/                # Unit tests
```

**Structure Decision**: Monorepo with packages/ structure. `shared` package enables type sharing between frontend and backend per Constitution Principle IV.

## Complexity Tracking

> No violations - all design choices align with Constitution principles.

| Decision | Justification |
|----------|---------------|
| Monorepo (3 packages) | Type sharing requirement (Constitution IV), single deploy pipeline |
| IndexedDB for offline | FR-010 requirement, Constitution V (standard browser API) |
