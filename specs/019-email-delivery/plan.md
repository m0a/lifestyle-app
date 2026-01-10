# Implementation Plan: Email Delivery System

**Branch**: `019-email-delivery` | **Date**: 2026-01-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/019-email-delivery/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

メール配信システムの実装。パスワードリセット、メールアドレス確認、メールアドレス変更確認の3つのユースケースに対応。Resend APIを使用した信頼性の高いメール送信、セキュアなトークン管理（32文字/256bit）、リトライメカニズム（指数バックオフ）、レート制限、未確認アカウント自動削除を含む。既存のmonorepo構造（packages/shared, backend, frontend）に統合し、Cloudflare Workers + D1で実装。

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Hono (backend), React 18+ (frontend), Drizzle ORM, Zod, TanStack Query, Tailwind CSS, Resend (email API), crypto (token generation)
**Storage**: Cloudflare D1 (SQLite) for tokens/logs, R2 (if email attachments needed in future)
**Testing**: Vitest (unit/integration), Playwright (E2E)
**Target Platform**: Cloudflare Workers (backend), modern browsers (frontend PWA)
**Project Type**: Web application (pnpm monorepo: packages/shared, backend, frontend)
**Performance Goals**: メール配信遅延90%のケースで30秒以内、送信成功率99%以上、パスワードリセット完了5分以内
**Constraints**: レート制限10req/hour/IP、トークン有効期限24-48時間、リトライ最大3回（指数バックオフ）、未確認アカウント7日間保持
**Scale/Scope**: 既存ユーザーベース対応、新規登録フロー統合、3つのメールタイプ（パスワードリセット、確認、変更）、多言語対応（日本語/英語）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. User Privacy First ✅
- トークンは32文字/256bitでセキュア生成（推測不可能）
- メール内容は最小限（トークン付きリンクのみ）
- 未確認アカウント7日間自動削除（個人情報の長期保持回避）
- パスワードリセットでメールアドレスの存在を漏らさない

### II. Simple UX ✅
- エラーメッセージ明確（「メール送信に失敗しました」）
- 手動リトライボタン提供（ユーザーコントロール）
- 確認メール再送機能あり（3回/日まで）
- メール有効期限明示（24-48時間）

### III. Test-Driven Development ✅
- Vitestでサービスレイヤーのユニットテスト（トークン生成、検証ロジック）
- PlaywrightでE2Eフロー検証（パスワードリセット完全フロー、メール確認フロー）
- カバレッジ80%以上維持
- メール送信モック/スタブ戦略必要（resend SDKのモック）

### IV. Type Safety ✅
- Zodスキーマでトークン、メールペイロード検証
- shared packageでトークン型定義共有
- strict mode有効（既存プロジェクト準拠）
- `any`型使用なし

### V. Simplicity Over Cleverness ✅ (要正当化)
- **新規依存: Resend追加** → SMTP自前実装回避、シンプル化（後述Complexity Tracking参照）
- メールテンプレートは最小限HTML（React Emailなど使わず）
- リトライロジックはシンプルな指数バックオフ
- トークン管理は既存D1テーブルで完結

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
packages/shared/
├── src/
│   ├── schemas/
│   │   ├── email.ts           # メールペイロードZodスキーマ (新規)
│   │   └── token.ts           # トークンZodスキーマ (新規)
│   └── types/
│       ├── email.ts           # メール型定義 (新規)
│       └── token.ts           # トークン型定義 (新規)

packages/backend/
├── src/
│   ├── services/
│   │   ├── email/
│   │   │   ├── email.service.ts      # メール送信サービス (新規)
│   │   │   ├── templates/            # HTMLテンプレート (新規)
│   │   │   │   ├── password-reset.ts
│   │   │   │   ├── email-verification.ts
│   │   │   │   └── email-change.ts
│   │   │   └── retry.ts              # リトライロジック (新規)
│   │   ├── token/
│   │   │   ├── token.service.ts      # トークン生成・検証 (新規)
│   │   │   └── crypto.ts             # セキュア乱数生成 (新規)
│   │   └── rate-limit/
│   │       └── email-rate-limit.ts   # レート制限 (新規)
│   ├── routes/
│   │   ├── auth/
│   │   │   ├── password-reset.ts     # パスワードリセットAPI (拡張)
│   │   │   └── register.ts           # 登録API (拡張: メール確認)
│   │   └── email/
│   │       ├── verify.ts             # メール確認API (新規)
│   │       └── change.ts             # メール変更API (新規)
│   └── cron/
│       └── cleanup-unverified.ts     # 未確認アカウント削除 (新規)
├── migrations/
│   ├── 0020_email_tokens.sql         # トークンテーブル (新規)
│   ├── 0021_email_logs.sql           # メール送信ログテーブル (新規)
│   └── 0022_user_email_verified.sql  # users.email_verified列追加 (新規)

packages/frontend/
├── src/
│   ├── pages/
│   │   ├── ResetPassword.tsx         # パスワードリセット画面 (新規)
│   │   ├── VerifyEmail.tsx           # メール確認画面 (新規)
│   │   └── ChangeEmail.tsx           # メール変更画面 (新規)
│   ├── components/
│   │   └── auth/
│   │       ├── ForgotPasswordLink.tsx    # 「パスワードを忘れた」リンク (新規)
│   │       ├── ResendEmailButton.tsx     # 確認メール再送ボタン (新規)
│   │       └── EmailVerificationBanner.tsx # 未確認警告バナー (新規)
│   └── services/
│       └── auth.ts                   # 認証API呼び出し (拡張)

tests/
├── unit/
│   ├── services/
│   │   ├── email.service.test.ts     # メール送信ユニットテスト (新規)
│   │   ├── token.service.test.ts     # トークンユニットテスト (新規)
│   │   └── email-rate-limit.test.ts  # レート制限テスト (新規)
│   └── routes/
│       └── auth/
│           ├── password-reset.test.ts    # リセットAPI統合テスト (新規)
│           └── email-verify.test.ts      # 確認API統合テスト (新規)
└── e2e/
    ├── password-reset.spec.ts        # パスワードリセットE2E (新規)
    ├── email-verification.spec.ts    # メール確認E2E (新規)
    └── email-change.spec.ts          # メール変更E2E (新規)
```

**Structure Decision**: 既存のpnpm monorepo構造を活用。shared packageで型・スキーマ共有、backendでビジネスロジック・API、frontendでUIを分離。既存のCloudflare Workers環境に統合し、D1でトークン・ログ管理。新規ファイルは既存のディレクトリ構造に沿って配置。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| 新規依存: Resend SDK追加 | SMTP経由のメール送信は複雑（認証、コネクション管理、エラーハンドリング、IP評価対策）。Resendは簡潔なAPI、高い送信成功率、Cloudflare Workers互換性が高い | 自前SMTP実装は数百行のボイラープレート、メールサーバー維持コスト、スパム認定リスク。Nodemailer等のSMTP libraryもWorkers環境で制限あり（TCP接続、Node.js API依存） |
| HTMLメールテンプレート | ブランド化されたメール送信が要件（FR-006）。テキストメールだけでは視覚的整形不可 | テキストのみは要件違反。React Emailなどの重厚なツールは不要、最小限のHTML文字列テンプレートで十分 |
