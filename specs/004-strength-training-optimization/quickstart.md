# Quickstart: 筋トレ最適化運動記録

**Feature**: 004-strength-training-optimization
**Date**: 2026-01-01

## Prerequisites

- Node.js 20+
- pnpm 8+
- Cloudflare account (D1 database)

## Setup

```bash
# Clone and install
git clone <repo>
cd lifestyle-app
pnpm install

# Checkout feature branch
git checkout 004-strength-training-optimization

# Build shared package
pnpm --filter @lifestyle-app/shared build

# Run migrations (local)
pnpm --filter @lifestyle-app/backend exec wrangler d1 migrations apply DB --local
```

## Development

```bash
# Start backend (terminal 1)
pnpm --filter @lifestyle-app/backend dev

# Start frontend (terminal 2)
pnpm --filter @lifestyle-app/frontend dev

# Or start both
pnpm dev:all
```

## Key Files to Modify

### Backend

| File | Description |
|------|-------------|
| `packages/backend/src/db/schema.ts` | exerciseRecordsテーブル定義 |
| `packages/backend/drizzle/migrations/XXXX_strength_training.sql` | マイグレーション |
| `packages/backend/src/routes/exercises.ts` | APIエンドポイント |
| `packages/backend/src/services/exercises.ts` | ビジネスロジック |

### Frontend

| File | Description |
|------|-------------|
| `packages/frontend/src/pages/Exercise.tsx` | メインページ |
| `packages/frontend/src/components/exercise/StrengthInput.tsx` | 筋トレ入力フォーム（新規） |
| `packages/frontend/src/components/exercise/ExercisePresets.tsx` | 種目選択（新規） |
| `packages/frontend/src/components/exercise/LastRecordBadge.tsx` | 前回記録表示（新規） |
| `packages/frontend/src/components/exercise/ExerciseList.tsx` | 履歴表示（修正） |
| `packages/frontend/src/hooks/useExercises.ts` | データ取得フック（修正） |

### Shared

| File | Description |
|------|-------------|
| `packages/shared/src/schemas/index.ts` | Zodスキーマ |
| `packages/shared/src/types/index.ts` | TypeScript型 |
| `packages/shared/src/constants.ts` | プリセット種目定義 |

## Testing

```bash
# Unit tests
pnpm test

# Type check
pnpm --filter @lifestyle-app/shared build
pnpm --filter @lifestyle-app/shared typecheck

# Lint
pnpm lint
```

## Validation Checklist

- [ ] 筋トレ記録作成（セット/レップ/重量）
- [ ] プリセット種目選択
- [ ] カスタム種目入力
- [ ] 自重トレ記録（重量なし）
- [ ] 前回記録表示・コピー
- [ ] 履歴一覧表示
- [ ] 種目フィルタ
- [ ] 記録編集・削除

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/exercises | 記録一覧取得 |
| POST | /api/exercises | 記録作成 |
| GET | /api/exercises/:id | 記録取得 |
| PUT | /api/exercises/:id | 記録更新 |
| DELETE | /api/exercises/:id | 記録削除 |
| GET | /api/exercises/last/:exerciseType | 前回記録取得（新規） |

## Example Usage

### Create Exercise Record

```bash
curl -X POST http://localhost:8787/api/exercises \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "exerciseType": "ベンチプレス",
    "sets": 3,
    "reps": 10,
    "weight": 60,
    "recordedAt": "2026-01-01T10:00:00Z"
  }'
```

### Get Last Record

```bash
curl http://localhost:8787/api/exercises/last/%E3%83%99%E3%83%B3%E3%83%81%E3%83%97%E3%83%AC%E3%82%B9 \
  -H "Authorization: Bearer <token>"
```
