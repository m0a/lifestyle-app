# Quickstart: 食事日時コントロール

**Feature**: 011-meal-datetime
**Date**: 2026-01-03

## 概要

この機能は、食事記録の日時を新規登録時・編集時にコントロールできるようにします。

## 前提条件

- Node.js 20+
- pnpm
- 開発環境セットアップ済み

## セットアップ

```bash
# リポジトリルートで
pnpm install

# 開発サーバー起動
pnpm dev:all  # フロントエンド + バックエンド同時起動
```

## 変更対象ファイル

### フロントエンド（主要変更）

| ファイル | 変更内容 |
|----------|----------|
| `packages/frontend/src/components/meal/MealInput.tsx` | 新規登録時のUI改善 |
| `packages/frontend/src/components/meal/MealEditMode.tsx` | 日時編集セクション追加 |

### バックエンド（変更なし）

既存の `PATCH /api/meals/:id` エンドポイントが `recordedAt` の更新をサポート済み。

### 共有スキーマ（変更なし）

既存の `updateMealSchema` に `recordedAt` フィールドが定義済み。

## 実装パターン

### 1. 日時入力コンポーネント

```tsx
// datetime-local入力（ブラウザネイティブUI使用）
<input
  type="datetime-local"
  value={recordedAt.slice(0, 16)}
  onChange={(e) => setRecordedAt(new Date(e.target.value).toISOString())}
  max={new Date().toISOString().slice(0, 16)}  // 未来禁止
/>
```

### 2. 未来日時バリデーション

```tsx
const validateDateTime = (dateStr: string): string | null => {
  const date = new Date(dateStr);
  if (date > new Date()) {
    return '未来の日時は指定できません';
  }
  return null;
};
```

### 3. 日時更新API呼び出し

```tsx
const updateMealDateTime = useMutation({
  mutationFn: async ({ mealId, recordedAt }: { mealId: string; recordedAt: string }) => {
    const res = await client.api.meals[':id'].$patch({
      param: { id: mealId },
      json: { recordedAt }
    });
    return res.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['meals'] });
  }
});
```

## テスト

```bash
# 単体テスト
pnpm test tests/unit/meal-datetime.test.ts

# 統合テスト
pnpm test tests/integration/meal-datetime.test.ts

# E2Eテスト
pnpm test:e2e tests/e2e/meal-datetime.spec.ts
```

## 検証項目

| シナリオ | 期待結果 |
|----------|----------|
| 昨日の日付で食事を登録 | 昨日の食事一覧に表示される |
| 編集画面で日時を変更 | 新しい日付の一覧に移動 |
| 未来の日時を入力 | バリデーションエラー表示 |
| 日時変更後、ダッシュボード確認 | 正しい日のカロリーに反映 |
