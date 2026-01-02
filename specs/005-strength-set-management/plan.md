# Implementation Plan: 筋トレのセット管理の見直し

**Branch**: `005-strength-set-management` | **Date**: 2026-01-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-strength-set-management/spec.md`

## Summary

筋トレ記録を「セット数サマリー」形式（例: 3セット×10回×45kg）から「セットごとの個別記録」形式に変更する。これによりセットごとの重量・回数の差異やバリエーション（ワイド、ナロウ等）を正確に記録できる。推定1RM（Epley公式）の自動計算表示も実装する。過去のトレーニングセッションを取り込んで新規入力のテンプレートとして使用できる機能も追加。

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: React 18+, Hono, Drizzle ORM, Zod, TanStack Query
**Storage**: Cloudflare D1 (SQLite)
**Testing**: Vitest + Playwright
**Target Platform**: Cloudflare Workers (Backend), Web PWA (Frontend)
**Project Type**: Web application (pnpm monorepo)
**Performance Goals**: 10セット入力を30秒以内
**Constraints**: 既存データの100%移行、データ損失なし
**Scale/Scope**: 個人利用アプリ、運動記録機能の改修

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. User Privacy First | ✅ Pass | 既存のユーザーデータ構造を維持、新規収集なし |
| II. Simple UX | ✅ Pass | セット追加は1タップ、3タップ以内で完了 |
| III. Test-Driven Development | ✅ Pass | Unit/Integration/E2Eテスト計画あり |
| IV. Type Safety | ✅ Pass | Zodスキーマ、TypeScript strict mode |
| V. Simplicity Over Cleverness | ✅ Pass | 最小限の変更（カラム追加/削除のみ） |

## Project Structure

### Documentation (this feature)

```text
specs/005-strength-set-management/
├── plan.md              # This file
├── research.md          # Phase 0 output ✓
├── data-model.md        # Phase 1 output ✓
├── quickstart.md        # Phase 1 output ✓
├── contracts/           # Phase 1 output ✓
│   └── api.md
└── tasks.md             # Phase 2 output ✓
```

### Source Code (repository root)

```text
packages/
├── shared/              # 共有スキーマ・型・定数
│   └── src/
│       ├── schemas/
│       │   └── index.ts          # createExerciseSetsSchema追加
│       └── constants.ts          # VARIATION_PRESETS追加（任意）
│
├── backend/             # Hono API on Cloudflare Workers
│   ├── src/
│   │   ├── db/
│   │   │   └── schema.ts         # setNumber, variation追加
│   │   ├── services/
│   │   │   └── exercise.ts       # 複数セット作成、グループ化
│   │   └── routes/
│   │       └── exercises.ts      # /grouped エンドポイント追加
│   └── migrations/
│       └── xxxx_set_management.sql
│
└── frontend/            # React + Vite PWA
    └── src/
        ├── components/
        │   └── exercise/
        │       ├── StrengthInput.tsx   # 複数セット入力UI
        │       ├── ExerciseList.tsx    # グループ化表示
        │       ├── SetRow.tsx          # 新規: セット行
        │       ├── ExerciseGroupCard.tsx # 新規: グループカード
        │       └── SessionListModal.tsx  # 新規: セッション取り込み
        ├── hooks/
        │   └── useExercises.ts         # API呼び出し修正
        └── lib/
            └── exercise-utils.ts       # 新規: RM計算、lbs変換

tests/
├── unit/
│   └── exercise.service.test.ts        # 修正
└── integration/
    └── exercises.test.ts               # 修正
```

**Structure Decision**: 既存のpnpmモノレポ構造を維持。shared/backend/frontendの3パッケージ構成。

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| なし | - | - |

すべての原則に準拠。追加の複雑さなし。
