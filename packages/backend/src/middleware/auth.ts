import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import type { Database } from '../db';
import { schema } from '../db';
import { eq } from 'drizzle-orm';

export interface AuthUser {
  id: string;
  email: string;
}

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser;
    db: Database;
  }
}

export async function authMiddleware(c: Context, next: Next) {
  const sessionId = getCookie(c, 'session');

  if (!sessionId) {
    return c.json({ message: '認証が必要です' }, 401);
  }

  // For simplicity, we use the session cookie as a JWT-like token
  // In production, use proper session storage or JWT validation
  try {
    const payload = JSON.parse(atob(sessionId));

    if (!payload.userId || !payload.exp || payload.exp < Date.now()) {
      return c.json({ message: 'セッションが無効です' }, 401);
    }

    const db = c.get('db');
    const user = await db
      .select({ id: schema.users.id, email: schema.users.email })
      .from(schema.users)
      .where(eq(schema.users.id, payload.userId))
      .get();

    if (!user) {
      return c.json({ message: 'ユーザーが見つかりません' }, 401);
    }

    c.set('user', user);
    await next();
  } catch {
    return c.json({ message: '認証に失敗しました' }, 401);
  }
}

export function createSessionToken(userId: string, expiresInMs = 7 * 24 * 60 * 60 * 1000): string {
  const payload = {
    userId,
    exp: Date.now() + expiresInMs,
  };
  return btoa(JSON.stringify(payload));
}
