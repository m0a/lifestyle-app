# Quickstart: 食事編集画面の一貫性改善

## 開発環境セットアップ

```bash
# リポジトリのルートから
cd /home/m0a/lifestyle-app

# 依存関係インストール
pnpm install

# sharedパッケージをビルド（型定義の共有に必要）
pnpm build:shared

# 開発サーバー起動
pnpm dev:all   # フロントエンド + バックエンド同時起動
```

## ブランチ確認

```bash
git branch --show-current
# 期待される出力: 010-meal-edit-consistency
```

## 関連ドキュメント

| ファイル | 内容 |
|----------|------|
| [spec.md](./spec.md) | 機能仕様 |
| [plan.md](./plan.md) | 実装計画 |
| [research.md](./research.md) | 技術リサーチ |
| [data-model.md](./data-model.md) | データモデル |
| [contracts/api.yaml](./contracts/api.yaml) | 新規API仕様 |
| [contracts/existing-apis.md](./contracts/existing-apis.md) | 既存API一覧 |

## 実装の優先順位

### P1: 食品アイテム編集 + UI一貫性

1. **MealDetailページに編集モード追加**
   - `packages/frontend/src/pages/MealDetail.tsx`
   - `isEditing` state追加
   - 編集ボタン実装

2. **MealEditModeコンポーネント作成**
   - `packages/frontend/src/components/meal/MealEditMode.tsx`
   - 既存のAnalysisResultを再利用
   - 保存/キャンセルボタン

3. **食品アイテム操作の統合**
   - 既存のmealAnalysisApi使用
   - updateFoodItem, addFoodItem, deleteFoodItem

### P2: AIチャット支援

4. **MealChatの編集モード統合**
   - 既存のMealChatコンポーネント再利用
   - 編集モードでのチャット機能有効化

### P3: 写真追加/変更

5. **写真削除API実装**
   - `DELETE /api/meals/:mealId/photo`
   - R2ストレージからの削除

6. **写真追加/変更API実装**
   - `POST /api/meals/:mealId/photo`
   - 既存写真の置き換えロジック

7. **PhotoCapture統合**
   - 編集モードでのPhotoCapture有効化

## テスト実行

```bash
# ユニットテスト
pnpm test:unit

# 統合テスト（バックエンド起動必要）
pnpm test:integration

# E2Eテスト（全サービス起動必要）
pnpm test:e2e
```

## 主要ファイル

### 変更対象

| ファイル | 変更内容 |
|----------|----------|
| `packages/frontend/src/pages/MealDetail.tsx` | 編集モード追加 |
| `packages/backend/src/routes/meal-analysis.ts` | 写真API追加 |

### 新規作成

| ファイル | 内容 |
|----------|------|
| `packages/frontend/src/components/meal/MealEditMode.tsx` | 編集モードUI |
| `tests/e2e/meal-edit.spec.ts` | E2Eテスト |

### 参照（変更なし）

| ファイル | 再利用内容 |
|----------|------------|
| `packages/frontend/src/components/meal/AnalysisResult.tsx` | 食品アイテム表示・編集 |
| `packages/frontend/src/components/meal/MealChat.tsx` | AIチャット |
| `packages/frontend/src/components/meal/PhotoCapture.tsx` | 写真撮影 |
| `packages/frontend/src/lib/api.ts` | APIクライアント |

## デバッグ

```bash
# フロントエンドのみ
pnpm dev           # http://localhost:5173

# バックエンドのみ
pnpm dev:backend   # http://localhost:8787

# ログ確認
# Wranglerコンソールに出力される
```

## よくある問題

### 型エラーが出る場合

```bash
pnpm build:shared   # sharedパッケージを再ビルド
pnpm typecheck      # 型チェック実行
```

### APIが404になる場合

```bash
# バックエンドが起動しているか確認
curl http://localhost:8787/api/health
```

### 認証エラー

- フロントエンドでログインしているか確認
- Cookieが正しく設定されているか確認
