# Quickstart: PR Preview Environment

## Prerequisites

1. Cloudflare Account (`abe00makoto`)
2. プレビュー用D1データベース作成済み
3. プレビュー用R2バケット作成済み（オプション）
4. GitHub Secrets設定済み:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`

## Setup Steps

### 1. プレビューD1データベース作成

```bash
wrangler d1 create health-tracker-preview-db
# 出力されるdatabase_idをメモ
```

### 2. wrangler.toml 更新

```toml
# packages/backend/wrangler.toml に追加

[env.preview]
name = "lifestyle-tracker-preview"

[[env.preview.d1_databases]]
binding = "DB"
database_name = "health-tracker-preview-db"
database_id = "<preview-db-uuid>"

[[env.preview.r2_buckets]]
binding = "PHOTOS"
bucket_name = "lifestyle-app-photos"  # 本番と共有可
```

### 3. GitHub Actions ワークフロー更新

`.github/workflows/ci.yml` に以下のジョブを追加:

- `deploy-pr-preview`: PR作成/更新時にPRプレビューをデプロイ
- `cleanup-pr-preview`: PRクローズ時にPRプレビューを削除
- `deploy-main-preview`: mainマージ時にmainプレビューを更新
- `deploy-production`: v*タグプッシュ時に本番デプロイ

### 4. 初回マイグレーション

```bash
# プレビューDBにスキーマ作成
wrangler d1 migrations apply DB --env preview --remote
```

## Verification

### PRプレビュー確認

1. 新しいPRを作成
2. CIが完了するまで待機
3. PRコメントにプレビューURLが投稿されることを確認
4. URLにアクセスしてアプリが動作することを確認

### mainプレビュー確認

1. PRをマージ
2. `lifestyle-tracker-preview.abe00makoto.workers.dev` にアクセス
3. 最新のmainが反映されていることを確認

### 本番リリース確認

1. タグを作成: `git tag v1.0.0 && git push origin v1.0.0`
2. CIが本番デプロイを実行することを確認
3. `lifestyle-tracker.abe00makoto.workers.dev` が更新されることを確認

## URLs

| 環境 | URL |
|------|-----|
| 本番 | https://lifestyle-tracker.abe00makoto.workers.dev |
| mainプレビュー | https://lifestyle-tracker-preview.abe00makoto.workers.dev |
| PRプレビュー | https://lifestyle-tracker-pr-{番号}.abe00makoto.workers.dev |

## Troubleshooting

### プレビューデプロイが失敗する

1. `CLOUDFLARE_API_TOKEN` の権限を確認
2. D1データベースIDが正しいか確認
3. wrangler.tomlの `[env.preview]` セクションを確認

### PRコメントが投稿されない

1. ワークフローの `permissions.pull-requests: write` を確認
2. `GITHUB_TOKEN` の権限を確認

### マイグレーションが失敗する

1. ローカルで `wrangler d1 migrations apply DB --env preview --dry-run` を実行
2. SQLの構文エラーを確認
