# dev-server

ローカル開発サーバーを起動するスキル。

## 使い方

`/dev-server` または `/dev` で呼び出し。

## 実行内容

1. **サーバー起動**
   ```bash
   cd /home/m0a/lifestyle-app && pnpm dev:all
   ```
   バックグラウンドで実行し、起動を確認。

2. **起動確認**
   - Frontend: http://localhost:5173/ (またはViteが選択したポート)
   - Backend: http://localhost:8787/
   - Tailscale経由: http://beelink-arch:5173/

3. **テストユーザー**
   - メール: `test@example.com`
   - パスワード: `password123`
   - ユーザーID: `test-user-001`

## Git Worktree使用時

issueブランチで作業する場合は、該当のworktreeディレクトリで実行：
```bash
cd /home/m0a/lifestyle-app-issue-XX && pnpm dev:all
```

## シードデータの投入

### 初回セットアップ（DBが空の場合）

1. **wrangler dev を一度起動**してローカルD1を作成
   ```bash
   pnpm dev:backend
   # Ctrl+C で停止
   ```

2. **テストユーザーを作成**
   ```bash
   DB_PATH=$(find packages/backend/.wrangler -name "*.sqlite" | head -1)
   sqlite3 "$DB_PATH" <<'EOF'
   INSERT INTO users (id, email, password_hash, email_verified, goal_weight, goal_calories, created_at, updated_at)
   VALUES (
     'test-user-001',
     'test@example.com',
     '$2a$10$miPsG0p/dTTwoIWd7QyW9eqvv4IhbBrLN/fJp054GO8pgYJQYD2ye',
     1, 65, 2000,
     datetime('now'), datetime('now')
   );
   EOF
   ```

3. **サンプルデータを生成**（過去30日分）
   ```bash
   DB_PATH=$(find packages/backend/.wrangler -name "*.sqlite" | head -1)
   for i in $(seq 0 29); do
     DATE=$(date -d "$i days ago" +%Y-%m-%dT10:00:00.000Z)

     # 体重（70%の確率）
     if [ $((RANDOM % 10)) -lt 7 ]; then
       WEIGHT=$(echo "67 + $RANDOM % 20 / 10" | bc -l | head -c 4)
       sqlite3 "$DB_PATH" "INSERT INTO weight_records (id, user_id, weight, recorded_at, created_at, updated_at) VALUES ('w-$i', 'test-user-001', $WEIGHT, '$DATE', '$DATE', '$DATE');"
     fi

     # 食事（60%の確率）
     if [ $((RANDOM % 10)) -lt 6 ]; then
       CAL=$((300 + RANDOM % 500))
       sqlite3 "$DB_PATH" "INSERT INTO meal_records (id, user_id, meal_type, content, calories, recorded_at, created_at, updated_at) VALUES ('m-$i', 'test-user-001', 'lunch', 'テスト食事', $CAL, '$DATE', '$DATE', '$DATE');"
     fi

     # 運動（50%の確率）
     if [ $((RANDOM % 10)) -lt 5 ]; then
       sqlite3 "$DB_PATH" "INSERT INTO exercise_records (id, user_id, exercise_type, muscle_group, set_number, reps, weight, recorded_at, created_at, updated_at) VALUES ('e-$i', 'test-user-001', 'ベンチプレス', 'chest', 1, 10, 60, '$DATE', '$DATE', '$DATE');"
     fi
   done
   ```

### データの確認

```bash
DB_PATH=$(find packages/backend/.wrangler -name "*.sqlite" | head -1)
sqlite3 "$DB_PATH" "SELECT email FROM users;"
sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM weight_records;"
sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM meal_records;"
sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM exercise_records;"
```

### データのリセット

```bash
DB_PATH=$(find packages/backend/.wrangler -name "*.sqlite" | head -1)
sqlite3 "$DB_PATH" "DELETE FROM exercise_records; DELETE FROM meal_records; DELETE FROM weight_records; DELETE FROM users;"
```

## 停止方法

```bash
pkill -f "wrangler|vite"
```

## トラブルシューティング

- **ポートが使用中**: Viteは自動で別ポートを選択
- **認証エラー (401)**: `.dev.vars` に `ENVIRONMENT=development` が必要
- **crypto.randomUUID エラー**: HTTP環境では nanoid フォールバックが動作
- **ログインできない**: パスワードハッシュをリセット（上記参照）
- **データが表示されない**: シードデータが投入されているか確認
