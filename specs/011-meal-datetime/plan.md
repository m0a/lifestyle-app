# Implementation Plan: 食事日時コントロール

**Branch**: `011-meal-datetime` | **Date**: 2026-01-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-meal-datetime/spec.md`

## Summary

ユーザーが食事記録の日時を自由にコントロールできるようにする。新規登録時は任意の過去日時を指定でき、既存記録の編集時も日時を変更可能にする。バックエンドは既に`recordedAt`の更新をサポートしているため、主にフロントエンドのUI改善が中心となる。

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: React 18+, Hono, Drizzle ORM, Zod, TanStack Query
**Storage**: Cloudflare D1 (SQLite) + R2 (photos)
**Testing**: Vitest + Playwright
**Target Platform**: Mobile-first PWA (モバイルブラウザ)
**Project Type**: web (monorepo: packages/frontend, packages/backend, packages/shared)
**Performance Goals**: 日時変更後1秒以内に反映（SC-003）
**Constraints**: 3タップ以内で日時変更画面にアクセス（SC-002）、30秒以内で日時設定完了（SC-001）
**Scale/Scope**: 個人利用アプリ、既存機能の拡張

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. User Privacy First | ✅ PASS | 日時変更は既存データの属性変更のみ。新規データ収集なし |
| II. Simple UX | ✅ PASS | 3タップ以内で日時変更（SC-002準拠）、datetime-localでネイティブUI活用 |
| III. Test-Driven Development | ✅ PASS | 単体テスト・E2Eテストを実装予定 |
| IV. Type Safety | ✅ PASS | 既存のZodスキーマ（datetimeSchema）を活用、型共有済み |
| V. Simplicity Over Cleverness | ✅ PASS | 既存のrecordedAtフィールド・APIを活用、新規抽象化なし |

**Gate Result**: PASS - すべての原則に準拠

## Project Structure

### Documentation (this feature)

```text
specs/011-meal-datetime/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
packages/
├── shared/
│   └── src/
│       └── schemas/
│           └── index.ts           # datetimeSchema（既存、変更なし）
├── backend/
│   └── src/
│       ├── routes/
│       │   └── meals.ts           # 既存API（変更なし）
│       └── services/
│           └── meal.ts            # recordedAt更新（既存、変更なし）
└── frontend/
    └── src/
        ├── components/
        │   └── meal/
        │       ├── MealInput.tsx      # 新規登録時の日時選択UI改善
        │       └── MealEditMode.tsx   # 編集モードに日時変更機能追加
        └── pages/
            └── MealDetail.tsx         # 編集画面との連携

tests/
├── unit/
│   └── meal-datetime.test.ts      # 日時バリデーションテスト
├── integration/
│   └── meal-datetime.test.ts      # API統合テスト
└── e2e/
    └── meal-datetime.spec.ts      # E2Eテスト
```

**Structure Decision**: 既存のmonorepo構造を維持。主要な変更はfrontend/src/components/meal/配下のUIコンポーネントのみ。

## Complexity Tracking

> 憲法違反なし。複雑さの正当化不要。
