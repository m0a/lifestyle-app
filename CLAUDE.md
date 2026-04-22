# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lifestyle tracking monorepo - 体重・食事・運動を記録するPWAアプリケーション。食事写真からAIがカロリー分析を行う機能を持つ。

## Workflow Rules

- コミット / PR作成の前に `pnpm typecheck` を実行し、型エラーがないことを確認する（pre-commitフックは入れていないため手動運用）。

## Commands

```bash
# Development
pnpm dev              # Frontend (Vite) at localhost:5174
pnpm dev:backend      # Backend (Wrangler) at localhost:8787
pnpm dev:all          # Both in parallel

# Testing
pnpm test             # Run vitest (unit + integration)
pnpm test:unit        # Unit tests only
pnpm test:integration # Integration tests only (backend起動が必要)
pnpm test:e2e         # Playwright E2E tests

# Single test file
pnpm test tests/unit/meal.service.test.ts

# Quality
pnpm lint             # ESLint
pnpm typecheck        # TypeScript check all packages
pnpm find-deadcode    # Knip dead code detection (threshold: 30)

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

### Tech Stack

- **Language**: TypeScript 5.x (strict mode)
- **Frontend**: React 18+, Vite, Tailwind CSS, Zustand (auth), TanStack Query (server state)
- **Backend**: Hono on Cloudflare Workers
- **Database**: Drizzle ORM + Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2 (meal photos)
- **AI**: Google Gemini via Vercel AI SDK (`@ai-sdk/google`)
- **Email**: Resend API (domain: yasedas.com)
- **Validation**: Zod (shared schemas)
- **Dead Code**: Knip

### Backend

- **Entry**: `packages/backend/src/index.ts`
- **Routes**: `/api/auth`, `/api/weights`, `/api/meals`, `/api/exercises`, `/api/dashboard`, `/api/email`, `/api/logs`
- **RPC**: Exports `AppType` for type-safe frontend client (`hc<AppType>`)

### Frontend

- **Routing**: react-router-dom with `ProtectedRoute`
- **API Client**: `packages/frontend/src/lib/client.ts` - Hono RPC client
- **Pages**: ホーム(`/`) → 今日のサマリー+ドットグリッド、体重(`/weight`)、食事(`/meals`)、運動(`/exercises`)、レポート(`/dashboard`)、設定(`/settings`)
- **Offline**: IndexedDB (`idb`) for offline support

### Type-Safe API Pattern

```typescript
// Backend: packages/backend/src/index.ts
export type AppType = typeof routes;

// Frontend: packages/frontend/src/lib/client.ts
import type { AppType } from '@lifestyle-app/backend';
export const client = hc<AppType>(API_BASE_URL);
```

### Database Schema

Tables: `users`, `weight_records`, `meal_records`, `meal_food_items`, `meal_photos`, `meal_chat_messages`, `exercise_records`, `password_reset_tokens`, `email_verification_tokens`, `email_change_requests`, `email_delivery_logs`, `email_rate_limits`, `ai_usage_logs`

Migrations in `packages/backend/migrations/`. Run migrations before testing new schema changes.

## Test Structure

```
tests/
├── unit/         # Service-level tests (mock DB)
├── integration/  # API route tests (backend起動が必要)
└── e2e/          # Playwright browser tests
```

## Deployment

### 環境

- **Production**: 本番環境（`v*`タグpush時のみデプロイ）
- **Main Preview**: mainブランチのプレビュー環境（main pushで自動デプロイ）
- **PR Preview**: PR別のプレビュー環境（PR作成で自動デプロイ、クローズで削除）

Preview環境は別のD1データベース（`health-tracker-preview-db`）を使用。

**⚠ PR Previewではマイグレーションが自動実行されない。** DBスキーマ変更を含むPRをpreviewでテストするには手動適用が必要：
```bash
pnpm --filter @lifestyle-app/backend exec wrangler d1 migrations apply DB --env preview --remote
```

### 本番デプロイ手順

1. `gh pr merge <PR番号> --squash --admin`
2. `git checkout main && git pull origin main`
3. `git tag v1.x.x && git push origin v1.x.x`
4. GitHub Actionsが自動でCI → マイグレーション → デプロイ

### デプロイ確認

```bash
gh run list --branch main --limit 3
# 本番URL: https://lifestyle-tracker.abe00makoto.workers.dev
```

### Preview Test Account

- **メール**: `test-preview@example.com`
- **パスワード**: `test1234`

## Error Logging

フロントエンドエラーは自動的にバックエンドに送信され、Cloudflare Workers Logsに記録される。

- `packages/frontend/src/lib/errorLogger.ts` - エラーロギング
- `packages/backend/src/routes/logs.ts` - ログ受信API
- 本番ログ: Cloudflare Dashboard > Workers & Pages > lifestyle-app-backend > Logs
