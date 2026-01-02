# Quickstart: 筋トレのセット管理の見直し

## 概要

筋トレ記録を「セット数サマリー」形式から「セットごとの個別記録」形式に変更する機能。

## 前提条件

- Node.js 20+
- pnpm 8+
- Cloudflare Wrangler CLI

## セットアップ

```bash
# 依存関係インストール
pnpm install

# 開発サーバー起動
pnpm dev:all
```

## 主要な変更ファイル

### Backend
| ファイル | 変更内容 |
|---------|---------|
| `packages/backend/src/db/schema.ts` | setNumber, variation追加、sets削除 |
| `packages/backend/migrations/xxxx_set_management.sql` | マイグレーション |
| `packages/backend/src/services/exercise.ts` | 複数セット作成、グループ化ロジック |
| `packages/backend/src/routes/exercises.ts` | /grouped エンドポイント追加 |

### Shared
| ファイル | 変更内容 |
|---------|---------|
| `packages/shared/src/schemas/index.ts` | createExerciseSetsSchema追加 |
| `packages/shared/src/constants.ts` | VARIATION_PRESETS追加（任意） |

### Frontend
| ファイル | 変更内容 |
|---------|---------|
| `packages/frontend/src/components/exercise/StrengthInput.tsx` | 複数セット入力UI |
| `packages/frontend/src/components/exercise/ExerciseList.tsx` | グループ化表示 |
| `packages/frontend/src/components/exercise/SetRow.tsx` | 新規: セット行コンポーネント |
| `packages/frontend/src/hooks/useExercises.ts` | API呼び出し修正 |
| `packages/frontend/src/lib/exercise-utils.ts` | 新規: RM計算、lbs変換 |

## 実装順序

1. **スキーマ変更**
   - shared: Zodスキーマ追加
   - backend: DBスキーマ変更

2. **マイグレーション**
   - 新カラム追加
   - 既存データ展開
   - 旧カラム削除

3. **Backend API**
   - ExerciseService修正
   - /grouped エンドポイント追加

4. **Frontend UI**
   - 入力コンポーネント改修
   - 一覧表示コンポーネント改修

## 主要な計算式

### 推定1RM (Epley公式)
```typescript
const calculateRM = (weight: number, reps: number): number => {
  if (reps <= 0 || weight <= 0) return 0;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
};
```

### kg → lbs変換
```typescript
const kgToLbs = (kg: number): number => {
  return Math.round(kg * 2.20462 * 10) / 10;
};
```

## テスト実行

```bash
# 全テスト
pnpm test

# 単体テスト
pnpm test:unit

# 特定ファイル
pnpm test tests/unit/exercise.service.test.ts
```

## マイグレーション実行

```bash
# ローカル
pnpm --filter @lifestyle-app/backend db:migrate:local

# プレビュー環境
pnpm --filter @lifestyle-app/backend exec wrangler d1 migrations apply DB --env preview --remote
```
