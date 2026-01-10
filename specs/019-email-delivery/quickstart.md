# Quickstart: Email Delivery System

**Feature**: 019-email-delivery | **Date**: 2026-01-10

## Overview

このガイドでは、メール配信システムの実装を始めるための基本的な統合シナリオとコード例を提供します。

---

## Prerequisites

1. **Resend API Key**: [Resend Dashboard](https://resend.com/api-keys)でAPIキーを取得
2. **Environment Variables**: `wrangler.toml`または`.dev.vars`に設定

```toml
# wrangler.toml
[vars]
RESEND_API_KEY = "re_xxxxx"
FROM_EMAIL = "noreply@example.com"
FRONTEND_URL = "https://lifestyle-app.example.com"
```

3. **Database Migration**: マイグレーションを実行

```bash
pnpm --filter @lifestyle-app/backend db:migrate:local
```

---

## Quick Integration Examples

### 1. Send Password Reset Email

```typescript
// packages/backend/src/services/email/email.service.ts
import { Resend } from 'resend';
import { generateSecureToken } from '../token/crypto';
import { passwordResetTemplate } from './templates/password-reset';

export async function sendPasswordResetEmail(
  email: string,
  userId: number,
  env: Env
): Promise<void> {
  const resend = new Resend(env.RESEND_API_KEY);

  // 1. トークン生成
  const token = generateSecureToken();
  const expiresAt = Date.now() + 24 * 3600 * 1000; // 24時間

  // 2. DBに保存
  await env.DB.prepare(
    'INSERT INTO password_reset_tokens (user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?)'
  ).bind(userId, token, expiresAt, Date.now()).run();

  // 3. メール送信（リトライ付き）
  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;
  await sendWithRetry(async () => {
    await resend.emails.send({
      from: env.FROM_EMAIL,
      to: email,
      subject: 'パスワードリセット',
      html: passwordResetTemplate(resetUrl, 'ja'),
    });
  });

  // 4. ログ記録
  await env.DB.prepare(
    'INSERT INTO email_delivery_logs (user_id, email_type, recipient_email, status, retry_count, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(userId, 'password_reset', email, 'success', 0, Date.now()).run();
}
```

### 2. Verify Token and Reset Password

```typescript
// packages/backend/src/routes/auth/password-reset.ts
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const confirmSchema = z.object({
  token: z.string().length(32),
  newPassword: z.string().min(8),
});

app.post('/auth/password-reset/confirm', zValidator('json', confirmSchema), async (c) => {
  const { token, newPassword } = c.req.valid('json');
  const now = Date.now();

  // 1. トークン検証
  const tokenRecord = await c.env.DB.prepare(
    'SELECT * FROM password_reset_tokens WHERE token = ? AND expires_at > ? AND used_at IS NULL'
  ).bind(token, now).first();

  if (!tokenRecord) {
    return c.json({ error: 'INVALID_TOKEN', message: 'トークンが無効または期限切れです' }, 400);
  }

  // 2. パスワード更新
  const hashedPassword = await hashPassword(newPassword);
  await c.env.DB.prepare(
    'UPDATE users SET password_hash = ? WHERE id = ?'
  ).bind(hashedPassword, tokenRecord.user_id).run();

  // 3. トークン無効化
  await c.env.DB.prepare(
    'UPDATE password_reset_tokens SET used_at = ? WHERE id = ?'
  ).bind(now, tokenRecord.id).run();

  return c.json({ message: 'パスワードが更新されました' });
});
```

### 3. Generate Secure Token

```typescript
// packages/backend/src/services/token/crypto.ts
export function generateSecureToken(): string {
  const array = new Uint8Array(24); // 24 bytes = 192 bits
  crypto.getRandomValues(array);

  // Base64url encoding
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
```

### 4. Exponential Backoff Retry

```typescript
// packages/backend/src/services/email/retry.ts
export async function sendWithRetry(
  sendFn: () => Promise<void>,
  maxRetries = 3
): Promise<void> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await sendFn();
      return; // 成功
    } catch (error) {
      if (attempt === maxRetries - 1) {
        // 最終リトライ失敗 → notify.sh通知
        throw error;
      }
      const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

### 5. Rate Limiting Check

```typescript
// packages/backend/src/services/rate-limit/email-rate-limit.ts
export async function checkEmailRateLimit(ip: string, env: Env): Promise<void> {
  const now = Date.now();
  const expiresAt = now + 3600 * 1000; // 1時間後

  // 1. 現在のカウントチェック
  const result = await env.DB.prepare(
    'SELECT count FROM email_rate_limits WHERE ip = ? AND expires_at > ?'
  ).bind(ip, now).first<{ count: number }>();

  if (result && result.count >= 10) {
    throw new Error('RATE_LIMIT_EXCEEDED');
  }

  // 2. カウント増加（UPSERT）
  await env.DB.prepare(`
    INSERT INTO email_rate_limits (ip, count, expires_at)
    VALUES (?, 1, ?)
    ON CONFLICT(ip) DO UPDATE SET
      count = count + 1,
      expires_at = CASE
        WHEN expires_at < ? THEN ?
        ELSE expires_at
      END
  `).bind(ip, expiresAt, now, expiresAt).run();
}
```

### 6. HTML Email Template

```typescript
// packages/backend/src/services/email/templates/password-reset.ts
type EmailLocale = 'ja' | 'en';

const messages = {
  ja: {
    subject: 'パスワードリセット',
    title: 'パスワードをリセット',
    body: '以下のボタンをクリックして、新しいパスワードを設定してください。',
    button: 'パスワードをリセット',
    expire: 'このリンクは24時間有効です。',
  },
  en: {
    subject: 'Password Reset',
    title: 'Reset Your Password',
    body: 'Click the button below to set a new password.',
    button: 'Reset Password',
    expire: 'This link is valid for 24 hours.',
  },
};

export function passwordResetTemplate(resetUrl: string, locale: EmailLocale): string {
  const msg = messages[locale];
  return `
    <!DOCTYPE html>
    <html lang="${locale}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${msg.subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
      <div style="background: white; border-radius: 8px; padding: 32px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h1 style="color: #333; margin: 0 0 24px 0; font-size: 24px;">${msg.title}</h1>
        <p style="color: #666; margin: 0 0 24px 0; line-height: 1.6;">${msg.body}</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 32px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; font-weight: 500;">${msg.button}</a>
        <p style="color: #999; margin: 24px 0 0 0; font-size: 14px;">${msg.expire}</p>
      </div>
    </body>
    </html>
  `;
}
```

### 7. Frontend: Request Password Reset

```typescript
// packages/frontend/src/services/auth.ts
import { client } from '../lib/client';

export async function requestPasswordReset(email: string): Promise<void> {
  const response = await client.api.auth['password-reset'].request.$post({
    json: { email },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  // 成功メッセージ表示（メールアドレスの存在を漏らさない）
  alert('パスワードリセットメールを送信しました。メールをご確認ください。');
}
```

### 8. Frontend: Confirm Password Reset

```typescript
// packages/frontend/src/pages/ResetPassword.tsx
import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { client } from '../lib/client';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [newPassword, setNewPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      alert('無効なリンクです');
      return;
    }

    try {
      const response = await client.api.auth['password-reset'].confirm.$post({
        json: { token, newPassword },
      });

      if (response.ok) {
        alert('パスワードが更新されました');
        navigate('/login');
      } else {
        const error = await response.json();
        alert(error.message);
      }
    } catch (error) {
      alert('エラーが発生しました');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h1>パスワードをリセット</h1>
      <input
        type="password"
        placeholder="新しいパスワード"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        minLength={8}
        required
      />
      <button type="submit">更新</button>
    </form>
  );
}
```

---

## Cron Setup: Unverified Account Cleanup

```toml
# wrangler.toml
[triggers]
crons = ["0 2 * * *"] # 毎日02:00 UTC
```

```typescript
// packages/backend/src/index.ts
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const sevenDaysAgo = Date.now() - 7 * 24 * 3600 * 1000;

    // 未確認アカウント削除
    await env.DB.prepare(
      'DELETE FROM users WHERE email_verified = 0 AND created_at < ?'
    ).bind(sevenDaysAgo).run();

    // 期限切れトークン削除
    const now = Date.now();
    await env.DB.prepare(
      'DELETE FROM password_reset_tokens WHERE expires_at < ?'
    ).bind(now - 7 * 24 * 3600 * 1000).run();

    await env.DB.prepare(
      'DELETE FROM email_verification_tokens WHERE expires_at < ?'
    ).bind(now - 7 * 24 * 3600 * 1000).run();
  },
};
```

---

## Testing Scenarios

### Unit Test: Token Generation

```typescript
// tests/unit/services/token.service.test.ts
import { describe, it, expect } from 'vitest';
import { generateSecureToken } from '@lifestyle-app/backend/services/token/crypto';

describe('Token Generation', () => {
  it('should generate 32-character base64url token', () => {
    const token = generateSecureToken();
    expect(token).toHaveLength(32);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/); // base64url文字のみ
  });

  it('should generate unique tokens', () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateSecureToken()));
    expect(tokens.size).toBe(100); // すべてユニーク
  });
});
```

### Integration Test: Password Reset Flow

```typescript
// tests/integration/routes/auth/password-reset.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { testClient } from '../../helpers';

describe('Password Reset Flow', () => {
  beforeEach(async () => {
    // テストユーザー作成
    await testClient.createUser({ email: 'test@example.com', password: 'old1234' });
  });

  it('should reset password successfully', async () => {
    // 1. リセット要求
    const reqRes = await testClient.post('/api/auth/password-reset/request', {
      json: { email: 'test@example.com' },
    });
    expect(reqRes.status).toBe(200);

    // 2. トークン取得（DB直接アクセス）
    const tokenRecord = await testClient.db.getPasswordResetToken('test@example.com');
    expect(tokenRecord).toBeDefined();

    // 3. パスワード更新
    const confirmRes = await testClient.post('/api/auth/password-reset/confirm', {
      json: { token: tokenRecord.token, newPassword: 'new5678' },
    });
    expect(confirmRes.status).toBe(200);

    // 4. 新パスワードでログイン
    const loginRes = await testClient.post('/api/auth/login', {
      json: { email: 'test@example.com', password: 'new5678' },
    });
    expect(loginRes.status).toBe(200);
  });

  it('should reject expired token', async () => {
    // トークン作成（期限切れ）
    const token = await testClient.db.createExpiredPasswordResetToken('test@example.com');

    const res = await testClient.post('/api/auth/password-reset/confirm', {
      json: { token, newPassword: 'new5678' },
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'INVALID_TOKEN' });
  });
});
```

---

## API Reference

詳細なAPI仕様は [contracts/email-api.yaml](./contracts/email-api.yaml) を参照してください。

### Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/password-reset/request` | POST | No | パスワードリセット要求 |
| `/api/auth/password-reset/confirm` | POST | No | パスワードリセット確認 |
| `/api/auth/register` | POST | No | 新規ユーザー登録（確認メール送信） |
| `/api/email/verify` | POST | No | メールアドレス確認 |
| `/api/email/verify/resend` | POST | Yes | 確認メール再送 |
| `/api/email/change/request` | POST | Yes | メールアドレス変更要求 |
| `/api/email/change/confirm` | POST | No | メールアドレス変更確認 |
| `/api/email/change/cancel` | POST | No | メールアドレス変更キャンセル |

---

## Common Pitfalls

1. **トークンの衝突**: UNIQUE制約でDB側で防止されるが、生成時に十分なエントロピー（24バイト）を確保
2. **有効期限チェック漏れ**: 必ず`expires_at > now()`をクエリに含める
3. **使用済みトークンの再利用**: `used_at IS NULL`条件を忘れずに
4. **レート制限の期限切れレコード**: 定期的に`expires_at < now()`レコードを削除（Cron or 挿入時）
5. **メールアドレス列挙攻撃**: パスワードリセット時、存在しないメールアドレスでも成功メッセージを返す
6. **リトライ無限ループ**: 必ず最大リトライ回数を設定（デフォルト3回）

---

## Next Steps

1. **実装開始**: [tasks.md](./tasks.md)（`/speckit.tasks`で生成）のタスクリストに従って実装
2. **テスト作成**: 各APIエンドポイントの統合テストを優先的に作成
3. **E2Eテスト**: Playwrightでパスワードリセット完全フローをテスト
4. **本番デプロイ前**: Resend APIキーとドメイン認証を設定

---

## References

- [Resend Documentation](https://resend.com/docs)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [OWASP Password Reset Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
