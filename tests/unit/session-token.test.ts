import { describe, it, expect } from 'vitest';
import {
  createSessionToken,
  verifySessionToken,
  resolveSessionSecret,
} from '../../packages/backend/src/middleware/auth';

const SECRET = 'unit-test-session-secret';
const OTHER_SECRET = 'a-different-secret';
const USER_ID = 'user-123';

describe('session token (HMAC-signed)', () => {
  it('round-trips a valid token', async () => {
    const token = await createSessionToken(USER_ID, SECRET);
    const payload = await verifySessionToken(token, SECRET);

    expect(payload).not.toBeNull();
    expect(payload?.userId).toBe(USER_ID);
    expect(payload?.exp).toBeGreaterThan(Date.now());
  });

  it('produces a two-part `<payload>.<signature>` token', async () => {
    const token = await createSessionToken(USER_ID, SECRET);
    expect(token.split('.')).toHaveLength(2);
  });

  // The core vulnerability (issue #95): the old format was a bare base64(JSON)
  // with no signature, so anyone could mint a token for an arbitrary userId.
  it('rejects a forged unsigned token (old base64-JSON format)', async () => {
    const forged = btoa(JSON.stringify({ userId: 'victim', exp: Date.now() + 100000 }));
    expect(await verifySessionToken(forged, SECRET)).toBeNull();
  });

  it('rejects a token whose payload was tampered without re-signing', async () => {
    const token = await createSessionToken(USER_ID, SECRET);
    const [, signature] = token.split('.');
    const forgedPayload = btoa(JSON.stringify({ userId: 'victim', exp: Date.now() + 100000 }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const tampered = `${forgedPayload}.${signature}`;

    expect(await verifySessionToken(tampered, SECRET)).toBeNull();
  });

  it('rejects a token whose signature was tampered', async () => {
    const token = await createSessionToken(USER_ID, SECRET);
    const [payload] = token.split('.');
    const tampered = `${payload}.AAAAAAAAAAAAAAAAAAAAAAAAAAA`;

    expect(await verifySessionToken(tampered, SECRET)).toBeNull();
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await createSessionToken(USER_ID, OTHER_SECRET);
    expect(await verifySessionToken(token, SECRET)).toBeNull();
  });

  it('rejects an expired token', async () => {
    const token = await createSessionToken(USER_ID, SECRET, -1000);
    expect(await verifySessionToken(token, SECRET)).toBeNull();
  });

  it('rejects malformed tokens', async () => {
    expect(await verifySessionToken('', SECRET)).toBeNull();
    expect(await verifySessionToken('no-dot-here', SECRET)).toBeNull();
    expect(await verifySessionToken('.onlysig', SECRET)).toBeNull();
    expect(await verifySessionToken('onlypayload.', SECRET)).toBeNull();
    expect(await verifySessionToken('not!base64.sig', SECRET)).toBeNull();
  });

  it('refuses to sign without a secret and never verifies one', async () => {
    await expect(createSessionToken(USER_ID, '')).rejects.toThrow();
    const token = await createSessionToken(USER_ID, SECRET);
    expect(await verifySessionToken(token, '')).toBeNull();
  });
});

describe('resolveSessionSecret', () => {
  it('uses the configured secret when present (any environment)', () => {
    expect(resolveSessionSecret({ SESSION_SECRET: 'real', ENVIRONMENT: 'production' })).toBe('real');
    expect(resolveSessionSecret({ SESSION_SECRET: 'real', ENVIRONMENT: 'development' })).toBe('real');
  });

  it('falls back to a dev key in non-production when unset', () => {
    const devSecret = resolveSessionSecret({ ENVIRONMENT: 'development' });
    expect(devSecret).toBeTruthy();
    // preview/test behave the same
    expect(resolveSessionSecret({ ENVIRONMENT: 'preview' })).toBe(devSecret);
    expect(resolveSessionSecret({ ENVIRONMENT: 'test' })).toBe(devSecret);
  });

  it('fails closed in production when the secret is missing', () => {
    expect(() => resolveSessionSecret({ ENVIRONMENT: 'production' })).toThrow();
  });
});
