# Lifestyle App

生活習慣改善トラッカー - 体重・食事・運動を記録するアプリケーション

## 技術スタック

- **Frontend**: React 18+, Vite, Tailwind CSS
- **Backend**: Hono, Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2
- **AI**: Google Gemini (gemini-3-flash-preview)
- **Monorepo**: pnpm workspaces

## 開発

```bash
# 依存関係インストール
pnpm install

# 開発サーバー起動
pnpm dev          # フロントエンド
pnpm dev:backend  # バックエンド
pnpm dev:all      # 両方

# テスト
pnpm test

# ビルド
pnpm -r build
```

## デプロイメントワークフロー

### 環境

| 環境 | URL | トリガー |
|------|-----|----------|
| 本番 | `lifestyle-tracker.abe00makoto.workers.dev` | `v*` タグプッシュ |
| mainプレビュー | `lifestyle-tracker-preview.abe00makoto.workers.dev` | mainブランチへのプッシュ |
| PRプレビュー | `lifestyle-tracker-pr-{番号}.abe00makoto.workers.dev` | PR作成/更新 |

### フロー

```
PR作成 → PRプレビュー自動デプロイ → PRにURLコメント
   ↓
PRマージ → mainプレビュー更新 + PRプレビュー削除
   ↓
v*タグプッシュ → 本番デプロイ
```

### 本番リリース手順

```bash
# 1. mainブランチで最新を確認
git checkout main
git pull

# 2. mainプレビューで動作確認
# https://lifestyle-tracker-preview.abe00makoto.workers.dev

# 3. タグを作成してプッシュ
git tag v1.0.0
git push origin v1.0.0
```

## データベース

| 環境 | データベース名 |
|------|---------------|
| 本番 | health-tracker-db |
| プレビュー | health-tracker-preview-db |

### マイグレーション

```bash
# プレビュー環境
pnpm --filter @lifestyle-app/backend exec wrangler d1 migrations apply DB --env preview --remote

# 本番環境 (タグデプロイ時に自動実行)
pnpm --filter @lifestyle-app/backend exec wrangler d1 migrations apply DB --remote
```

## 環境変数

### Cloudflare Workers

| 変数 | 説明 |
|------|------|
| ENVIRONMENT | 環境識別子 (production/preview) |
| AI_PROVIDER | AIプロバイダー (google) |
| AI_MODEL | AIモデル (gemini-3-flash-preview) |

### Secrets

| シークレット | 説明 |
|-------------|------|
| GOOGLE_GENERATIVE_AI_API_KEY | Google AI API キー |

### GitHub Secrets

| シークレット | 説明 |
|-------------|------|
| CLOUDFLARE_API_TOKEN | Cloudflare API トークン |
| CLOUDFLARE_ACCOUNT_ID | Cloudflare アカウント ID |
| GOOGLE_GENERATIVE_AI_API_KEY | Google AI API キー |
