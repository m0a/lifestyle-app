# Quickstart: 食事タイプの変更機能

**Feature**: 012-meal-type-change
**Date**: 2026-01-03

## 変更概要

AIチャットで食事タイプ（朝食/昼食/夕食/間食）を変更できる機能を追加します。

## 変更対象ファイル

### 1. Shared (packages/shared)

| ファイル | 変更内容 |
|---------|---------|
| `src/schemas/meal-analysis.ts` | `set_meal_type` アクションを `chatChangeSchema` に追加 |

### 2. Backend (packages/backend)

| ファイル | 変更内容 |
|---------|---------|
| `src/services/ai-chat.ts` | AIプロンプトに `set_meal_type` の指示を追加、`parseChanges` で解析 |
| `src/routes/meal-chat.ts` | `/apply` エンドポイントで `set_meal_type` を処理 |

### 3. Frontend (packages/frontend)

| ファイル | 変更内容 |
|---------|---------|
| `src/components/meal/MealChat.tsx` | `set_meal_type` の変更提案を日本語で表示 |
| `src/lib/api.ts` | レスポンスに `mealType` を追加（型変更のみ） |

## 実装ステップ

### Step 1: Zodスキーマ拡張
```typescript
// packages/shared/src/schemas/meal-analysis.ts
export const chatChangeSchema = z.discriminatedUnion('action', [
  // ... 既存のアクション
  z.object({
    action: z.literal('set_meal_type'),
    mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  }),
]);
```

### Step 2: AIプロンプト更新
```typescript
// packages/backend/src/services/ai-chat.ts
// CHAT_SYSTEM_PROMPT に追加:
// - **食事タイプ変更**: [CHANGE: {"action": "set_meal_type", "mealType": "breakfast"}]
```

### Step 3: バックエンド処理
```typescript
// packages/backend/src/routes/meal-chat.ts
case 'set_meal_type':
  newMealType = change.mealType;
  break;
```

### Step 4: フロントエンド表示
```typescript
// packages/frontend/src/components/meal/MealChat.tsx
{change.action === 'set_meal_type' && `食事タイプ変更: ${getMealTypeLabel(change.mealType)}`}
```

## テスト確認

```bash
# 1. ユニットテスト
pnpm test tests/unit/ai-chat.service.test.ts

# 2. 統合テスト
pnpm test tests/integration/meal-chat.test.ts

# 3. E2Eテスト（手動）
# - 食事詳細画面でAIチャットを開く
# - 「朝食に変更して」と入力
# - 変更提案が表示されることを確認
# - 「適用する」をクリック
# - 食事タイプが「朝食」に変更されることを確認
```

## 日本語マッピング

| mealType | 日本語表示 |
|----------|-----------|
| breakfast | 朝食 |
| lunch | 昼食 |
| dinner | 夕食 |
| snack | 間食 |

## 依存関係

なし（既存機能の拡張のみ）

## リスクと緩和策

| リスク | 緩和策 |
|--------|--------|
| AIが誤認識 | ユーザーが「適用する」前に確認可能 |
| 既存テスト破損 | discriminated union の後方互換性により低リスク |
