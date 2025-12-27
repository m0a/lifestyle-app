import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { setCookie, deleteCookie } from 'hono/cookie';
import { registerSchema, loginSchema } from '@lifestyle-app/shared';
import { AuthService } from '../services/auth';
import { createSessionToken, authMiddleware } from '../middleware/auth';
import type { Database } from '../db';

type Bindings = {
  DB: D1Database;
};

type Variables = {
  db: Database;
};

const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>();

auth.post('/register', zValidator('json', registerSchema), async (c) => {
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
});

auth.post('/login', zValidator('json', loginSchema), async (c) => {
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
});

auth.post('/logout', async (c) => {
  deleteCookie(c, 'session', {
    path: '/',
  });

  return c.json({ message: 'ログアウトしました' });
});

auth.get('/me', authMiddleware, async (c) => {
  const authUser = c.get('user');
  const db = c.get('db');
  const authService = new AuthService(db);

  const user = await authService.getUserById(authUser.id);

  return c.json({ user });
});

export { auth };
