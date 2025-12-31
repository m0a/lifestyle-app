# Implementation Plan: Health Tracker

**Branch**: `001-health-tracker` | **Date**: 2025-12-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-health-tracker/spec.md`

## Summary

運動・食事・体重管理のトラッキングアプリ。ユーザーはリアルタイムで記録を入力し、振り返りダッシュボードで進捗を確認できる。Cloudflare Workers + D1によるサーバーレスアーキテクチャで、オフライン対応とプライバシー重視の設計を実現する。

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: React 18+, Hono (RPC), Drizzle ORM, Zod, Tailwind CSS
**API Strategy**: Hono RPC（エンドツーエンド型安全）
**Storage**: Cloudflare D1 (SQLite) + IndexedDB (オフライン用)
**Testing**: Vitest + Playwright
**Target Platform**: Web (モバイルファースト、PWA対応)
**Project Type**: Web application (frontend + backend)
**Performance Goals**: 1000同時接続、レスポンス<200ms、週間レポート<2秒
**Constraints**: オフライン対応必須、3タップ以内で記録完了
**Scale/Scope**: 1000ユーザー、4画面（記録×3 + ダッシュボード）

### Hono RPC Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                       │
│  const client = hc<AppType>('/')                           │
│  const res = await client.api.weights.$post({ json: data })│
│                         ↑ 型が自動推論                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend (Hono + RPC)                      │
│  const app = new Hono()                                     │
│    .post('/api/weights', zValidator('json', schema), ...)  │
│  export type AppType = typeof app                           │
└─────────────────────────────────────────────────────────────┘
```

**メリット**:
- フロントエンド・バックエンド間で型が自動共有（コード生成不要）
- APIエンドポイント変更時にコンパイルエラーで検知
- Zodスキーマの二重定義が不要
- IDE補完が効く

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
│       ├── types/       # 共通型定義
│       └── schemas/     # Zodバリデーションスキーマ
├── backend/             # Hono on Cloudflare Workers
│   └── src/
│       ├── index.ts     # AppType export（RPC用）
│       ├── db/          # Drizzle schema & migrations
│       ├── routes/      # API endpoints（チェーン形式）
│       └── services/    # Business logic
└── frontend/            # React + Vite
    └── src/
        ├── lib/
        │   └── client.ts  # hc<AppType> RPCクライアント
        ├── components/  # UI components
        ├── pages/       # Route pages
        ├── hooks/       # Custom hooks（RPCクライアント使用）
        └── stores/      # State management

tests/
├── e2e/                 # Playwright tests
├── integration/         # API integration tests
└── unit/                # Unit tests
```

**Structure Decision**: Monorepo with packages/ structure. `shared` package enables type sharing between frontend and backend per Constitution Principle IV. Hono RPC enables end-to-end type safety by exporting `AppType` from backend.

## Complexity Tracking

> No violations - all design choices align with Constitution principles.

| Decision | Justification |
|----------|---------------|
| Monorepo (3 packages) | Type sharing requirement (Constitution IV), single deploy pipeline |
| IndexedDB for offline | FR-010 requirement, Constitution V (standard browser API) |
| Workers + Static Assets | 同一オリジンでcookie問題回避、単一デプロイで運用簡素化 |
| Duck typing for errors | Cloudflare Workers環境での`instanceof`問題回避 |
| Hono RPC | エンドツーエンド型安全、OpenAPI/コード生成不要、Constitution IV準拠 |

## Deployment Architecture

**方式**: Cloudflare Workers + Static Assets（統合デプロイ）

```
https://lifestyle-tracker.abe00makoto.workers.dev
├── /                    # フロントエンド（React SPA）
├── /api/auth/*          # 認証API
├── /api/weights/*       # 体重記録API
├── /api/meals/*         # 食事記録API
├── /api/exercises/*     # 運動記録API
├── /api/dashboard/*     # ダッシュボードAPI
└── /api/user/*          # ユーザー設定API
```

**選定理由**:
- Cloudflare Pagesとの分離デプロイではクロスオリジンcookie問題が発生（Brave等でブロック）
- 同一Workerからフロントエンド・バックエンドを配信することで解決
- `wrangler.toml`の`[assets]`設定でSPA対応

**設定ファイル**:
- `packages/backend/wrangler.toml`: Worker + assets設定
- `packages/frontend/.env.production`: `VITE_API_URL=`（空文字列で相対パス）
