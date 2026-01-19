# Implementation Plan: Timezone Offset Storage

**Branch**: `020-timezone-offset-storage` | **Date**: 2026-01-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/020-timezone-offset-storage/spec.md`

## Summary

recordedAtフィールドにタイムゾーンオフセット（例: `+09:00`）を含めて保存する方式へ移行する。これにより、表示時のタイムゾーン送信が不要になり、記録した場所の文脈が保持される。既存データはJST（+09:00）でマイグレーションする。

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: React 18+, Hono, Drizzle ORM, Zod, date-fns-tz
**Storage**: Cloudflare D1 (SQLite) - recorded_atカラムの値形式のみ変更
**Testing**: Vitest + Playwright
**Target Platform**: Cloudflare Workers (Backend), Web Browser (Frontend PWA)
**Project Type**: Web application (monorepo: frontend + backend + shared)
**Performance Goals**: 既存性能を維持（変更は日時文字列形式のみ）
**Constraints**: 既存データとの後方互換性、ダウンタイムなしでのマイグレーション
**Scale/Scope**: 既存ユーザーの全データ（weight_records, meal_records, exercise_records）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. User Privacy First | ✅ Pass | データ形式変更のみ、新規データ収集なし |
| II. Simple UX | ✅ Pass | ユーザー操作に変更なし（透過的） |
| III. Test-Driven Development | ✅ Pass | 単体テスト・統合テストを先に書く |
| IV. Type Safety | ✅ Pass | Zodスキーマでオフセット必須を強制 |
| V. Simplicity Over Cleverness | ✅ Pass | 既存の表示時TZ送信を削除しシンプル化 |

**Gate Result**: PASS - 全原則に準拠

## Project Structure

### Documentation (this feature)

```text
specs/020-timezone-offset-storage/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (by /speckit.tasks)
```

### Source Code (repository root)

```text
packages/
├── shared/
│   └── src/
│       └── schemas/
│           └── index.ts          # datetimeSchema修正
├── backend/
│   └── src/
│       ├── services/
│       │   ├── dashboard.ts      # TZ送信ロジック削除
│       │   ├── weight.ts         # 日付抽出ロジック変更
│       │   ├── meal.ts           # 日付抽出ロジック変更
│       │   └── exercise.ts       # 日付抽出ロジック変更
│       ├── routes/
│       │   └── dashboard.ts      # timezoneパラメータ削除
│       └── db/
│           └── migrations/       # マイグレーションSQL
└── frontend/
    └── src/
        ├── lib/
        │   └── datetime.ts       # toLocalISOString関数追加
        ├── hooks/
        │   ├── useActivityDots.ts  # timezone送信削除
        │   └── useMeals.ts         # timezone送信削除
        └── pages/
            └── (各記録ページ)      # 日時送信形式変更

tests/
├── unit/
│   └── datetime.test.ts          # 日時変換ユニットテスト
└── integration/
    └── timezone.test.ts          # タイムゾーン統合テスト
```

**Structure Decision**: 既存のmonorepo構造（packages/shared, backend, frontend）を維持。新規ディレクトリ作成なし。

## Complexity Tracking

> Constitution Check passed - no violations to justify.

N/A - シンプルな形式変更のため、複雑さの追加なし。
