# Quickstart: デッドコード検出ツール (Knip)

**Feature**: [spec.md](./spec.md)
**Target**: 開発者向けガイド

## 概要

このガイドでは、Knipを使ったデッドコード検出の使い方を説明します。Knipは未使用のエクスポート、ファイル、依存関係を自動検出するツールです。

## 前提条件

- Node.js 20+
- pnpmインストール済み
- プロジェクトルートで作業

## 基本的な使い方

### 1. デッドコードを検出する

```bash
# ローカルでデッドコードをチェック
pnpm find-deadcode
```

出力例：
```
Unused exports (3)
  packages/frontend/src/components/exercise/ExerciseInput.tsx
    - ExerciseInput
  packages/shared/src/utils/oldHelper.ts
    - formatOldDate
    - deprecatedFunction

Unused files (1)
  packages/backend/src/legacy/oldService.ts
```

### 2. 自動修正を試す（実験的機能）

```bash
# Knipが安全に削除できる箇所を自動修正
pnpm find-deadcode:fix
```

**注意**: 自動修正後は必ず動作確認とテストを実行してください。

### 3. CI統合による自動チェック

すべてのプルリクエストで自動的にデッドコードがチェックされます。

- **閾値**: 初期値10個（未使用エクスポート）
- **動作**: 閾値を超えた場合、CIが失敗しマージがブロックされる
- **通知**: PR作成時、コメントで検出数と閾値が表示される

#### CI結果の見方

PRコメント例：
```
🔍 Dead Code Analysis

Unused Exports: 8 (Threshold: 10)

✅ PASSED: Within threshold
```

### 4. 検出結果への対処

#### パターンA: 本当に未使用のコード
→ 削除する

```bash
# ファイルを削除
rm packages/frontend/src/components/exercise/ExerciseInput.tsx

# 型チェック
pnpm typecheck

# テスト実行
pnpm test
```

#### パターンB: 実際には使われている（誤検出）
→ Knip設定を更新

`knip.json`に除外パターンを追加：
```json
{
  "ignore": [
    "src/utils/runtimeImported.ts"
  ]
}
```

誤検出の例：
- 動的import（`import()`）されるファイル
- フレームワークが自動でimportするファイル（例: Honoルートハンドラ）
- マイグレーションファイル

### 5. 閾値の段階的引き下げ

プロジェクトでは、閾値を段階的に0個まで引き下げる計画です。

**ロードマップ**:
1. **初期**: 10個（マージブロック開始）
2. **2週間後**: 5個に引き下げ
3. **4週間後**: 0個（厳格モード）

閾値の変更方法：
```javascript
// scripts/check-deadcode-threshold.js
const MAX_UNUSED_EXPORTS = 5; // この値を変更
```

## トラブルシューティング

### Q: Knipが遅い
A: 特定のパッケージのみチェック
```bash
pnpm --filter @lifestyle-app/frontend find-deadcode
```

### Q: 誤検出が多い
A: `knip.json`のignoreパターンを調整

### Q: CIで閾値を超えたが緊急マージが必要
A: 一時的に閾値を引き上げ（コミット後すぐに戻す）

## ベストプラクティス

1. **定期的な実行**: 週1回ローカルで実行して早期発見
2. **段階的削除**: 一度に大量のコードを削除せず、小さなPRで分割
3. **テスト実行**: 削除後は必ずテストスイート実行
4. **設定のレビュー**: 四半期ごとにknip.jsonの除外パターンを見直し

## 参考リンク

- [Knip公式ドキュメント](https://knip.dev/)
- [Monorepo設定ガイド](https://knip.dev/features/monorepos-and-workspaces)
- [CI統合ガイド](https://knip.dev/guides/using-knip-in-ci)
- [research.md](./research.md) - ツール選定の経緯と詳細設定
