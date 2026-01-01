# Research: PR Preview Environment

**Date**: 2026-01-01
**Feature**: 002-pr-preview-env

## 1. Wrangler Preview Deployment

### Decision: `--name` フラグによる動的Worker名

PRプレビュー環境には `wrangler deploy --name` でWorker名を動的に指定する。

**Rationale**:
- PR番号に基づいた一意のWorker名を生成可能
- 各PRが独立したWorkerとしてデプロイされる
- 削除も `wrangler delete --name` で簡単

**Alternatives considered**:
- `--env` のみ使用 → 環境名が固定されPR毎の分離が困難
- Preview URLs (`--preview-alias`) → Wrangler 4.21.0+が必要、現在のバージョン未確認

**Command Examples**:
```bash
# PRプレビューデプロイ
wrangler deploy --name lifestyle-tracker-pr-123

# PRプレビュー削除
wrangler delete --name lifestyle-tracker-pr-123 --force

# mainプレビューデプロイ (--env使用)
wrangler deploy --env preview
```

---

## 2. wrangler.toml 環境設定

### Decision: `[env.preview]` セクション追加

mainプレビュー環境用に `[env.preview]` を追加し、プレビュー専用D1を設定する。

**Rationale**:
- 本番DBと完全分離
- `wrangler deploy --env preview` で簡単にデプロイ
- PRプレビューは `--name` で動的生成し、同じD1を参照

**Configuration Example**:
```toml
# wrangler.toml
name = "lifestyle-tracker"
main = "src/index.ts"

# 本番環境 (デフォルト)
[[d1_databases]]
binding = "DB"
database_name = "health-tracker-db"
database_id = "xxx-prod-uuid-xxx"

[[r2_buckets]]
binding = "PHOTOS"
bucket_name = "lifestyle-app-photos"

# プレビュー環境
[env.preview]
name = "lifestyle-tracker-preview"

[[env.preview.d1_databases]]
binding = "DB"
database_name = "health-tracker-preview-db"
database_id = "xxx-preview-uuid-xxx"

[[env.preview.r2_buckets]]
binding = "PHOTOS"
bucket_name = "lifestyle-app-photos-preview"
```

**Gotchas**:
- バインディング（d1_databases, r2_buckets, vars）は**継承されない**
- 各環境で明示的に定義が必要
- PRプレビューは `--name` で別Worker名を指定しても、プレビューD1を使うには設定ファイル調整が必要

---

## 3. PRプレビューのD1バインディング

### Decision: 環境変数でD1設定を上書き

PRプレビューWorkerがプレビューD1を使用するため、デプロイ時に設定を調整する。

**Approach A: wrangler.tomlを動的生成** (採用)
```bash
# CI/CDでwrangler.tomlを書き換え
sed -i 's/database_id = "prod-uuid"/database_id = "preview-uuid"/' wrangler.toml
wrangler deploy --name lifestyle-tracker-pr-${PR_NUMBER}
```

**Approach B: --env preview + --name の組み合わせ**
- Wrangler最新版では `--name` と `--env` の併用が可能
- ただしWorker名が `lifestyle-tracker-preview` になる（PR番号が付かない）

**Final Decision**: wrangler.tomlの動的書き換えでPR番号付きWorker名 + プレビューD1を実現

---

## 4. GitHub Actions Workflow構成

### Decision: 単一CIファイルに統合

既存の `ci.yml` を拡張し、イベントタイプに応じてジョブを分岐する。

**Rationale**:
- 設定の一元管理
- 共通ステップ（lint, test, build）の再利用
- concurrency設定でPR毎のデプロイを制御

**Workflow Structure**:
```yaml
on:
  push:
    branches: [main]
    tags: ['v*']
  pull_request:
    types: [opened, synchronize, closed]
    branches: [main]

jobs:
  lint-and-typecheck: ...
  test: ...
  build: ...

  # PRプレビューデプロイ
  deploy-pr-preview:
    if: github.event_name == 'pull_request' && github.event.action != 'closed'
    needs: [build]
    ...

  # PRプレビュークリーンアップ
  cleanup-pr-preview:
    if: github.event_name == 'pull_request' && github.event.action == 'closed'
    ...

  # mainプレビューデプロイ
  deploy-main-preview:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    needs: [build]
    ...

  # 本番デプロイ
  deploy-production:
    if: github.event_name == 'push' && startsWith(github.ref, 'refs/tags/v')
    needs: [build]
    ...
```

---

## 5. PRコメント投稿

### Decision: `gh` CLI使用

**Rationale**:
- GitHub Actionsに標準搭載
- シンプルなコマンドで投稿可能
- `actions/github-script` より軽量

**Command**:
```bash
gh pr comment ${{ github.event.pull_request.number }} \
  --repo ${{ github.repository }} \
  --body "## Preview Deployed

URL: https://lifestyle-tracker-pr-${PR_NUMBER}.abe00makoto.workers.dev
Commit: ${{ github.sha }}"
```

**Permission Required**:
```yaml
permissions:
  pull-requests: write
```

---

## 6. D1マイグレーション実行

### Decision: デプロイ前にマイグレーション適用

**Rationale**:
- スキーマ変更がある場合、デプロイ前に適用が必要
- 失敗時はデプロイをスキップ

**Commands**:
```bash
# mainプレビュー
wrangler d1 migrations apply DB --env preview --remote

# 本番
wrangler d1 migrations apply DB --remote

# PRプレビュー（mainプレビューと同じD1を使用）
# → mainマージ時にのみ実行、PRデプロイ時は不要
```

---

## 7. Worker削除

### Decision: `wrangler delete --force`

**Rationale**:
- `--force` で確認プロンプトをスキップ（CI/CD用）
- `--name` で特定Workerを指定削除

**Command**:
```bash
wrangler delete --name lifestyle-tracker-pr-${PR_NUMBER} --force
```

**Gotcha**:
- 存在しないWorkerを削除しようとするとエラー
- `|| true` で失敗を無視（既に削除済みの場合）

---

## Summary of Technical Decisions

| 項目 | 決定 |
|------|------|
| PRプレビューWorker名 | `lifestyle-tracker-pr-{番号}` |
| mainプレビューWorker名 | `lifestyle-tracker-preview` |
| プレビューD1 | 全プレビュー環境で共有 |
| デプロイ方法 | `--name` (PR) / `--env preview` (main) |
| PRコメント | `gh pr comment` |
| マイグレーション | mainマージ時 + タグプッシュ時 |
| Worker削除 | `wrangler delete --name xxx --force` |
