import { Hono } from 'hono';
import { deleteCookie } from 'hono/cookie';
import { AuthService } from '../services/auth';
import { authMiddleware } from '../middleware/auth';
import type { Database } from '../db';
import { webauthn } from './auth/webauthn';

type Bindings = {
  DB: D1Database;
  ENVIRONMENT: string;
  SESSION_SECRET?: string;
  RP_ID: string;
  RP_NAME: string;
  RP_ORIGIN: string;
};

type Variables = {
  db: Database;
  user: { id: string; email: string };
};

// Authentication is passkey-only: registering and logging in both live under
// /webauthn. There is no password login, no email verification and no password
// reset, so this file only keeps the session-level endpoints.
//
// Chain format for RPC type inference
export const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>()
  .route('/webauthn', webauthn)
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
  });
