/**
 * Integration tests for WebAuthn / Passkey endpoints
 *
 * Tests:
 * - POST /api/auth/webauthn/signup/options (public, passkey-only signup)
 * - POST /api/auth/webauthn/signup/verify (public, passkey-only signup)
 * - POST /api/auth/webauthn/register/options (auth required)
 * - POST /api/auth/webauthn/register/verify (auth required)
 * - POST /api/auth/webauthn/authenticate/options (public)
 * - POST /api/auth/webauthn/authenticate/verify (public)
 * - GET  /api/auth/webauthn/credentials (auth required)
 * - DELETE /api/auth/webauthn/credentials/:credentialId (auth required)
 *
 * Note: Full ceremony tests require a real authenticator/browser environment.
 * These tests cover only the simple cases that don't require ceremony state.
 */

import { describe, it, expect } from 'vitest';

const API_BASE = 'http://localhost:8787';

describe('WebAuthn / Passkey API Integration Tests', () => {
  describe('POST /api/auth/webauthn/signup/options', () => {
    const post = (body: unknown) =>
      fetch(`${API_BASE}/api/auth/webauthn/signup/options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

    it('returns 200 with creation options for a valid display name', async () => {
      const res = await post({ displayName: 'テストユーザー' });
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, any>;
      expect(typeof body['challenge']).toBe('string');
      // Both WebAuthn name fields carry the label: passkey managers may surface
      // either, so neither may be left blank.
      expect(body['user']?.name).toBe('テストユーザー');
      expect(body['user']?.displayName).toBe('テストユーザー');
      // Discoverable credential is what makes identifier-free login possible.
      expect(body['authenticatorSelection']?.residentKey).toBe('required');
    });

    it('rejects a missing display name', async () => {
      expect((await post({})).status).toBe(400);
    });

    it('rejects a whitespace-only display name (trimmed before the min check)', async () => {
      expect((await post({ displayName: '   ' })).status).toBe(400);
    });

    it('rejects a display name longer than 50 characters', async () => {
      expect((await post({ displayName: 'a'.repeat(51) })).status).toBe(400);
    });

    it('does not require authentication', async () => {
      expect((await post({ displayName: 'サインアップ' })).status).not.toBe(401);
    });
  });

  describe('POST /api/auth/webauthn/signup/verify', () => {
    it('rejects a response that matches no stored signup challenge', async () => {
      const res = await fetch(`${API_BASE}/api/auth/webauthn/signup/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: {} }),
      });
      // Never 201: no account may be created without a verified credential.
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    });
  });

  describe('POST /api/auth/webauthn/authenticate/verify', () => {
    it('rejects a malformed response with 4xx, not 500', async () => {
      const res = await fetch(`${API_BASE}/api/auth/webauthn/authenticate/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: {} }),
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    });
  });

  describe('POST /api/auth/webauthn/authenticate/options', () => {
    it('returns 200 with valid PublicKeyCredentialRequestOptions shape', async () => {
      const res = await fetch(`${API_BASE}/api/auth/webauthn/authenticate/options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(typeof body['challenge']).toBe('string');
      expect((body['challenge'] as string).length).toBeGreaterThan(0);
      expect(typeof body['rpId']).toBe('string');
      expect(Array.isArray(body['allowCredentials'])).toBe(true);
    });
  });

  describe('GET /api/auth/webauthn/credentials', () => {
    it('returns 401 without a valid session cookie', async () => {
      const res = await fetch(`${API_BASE}/api/auth/webauthn/credentials`);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/webauthn/register/options', () => {
    it('returns 401 without a valid session cookie', async () => {
      const res = await fetch(`${API_BASE}/api/auth/webauthn/register/options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/webauthn/register/verify', () => {
    it('returns 401 without a valid session cookie', async () => {
      const res = await fetch(`${API_BASE}/api/auth/webauthn/register/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: {} }),
      });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/webauthn/authenticate/verify', () => {
    it('rejects with 401 when the credential does not exist', async () => {
      const res = await fetch(`${API_BASE}/api/auth/webauthn/authenticate/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: {
            id: 'non-existent-credential-id',
            rawId: 'non-existent-credential-id',
            response: {},
            type: 'public-key',
            clientExtensionResults: {},
          },
        }),
      });
      expect(res.status).toBe(401);
      const body = (await res.json()) as { code?: string };
      expect(body.code).toBe('CREDENTIAL_NOT_FOUND');
    });
  });
});
