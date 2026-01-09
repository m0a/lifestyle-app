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

# Dead Code Detection
pnpm find-deadcode       # Detect unused exports, files, and dependencies with Knip
pnpm find-deadcode:fix   # Auto-fix unused exports (experimental)
pnpm find-deadcode:ci    # CI mode with threshold check (threshold: 40 → 0)

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

Tables: `users`, `weight_records`, `meal_records`, `meal_food_items`, `meal_photos`, `meal_chat_messages`, `exercise_records`

Migrations in `packages/backend/migrations/`. Run migrations before testing new schema changes.

**Multiple Photos Feature (016-multiple-meal-photos)**:
- `meal_photos`: 1食事あたり最大10枚の写真を保存
- `meal_records.photo_key`: 旧フィールド（後方互換性のため保持）
- 写真ごとのAI分析、カロリー・栄養素の自動集計

## Test Structure

```
tests/
├── unit/         # Service-level tests (mock DB)
├── integration/  # API route tests
└── e2e/          # Playwright browser tests
```

## Deployment

### 環境

- **Production**: 本番環境（`v*`タグpush時のみデプロイ）
- **Main Preview**: mainブランチのプレビュー環境（main pushで自動デプロイ）
- **PR Preview**: PR別のプレビュー環境（PR作成で自動デプロイ、クローズで削除）

Preview環境は別のD1データベース（`health-tracker-preview-db`）を使用。

### 本番デプロイ手順

1. **mainブランチにマージ**:
   ```bash
   gh pr merge <PR番号> --squash --admin
   ```

2. **バージョンタグを作成・push**:
   ```bash
   git checkout main
   git pull origin main
   git tag v1.2.3
   git push origin v1.2.3
   ```

3. **自動デプロイ開始**: GitHub ActionsがCI実行
   - Lint & Type Check
   - Unit & Integration Tests
   - Build
   - **Run migrations on production DB** ← マイグレーション自動実行
   - **Deploy to Production** ← タグpush時のみ実行

### デプロイ確認

```bash
# CI状態確認
gh run list --branch main --limit 3

# 本番URL
https://lifestyle-tracker.abe00makoto.workers.dev
```

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
- 019-email-delivery: Added TypeScript 5.x (strict mode) + Hono (backend), React 18+ (frontend), Drizzle ORM, Zod, TanStack Query, Tailwind CSS, Resend (email API), crypto (token generation)
- 018-cleanup-deadcode: Knip integration for dead code detection
- 017-multi-exercise-import: Added TypeScript 5.3 (strict mode) + React 18+, Hono, Drizzle ORM, TanStack Query, Zod, Tailwind CSS
- **016-multiple-meal-photos**: ✅ COMPLETED (84.3% - 70/83 tasks)
  - Multiple photos per meal (up to 10 photos)
  - User Story 1-4 implemented (US5 deemed unnecessary)
  - PhotoCarousel with horizontal scroll
  - AI analysis for each photo with aggregated nutrition
  - Image resize before upload (1920px width)
  - Client-side validation (10MB limit, JPEG/PNG only)
  - Remaining: 13 Polish tasks (optional enhancements)

## Dead Code Detection (018-cleanup-deadcode)

**Tool**: Knip - 包括的なTypeScript/JavaScriptデッドコード検出ツール

**Current Status**:
- Baseline: 36 unused exports
- Threshold: 40 → 30 (Week 2進行中)
- Roadmap: 40 → 30 → 20 → 10 → 0 (reduce by 10 every 2 weeks)

**Usage**:
```bash
# Local development
pnpm find-deadcode       # Full report with unused exports, files, dependencies

# CI integration
pnpm find-deadcode:ci    # JSON report + threshold check
```

**What Knip Detects**:
- Unused exports (functions, classes, types not imported elsewhere)
- Unused files (files never imported)
- Unused dependencies (packages in package.json but not used)
- Duplicate exports (same export from multiple sources)

**CI Integration**:
- Runs on every pull request
- Posts comment with unused export count
- Blocks merge if count exceeds threshold
- Generates artifact report (30-day retention)

**Configuration**: `knip.json` at repository root
- Workspace-specific entry points
- Ignore patterns for test files, config files
- Type definitions excluded from checks

**For detailed usage**: See `specs/018-cleanup-deadcode/quickstart.md`

## Features

### Email Delivery System (019-email-delivery)
**Status**: ✅ Complete (81/92 tasks, 88.0%) - Production Ready

**Email Configuration:**
- **Domain**: yasedas.com (verified via Resend)
- **FROM_EMAIL**: `noreply@yasedas.com`
- **DNS Records**: SPF, DKIM, MX configured on お名前.com
- **Region**: ap-northeast-1 (Tokyo)

**Completed Features:**
- ✅ Password Reset Flow (User Story 1, P1)
  - Forgot password link on login page
  - Email with secure reset link (24-hour expiration)
  - New password confirmation
  - Rate limiting (10 requests/hour per IP)
- ✅ Email Verification on Signup (User Story 2, P2)
  - Automatic verification email on registration
  - Email verification banner for unverified users
  - Resend verification email button
  - Login blocked until email verified
- ✅ Email Change Verification (User Story 3, P3)
  - Confirmation email to NEW address
  - Notification email to OLD address (with cancel link)
  - Dual verification for security
- ✅ Scheduled Cleanup (Cron Job)
  - Unverified accounts deleted after 7 days
  - Expired tokens cleanup (>7 days old)
  - Runs daily at 2:00 AM UTC

**Architecture:**
- Email Service: Resend API with retry logic (exponential backoff: 1s, 2s, 4s)
- Token Security: 32-character tokens (256-bit entropy), Web Crypto API
- Database: `password_reset_tokens`, `email_verification_tokens`, `email_change_requests`, `email_delivery_logs`
- Cron: Cloudflare Cron Triggers for scheduled cleanup
- Rate Limiting: IP-based with email_rate_limits table

**Endpoints:**
- `POST /api/auth/password-reset/request` - Request password reset
- `POST /api/auth/password-reset/confirm` - Confirm with token
- `POST /api/email/verify` - Verify email address
- `POST /api/email/verify/resend` - Resend verification email
- `POST /api/email/change/request` - Request email change
- `POST /api/email/change/confirm` - Confirm email change
- `POST /api/email/change/cancel` - Cancel email change

**Security:**
- Email enumeration prevention
- CSRF protection (sameSite: 'Lax')
- XSS protection (httpOnly cookies)
- SQL injection prevention (Drizzle ORM)
- Secure token generation (cryptographically random)

### Multiple Photos Per Meal (016-multiple-meal-photos)
**Status**: ✅ Core functionality complete (70/83 tasks)

**Completed Features:**
- ✅ Add photos to existing meals (User Story 1)
- ✅ Add photos via AI chat interface (User Story 2)
- ✅ Horizontal photo carousel in meal history (User Story 3)
- ✅ Multi-photo meal creation (User Story 4)
- ✅ Image validation (10MB, JPEG/PNG only)
- ✅ Auto-resize to 1920px before upload

**Architecture:**
- Database: `meal_photos` table with 1:N relation to `meal_records`
- Storage: R2 for photo files, D1 for metadata
- AI: Per-photo Gemini analysis with aggregated nutrition totals
- Components: `PhotoCarousel`, `PhotoCapture`, `PhotoUploadButton`

**Endpoints:**
- `GET/POST/DELETE /api/meals/:mealId/photos` - Photo CRUD
- `POST /api/meal-chat/:mealId/add-photo` - Chat photo upload
- `POST /api/meals` - Multi-photo meal creation

## Active Technologies
- TypeScript 5.x (strict mode) + React 18+, Hono, Drizzle ORM, Zod, TanStack Query, Tailwind CSS, Vercel AI SDK (@ai-sdk/google)
- Cloudflare D1 (SQLite) for metadata, R2 for photo files
- Image processing: Canvas API for client-side resize
- TypeScript 5.3 (strict mode) + React 18+, Hono, Drizzle ORM, TanStack Query, Zod, Tailwind CSS (017-multi-exercise-import)
- Cloudflare D1 (SQLite) - existing `exercise_records` table (017-multi-exercise-import)
- TypeScript 5.x (strict mode) + Hono (backend), React 18+ (frontend), Drizzle ORM, Zod, TanStack Query, Tailwind CSS, Resend (email API), crypto (token generation) (019-email-delivery)
- Cloudflare D1 (SQLite) for tokens/logs, R2 (if email attachments needed in future) (019-email-delivery)
- Knip for dead code detection (018-cleanup-deadcode)
