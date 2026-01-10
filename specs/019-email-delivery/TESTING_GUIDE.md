# Email Delivery System - テスト手順書

**Feature**: 019-email-delivery
**Date**: 2026-01-10
**Status**: 実装完了 - 最終テスト中

## 📋 事前準備

### 環境設定の確認

1. ✅ **Resend API設定済み**
   - APIキー: `re_6zBqmXmm_ApxJEDT4w6np3eW1a9rJSnoPY`
   - 送信元: `onboarding@resend.dev`（テストアドレス）

2. **開発サーバー起動**
   ```bash
   # ターミナル1
   pnpm dev:backend  # http://localhost:8787

   # ターミナル2
   pnpm dev          # http://localhost:5173
   ```

3. **メール受信テスト用アドレス**
   - Gmail、Outlook、Yahoo等の実際のメールアドレスを用意
   - 迷惑メールフォルダも確認できるようにしておく

---

## 🧪 テストフロー1: パスワードリセット (User Story 1)

### 目的
既存ユーザーがパスワードを忘れた場合の復旧フロー

### 手順

1. **パスワードリセット申請**
   - http://localhost:5173/login にアクセス
   - 「パスワードを忘れた方はこちら」リンクをクリック
   - `/forgot-password` ページに遷移
   - 登録済みメールアドレスを入力して送信

2. **確認ポイント①: フロントエンド**
   - ✅ 成功メッセージ表示: 「パスワードリセットメールを送信しました」
   - ✅ エラーハンドリング: 未登録メールでもセキュリティのため同じメッセージ表示

3. **確認ポイント②: バックエンドログ**
   ```bash
   # ターミナル1で確認
   [Email] Sending password reset email to: your-email@example.com
   [Email] Password reset email sent successfully
   ```

4. **確認ポイント③: メール受信**
   - ✅ 件名: 「パスワードのリセット」
   - ✅ 送信元: `onboarding@resend.dev`
   - ✅ 本文にリセットリンク: `http://localhost:5173/reset-password?token=...`
   - ✅ 有効期限の記載: 1時間以内

5. **パスワードリセット実行**
   - メール内のリンクをクリック
   - `/reset-password?token=xxxxx` ページに遷移
   - 新しいパスワードを2回入力（確認のため）
   - 送信ボタンをクリック

6. **確認ポイント④: リセット成功**
   - ✅ 成功メッセージ表示: 「パスワードをリセットしました」
   - ✅ 3秒後に `/login` へ自動リダイレクト
   - ✅ 新しいパスワードでログイン成功

### エラーケースのテスト

- **期限切れトークン**: リセット申請から1時間後にリンクをクリック → エラーメッセージ表示
- **無効なトークン**: URLのtoken部分を改変 → エラーメッセージ表示
- **トークン再利用**: 同じリンクを2回使用 → 2回目はエラー

---

## 🧪 テストフロー2: 新規登録時のメール確認 (User Story 2)

### 目的
新規ユーザー登録時のメールアドレス所有権確認

### 手順

1. **新規ユーザー登録**
   - http://localhost:5173/register にアクセス
   - メールアドレス、パスワード、目標体重・カロリーを入力
   - 「登録」ボタンをクリック

2. **確認ポイント①: 登録成功**
   - ✅ 成功メッセージ表示: 「登録しました。確認メールをご確認ください。」
   - ✅ `/login` ページへリダイレクト
   - ✅ 黄色の警告メッセージ: 「メールアドレスを確認してください」

3. **確認ポイント②: バックエンドログ**
   ```bash
   [Email] Sending email verification to: new-user@example.com
   [Email] Verification email sent successfully
   ```

4. **確認ポイント③: メール受信**
   - ✅ 件名: 「メールアドレスの確認」
   - ✅ 送信元: `onboarding@resend.dev`
   - ✅ 本文に確認リンク: `http://localhost:5173/verify-email?token=...`
   - ✅ 有効期限の記載: 24時間以内

5. **ログイン試行（未確認状態）**
   - 登録したメールアドレスとパスワードでログイン試行
   - ✅ エラーメッセージ表示: 「メールアドレスを確認してください。確認メールのリンクをクリックしてアカウントを有効化してください。」
   - ✅ エラーコード: `EMAIL_NOT_VERIFIED`
   - ✅ 黄色の警告バナー表示
   - ✅ 「確認メールを再送信」ボタン表示

6. **メールアドレス確認**
   - メール内のリンクをクリック
   - `/verify-email?token=xxxxx` ページに遷移
   - ✅ 自動的に確認処理実行（useEffectで自動実行）
   - ✅ 成功メッセージ表示: 「メールアドレスを確認しました！」
   - ✅ 3秒後に `/login` へ自動リダイレクト

7. **ログイン成功**
   - 確認済みのアカウントでログイン
   - ✅ ログイン成功、ダッシュボードへ遷移
   - ✅ 警告バナーなし

### エラーケースのテスト

- **確認メール再送信**: 未確認状態で「確認メールを再送信」ボタンをクリック → 新しいメール受信
- **期限切れトークン**: 登録から24時間後にリンクをクリック → エラーメッセージ表示
- **無効なトークン**: URLのtoken部分を改変 → エラーメッセージ表示

---

## 🧪 テストフロー3: メールアドレス変更 (User Story 3)

### 目的
既存ユーザーが安全にメールアドレスを変更できる

### 手順

1. **メール変更申請**
   - ログイン済みの状態で http://localhost:5173/settings にアクセス
   - 「メールアドレス変更」セクションに移動
   - 新しいメールアドレスを入力
   - 「変更する」ボタンをクリック

2. **確認ポイント①: フロントエンド**
   - ✅ 成功メッセージ表示: 「確認メールを送信しました。新しいメールアドレスと現在のメールアドレスをご確認ください。」

3. **確認ポイント②: バックエンドログ**
   ```bash
   [Email] Sending email change confirmation to: new-email@example.com
   [Email] Email change confirmation sent successfully
   [Email] Sending email change notification to: old-email@example.com
   [Email] Email change notification sent successfully
   ```

4. **確認ポイント③: 新メールアドレス宛（確認メール）**
   - ✅ 件名: 「メールアドレス変更の確認」
   - ✅ 送信元: `onboarding@resend.dev`
   - ✅ 本文に確認リンク: `http://localhost:5173/confirm-email-change?token=...`
   - ✅ 有効期限の記載: 24時間以内

5. **確認ポイント④: 旧メールアドレス宛（通知メール）**
   - ✅ 件名: 「メールアドレス変更のお知らせ」
   - ✅ 送信元: `onboarding@resend.dev`
   - ✅ 本文にキャンセルリンク: `http://localhost:5173/cancel-email-change?token=...`
   - ✅ 警告文: 「心当たりがない場合は、すぐにキャンセルしてください」

6. **メールアドレス変更確認（成功パターン）**
   - 新メールアドレスに届いた確認リンクをクリック
   - `/confirm-email-change?token=xxxxx` ページに遷移
   - ✅ 自動的に確認処理実行
   - ✅ 成功メッセージ表示: 「メールアドレスを変更しました！」
   - ✅ 「セキュリティのため、再度ログインしてください」のメッセージ
   - ✅ 3秒後に `/login` へ自動リダイレクト
   - ✅ セッションがクリアされている（ログアウト状態）

7. **新メールアドレスでログイン**
   - 新しいメールアドレスと既存のパスワードでログイン
   - ✅ ログイン成功

8. **メールアドレス変更キャンセル（キャンセルパターン）**
   - 旧メールアドレスに届いたキャンセルリンクをクリック
   - `/cancel-email-change?token=xxxxx` ページに遷移
   - ✅ 自動的にキャンセル処理実行
   - ✅ 成功メッセージ表示: 「メールアドレス変更をキャンセルしました」
   - ✅ 3秒後に `/login` へ自動リダイレクト
   - ✅ 旧メールアドレスでログイン成功（変更されていない）

### エラーケースのテスト

- **既存メールと同じ**: 現在と同じメールアドレスを入力 → エラーメッセージ表示
- **既に使用中のメール**: 他のユーザーが使用中のメールアドレスを入力 → エラーメッセージ表示
- **確認後のキャンセル試行**: 確認リンクをクリックした後にキャンセルリンクをクリック → エラーメッセージ表示
- **期限切れトークン**: 申請から24時間後にリンクをクリック → エラーメッセージ表示

---

## 🔍 Cron Job テスト

### 目的
未確認アカウントと期限切れトークンの自動クリーンアップ

### 手順（手動トリガー）

1. **テスト用未確認アカウント作成**
   - 新規登録を行うが、メールアドレスを確認しない
   - データベースで `email_verified = 0` を確認

2. **データベースの日時を手動調整**（本番では7日自動）
   ```sql
   -- 未確認アカウントのcreatedAtを8日前に設定
   UPDATE users
   SET created_at = datetime('now', '-8 days')
   WHERE email_verified = 0 AND email = 'test-cleanup@example.com';
   ```

3. **Cron jobを手動実行**
   ```bash
   # wrangler CLIでscheduledイベントをトリガー
   cd packages/backend
   npx wrangler dev --test-scheduled
   ```

4. **確認ポイント①: バックエンドログ**
   ```bash
   [Cron] Scheduled event triggered at: 2026-01-10T02:00:00.000Z
   [Cron] Deleting unverified user: test-cleanup@example.com
   [Cron] Cleanup completed successfully: {
     unverifiedUsersDeleted: 1,
     expiredPasswordResetTokensDeleted: 5,
     expiredEmailVerificationTokensDeleted: 3,
     expiredEmailChangeRequestsDeleted: 0
   }
   ```

5. **確認ポイント②: データベース**
   - ✅ 未確認アカウントが削除されている
   - ✅ 期限切れトークンが削除されている

---

## 📊 テスト結果チェックリスト

### User Story 1: パスワードリセット
- [ ] パスワードリセット申請 → メール受信
- [ ] リセットリンククリック → パスワード変更画面表示
- [ ] パスワード変更成功 → ログインページへリダイレクト
- [ ] 新パスワードでログイン成功
- [ ] 期限切れトークンでエラー表示
- [ ] 無効なトークンでエラー表示

### User Story 2: メール確認
- [ ] 新規登録 → 確認メール受信
- [ ] 未確認状態でログイン試行 → エラー表示
- [ ] 警告バナー表示
- [ ] 確認メール再送信ボタン動作
- [ ] 確認リンククリック → 自動確認
- [ ] 確認後ログイン成功
- [ ] 警告バナー非表示

### User Story 3: メールアドレス変更
- [ ] メール変更申請 → 2通のメール受信（新・旧）
- [ ] 新メールに確認リンク、旧メールにキャンセルリンク
- [ ] 確認リンククリック → 変更成功
- [ ] セッションクリア → ログアウト
- [ ] 新メールアドレスでログイン成功
- [ ] キャンセルリンククリック → 変更キャンセル
- [ ] 旧メールアドレスでログイン成功（変更されていない）

### Cron Job
- [ ] 未確認アカウント削除（7日経過後）
- [ ] 期限切れトークン削除
- [ ] ログに削除件数が表示される

---

## 🐛 トラブルシューティング

### メールが届かない場合

1. **バックエンドログを確認**
   ```bash
   # ターミナル1でログ確認
   [Email] Sending ... → 送信試行
   [Email] ... sent successfully → 送信成功
   [Email] Failed to send ... → 送信失敗（エラー詳細を確認）
   ```

2. **Resend APIキーを確認**
   ```bash
   cat packages/backend/.dev.vars
   # RESEND_API_KEY が正しいか確認
   ```

3. **迷惑メールフォルダを確認**
   - Gmailの場合: プロモーションタブや迷惑メールフォルダ
   - Outlookの場合: 迷惑メールフォルダ

4. **Resend Dashboardでログ確認**
   - https://resend.com/emails にアクセス
   - 送信履歴とエラーログを確認

### フロントエンドエラーの場合

1. **ブラウザコンソールを確認**
   ```
   F12 → Console タブ
   ```

2. **ネットワークタブでAPI呼び出し確認**
   ```
   F12 → Network タブ → XHR/Fetch
   ```

3. **TanStack Query Devtoolsを確認**
   - ページ下部の「React Query」アイコンをクリック
   - クエリの状態（loading, error, success）を確認

---

## ✅ テスト完了後

すべてのテストが成功したら:

1. **タスクリストを更新**
   ```bash
   # specs/019-email-delivery/tasks.md を確認
   # T090, T091をcompletedにマーク
   ```

2. **GitHub Issueをクローズ**
   ```bash
   gh issue close <issue-number> --comment "テスト完了。すべてのフローが正常に動作することを確認しました。"
   ```

3. **PR #51をレビュー依頼**
   ```bash
   gh pr ready <PR番号>
   gh pr review <PR番号> --approve
   ```

4. **マージとデプロイ**
   - mainブランチにマージ
   - 本番環境デプロイ前にpreview環境でも確認

---

**Happy Testing! 🎉**
