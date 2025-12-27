# Quickstart: Health Tracker

**Feature**: 001-health-tracker
**Date**: 2025-12-27

## Prerequisites

- Node.js 20+
- pnpm 8+
- Cloudflare account (free tier OK)
- Wrangler CLI (`pnpm add -g wrangler`)

## Project Setup

### 1. Initialize Monorepo

```bash
# Create pnpm workspace
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'packages/*'
EOF

# Initialize root package.json
pnpm init
```

### 2. Create Packages

```bash
# Shared types & schemas
mkdir -p packages/shared/src/{types,schemas}
cd packages/shared && pnpm init && cd ../..

# Backend (Hono + Cloudflare Workers)
mkdir -p packages/backend/src/{db,routes,services}
cd packages/backend && pnpm init && cd ../..

# Frontend (React + Vite)
pnpm create vite packages/frontend --template react-ts
```

### 3. Install Dependencies

```bash
# Root devDependencies
pnpm add -Dw typescript vitest @playwright/test

# Shared
cd packages/shared
pnpm add zod
pnpm add -D typescript

# Backend
cd ../backend
pnpm add hono drizzle-orm @hono/zod-validator
pnpm add -D wrangler drizzle-kit @cloudflare/workers-types typescript

# Frontend
cd ../frontend
pnpm add @tanstack/react-query zustand react-hook-form @hookform/resolvers chart.js react-chartjs-2
pnpm add -D tailwindcss postcss autoprefixer vite-plugin-pwa
```

### 4. Configure TypeScript

```bash
# Root tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
EOF
```

### 5. Configure Cloudflare D1

```bash
cd packages/backend

# Create D1 database
wrangler d1 create health-tracker-db

# Configure wrangler.toml
cat > wrangler.toml << 'EOF'
name = "health-tracker-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "health-tracker-db"
database_id = "<YOUR_DATABASE_ID>"
EOF

# Generate Drizzle migrations
pnpm drizzle-kit generate
pnpm wrangler d1 migrations apply health-tracker-db
```

### 6. Configure Frontend

```bash
cd packages/frontend

# Initialize Tailwind
pnpm tailwindcss init -p

# Configure vite.config.ts for PWA
cat > vite.config.ts << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:8787'
    }
  }
})
EOF
```

## Development

### Start Backend

```bash
cd packages/backend
pnpm wrangler dev
# API available at http://localhost:8787
```

### Start Frontend

```bash
cd packages/frontend
pnpm dev
# App available at http://localhost:5173
```

### Run Tests

```bash
# Unit tests
pnpm vitest

# E2E tests
pnpm playwright test
```

## Deployment

### Deploy Backend

```bash
cd packages/backend
pnpm wrangler deploy
```

### Deploy Frontend

```bash
cd packages/frontend
pnpm build
pnpm wrangler pages deploy dist
```

## API Endpoints Quick Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/auth/register | ユーザー登録 |
| POST | /api/v1/auth/login | ログイン |
| GET | /api/v1/weights | 体重記録一覧 |
| POST | /api/v1/weights | 体重記録作成 |
| GET | /api/v1/meals | 食事記録一覧 |
| POST | /api/v1/meals | 食事記録作成 |
| GET | /api/v1/exercises | 運動記録一覧 |
| POST | /api/v1/exercises | 運動記録作成 |
| GET | /api/v1/dashboard/summary | ダッシュボード |

## Troubleshooting

### D1 Connection Issues

```bash
# Check D1 database status
wrangler d1 info health-tracker-db

# Reset migrations
wrangler d1 migrations apply health-tracker-db --remote
```

### TypeScript Errors

```bash
# Check shared types are linked
pnpm --filter @health-tracker/shared build
pnpm --filter @health-tracker/backend typecheck
```

## Next Steps

1. `/speckit.tasks` でタスク一覧を生成
2. P1（体重記録）から実装開始
3. 各ストーリー完了後にE2Eテストを実行
