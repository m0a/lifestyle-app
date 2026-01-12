/**
 * Email change routes
 *
 * Endpoints:
 * - POST /email/change/request - Request email change (requires auth)
 * - POST /email/change/confirm - Confirm email change with token
 * - POST /email/change/cancel - Cancel email change with token
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import {
  requestEmailChange,
  confirmEmailChange,
  cancelEmailChange,
} from '../../services/email/email-change.service';
import { authMiddleware } from '../../middleware/auth';

type Bindings = {
  DB: D1Database;
  RESEND_API_KEY: string;
  FROM_EMAIL: string;
  FRONTEND_URL: string;
};

type Variables = {
  user: { id: string; email: string };
};

/**
 * Request email change schema
 */
const requestEmailChangeSchema = z.object({
  newEmail: z.string().email('有効なメールアドレスを入力してください'),
});

/**
 * Email change token schema
 */
const emailChangeTokenSchema = z.object({
  token: z.string().min(32, 'トークンが無効です').max(32, 'トークンが無効です'),
});

// Chain format for RPC type inference
export const emailChange = new Hono<{ Bindings: Bindings; Variables: Variables }>()
/**
 * POST /email/change/request
 *
 * Request email address change (requires authentication)
 */
.post('/change/request', authMiddleware, zValidator('json', requestEmailChangeSchema), async (c) => {
  const authUser = c.get('user');
  const { newEmail } = c.req.valid('json');

  // Check if new email is same as current
  if (newEmail === authUser.email) {
    return c.json({ error: '現在のメールアドレスと同じです' }, 400);
  }

  const result = await requestEmailChange(
    c.env.DB,
    authUser.id,
    authUser.email,
    newEmail,
    c.env.RESEND_API_KEY,
    c.env.FROM_EMAIL,
    c.env.FRONTEND_URL
  );

  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  return c.json({
    message: '確認メールを送信しました。新しいメールアドレスと現在のメールアドレスの両方をご確認ください。',
  });
})
/**
 * POST /email/change/confirm
 *
 * Confirm email change with token
 */
.post('/change/confirm', zValidator('json', emailChangeTokenSchema), async (c) => {
  const { token } = c.req.valid('json');

  const result = await confirmEmailChange(c.env.DB, token);

  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  return c.json({
    message: 'メールアドレスを変更しました',
    userId: result.userId,
    newEmail: result.newEmail,
  });
})
/**
 * POST /email/change/cancel
 *
 * Cancel email change with token
 */
.post('/change/cancel', zValidator('json', emailChangeTokenSchema), async (c) => {
  const { token } = c.req.valid('json');

  const result = await cancelEmailChange(c.env.DB, token);

  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  return c.json({
    message: 'メールアドレス変更をキャンセルしました',
  });
});
