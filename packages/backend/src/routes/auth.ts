import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { setCookie, deleteCookie } from 'hono/cookie';
import {
  registerSchema,
  loginSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
} from '@lifestyle-app/shared';
import { AuthService } from '../services/auth';
import { createSessionToken, authMiddleware } from '../middleware/auth';
import type { Database } from '../db';
import {
  requestPasswordReset,
  confirmPasswordReset,
} from '../services/auth/password-reset.service';
import { getClientIP } from '../services/rate-limit/email-rate-limit';

type Bindings = {
  DB: D1Database;
  RESEND_API_KEY: string;
  FROM_EMAIL: string;
  FRONTEND_URL: string;
};

type Variables = {
  db: Database;
  user: { id: string; email: string };
};

// Chain format for RPC type inference
export const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>()
  .post('/register', zValidator('json', registerSchema), async (c) => {
    const input = c.req.valid('json');
    const db = c.get('db');
    const authService = new AuthService(db);

    const user = await authService.register(input);
    const token = createSessionToken(user.id);

    setCookie(c, 'session', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return c.json({ user }, 201);
  })
  .post('/login', zValidator('json', loginSchema), async (c) => {
    const input = c.req.valid('json');
    const db = c.get('db');
    const authService = new AuthService(db);

    const user = await authService.login(input);
    const token = createSessionToken(user.id);

    setCookie(c, 'session', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return c.json({ user });
  })
  .post('/logout', async (c) => {
    deleteCookie(c, 'session', {
      path: '/',
    });

    return c.json({ message: 'ログアウトしました' });
  })
  .get('/me', authMiddleware, async (c) => {
    const authUser = c.get('user');
    const db = c.get('db');
    const authService = new AuthService(db);

    const user = await authService.getUserById(authUser.id);

    return c.json({ user });
  })
  .post(
    '/password-reset/request',
    zValidator('json', passwordResetRequestSchema),
    async (c) => {
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

      return c.json({ message: 'パスワードリセットのメールを送信しました。' });
    }
  )
  .post(
    '/password-reset/confirm',
    zValidator('json', passwordResetConfirmSchema),
    async (c) => {
      const { token, newPassword } = c.req.valid('json');

      const result = await confirmPasswordReset(c.env.DB, token, newPassword);

      if (!result.success) {
        return c.json({ error: result.error }, 400);
      }

      return c.json({
        message: 'パスワードを正常にリセットしました。新しいパスワードでログインできます。',
      });
    }
  );
