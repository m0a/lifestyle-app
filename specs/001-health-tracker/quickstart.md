# Quickstart: Health Tracker

**Feature**: 001-health-tracker
**Date**: 2025-12-27
**API Strategy**: Hono RPC（エンドツーエンド型安全）

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
pnpm add hono @tanstack/react-query zustand react-hook-form @hookform/resolvers chart.js react-chartjs-2
pnpm add -D tailwindcss postcss autoprefixer vite-plugin-pwa
```

> **Note**: フロントエンドに`hono`を追加。Hono RPC クライアント（`hc`）に必要。

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

# Configure wrangler.toml (Workers + Static Assets統合方式)
cat > wrangler.toml << 'EOF'
name = "lifestyle-tracker"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# フロントエンドを同一Workerから配信（同一オリジンでcookie問題を回避）
[assets]
directory = "./public"
binding = "ASSETS"
not_found_handling = "single-page-application"

[vars]
ENVIRONMENT = "production"

[[d1_databases]]
binding = "DB"
database_name = "health-tracker-db"
database_id = "<YOUR_DATABASE_ID>"
EOF

# Generate Drizzle migrations
pnpm drizzle-kit generate
pnpm wrangler d1 migrations apply health-tracker-db
```

> **Note**: Workers + Static Assets方式を採用。フロントエンドとバックエンドを同一オリジンから配信することで、サードパーティcookieブロック（Brave等）の問題を回避。

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

### 7. Configure Hono RPC

#### Backend: AppType Export

```typescript
// packages/backend/src/index.ts
import { Hono } from 'hono';
import { auth } from './routes/auth';
import { weights } from './routes/weights';
import { meals } from './routes/meals';
import { exercises } from './routes/exercises';
import { dashboard } from './routes/dashboard';

const app = new Hono()
  .route('/api/auth', auth)
  .route('/api/weights', weights)
  .route('/api/meals', meals)
  .route('/api/exercises', exercises)
  .route('/api/dashboard', dashboard);

// RPC用: フロントエンドに型をexport
export type AppType = typeof app;
export default app;
```

#### Backend: Route Example (チェーン形式必須)

```typescript
// packages/backend/src/routes/weights.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createWeightSchema } from '@lifestyle-app/shared';

// チェーン形式で定義（型推論に必要）
export const weights = new Hono()
  .get('/', async (c) => {
    const weights = await getWeights(c);
    return c.json({ weights });
  })
  .post('/', zValidator('json', createWeightSchema), async (c) => {
    const input = c.req.valid('json');
    const weight = await createWeight(c, input);
    return c.json({ weight }, 201);
  })
  .patch('/:id', zValidator('json', updateWeightSchema), async (c) => {
    const id = c.req.param('id');
    const input = c.req.valid('json');
    const weight = await updateWeight(c, id, input);
    return c.json({ weight });
  })
  .delete('/:id', async (c) => {
    const id = c.req.param('id');
    await deleteWeight(c, id);
    return c.json({ message: 'Deleted' });
  });
```

> **重要**: ルートは必ずチェーン形式（`.get().post().patch()`）で定義。`app.get()`形式だと型が推論されない。

#### Frontend: RPC Client

```typescript
// packages/frontend/src/lib/client.ts
import { hc } from 'hono/client';
import type { AppType } from '@lifestyle-app/backend';

// 同一オリジンなので空文字列
export const client = hc<AppType>('/');

// 使用例:
// const res = await client.api.weights.$get();
// const { weights } = await res.json();  // 型安全！
```

#### Frontend: Hook Example

```typescript
// packages/frontend/src/hooks/useWeights.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client } from '../lib/client';

export function useWeights() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['weights'],
    queryFn: async () => {
      const res = await client.api.weights.$get();
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();  // 型が自動推論される
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: { weight: number; recordedAt: string }) => {
      const res = await client.api.weights.$post({ json: input });
      if (!res.ok) throw new Error('Failed to create');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['weights'] }),
  });

  return { ...query, create: createMutation };
}
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

### 統合デプロイ（推奨）

フロントエンドとバックエンドを同一Workerから配信：

```bash
# 1. フロントエンドをビルド
cd packages/frontend
pnpm build

# 2. ビルド成果物をバックエンドのpublicにコピー
rm -rf ../backend/public/*
cp -r dist/* ../backend/public/

# 3. 統合Workerをデプロイ
cd ../backend
pnpm wrangler deploy

# デプロイ先: https://lifestyle-tracker.<account>.workers.dev
```

### フロントエンド環境変数

```bash
# packages/frontend/.env.production
# 同一オリジンなので空文字列（相対パス使用）
VITE_API_URL=
```

> **重要**: `VITE_API_URL`を空文字列にすることで、APIリクエストが相対パス（`/api/...`）になり、同一オリジンでcookieが正常に動作する。

## API Endpoints Quick Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | ユーザー登録 |
| POST | /api/auth/login | ログイン |
| POST | /api/auth/logout | ログアウト |
| GET | /api/auth/me | 現在のユーザー情報 |
| GET | /api/weights | 体重記録一覧 |
| POST | /api/weights | 体重記録作成 |
| PATCH | /api/weights/:id | 体重記録更新 |
| DELETE | /api/weights/:id | 体重記録削除 |
| GET | /api/meals | 食事記録一覧 |
| POST | /api/meals | 食事記録作成 |
| GET | /api/exercises | 運動記録一覧 |
| POST | /api/exercises | 運動記録作成 |
| GET | /api/dashboard/summary | ダッシュボードサマリー |
| GET | /api/dashboard/trends | トレンドデータ |
| GET | /api/dashboard/goals | 目標進捗 |
| GET | /api/user/settings | ユーザー設定取得 |
| PATCH | /api/user/settings | ユーザー設定更新 |
| GET | /api/user/export | データエクスポート |
| DELETE | /api/user/account | アカウント削除 |

## Troubleshooting

### D1 Connection Issues

```bash
# Check D1 database status
wrangler d1 info health-tracker-db

# Apply migrations to remote
wrangler d1 migrations apply health-tracker-db --remote

# Execute SQL directly
wrangler d1 execute health-tracker-db --remote --command "SELECT * FROM users"
```

### TypeScript Errors

```bash
# Check shared types are linked
pnpm --filter @lifestyle-app/shared build
pnpm --filter @lifestyle-app/backend typecheck
```

### ログイン/登録が失敗する

1. **D1マイグレーション未適用**: `wrangler d1 migrations apply --remote` を実行
2. **CORS設定**: 開発時はlocalhost:5173を許可
3. **Cookie問題（Brave等）**: 同一オリジンデプロイを使用（Workers + Static Assets）

### ダッシュボードがローディング中のまま

1. **APIパス確認**: フロントエンドのAPIパスが`/api/dashboard/...`になっているか確認
2. **Service Workerクリア**: 開発者ツール → Application → Service Workers → Unregister
3. **ハードリフレッシュ**: Ctrl+Shift+R

### エラーが500で返される

Cloudflare Workers環境では`instanceof`チェックが正しく動作しないことがある。`app.onError`でduck typingを使用：

```typescript
// packages/backend/src/index.ts
app.onError((err, c) => {
  const e = err as Record<string, unknown>;
  if (e.name === 'AppError' && typeof e.statusCode === 'number') {
    return c.json({ message: err.message, code: e.code }, e.statusCode);
  }
  return c.json({ message: 'Internal Error' }, 500);
});
```

### デプロイ後に古いバージョンが表示される

```bash
# 1. Service Workerをクリア（ブラウザ側）
# 開発者ツール → Application → Service Workers → Unregister
# 開発者ツール → Application → Storage → Clear site data

# 2. Cloudflareキャッシュをパージ
wrangler deployments list  # 最新デプロイを確認
```

## Production URL

```
https://lifestyle-tracker.abe00makoto.workers.dev
```

## Next Steps

1. `/speckit.tasks` でタスク一覧を生成
2. P1（体重記録）から実装開始
3. 各ストーリー完了後にE2Eテストを実行
