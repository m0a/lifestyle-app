/**
 * Email verification routes
 *
 * Endpoints:
 * - POST /email/verify - Verify email with token
 * - POST /email/verify/resend - Resend verification email
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import {
  verifyEmail,
  resendVerificationEmail,
} from '../../services/email/email-verification.service';
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

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * Verify email schema
 */
const verifyEmailSchema = z.object({
  token: z.string().min(32, 'トークンが無効です').max(32, 'トークンが無効です'),
});

/**
 * POST /email/verify
 *
 * Verify email address with token
 */
app.post('/verify', zValidator('json', verifyEmailSchema), async (c) => {
  const { token } = c.req.valid('json');

  const result = await verifyEmail(c.env.DB, token);

  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  return c.json({
    message: 'メールアドレスを確認しました',
    userId: result.userId,
  });
});

/**
 * POST /email/verify/resend
 *
 * Resend verification email (requires authentication)
 */
app.post('/verify/resend', authMiddleware, async (c) => {
  const authUser = c.get('user');

  const result = await resendVerificationEmail(
    c.env.DB,
    authUser.id,
    authUser.email,
    c.env.RESEND_API_KEY,
    c.env.FROM_EMAIL,
    c.env.FRONTEND_URL
  );

  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  return c.json({
    message: '確認メールを再送信しました。メールをご確認ください。',
  });
});

export default app;
