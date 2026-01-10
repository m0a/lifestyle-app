# Research: Email Delivery System

**Date**: 2026-01-10
**Feature**: 019-email-delivery
**Phase**: 0 - Technical Research

## Overview

メール配信システムの実装に必要な技術調査。Resend API統合、セキュアトークン生成、リトライメカニズム、レート制限、HTMLテンプレート、Cron Triggers、notify.sh統合について調査し、実装方針を決定。

---

## 1. Resend SDK on Cloudflare Workers

### Decision
**Resend SDK (@resend/sdk)** を使用し、Cloudflare Workers環境で動作させる。

### Rationale
- Resend公式SDKはfetch API基盤で、Cloudflare Workers環境と完全互換
- シンプルなAPI（`resend.emails.send()`）で、認証・リトライ・エラーハンドリング内包
- TypeScript型定義完備、厳密な型安全性
- SMTP自前実装（数百行）に比べて圧倒的にシンプル

### Implementation Approach
```typescript
import { Resend } from 'resend';

const resend = new Resend(env.RESEND_API_KEY);

await resend.emails.send({
  from: 'noreply@example.com',
  to: user.email,
  subject: 'パスワードリセット',
  html: emailTemplate,
});
```

### Alternatives Considered
- **SMTP直接実装**: Nodemailer等のライブラリはNode.js TCP API依存でWorkers非互換。自前実装は複雑すぎる
- **SendGrid/Mailgun**: Resendより複雑な認証、Workers互換性が低い、コスト高

### References
- Resend Docs: https://resend.com/docs/send-with-nodejs
- Cloudflare Workers compatibility: https://developers.cloudflare.com/workers/runtime-apis/web-standards/

---

## 2. Secure Token Generation (32-char, 256-bit)

### Decision
**Web Crypto API** (`crypto.getRandomValues()`) を使用し、base64url形式で32文字トークン生成。

### Rationale
- Cloudflare Workers環境でWeb Crypto APIが標準サポート
- `crypto.randomBytes()` (Node.js API) は非互換
- base64url形式で32文字 = 192bit（256bitには24文字で足りるが、32文字でより安全）
- URLセーフ（`+`, `/`, `=`なし）でメールリンクに最適

### Implementation Approach
```typescript
function generateSecureToken(): string {
  const array = new Uint8Array(24); // 24 bytes = 192 bits
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, ''); // 32文字のbase64url
}
```

### Alternatives Considered
- **crypto.randomUUID()**: 128bitで不十分（仕様は256bit要求）
- **crypto.randomBytes()**: Node.js APIでWorkers非互換
- **Math.random()**: 暗号学的に安全でない

### References
- Web Crypto API: https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues
- Base64url encoding: https://datatracker.ietf.org/doc/html/rfc4648#section-5

---

## 3. Exponential Backoff Retry (1s, 2s, 4s)

### Decision
シンプルな**Promise chain + setTimeout** でリトライ実装。Durable Objects不使用。

### Rationale
- Cloudflare Workers環境で標準的なpromise/async-await完全サポート
- 指数バックオフはシンプルなループ+delay関数で実装可能
- Durable Objectsは過剰（永続化不要、Workers内で完結）
- リトライ完了まで最大7秒（1+2+4）、Workers実行時間制限（30秒）内で十分

### Implementation Approach
```typescript
async function sendWithRetry(
  sendFn: () => Promise<void>,
  maxRetries = 3
): Promise<void> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await sendFn();
      return; // 成功
    } catch (error) {
      if (attempt === maxRetries - 1) throw error; // 最終試行失敗
      const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

### Alternatives Considered
- **Durable Objects**: 永続化不要、複雑すぎる
- **外部キュー（Bull, SQS）**: インフラ追加、過剰
- **固定間隔リトライ**: 一時的障害に効果的でない

### References
- Cloudflare Workers execution time: https://developers.cloudflare.com/workers/platform/limits/#worker-limits
- Exponential backoff pattern: https://cloud.google.com/iot/docs/how-tos/exponential-backoff

---

## 4. Rate Limiting (10 req/hour/IP)

### Decision
**D1テーブル** (`email_rate_limits`) でIP別リクエストカウント管理。TTL 1時間。

### Rationale
- Cloudflare Workers KV Namespaceはリスト操作（カウント）に不向き
- D1 (SQLite) でシンプルなUPSERT + 期限チェッククエリ
- Workers Analyticsは集計専用、リアルタイムレート制限には不向き
- IPアドレスは`request.headers.get('CF-Connecting-IP')`で取得（Cloudflare提供）

### Implementation Approach
```typescript
// D1テーブル: email_rate_limits(ip, count, expires_at)
const ip = request.headers.get('CF-Connecting-IP');
const now = Date.now();
const expiresAt = now + 3600 * 1000; // 1時間後

const result = await db
  .prepare('SELECT count FROM email_rate_limits WHERE ip = ? AND expires_at > ?')
  .bind(ip, now)
  .first();

if (result && result.count >= 10) {
  throw new Error('Rate limit exceeded');
}

await db
  .prepare('INSERT OR REPLACE INTO email_rate_limits (ip, count, expires_at) VALUES (?, COALESCE((SELECT count FROM email_rate_limits WHERE ip = ?), 0) + 1, ?)')
  .bind(ip, ip, expiresAt)
  .run();
```

### Alternatives Considered
- **Workers KV**: リスト操作非効率、強整合性なし
- **Workers Analytics**: リアルタイム不可
- **外部Redis**: インフラ追加、複雑

### References
- Cloudflare Workers request headers: https://developers.cloudflare.com/workers/runtime-apis/request/#incomingrequestcfproperties
- D1 UPSERT pattern: https://www.sqlite.org/lang_UPSERT.html

---

## 5. HTML Email Templates (Multi-language, Mobile-friendly)

### Decision
**最小限のHTML文字列テンプレート関数** を実装。React Email等の重厚なツール不使用。

### Rationale
- 要件はシンプル（トークンリンク、ブランディング、多言語対応）
- React Email等はビルドプロセス追加、バンドルサイズ増
- HTML文字列テンプレートリテラルで十分（TypeScript tagged template）
- インラインCSS使用（メールクライアント互換性）

### Implementation Approach
```typescript
type EmailLocale = 'ja' | 'en';

const messages = {
  ja: { subject: 'パスワードリセット', button: 'パスワードをリセット' },
  en: { subject: 'Password Reset', button: 'Reset Password' },
};

function passwordResetTemplate(token: string, locale: EmailLocale): string {
  const msg = messages[locale];
  return `
    <!DOCTYPE html>
    <html lang="${locale}">
    <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h1>${msg.subject}</h1>
      <p>以下のリンクをクリックしてパスワードをリセットしてください：</p>
      <a href="https://example.com/reset?token=${token}"
         style="display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none;">
        ${msg.button}
      </a>
    </body>
    </html>
  `;
}
```

### Alternatives Considered
- **React Email**: ビルド複雑化、バンドルサイズ増
- **Handlebars/Mustache**: 依存追加、過剰
- **プレーンテキスト**: 要件（視覚的整形）違反

### References
- Email HTML best practices: https://www.campaignmonitor.com/dev-resources/guides/coding-html-emails/
- Inline CSS for email: https://www.litmus.com/blog/do-email-marketers-and-designers-still-need-to-inline-css

---

## 6. Cloudflare Cron Triggers (Unverified Account Cleanup)

### Decision
**Cloudflare Workers Cron Triggers** で毎日1回実行。`wrangler.toml`に設定。

### Rationale
- Cloudflare Workers標準機能、追加コストなし
- Cron構文（UNIX cron互換）でスケジュール簡単
- Worker関数に`scheduled`イベントハンドラ追加するだけ

### Implementation Approach
```toml
# wrangler.toml
[triggers]
crons = ["0 2 * * *"] # 毎日02:00 UTC
```

```typescript
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const sevenDaysAgo = Date.now() - 7 * 24 * 3600 * 1000;
    await env.DB.prepare(
      'DELETE FROM users WHERE email_verified = 0 AND created_at < ?'
    ).bind(sevenDaysAgo).run();
  },
};
```

### Alternatives Considered
- **外部Cron（GitHub Actions, cron-job.org）**: HTTP呼び出し必要、セキュリティリスク
- **手動実行**: 運用負荷、忘れるリスク

### References
- Cloudflare Workers Cron Triggers: https://developers.cloudflare.com/workers/configuration/cron-triggers/

---

## 7. notify.sh Integration (Admin Notification)

### Decision
**Bash script実行** (`notify.sh`) via Cloudflare Workers **KV + webhook**。Workers内でnotify.shを直接呼び出せないため、KVにエラーログ書き込み、外部監視プロセスが定期取得してnotify.sh実行。

### Rationale
- Cloudflare WorkersはBash実行不可（サンドボックス環境）
- KVにエラーイベント書き込み → 外部プロセス（GitHub Actions, cron）が定期チェック → notify.sh実行
- または、notify.shをHTTP webhookに変換（簡易API化）してWorkers from fetch

### Implementation Approach (Option 1: KV + External Process)
```typescript
// Workers: KVにエラー書き込み
await env.ERROR_LOG_KV.put(
  `email-error-${Date.now()}`,
  JSON.stringify({ type: 'email_send_failed', email: user.email }),
  { expirationTtl: 86400 } // 24時間保持
);
```

External cron (GitHub Actions):
```bash
# .github/workflows/notify-email-errors.yml
- run: |
    wrangler kv:key list --binding ERROR_LOG_KV | jq -r '.[].name' | while read key; do
      wrangler kv:key get --binding ERROR_LOG_KV "$key" | ./notify.sh
      wrangler kv:key delete --binding ERROR_LOG_KV "$key"
    done
```

### Implementation Approach (Option 2: notify.sh as HTTP Webhook)
```typescript
// notify.shをHTTP API化（簡易Flask/Express）
await fetch('https://notify-api.example.com/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'Email send failed', details: error }),
});
```

### Alternatives Considered
- **Durable Objects**: 過剰、通知のみに不要
- **Cloudflare Email Routing**: 受信専用、送信不可
- **直接Bash実行**: Workers環境で不可能

### References
- Cloudflare Workers KV: https://developers.cloudflare.com/kv/
- GitHub Actions scheduled workflow: https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule

---

## Summary

| 技術領域 | 選択技術 | 理由 |
|---------|---------|------|
| メール送信 | Resend SDK | Workers互換、シンプル、高信頼性 |
| トークン生成 | Web Crypto API (base64url) | 256bit安全性、URLセーフ |
| リトライ | Promise chain + setTimeout | シンプル、Durable Objects不要 |
| レート制限 | D1テーブル + UPSERT | リアルタイム、KVよりシンプル |
| HTMLテンプレート | 文字列テンプレート関数 | React Email不要、最小限 |
| Cron | Cloudflare Cron Triggers | 標準機能、追加コストなし |
| notify.sh | KV + 外部cron or HTTP API化 | Workers Bash不可、代替方法 |

**Phase 0完了**: すべての技術的未知事項を解決。Phase 1（data-model.md, contracts/）に進む準備完了。
