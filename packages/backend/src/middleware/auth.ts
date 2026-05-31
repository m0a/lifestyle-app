import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import type { Database } from '../db';
import { schema } from '../db';
import { eq } from 'drizzle-orm';

interface AuthUser {
  id: string;
  email: string;
}

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser;
    db: Database;
  }
}

interface SessionPayload {
  userId: string;
  exp: number;
}

/**
 * Fallback signing key for dev / test / preview only. Production refuses to use
 * it — a real high-entropy `SESSION_SECRET` Workers Secret must be configured
 * there (see SETUP_SECRETS.md). This keeps local dev and CI working out of the
 * box while guaranteeing production tokens are signed with a non-public key.
 */
const DEV_SESSION_SECRET = 'dev-only-insecure-session-secret-do-not-use-in-prod';

/**
 * Resolve the session signing secret from the Worker env. In production a real
 * secret is mandatory (throws if missing, so auth fails closed rather than
 * silently using a guessable key); elsewhere it falls back to a dev constant.
 */
export function resolveSessionSecret(env: {
  SESSION_SECRET?: string;
  ENVIRONMENT?: string;
}): string {
  if (env.SESSION_SECRET) {
    return env.SESSION_SECRET;
  }
  if (env.ENVIRONMENT === 'production') {
    throw new Error('SESSION_SECRET must be configured in production');
  }
  return DEV_SESSION_SECRET;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// TextEncoder#encode is typed as Uint8Array<ArrayBufferLike>; WebCrypto wants
// a BufferSource backed by a (non-shared) ArrayBuffer, so narrow the type here.
function utf8(value: string): Uint8Array<ArrayBuffer> {
  return encoder.encode(value) as Uint8Array<ArrayBuffer>;
}

function bytesToBase64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (const byte of arr) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    utf8(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/**
 * Create a signed session token of the form `<payload>.<signature>`,
 * both base64url-encoded.
 *
 * The HMAC-SHA256 signature over the payload is what makes the token
 * unforgeable: without `secret`, an attacker cannot mint a token for an
 * arbitrary userId. (The previous implementation was a bare base64(JSON)
 * with no signature, so any userId could be impersonated.)
 */
export async function createSessionToken(
  userId: string,
  secret: string,
  expiresInMs = 7 * 24 * 60 * 60 * 1000
): Promise<string> {
  if (!secret) {
    throw new Error('SESSION_SECRET is not configured');
  }

  const payload: SessionPayload = {
    userId,
    exp: Date.now() + expiresInMs,
  };
  const payloadB64 = bytesToBase64url(utf8(JSON.stringify(payload)));
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, utf8(payloadB64));

  return `${payloadB64}.${bytesToBase64url(signature)}`;
}

/**
 * Verify a signed session token. Returns the payload only when the signature
 * is valid (verified in constant time by `crypto.subtle.verify`) and the
 * token has not expired. Returns null for any tampering/format/expiry error.
 */
export async function verifySessionToken(
  token: string,
  secret: string
): Promise<SessionPayload | null> {
  if (!secret) {
    return null;
  }

  const dotIndex = token.indexOf('.');
  if (dotIndex <= 0 || dotIndex === token.length - 1) {
    return null;
  }
  const payloadB64 = token.slice(0, dotIndex);
  const signatureB64 = token.slice(dotIndex + 1);

  let signature: Uint8Array<ArrayBuffer>;
  try {
    signature = base64urlToBytes(signatureB64);
  } catch {
    return null;
  }

  const key = await importHmacKey(secret);
  const valid = await crypto.subtle.verify('HMAC', key, signature, utf8(payloadB64));
  if (!valid) {
    return null;
  }

  try {
    const payload = JSON.parse(decoder.decode(base64urlToBytes(payloadB64))) as SessionPayload;
    if (!payload.userId || !payload.exp || payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function authMiddleware(c: Context, next: Next) {
  const sessionId = getCookie(c, 'session');

  if (!sessionId) {
    return c.json({ message: '認証が必要です' }, 401);
  }

  let secret: string;
  try {
    secret = resolveSessionSecret(c.env as { SESSION_SECRET?: string; ENVIRONMENT?: string });
  } catch {
    // Misconfiguration (production without a secret): fail closed.
    console.error('SESSION_SECRET is not configured; rejecting authenticated request');
    return c.json({ message: '認証に失敗しました' }, 401);
  }

  const payload = await verifySessionToken(sessionId, secret);
  if (!payload) {
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
}
