<!--
Sync Impact Report
==================
Version change: 0.0.0 → 1.0.0 (Initial constitution)
Added sections:
  - Core Principles (5 principles)
  - Technical Standards
  - Development Workflow
  - Governance
Templates status:
  - .specify/templates/plan-template.md ✅ compatible
  - .specify/templates/spec-template.md ✅ compatible
  - .specify/templates/tasks-template.md ✅ compatible
Follow-up TODOs: None
-->

# Lifestyle App Constitution

## Core Principles

### I. User Privacy First

ユーザーの健康データは最も機密性の高い個人情報である。

- 健康・生活習慣データは必要最小限のみ収集すること
- データはCloudflare D1でサーバーサイドに保存されるが、暗号化とアクセス制御を徹底すること
- 第三者へのデータ共有は明示的な同意なしに行わないこと
- ユーザーはいつでも自分のデータを完全に削除できること
- プライバシーポリシーは平易な言葉で説明すること

### II. Simple UX

習慣化には摩擦のない体験が不可欠である。

- 1つのアクションは3タップ以内で完了できること
- 画面は1つの目的に集中し、情報過多を避けること
- オンボーディングは2分以内に完了できること
- エラーメッセージは次のアクションを明示すること
- 視覚的フィードバックで達成感を演出すること

### III. Test-Driven Development (TDD)

品質は後付けではなく、設計に組み込む。

- テストを先に書き、失敗を確認してから実装すること
- Red → Green → Refactorサイクルを厳守すること
- カバレッジ80%以上を維持すること
- E2Eテストでユーザージャーニーを検証すること

### IV. Type Safety

TypeScriptの型システムを最大限活用する。

- `any`型の使用は禁止（`unknown`で代替）
- APIレスポンスはZodでランタイム検証すること
- 型定義はフロントエンド・バックエンドで共有すること
- strictモードを有効にすること

### V. Simplicity Over Cleverness

シンプルさは機能である。

- YAGNIを徹底し、今必要な機能のみ実装すること
- 抽象化は3回以上の重複が発生してから検討すること
- ライブラリ追加は慎重に判断すること（バンドルサイズへの影響を考慮）
- コードは読みやすさを最優先すること

## Technical Standards

**Language/Runtime**: TypeScript 5.x (strict mode)
**Frontend**: React 18+ with Vite
**Backend**: Hono on Cloudflare Workers
**Database**: Cloudflare D1 (SQLite)
**ORM**: Drizzle ORM
**Validation**: Zod
**Testing**: Vitest + Playwright
**Styling**: Tailwind CSS
**Deployment**: Cloudflare Pages + Workers

## Development Workflow

1. **Feature Branch**: `feature/###-feature-name`形式で作成
2. **Commit Message**: Conventional Commits準拠
3. **Code Review**: マージ前に最低1人のレビュー必須
4. **CI/CD**: 全テスト通過後に自動デプロイ
5. **Documentation**: 公開APIは必ずドキュメント化

## Governance

この憲法はプロジェクトの最上位規範であり、すべての設計判断はこれに準拠すること。

- 憲法の改正には変更理由のドキュメント化と移行計画が必要
- すべてのPR/レビューはこの憲法への準拠を確認すること
- 複雑さの追加には明確な正当化が必要

**Version**: 1.0.0 | **Ratified**: 2025-12-27 | **Last Amended**: 2025-12-27
