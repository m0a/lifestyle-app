# Quickstart: 食事入力フローの改善

**Feature**: 003-meal-input-flow
**Date**: 2026-01-01

## Prerequisites

- Node.js 20+
- pnpm 8+
- Cloudflare account (for wrangler)

## Setup

```bash
# リポジトリをクローン（済みの場合はスキップ）
git clone https://github.com/m0a/lifestyle-app.git
cd lifestyle-app

# ブランチ切り替え
git checkout 003-meal-input-flow

# 依存関係インストール
pnpm install

# 環境変数設定（.dev.varsファイル）
cp packages/backend/.dev.vars.example packages/backend/.dev.vars
# GOOGLE_GENERATIVE_AI_API_KEY を設定
```

## Development

```bash
# フロントエンド開発サーバー
pnpm dev

# バックエンド開発サーバー（別ターミナル）
pnpm dev:backend

# 両方同時起動
pnpm dev:all
```

## Key Files to Modify

### Backend

| File | Action | Description |
|------|--------|-------------|
| `packages/backend/src/routes/meal-analysis.ts` | MODIFY | テキスト分析エンドポイント追加 |
| `packages/backend/src/services/ai-analysis.ts` | MODIFY | テキスト分析メソッド追加 |

### Frontend

| File | Action | Description |
|------|--------|-------------|
| `packages/frontend/src/components/meal/SmartMealInput.tsx` | CREATE | 統合入力コンポーネント |
| `packages/frontend/src/pages/Meal.tsx` | MODIFY | SmartMealInput統合 |
| `packages/frontend/src/pages/MealAnalysis.tsx` | DELETE | 機能をMeal.tsxに統合 |
| `packages/frontend/src/router.tsx` | MODIFY | /meals/analyzeルート削除 |
| `packages/frontend/src/lib/api.ts` | MODIFY | analyzeText API追加 |

### Shared

| File | Action | Description |
|------|--------|-------------|
| `packages/shared/src/types.ts` | MODIFY | TextAnalysis型追加 |
| `packages/shared/src/schemas.ts` | MODIFY | textAnalysisRequestSchema追加 |

## Testing

```bash
# ユニットテスト
pnpm test

# 特定のテストファイル
pnpm test packages/backend/src/services/ai-analysis.test.ts

# E2Eテスト（Playwright）
pnpm test:e2e
```

## API Testing

```bash
# テキスト分析API（開発環境）
curl -X POST http://localhost:8787/api/meals/analyze-text \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"text": "昼にラーメン食べた"}'
```

## Expected Response

```json
{
  "mealId": "uuid-here",
  "foodItems": [
    {
      "id": "uuid-here",
      "name": "ラーメン",
      "portion": "medium",
      "calories": 450,
      "protein": 20.0,
      "fat": 15.0,
      "carbs": 60.0
    }
  ],
  "totals": {
    "calories": 450,
    "protein": 20.0,
    "fat": 15.0,
    "carbs": 60.0
  },
  "inferredMealType": "lunch",
  "mealTypeSource": "text"
}
```

## Common Issues

### AI応答が遅い
- 10秒でタイムアウトする設計
- タイムアウト時は手動入力にフォールバック

### 食事タイプが正しく判定されない
- テキストに時間情報がない場合は現在時刻から推測
- ユーザーは手動で変更可能

### 開発サーバーが起動しない
- `pnpm install` を再実行
- `.dev.vars` ファイルの設定を確認
