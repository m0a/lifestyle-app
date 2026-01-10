/**
 * Password reset routes
 *
 * Endpoints:
 * - POST /auth/password-reset/request - Request password reset email
 * - POST /auth/password-reset/confirm - Confirm and reset password
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
} from '@lifestyle-app/shared';
import {
  requestPasswordReset,
  confirmPasswordReset,
} from '../../services/auth/password-reset.service';
import { getClientIP } from '../../services/rate-limit/email-rate-limit';

type Bindings = {
  DB: D1Database;
  RESEND_API_KEY: string;
  FROM_EMAIL: string;
  FRONTEND_URL: string;
};

const app = new Hono<{ Bindings: Bindings }>();

/**
 * POST /auth/password-reset/request
 *
 * Request a password reset email
 */
app.post('/request', zValidator('json', passwordResetRequestSchema), async (c) => {
  const { email } = c.req.valid('json');
  const clientIP = getClientIP(c.req.raw.headers);

  const result = await requestPasswordReset(
    c.env.DB,
    email,
    clientIP,
    c.env.RESEND_API_KEY,
    c.env.FROM_EMAIL,
    c.env.FRONTEND_URL
  );

  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  return c.json({
    message:
      'パスワードリセットのメールを送信しました。メールをご確認ください。',
  });
});

/**
 * POST /auth/password-reset/confirm
 *
 * Confirm password reset with token and new password
 */
app.post('/confirm', zValidator('json', passwordResetConfirmSchema), async (c) => {
  const { token, newPassword } = c.req.valid('json');

  const result = await confirmPasswordReset(c.env.DB, token, newPassword);

  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  return c.json({
    message: 'パスワードを正常にリセットしました。新しいパスワードでログインできます。',
  });
});

export default app;
