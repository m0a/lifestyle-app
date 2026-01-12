# Email API Secrets セットアップ手順

**Feature**: 019-email-delivery
**Date**: 2026-01-10

## 🎯 要約（TL;DR）

| 設定項目 | ローカル開発 | Main/Production | PR Preview |
|---------|-------------|-----------------|------------|
| **RESEND_API_KEY** | `.dev.vars`（✅済） | Cloudflare Dashboard（推奨） | GitHub Secrets（必須） |
| **設定方法** | ファイル編集 | Web UI or wrangler CLI | CI自動設定 |
| **必要性** | ✅ 必須 | ✅ 必須 | オプショナル（PR使う場合のみ） |

**推奨フロー**:
1. ✅ **ローカル開発**: `.dev.vars`設定済み → すぐテスト可能
2. 🌐 **Main/Production**: [Cloudflare Dashboard](https://dash.cloudflare.com/) で直接設定（簡単）
3. 🔀 **PR Preview**: GitHub Secretsに追加（PRを使う場合のみ）

---

## 🔐 環境変数の3層管理

```
┌─────────────────┬──────────────────┬────────────────────────┐
│ 環境            │ 保存場所         │ 用途                   │
├─────────────────┼──────────────────┼────────────────────────┤
│ ローカル開発    │ .dev.vars        │ 開発サーバー実行       │
│ CI/CD           │ GitHub Secrets   │ デプロイ時の設定       │
│ 本番/プレビュー │ Cloudflare       │ Workers実行時の値      │
│                 │ Workers Secrets  │                        │
└─────────────────┴──────────────────┴────────────────────────┘
```

---

## ✅ 完了済み: ローカル開発環境

**ファイル**: `packages/backend/.dev.vars`

```bash
RESEND_API_KEY=re_6zBqmXmm_ApxJEDT4w6np3eW1a9rJSnoPY
FROM_EMAIL=onboarding@resend.dev
FRONTEND_URL=http://localhost:5173
```

- ✅ APIキー設定済み
- ✅ `.gitignore`でリポジトリから除外
- ✅ ローカル開発サーバーで使用可能

---

## 📝 手順1: GitHub Secretsに追加（オプショナル）

**用途**: PR Preview環境の動的Worker作成時のみ使用

**重要**: Main PreviewとProduction環境では**GitHub Secretsは不要**です。Cloudflare Dashboard上で直接設定してください（手順2参照）。

GitHub Secretsは以下の場合のみ必要:
- ✅ PR Preview環境を使用する場合（PR番号ごとに動的Worker作成）
- ❌ Main PreviewやProductionのみの場合は不要

### 方法1: GitHub Web UI

1. **リポジトリ設定にアクセス**:
   ```
   https://github.com/<your-username>/lifestyle-app/settings/secrets/actions
   ```

2. **New repository secretをクリック**

3. **シークレットを追加**:
   - **Name**: `RESEND_API_KEY`
   - **Secret**: `re_6zBqmXmm_ApxJEDT4w6np3eW1a9rJSnoPY`
   - 「Add secret」をクリック

### 方法2: GitHub CLI

```bash
# リポジトリルートで実行
cd /home/m0a/lifestyle-app

# シークレット追加（プロンプトが表示される）
gh secret set RESEND_API_KEY

# プロンプトに以下を貼り付け
re_6zBqmXmm_ApxJEDT4w6np3eW1a9rJSnoPY

# 確認
gh secret list | grep RESEND
```

---

## 📝 手順2: Cloudflare Workers Secretsを設定

**重要**: シークレットは一度設定すれば永続化されます。変更がない限り再設定は不要です。

### 方法A: Cloudflare Dashboard（推奨）

Web UIで直接設定できます。CLIより視覚的でわかりやすいです。

#### Preview環境の設定

1. **Cloudflare Dashboardにアクセス**:
   ```
   https://dash.cloudflare.com/
   ```

2. **Workers & Pages**を選択

3. **lifestyle-tracker-preview**を選択

4. **Settings** → **Variables and Secrets**

5. **Add variable**をクリック:
   - **Type**: Secret
   - **Variable name**: `RESEND_API_KEY`
   - **Value**: `re_6zBqmXmm_ApxJEDT4w6np3eW1a9rJSnoPY`
   - **Deploy**をクリック

6. 同様に`GOOGLE_GENERATIVE_AI_API_KEY`も設定（既存の場合はスキップ）

#### Production環境の設定

1. **Cloudflare Dashboard**で**lifestyle-tracker**を選択

2. **Settings** → **Variables and Secrets**

3. 上記と同様に`RESEND_API_KEY`を追加

### 方法B: wrangler CLI

コマンドラインで設定する場合:

#### Preview環境

```bash
cd /home/m0a/lifestyle-app/packages/backend

# RESEND_API_KEY を設定
echo "re_6zBqmXmm_ApxJEDT4w6np3eW1a9rJSnoPY" | pnpm exec wrangler secret put RESEND_API_KEY --env preview

# GOOGLE_GENERATIVE_AI_API_KEY を設定（既存の場合はスキップ）
echo "your-google-api-key" | pnpm exec wrangler secret put GOOGLE_GENERATIVE_AI_API_KEY --env preview
```

#### Production環境

```bash
cd /home/m0a/lifestyle-app/packages/backend

# RESEND_API_KEY を設定
echo "re_6zBqmXmm_ApxJEDT4w6np3eW1a9rJSnoPY" | pnpm exec wrangler secret put RESEND_API_KEY

# GOOGLE_GENERATIVE_AI_API_KEY を設定（既存の場合はスキップ）
echo "your-google-api-key" | pnpm exec wrangler secret put GOOGLE_GENERATIVE_AI_API_KEY
```

### PR Preview環境について

PR Preview環境は**自動的にシークレットが設定**されます（CI/CD内で実行）。

- 理由: PR番号ごとに動的にWorkerが作成されるため
- GitHub ActionsがGitHub Secretsから取得して自動設定

---

## 🔍 設定確認

### CI設定の確認

`.github/workflows/ci.yml`の動作:

```yaml
# Main Preview & Production: 手動設定（一度のみ）
# Note: Secrets are set once manually via wrangler CLI, not on every deploy
# See specs/019-email-delivery/SETUP_SECRETS.md for setup instructions

# PR Preview: 自動設定（PR作成時）
- name: Set secrets for PR Preview
  run: |
    cd packages/backend
    echo "${{ secrets.RESEND_API_KEY }}" | pnpm exec wrangler secret put RESEND_API_KEY --name lifestyle-tracker-pr-${{ github.event.pull_request.number }}
```

✅ **既に設定済み**（最新のコミットで更新）

**ポイント**:
- Main PreviewとProductionは**手動設定**（一度のみ、永続化）
- PR Previewは**自動設定**（PR番号ごとに動的Worker作成のため）

### wrangler.toml の確認

`packages/backend/wrangler.toml`に以下が設定されていることを確認:

```toml
[vars]
FROM_EMAIL = "onboarding@resend.dev"
FRONTEND_URL = "https://lifestyle-app.abe00makoto.workers.dev"

[env.preview.vars]
FROM_EMAIL = "onboarding@resend.dev"
FRONTEND_URL = "https://lifestyle-tracker-preview.abe00makoto.workers.dev"
```

✅ **既に設定済み**（最新のコミットで更新）

---

## 🚀 デプロイ時の動作

### 自動設定フロー

1. **PR作成**:
   - GitHub Actionsが起動
   - PRプレビュー環境にデプロイ
   - `RESEND_API_KEY`が自動設定される
   - メール送信機能が利用可能

2. **mainブランチにマージ**:
   - Main Preview環境に自動デプロイ
   - `RESEND_API_KEY`が自動設定される

3. **本番デプロイ（タグpush）**:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
   - Production環境に自動デプロイ
   - `RESEND_API_KEY`が自動設定される

### 手動確認（オプショナル）

Cloudflare Dashboardでシークレットが設定されているか確認:

```bash
# ローカルから確認（要: CLOUDFLARE_API_TOKEN）
cd packages/backend

# Preview環境のシークレット一覧
pnpm exec wrangler secret list --env preview

# Production環境のシークレット一覧
pnpm exec wrangler secret list

# 期待される出力:
# - GOOGLE_GENERATIVE_AI_API_KEY
# - RESEND_API_KEY
```

---

## 🧪 テストでの扱い

### CI統合テスト

**現状**: `RESEND_API_KEY`は**使用していません**

```yaml
# .github/workflows/ci.yml Line 78
echo "GOOGLE_GENERATIVE_AI_API_KEY=${{ secrets.GOOGLE_GENERATIVE_AI_API_KEY }}" > .dev.vars
# ↑ RESEND_API_KEYは含まれていない
```

- **方針**: メール送信を**モック化**
- **理由**:
  - 外部APIへの依存を排除
  - テストの高速化
  - コスト削減（Resend APIの呼び出し回数を節約）
  - 統合テストでは実際のメール送信は不要

### E2Eテスト

- **方針**: 実際のメール送信は**オプショナル**
- **推奨**: 手動テストで最終確認（`TESTING_GUIDE.md`参照）
- **理由**:
  - E2Eでのメール受信確認は複雑（メールボックスAPIが必要）
  - CI環境での実メール送信はコストがかかる

---

## 📋 チェックリスト

### セットアップ

- [x] ローカル開発環境（.dev.vars）設定済み
- [ ] **手順1**: GitHub Secretsに`RESEND_API_KEY`を追加（PR Preview使う場合のみ）
- [ ] **手順2**: Cloudflare Workersにシークレット設定（**推奨**: Cloudflare Dashboard）
  - [ ] Preview環境に`RESEND_API_KEY`設定
  - [ ] Production環境に`RESEND_API_KEY`設定
- [x] CI設定ファイル（.github/workflows/ci.yml）更新済み
- [x] wrangler.toml設定済み

### 環境別の設定方法

| 環境 | GitHub Secrets | Cloudflare Secrets | 設定タイミング |
|------|----------------|-------------------|----------------|
| **ローカル開発** | 不要 | 不要 | `.dev.vars`で設定済み |
| **Main Preview** | 不要 | ✅ 必要 | 手動（一度のみ） |
| **Production** | 不要 | ✅ 必要 | 手動（一度のみ） |
| **PR Preview** | ✅ 必要 | 自動設定 | CI内で自動 |

### 確認

- [ ] `wrangler secret list --env preview`で設定確認
- [ ] `wrangler secret list`で本番環境の設定確認
- [ ] PRを作成してプレビューデプロイが成功
- [ ] プレビュー環境でメール送信をテスト
- [ ] ログでメール送信成功を確認

---

## 🐛 トラブルシューティング

### GitHub Actionsでシークレットエラーが出る

**症状**:
```
Error: Secret RESEND_API_KEY not found
```

**解決策**:
1. GitHub Secretsが正しく追加されているか確認
2. シークレット名のタイプミスがないか確認（大文字小文字区別）
3. リポジトリのSecrets設定ページで確認

### Cloudflare Workersでシークレットが見つからない

**症状**:
```
env.RESEND_API_KEY is undefined
```

**解決策**:
1. CI/CDパイプラインが正常に完了しているか確認
2. wrangler secret listで確認
3. 手動でシークレットを設定:
   ```bash
   cd packages/backend
   echo "re_6zBqmXmm_ApxJEDT4w6np3eW1a9rJSnoPY" | pnpm exec wrangler secret put RESEND_API_KEY --env preview
   ```

### ローカル開発でメールが送信されない

**症状**:
```
[Email] Failed to send email: Invalid API key
```

**解決策**:
1. `.dev.vars`ファイルが存在するか確認
2. APIキーが正しいか確認
3. バックエンドサーバーを再起動

---

## 📚 参考資料

- [Resend Documentation](https://resend.com/docs)
- [Cloudflare Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [GitHub Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/commands/#secret)

---

**次のステップ**: GitHub Secretsを追加したら、`TESTING_GUIDE.md`に従ってメール送信機能をテストしてください。
