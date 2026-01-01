# Implementation Plan: 筋トレ最適化運動記録

**Branch**: `004-strength-training-optimization` | **Date**: 2026-01-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-strength-training-optimization/spec.md`

## Summary

運動記録機能を筋トレ専用に再設計する。現在の「運動種目」+「時間」のシンプルな構造から、筋トレに必要な「セット数」「回数（レップ）」「重量」を記録できる構造に変更する。プリセット種目による素早い入力、前回記録の参照・コピー機能を追加し、ユーザーが30秒以内に1種目を記録できるUXを実現する。

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: React 18+, Hono, Drizzle ORM, Zod, Tailwind CSS
**Storage**: Cloudflare D1 (SQLite)
**Testing**: Vitest + Playwright
**Target Platform**: Web (Cloudflare Workers with Static Assets)
**Project Type**: Monorepo (packages/frontend, packages/backend, packages/shared)
**Performance Goals**: 1種目30秒以内に記録、前回コピー10秒以内
**Constraints**: 3タップ以内で1アクション完了（Constitution準拠）
**Scale/Scope**: 個人利用、週2-5回のトレーニング頻度

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. User Privacy First | ✅ PASS | 運動データはユーザー所有、D1に保存 |
| II. Simple UX | ✅ PASS | 30秒以内記録、プリセット選択で3タップ以内 |
| III. TDD | ✅ PASS | テストファースト、カバレッジ80%維持 |
| IV. Type Safety | ✅ PASS | Zod検証、shared型定義 |
| V. Simplicity | ✅ PASS | 既存パターン踏襲、新規ライブラリなし |

## Project Structure

### Documentation (this feature)

```text
specs/004-strength-training-optimization/
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
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   └── schema.ts        # exerciseRecords修正
│   │   ├── routes/
│   │   │   └── exercises.ts     # API修正
│   │   └── services/
│   │       └── exercises.ts     # ビジネスロジック修正
│   ├── drizzle/
│   │   └── migrations/          # マイグレーション追加
│   └── tests/
│       └── exercises.test.ts    # テスト修正
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── exercise/
│   │   │       ├── StrengthInput.tsx      # 新規: 筋トレ入力
│   │   │       ├── ExercisePresets.tsx    # 新規: プリセット選択
│   │   │       ├── LastRecordBadge.tsx    # 新規: 前回記録表示
│   │   │       ├── ExerciseList.tsx       # 修正: 表示形式
│   │   │       └── ExerciseSummary.tsx    # 修正: サマリー
│   │   ├── pages/
│   │   │   └── Exercise.tsx     # 修正: 新入力フォーム統合
│   │   └── hooks/
│   │       └── useExercises.ts  # 修正: 新スキーマ対応
│   └── tests/
│       └── exercise/
└── shared/
    └── src/
        ├── schemas/
        │   └── index.ts         # createExerciseSchema修正
        ├── types/
        │   └── index.ts         # ExerciseRecord型修正
        └── constants.ts         # EXERCISE_PRESETS追加
```

**Structure Decision**: 既存のmonorepo構造を維持。フロントエンド/バックエンド/共有型の3パッケージ構成。

## Complexity Tracking

> No violations - following existing patterns

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | - | - |
