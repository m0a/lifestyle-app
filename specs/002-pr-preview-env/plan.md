# Implementation Plan: PR Preview Environment

**Branch**: `002-pr-preview-env` | **Date**: 2026-01-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-pr-preview-env/spec.md`

## Summary

GitHub ActionsワークフローとCloudflare Workers設定を更新し、PRプレビュー環境、mainプレビュー環境、タグベース本番リリースを実現する。アプリケーションコードの変更は不要で、CI/CD設定のみの変更。

## Technical Context

**Language/Version**: YAML (GitHub Actions), TOML (wrangler.toml)
**Primary Dependencies**: GitHub Actions, Cloudflare Workers (wrangler CLI), gh CLI
**Storage**: Cloudflare D1 (本番DB + プレビューDB)
**Testing**: 手動テスト（PR作成→プレビュー確認→マージ→削除確認）
**Target Platform**: GitHub Actions runners (ubuntu-latest)
**Project Type**: CI/CD configuration (infrastructure as code)
**Performance Goals**: デプロイ完了まで5分以内
**Constraints**: Cloudflare無料枠内、GitHub Actionsの月間利用時間内
**Scale/Scope**: 同時PR数10程度を想定

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. User Privacy First | ✅ PASS | プレビュー環境は本番DBと分離。テストデータのみ使用 |
| II. Simple UX | N/A | インフラ変更のため直接適用なし |
| III. Test-Driven Development | ⚠️ PARTIAL | CI/CDはE2Eテストで間接検証。ワークフロー自体のユニットテストは困難 |
| IV. Type Safety | N/A | YAML/TOML設定のためTypeScript型システム適用外 |
| V. Simplicity Over Cleverness | ✅ PASS | 既存wrangler機能を活用、カスタムスクリプト最小化 |

**Gate Result**: PASS（TDDは制約上完全適用困難だが、E2Eテストで補完）

## Project Structure

### Documentation (this feature)

```text
specs/002-pr-preview-env/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # N/A (no data model changes)
├── quickstart.md        # Phase 1 output
├── contracts/           # N/A (no API contracts)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
.github/
└── workflows/
    └── ci.yml           # 更新: preview/production deploy jobs追加

packages/backend/
└── wrangler.toml        # 更新: preview環境設定追加
```

**Structure Decision**: 既存のCI/CD構成に追加。新規ファイル不要、既存ファイルの拡張のみ。

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| なし | - | - |
