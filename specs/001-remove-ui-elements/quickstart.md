# Quickstart: 運動記録フォームと履歴表示のシンプル化

**Feature**: 001-remove-ui-elements
**Date**: 2026-01-09

## Overview

この機能は既存の運動記録UIから不要な要素（日時入力フィールド、種目フィルタ）を削除し、記録フローを簡素化する。開発者は既存のコンポーネントを編集するのみで、新規ファイルの作成やAPI変更は不要。

## Prerequisites

- Node.js 20+
- pnpm 8+
- 既存のlifestyle-appリポジトリのクローン
- ブランチ: `001-remove-ui-elements`（既にチェックアウト済み）

## Quick Start (5分)

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. 開発サーバー起動

```bash
# ターミナル1: フロントエンド
pnpm dev

# ターミナル2: バックエンド（必要に応じて）
pnpm dev:backend
```

### 3. 変更対象ファイルの確認

以下の3ファイルのみを編集する:

```
packages/frontend/src/
├── components/exercise/ExerciseInput.tsx  # 日時フィールド削除
├── pages/Exercise.tsx                     # フィルタUI削除
└── hooks/useExercises.ts                  # パラメータ簡素化
```

### 4. テスト実行

```bash
# ユニットテスト
pnpm test:unit tests/unit/exercise

# 統合テスト
pnpm test:integration tests/integration/exercise

# E2Eテスト
pnpm test:e2e tests/e2e/exercise-recording.spec.ts
```

## Development Workflow

### Step 1: ExerciseInput.tsxの編集（日時フィールド削除）

**ファイル**: `packages/frontend/src/components/exercise/ExerciseInput.tsx`

**変更内容**: 147-160行目の日時入力フィールドを削除

```typescript
// Before (147-160行目)
<div>
  <label htmlFor="recordedAt" className="block text-sm font-medium text-gray-700">
    記録日時
  </label>
  <input
    {...register('recordedAt')}
    type="datetime-local"
    id="recordedAt"
    defaultValue={new Date().toISOString().slice(0, 16)}
    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
  />
  {errors.recordedAt && (
    <p className="mt-1 text-sm text-red-600">{errors.recordedAt.message}</p>
  )}
</div>

// After: この <div> ブロック全体を削除
```

**理由**: `defaultValues`で`recordedAt`は自動設定されるため、UIフィールドは不要

**確認**:
- ブラウザで http://localhost:5173/exercises にアクセス
- 「記録日時」フィールドが表示されないことを確認
- 記録ボタンを押して、現在時刻で保存されることを確認

### Step 2: Exercise.tsxの編集（フィルタUI削除）

**ファイル**: `packages/frontend/src/pages/Exercise.tsx`

**変更内容1**: 10-11行目と33-38行目のstate管理を削除

```typescript
// Before (10-11行目)
const [filterType, setFilterType] = useState<string>('');
const [allExerciseTypes, setAllExerciseTypes] = useState<string[]>([]);

// After: 削除
```

```typescript
// Before (33-38行目)
useEffect(() => {
  if (!filterType && exercises.length > 0) {
    const types = [...new Set(exercises.map((e) => e.exerciseType))].sort();
    setAllExerciseTypes(types);
  }
}, [exercises, filterType]);

// After: 削除
```

**変更内容2**: 30行目のuseExercises呼び出しを簡素化

```typescript
// Before (30行目)
const { exercises, ... } = useExercises({ exerciseType: filterType || undefined });

// After
const { exercises, ... } = useExercises();
```

**変更内容3**: 100-113行目のフィルタUIを削除

```typescript
// Before (100-113行目)
{allExerciseTypes.length > 0 && (
  <select
    value={filterType}
    onChange={(e) => setFilterType(e.target.value)}
    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
  >
    <option value="">すべての種目</option>
    {allExerciseTypes.map((type) => (
      <option key={type} value={type}>
        {type}
      </option>
    ))}
  </select>
)}

// After: 削除
```

**確認**:
- ブラウザで http://localhost:5173/exercises にアクセス
- 種目フィルタドロップダウンが表示されないことを確認
- すべての記録が時系列で表示されることを確認

### Step 3: テストの更新

#### 3-1. ユニットテスト

**新規作成**: `tests/unit/exercise-input.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExerciseInput } from '@/components/exercise/ExerciseInput';
import { describe, it, expect, vi } from 'vitest';

describe('ExerciseInput', () => {
  it('should not display recordedAt field', () => {
    const onSubmit = vi.fn();
    render(<ExerciseInput onSubmit={onSubmit} />);

    // 日時フィールドが存在しないことを確認
    expect(screen.queryByLabelText('記録日時')).not.toBeInTheDocument();
  });

  it('should submit with current timestamp', async () => {
    const onSubmit = vi.fn();
    const now = new Date();

    render(<ExerciseInput onSubmit={onSubmit} />);

    // フォーム入力
    fireEvent.change(screen.getByLabelText('運動種目'), { target: { value: 'テスト' } });
    fireEvent.change(screen.getByLabelText('セット数'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('回数'), { target: { value: '10' } });
    fireEvent.click(screen.getByText('記録する'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
      const submittedData = onSubmit.mock.calls[0][0];

      // recordedAt が現在時刻（±1秒の許容範囲）であることを確認
      const submittedTime = new Date(submittedData.recordedAt);
      const diff = Math.abs(submittedTime.getTime() - now.getTime());
      expect(diff).toBeLessThan(1000);
    });
  });
});
```

#### 3-2. E2Eテスト

**新規作成**: `tests/e2e/exercise-recording.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Exercise Recording - Simplified UI', () => {
  test('should not show datetime field', async ({ page }) => {
    await page.goto('http://localhost:5173/exercises');

    // 日時フィールドが存在しないことを確認
    await expect(page.locator('label:has-text("記録日時")')).not.toBeVisible();
    await expect(page.locator('input[type="datetime-local"]')).not.toBeVisible();
  });

  test('should not show filter dropdown', async ({ page }) => {
    await page.goto('http://localhost:5173/exercises');

    // フィルタドロップダウンが存在しないことを確認
    await expect(page.locator('select')).toHaveCount(0); // Exercise pageにselectは存在しない
  });

  test('should record with current timestamp', async ({ page }) => {
    await page.goto('http://localhost:5173/exercises');

    const before = new Date();

    // 記録を作成
    await page.click('text=ランニング'); // 種目選択
    await page.fill('input[id="sets"]', '1');
    await page.fill('input[id="reps"]', '30');
    await page.click('button:has-text("記録する")');

    const after = new Date();

    // 履歴に表示されることを確認
    await expect(page.locator('.exercise-list')).toContainText('ランニング');

    // 記録時刻が before と after の間であることを確認
    const recordedTime = await page.locator('.recorded-at').first().textContent();
    // タイムスタンプのパース・検証ロジック（実装に応じて調整）
  });
});
```

### Step 4: 型チェックとLint

```bash
# 型チェック
pnpm typecheck

# Lint
pnpm lint

# 自動修正
pnpm lint:fix
```

## Common Issues & Solutions

### Issue 1: `recordedAt` が undefined になる

**原因**: `defaultValues`が正しく設定されていない

**解決策**: ExerciseInput.tsxの38行目を確認

```typescript
const { register, handleSubmit, reset, setValue, watch } = useForm<CreateExerciseInput>({
  resolver: zodResolver(createExerciseSchema),
  defaultValues: {
    recordedAt: new Date().toISOString(), // ← これが必要
  },
});
```

### Issue 2: フィルタUIが残っている

**原因**: Exercise.tsxの削除が不完全

**解決策**: 以下をすべて削除したか確認
- `filterType` state（10行目）
- `allExerciseTypes` state（11行目）
- useEffect（33-38行目）
- selectタグ（100-113行目）

### Issue 3: テストが失敗する

**原因**: モックの設定が不足

**解決策**: `vi.fn()`でonSubmitをモック化

```typescript
const onSubmit = vi.fn();
render(<ExerciseInput onSubmit={onSubmit} />);
```

## Testing Checklist

実装完了後、以下をすべて確認:

- [ ] 運動記録ページで日時フィールドが表示されない
- [ ] 記録ボタンを押すと、現在時刻で保存される
- [ ] 履歴に新規記録が時系列順に表示される
- [ ] フィルタドロップダウンが表示されない
- [ ] すべての種目の記録が混在して表示される
- [ ] 記録編集時に日時が変更されない
- [ ] ユニットテストがすべてパスする
- [ ] E2Eテストがすべてパスする
- [ ] 型エラーがない（`pnpm typecheck`）
- [ ] Lintエラーがない（`pnpm lint`）

## Performance Metrics

実装前後のパフォーマンスを測定:

```bash
# Lighthouse CI
pnpm lighthouse http://localhost:5173/exercises
```

**目標値**:
- 記録完了時間: 30%短縮（仕様SC-005）
- First Contentful Paint: 変化なし（UI削除のみ）
- Time to Interactive: 微減（DOM要素減少により）

## Next Steps

1. ✅ ExerciseInput.tsx編集
2. ✅ Exercise.tsx編集
3. ✅ テスト作成・更新
4. ✅ 型チェック・Lint
5. → コミット & プッシュ
6. → `/speckit.tasks`でタスク生成
7. → タスクに従って実装を進める

## Resources

- [React Hook Form - defaultValues](https://react-hook-form.com/docs/useform#defaultValues)
- [TanStack Query - useMutation](https://tanstack.com/query/latest/docs/framework/react/guides/mutations)
- [Playwright - Testing Library](https://playwright.dev/docs/test-assertions)
- [Vitest - Unit Testing](https://vitest.dev/guide/)

## Support

質問や問題が発生した場合:
- `/speckit.plan`の出力を確認: `specs/001-remove-ui-elements/plan.md`
- リサーチドキュメントを参照: `specs/001-remove-ui-elements/research.md`
- データモデルを確認: `specs/001-remove-ui-elements/data-model.md`
