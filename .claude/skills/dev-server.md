# dev-server

ローカル開発サーバーを起動するスキル。

## 使い方

`/dev-server` または `/dev` で呼び出し。

## 前提条件

1. **sharedパッケージのビルド**（初回 or shared変更後）
   ```bash
   npx tsc --build packages/shared --force
   ```

2. **`.dev.vars` の設定**（packages/backend/.dev.vars）
   ```
   ENVIRONMENT=development
   ```

## 実行内容

```bash
pnpm dev:all  # バックグラウンドで実行
```

**起動確認**:
- Frontend: http://localhost:5173/
- Backend: http://localhost:8787/
- Tailscale経由: http://beelink-arch:5173/

**テストユーザー**: `test@example.com` / `password123`

## Git Worktree使用時

```bash
cd /home/m0a/lifestyle-app-issue-XX && pnpm dev:all
```

## シードデータ

DB操作の共通変数：
```bash
DB_PATH=$(find packages/backend/.wrangler -name "*.sqlite" | head -1)
```

### テストユーザー作成

```bash
sqlite3 "$DB_PATH" "INSERT INTO users (id, email, password_hash, email_verified, goal_weight, goal_calories, created_at, updated_at) VALUES ('test-user-001', 'test@example.com', '\$2a\$10\$miPsG0p/dTTwoIWd7QyW9eqvv4IhbBrLN/fJp054GO8pgYJQYD2ye', 1, 65, 2000, datetime('now'), datetime('now'));"
```

※ `email_verified=1` が必須（0だとログイン不可）

### データ確認

```bash
sqlite3 "$DB_PATH" "SELECT email FROM users; SELECT COUNT(*) FROM weight_records; SELECT COUNT(*) FROM meal_records;"
```

### データリセット

```bash
sqlite3 "$DB_PATH" "DELETE FROM exercise_records; DELETE FROM meal_records; DELETE FROM weight_records; DELETE FROM users;"
```

## 停止方法

```bash
pkill -f "wrangler|vite"
```

## トラブルシューティング

| 問題 | 解決策 |
|------|--------|
| ポート使用中 | Viteが自動で別ポートを選択 |
| 401エラー | 前提条件の`.dev.vars`を確認 |
| ログインできない | テストユーザーを再作成 |
