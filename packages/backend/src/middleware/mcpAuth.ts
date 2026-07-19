/**
 * MCP bearer-token auth middleware.
 *
 * Remote MCP clients (e.g. a headless Claude Code) send a personal token as
 * `Authorization: Bearer <token>`. This resolves it to the owning user and sets
 * `c.set('user', …)` in the SAME shape as the cookie-session `authMiddleware`,
 * so every downstream service call is scoped to that user with no changes.
 *
 * Fails closed with 401 + WWW-Authenticate (Bearer) on any missing/invalid
 * token — the format MCP clients expect for an auth challenge.
 */
import type { Context, Next } from 'hono';
import { eq } from 'drizzle-orm';
import { schema } from '../db';
import { verifyMcpToken } from '../services/mcp-token';

function unauthorized(c: Context) {
  return c.json({ message: 'MCPトークンが無効です' }, 401, {
    'WWW-Authenticate': 'Bearer realm="mcp", error="invalid_token"',
  });
}

export async function mcpAuth(c: Context, next: Next) {
  const header = c.req.header('Authorization');
  const token =
    header && header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : null;

  if (!token) {
    return unauthorized(c);
  }

  const db = c.get('db');
  const userId = await verifyMcpToken(db, token);
  if (!userId) {
    return unauthorized(c);
  }

  const user = await db
    .select({ id: schema.users.id, email: schema.users.email })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .get();

  if (!user) {
    return unauthorized(c);
  }

  c.set('user', user);
  await next();
}
