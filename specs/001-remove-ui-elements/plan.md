# Implementation Plan: 運動記録フォームと履歴表示のシンプル化

**Branch**: `001-remove-ui-elements` | **Date**: 2026-01-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-remove-ui-elements/spec.md`

## Summary

運動記録の入力フローを簡素化し、記録の心理的ハードルを下げることで継続的な記録習慣を支援する。具体的には、(1) 運動記録フォームから日時入力フィールドを削除し、記録ボタン押下時の現在時刻で自動保存、(2) 運動記録ページから種目フィルタUIを削除し、すべての記録を時系列表示する。

**技術的アプローチ**: 既存のExerciseInputコンポーネントとExerciseページから該当するUI要素を削除し、デフォルトの`recordedAt`値として現在時刻を設定する。バックエンドAPIは既にオプショナルな`recordedAt`を受け入れる実装になっているため、API変更は不要。

## Technical Context

**Language/Version**: TypeScript 5.3 (strict mode)
**Primary Dependencies**:
- Frontend: React 18.2, Vite 5.0, TanStack Query 5.17, react-hook-form 7.49, Zustand 4.4
- Backend: Hono 4.0, Drizzle ORM 0.30
- Shared: Zod 3.22 (validation)

**Storage**: Cloudflare D1 (SQLite) - 既存の`exercise_records`テーブルを使用
**Testing**: Vitest (unit/integration) + Playwright (E2E)
**Target Platform**: Cloudflare Workers (backend) + Vite PWA (frontend)
**Project Type**: pnpm monorepo (packages/frontend, packages/backend, packages/shared)
**Performance Goals**:
- 記録完了時間30%短縮（仕様SC-005）
- UI応答時間 <100ms

**Constraints**:
- 既存の記録編集機能は保持（日時変更なし）
- 食事記録・体重記録は対象外（変更しない）
- 型安全性の維持（Zod + TypeScript strict）

**Scale/Scope**:
- 影響範囲: 2コンポーネント（ExerciseInput, Exercise page）+ 1フック（useExercises）
- 削除対象: 日時入力フィールド（1要素）、種目フィルタUI（1ドロップダウン + state管理）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Initial Check (Before Phase 0)**: ✅ PASS - See below
**Post-Design Check (After Phase 1)**: ✅ PASS - No changes from initial check

### ✅ I. User Privacy First
- **Status**: N/A - データ収集・保存方法の変更なし
- **Notes**: UIの削除のみで、データプライバシーへの影響なし

### ✅ II. Simple UX
- **Status**: PASS - 仕様の主目的がUXシンプル化
- **Check**:
  - ✅ 記録を3ステップ以内で完了（SC-001）
  - ✅ 画面の情報過多を削減（フィルタUI削除）
  - ✅ エラーメッセージは既存実装を維持

### ✅ III. Test-Driven Development (TDD)
- **Status**: PASS - 既存テストを更新 + 新規テスト追加
- **Check**:
  - ✅ 日時フィールド削除のユニットテスト（ExerciseInput.test.tsx）
  - ✅ 現在時刻での自動保存のインテグレーションテスト
  - ✅ フィルタUI削除のE2Eテスト（Playwright）
  - ✅ カバレッジ80%維持（既存の運動記録テストを更新）

### ✅ IV. Type Safety
- **Status**: PASS - 既存の型定義を活用、新規型不要
- **Check**:
  - ✅ `CreateExerciseInput`型（packages/shared）は既存のまま使用
  - ✅ `recordedAt`はオプショナル（既にZodスキーマで定義済み）
  - ✅ strictモード継続

### ✅ V. Simplicity Over Cleverness
- **Status**: PASS - 複雑さの削減（UI削除）
- **Check**:
  - ✅ YAGNI遵守（不要なUI要素を削除）
  - ✅ 新規ライブラリ追加なし
  - ✅ 抽象化なし（既存コンポーネントの編集のみ）

**Overall**: ✅ すべてのゲート通過 - Phase 0に進める

## Project Structure

### Documentation (this feature)

```text
specs/001-remove-ui-elements/
├── plan.md              # This file
├── research.md          # Phase 0 output (技術調査・ベストプラクティス)
├── data-model.md        # Phase 1 output (データモデル定義)
├── quickstart.md        # Phase 1 output (開発者向けクイックスタート)
├── contracts/           # Phase 1 output (API契約)
│   └── (今回はAPI変更なしのため空)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
packages/
├── shared/              # 共有型定義・スキーマ
│   ├── src/
│   │   ├── schemas/
│   │   │   └── exercise.ts    # 既存: createExerciseSchema (変更なし)
│   │   └── types/
│   │       └── exercise.ts    # 既存: CreateExerciseInput (変更なし)
│   └── package.json
│
├── backend/             # Hono API on Cloudflare Workers
│   ├── src/
│   │   ├── routes/
│   │   │   └── exercises.ts   # 既存: POST /api/exercises (変更なし)
│   │   └── services/
│   │       └── exercise.ts    # 既存: createExercise() (変更なし)
│   └── package.json
│
└── frontend/            # React + Vite PWA
    ├── src/
    │   ├── components/
    │   │   └── exercise/
    │   │       ├── ExerciseInput.tsx      # 修正: 日時フィールド削除
    │   │       ├── ExerciseList.tsx       # 変更なし
    │   │       └── ExerciseSummary.tsx    # 変更なし
    │   ├── pages/
    │   │   └── Exercise.tsx               # 修正: フィルタUI削除
    │   └── hooks/
    │       └── useExercises.ts            # 修正: filterTypeパラメータ削除
    └── package.json

tests/
├── unit/
│   └── exercise.test.tsx              # 修正: 日時フィールドテスト更新
├── integration/
│   └── exercise-api.test.ts           # 修正: 自動時刻設定テスト追加
└── e2e/
    └── exercise-recording.spec.ts     # 修正: フィルタUI削除の検証

```

**Structure Decision**:
- pnpm monorepo構成（既存）を維持
- packages/frontend: UI削除のみ（新規ファイル追加なし）
- packages/backend: 変更なし（既存APIがオプショナルrecordedAtをサポート済み）
- packages/shared: 変更なし（既存スキーマで対応可能）

## Complexity Tracking

> **Constitutional violations**: なし

この機能は複雑さを**削減**するため、正当化は不要。

| Aspect | Before | After | Change |
|--------|--------|-------|--------|
| ExerciseInput fields | 4 (種目, セット, 回数, 日時) | 3 (種目, セット, 回数) | -1 フィールド |
| Exercise page UI elements | 2 (履歴リスト, フィルタ) | 1 (履歴リスト) | -1 要素 |
| useExercises parameters | 1 (filterType) | 0 | -1 パラメータ |
| User steps to record | 4 (入力x3 + 日時選択 + 記録) | 3 (入力x3 + 記録) | -1 ステップ |
