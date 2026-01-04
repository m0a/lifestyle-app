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

## Recent Changes
- 014-ai-usage-tracking: Added TypeScript 5.x (strict mode) + React 18+, Hono, Drizzle ORM, Zod, TanStack Query, Tailwind CSS, Vercel AI SDK
- 013-nutrient-summary: Added TypeScript 5.x (strict mode) + React 18+, Hono, Drizzle ORM, Zod, TanStack Query, Tailwind CSS
- 010-meal-edit-consistency: Added TypeScript 5.x (strict mode) + React 18+, Hono, Drizzle ORM, Zod, TanStack Query, Tailwind CSS

## Active Technologies
- TypeScript 5.x (strict mode) + React 18+, Hono, Drizzle ORM, Zod, TanStack Query, Tailwind CSS, Vercel AI SDK (014-ai-usage-tracking)
