# Quickstart: AI食事写真カロリー分析

## 開発環境セットアップ

### 1. 依存関係インストール

```bash
# プロジェクトルートで
pnpm install

# AI SDK追加（backend）
pnpm --filter @lifestyle-app/backend add ai @ai-sdk/google

# shared にスキーマ追加用
pnpm --filter @lifestyle-app/shared build
```

### 2. 環境変数設定

```bash
# packages/backend/.dev.vars
GOOGLE_GENERATIVE_AI_API_KEY=xxxxx
AI_PROVIDER=google
AI_MODEL=gemini-3-flash
```

### 3. wrangler.toml設定（R2バインディング）

```toml
# packages/backend/wrangler.toml に追加
[[r2_buckets]]
binding = "PHOTOS"
bucket_name = "lifestyle-app-photos"
```

### 4. R2バケット作成

```bash
wrangler r2 bucket create lifestyle-app-photos
```

### 5. DBマイグレーション

```bash
pnpm --filter @lifestyle-app/backend db:generate
pnpm --filter @lifestyle-app/backend db:migrate:local
```

## 開発サーバー起動

```bash
# ターミナル1: バックエンド
pnpm dev:backend

# ターミナル2: フロントエンド
pnpm dev
```

## 動作確認

### 1. 写真分析API

```bash
curl -X POST http://localhost:8787/api/meals/analyze \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "photo=@test-meal.jpg" \
  -F "mealType=lunch"
```

### 2. チャットAPI

```bash
curl -X POST http://localhost:8787/api/meals/{mealId}/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "ご飯を半分にしたい"}'
```

## テスト実行

```bash
# 全テスト
pnpm test

# ユニットテストのみ
pnpm test:unit

# E2Eテスト
pnpm test:e2e
```

## 主要ファイルパス

| 機能 | パス |
|------|------|
| AI分析サービス | `packages/backend/src/services/ai-analysis.ts` |
| チャットサービス | `packages/backend/src/services/ai-chat.ts` |
| 写真ストレージ | `packages/backend/src/services/photo-storage.ts` |
| AIプロバイダー抽象化 | `packages/backend/src/lib/ai-provider.ts` |
| 分析エンドポイント | `packages/backend/src/routes/meal-analysis.ts` |
| チャットエンドポイント | `packages/backend/src/routes/meal-chat.ts` |
| 写真撮影コンポーネント | `packages/frontend/src/components/meal/PhotoCapture.tsx` |
| 分析結果コンポーネント | `packages/frontend/src/components/meal/AnalysisResult.tsx` |
| チャットUIコンポーネント | `packages/frontend/src/components/meal/MealChat.tsx` |
| 共通スキーマ | `packages/shared/src/schemas/meal-analysis.ts` |

## トラブルシューティング

### AI APIエラー

```
Error: 401 Unauthorized
```
→ `GOOGLE_GENERATIVE_AI_API_KEY`が正しく設定されているか確認

### R2アクセスエラー

```
Error: R2 bucket not found
```
→ `wrangler r2 bucket create lifestyle-app-photos` を実行

### タイムアウト

```
Error: Worker exceeded CPU time limit
```
→ 画像サイズが大きすぎる可能性。ブラウザ側でリサイズしているか確認
