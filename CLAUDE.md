# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lifestyle tracking monorepo - 体重・食事・運動を記録するPWAアプリケーション。食事写真からAIがカロリー分析を行う機能を持つ。

## Commands

```bash
# Development
pnpm dev              # Frontend (Vite) at localhost:5173
pnpm dev:backend      # Backend (Wrangler) at localhost:8787
pnpm dev:all          # Both in parallel

# Testing
pnpm test             # Run vitest (unit + integration)
pnpm test:unit        # Unit tests only
pnpm test:integration # Integration tests only
pnpm test:e2e         # Playwright E2E tests

# Single test file
pnpm test tests/unit/meal.service.test.ts

# Quality
pnpm lint             # ESLint
pnpm typecheck        # TypeScript check all packages

# Build
pnpm build:shared     # Must build first (dependency)
pnpm build            # Build all packages

# Database
pnpm db:generate                    # Generate Drizzle migrations
pnpm db:migrate                     # Apply migrations (production)
pnpm --filter @lifestyle-app/backend db:migrate:local  # Apply migrations (local)
```

## Architecture

### Monorepo Structure (pnpm workspaces)

```
packages/
├── shared/      # Zod schemas, types, constants (build first)
├── backend/     # Hono API on Cloudflare Workers
└── frontend/    # React + Vite PWA
```

### Backend (Cloudflare Workers + Hono)

- **Entry**: `packages/backend/src/index.ts`
- **Routes**: `/api/auth`, `/api/weights`, `/api/meals`, `/api/exercises`, `/api/dashboard`
- **RPC**: Exports `AppType` for type-safe frontend client (`hc<AppType>`)
- **Database**: Drizzle ORM with D1 (SQLite)
- **Storage**: R2 for meal photos
- **AI**: Google Gemini via `@ai-sdk/google` for meal analysis/chat

### Frontend (React + Vite)

- **State**: Zustand (auth), TanStack Query (server state)
- **Routing**: react-router-dom with `ProtectedRoute`
- **API Client**: `packages/frontend/src/lib/client.ts` - Hono RPC client
- **Offline**: IndexedDB (`idb`) for offline support

### Type-Safe API Pattern

Backend exports `AppType`, frontend imports and uses `hc<AppType>()`:
```typescript
// Backend: packages/backend/src/index.ts
export type AppType = typeof routes;

// Frontend: packages/frontend/src/lib/client.ts
import type { AppType } from '@lifestyle-app/backend';
export const client = hc<AppType>(API_BASE_URL);
```

### Database Schema

Tables: `users`, `weight_records`, `meal_records`, `meal_food_items`, `meal_chat_messages`, `exercise_records`

Migrations in `packages/backend/migrations/`. Run migrations before testing new schema changes.

## Test Structure

```
tests/
├── unit/         # Service-level tests (mock DB)
├── integration/  # API route tests
└── e2e/          # Playwright browser tests
```

## Deployment

- **Production**: Deploy on `v*` tag push
- **Main Preview**: Auto-deploy on main branch push
- **PR Preview**: Auto-deploy on PR, cleanup on close

Preview uses separate D1 database (`health-tracker-preview-db`).

### Preview Test Account

PRプレビュー環境での動作確認用:
- **メール**: `test-preview@example.com`
- **パスワード**: `test1234`

## Error Logging & Troubleshooting

### Frontend Error Logs

フロントエンドで発生したエラーは自動的にバックエンドに送信され、Cloudflare Workers Logsに記録されます。

**実装箇所:**
- `packages/frontend/src/lib/errorLogger.ts` - エラーロギング機能
- `packages/backend/src/routes/logs.ts` - ログ受信API

**捕捉されるエラー:**
1. **グローバルエラー**: `window.onerror` - JavaScript実行エラー
2. **Promise拒否**: `window.onunhandledrejection` - 未処理のPromise
3. **React エラー**: `ErrorBoundary.componentDidCatch` - コンポーネントエラー
4. **バリデーションエラー**: `logValidationError()` - フォーム検証エラー

**ログの確認方法:**

```bash
# ローカル開発環境
pnpm dev:backend
# コンソールに [Frontend Error] として出力される

# 本番環境（Cloudflare Dashboard）
# 1. Workers & Pages > lifestyle-app-backend > Logs (Tail Workers)
# 2. [Frontend Error] で検索
```

**エラーログに含まれる情報:**
- `message`: エラーメッセージ
- `stack`: スタックトレース
- `url`: 発生したページURL
- `userAgent`: ブラウザ情報
- `timestamp`: 発生時刻（ISO 8601）
- `extra`: コンテキスト情報（componentStack, formName等）

**問題が発生したら:**
1. ブラウザのコンソールでクライアントサイドエラーを確認
2. Cloudflare Workers Logsでサーバーサイドログを確認
3. エラーの `url` と `timestamp` で発生状況を特定
4. `stack` と `componentStack` で原因箇所を特定

## Recent Changes
- 016-multiple-meal-photos: Added TypeScript 5.x (strict mode) + React 18+, Hono, Drizzle ORM, Zod, TanStack Query, Tailwind CSS, Vercel AI SDK (@ai-sdk/google)
- 015-request-id-tracing: Added TypeScript 5.x (strict mode)
- 014-ai-usage-tracking: Added TypeScript 5.x (strict mode) + React 18+, Hono, Drizzle ORM, Zod, TanStack Query, Tailwind CSS, Vercel AI SDK

## Active Technologies
- TypeScript 5.x (strict mode) + React 18+, Hono, Drizzle ORM, Zod, TanStack Query, Tailwind CSS, Vercel AI SDK (@ai-sdk/google) (016-multiple-meal-photos)
- Cloudflare D1 (SQLite) for metadata, R2 for photo files (016-multiple-meal-photos)
