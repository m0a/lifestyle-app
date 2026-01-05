# Quickstart: 食事記録の日付別表示

**Branch**: `001-meal-history` | **Date**: 2026-01-05

## Prerequisites

- Node.js 20+
- pnpm
- Git

## Setup

```bash
# Clone and checkout feature branch
git clone https://github.com/m0a/lifestyle-app.git
cd lifestyle-app
git checkout 001-meal-history

# Install dependencies
pnpm install

# Build shared package (required first)
pnpm build:shared
```

## Development

```bash
# Start frontend (localhost:5173)
pnpm dev

# Start backend (localhost:8787)
pnpm dev:backend

# Or start both
pnpm dev:all
```

## Testing

```bash
# Run all tests
pnpm test

# Run unit tests only
pnpm test:unit

# Run specific test file
pnpm test tests/unit/meal.service.test.ts

# Run E2E tests
pnpm test:e2e
```

## Feature Implementation Order

### Phase 1: P1 - 今日の食事のみ表示

1. `packages/frontend/src/pages/Meal.tsx` を修正
   - useMealsフックにstartDate/endDateを渡す
   - 空状態メッセージを追加

2. テスト作成
   - 今日の記録のみ表示されることを確認

### Phase 2: P2 - 過去の食事履歴ページ

1. `packages/backend/src/routes/meals.ts` に `/dates` エンドポイント追加
2. `packages/shared/src/schemas/index.ts` に型定義追加
3. `packages/frontend/src/pages/MealHistory.tsx` を新規作成
4. `packages/frontend/src/router.tsx` にルート追加

### Phase 3: P3 - 月間カレンダー

1. `packages/frontend/src/components/meal/MealCalendar.tsx` を新規作成
2. MealHistoryページにカレンダーを統合

## Key Files

| File | Purpose |
|------|---------|
| `packages/frontend/src/pages/Meal.tsx` | 今日の食事ページ（修正） |
| `packages/frontend/src/pages/MealHistory.tsx` | 履歴ページ（新規） |
| `packages/frontend/src/components/meal/MealCalendar.tsx` | カレンダーコンポーネント（新規） |
| `packages/backend/src/routes/meals.ts` | 食事API（datesエンドポイント追加） |
| `packages/frontend/src/router.tsx` | ルーティング（/meals/history追加） |

## Verification

### Manual Testing

1. `/meals` にアクセス → 今日の食事のみ表示されること
2. 「過去の記録を見る」リンクをタップ → `/meals/history` に遷移
3. カレンダーで過去の日付をタップ → その日の食事が表示されること
4. 記録がある日にマーカーが表示されること

### Automated Testing

```bash
# E2E test for meal history feature
pnpm test:e2e tests/e2e/meal-history.spec.ts
```

## Troubleshooting

### "今日の記録がありません" が常に表示される

- タイムゾーン設定を確認
- ブラウザの開発者ツールでネットワークリクエストを確認
- `timezoneOffset` パラメータが正しく送信されているか確認

### カレンダーが表示されない

- `/api/meals/dates` エンドポイントのレスポンスを確認
- 年月パラメータが正しいか確認
