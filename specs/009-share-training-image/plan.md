# Implementation Plan: トレーニング内容の画像共有機能

**Branch**: `009-share-training-image` | **Date**: 2026-01-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-share-training-image/spec.md`

## Summary

筋トレ記録を画像化してX/LINEに共有する機能。参考画像（筋トレMEMO）スタイルのカード形式レイアウトで、日付ヘッダー、種目カード、各セットの詳細（重量×回数、1RM計算値）、MAX RMハイライト、フッターを含む画像を生成。Web Share APIとCanvas APIを使用してフロントエンドで完結する実装。

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode) + React 18+, Hono, Drizzle ORM, Zod, TanStack Query
**Primary Dependencies**: React, Tailwind CSS, html-to-image (or html2canvas), Web Share API
**Storage**: Cloudflare D1 (SQLite) - 既存のexercise_recordsテーブルを使用
**Testing**: Vitest + Playwright
**Target Platform**: PWA (iOS/Android) - Mobile browsers with Web Share API support
**Project Type**: Web application (monorepo: frontend + backend)
**Performance Goals**: 画像生成2秒以内、5タップ以内で共有完了
**Constraints**: フロントエンドのみで画像生成（サーバーサイドレンダリング不使用）
**Scale/Scope**: 1日あたり最大10種目、各種目最大10セット

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. User Privacy First | ✅ PASS | 共有は明示的ユーザーアクションのみ、外部サービスへのデータ送信なし |
| II. Simple UX | ✅ PASS | 5タップ以内で共有完了（目標達成） |
| III. Test-Driven Development | ✅ PASS | ユニットテスト（1RM計算）+ E2Eテスト（共有フロー） |
| IV. Type Safety | ✅ PASS | Zod + TypeScript strict mode継続 |
| V. Simplicity Over Cleverness | ✅ PASS | フロントエンドのみの実装、新規ライブラリは1つ（html-to-image） |

## Project Structure

### Documentation (this feature)

```text
specs/009-share-training-image/
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
│       └── utils/
│           └── rm-calculator.ts    # 1RM計算ロジック
├── backend/
│   └── src/
│       └── services/
│           └── exercise.ts         # 既存 - MAX RM判定用クエリ追加
└── frontend/
    └── src/
        ├── components/
        │   └── exercise/
        │       ├── TrainingImagePreview.tsx  # 画像プレビューコンポーネント
        │       ├── TrainingImageCard.tsx     # 種目カードコンポーネント
        │       └── ShareButton.tsx           # 共有ボタン
        ├── hooks/
        │   └── useShareImage.ts              # Web Share API フック
        └── lib/
            └── image-generator.ts            # 画像生成ユーティリティ

tests/
├── unit/
│   └── rm-calculator.test.ts       # 1RM計算ユニットテスト
└── e2e/
    └── share-training.spec.ts      # 共有フローE2Eテスト
```

**Structure Decision**: 既存のmonorepo構造（packages/frontend, packages/backend, packages/shared）を継続。画像生成はフロントエンドで完結し、バックエンドはMAX RM判定用のクエリのみ追加。

## Complexity Tracking

> No violations - all principles satisfied with simple frontend-only approach.
