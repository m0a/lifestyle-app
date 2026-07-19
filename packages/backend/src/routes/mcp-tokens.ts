/**
 * MCP token management API (cookie-session authenticated).
 *
 * Lets the logged-in user mint, list, and revoke the personal bearer tokens
 * that remote MCP clients use against `/api/mcp`. Minting is gated by a fresh
 * passkey step-up: the caller must present a live WebAuthn assertion tied to
 * their own account, so a stolen web session alone cannot create a token.
 *
 * The raw token is returned exactly once (from POST /) and never again — only
 * its hash is stored (services/mcp-token).
 */
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  AuthenticatorTransportFuture,
  AuthenticationResponseJSON,
} from '@simplewebauthn/server';
import { authMiddleware } from '../middleware/auth';
import { AppError } from '../middleware/error';
import type { Database } from '../db';
import {
  saveChallenge,
  getAndDeleteChallenge,
  getCredentialsByUserId,
  getCredentialByCredentialId,
  updateCredentialCounter,
  base64urlToUint8Array,
} from '../services/webauthn.service';
import { createMcpToken, listMcpTokens, revokeMcpToken } from '../services/mcp-token';

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

const issueSchema = z.object({
  name: z.string().max(100).optional(),
  // AuthenticationResponseJSON from @simplewebauthn/browser; validated by the
  // WebAuthn ceremony below rather than by shape here.
  response: z.any(),
});

export const mcpTokens = new Hono<{ Bindings: Bindings; Variables: Variables }>()
  // Step 1: request a passkey challenge for the step-up before issuing a token.
  .post('/challenge', authMiddleware, async (c) => {
    const db = c.get('db');
    const user = c.get('user');

    const credentials = await getCredentialsByUserId(db, user.id);
    if (credentials.length === 0) {
      throw new AppError(
        'トークン発行にはパスキーの登録が必要です',
        400,
        'NO_PASSKEY'
      );
    }

    const options = await generateAuthenticationOptions({
      rpID: c.env.RP_ID,
      allowCredentials: credentials.map((cred) => ({
        id: cred.credentialId,
        transports: cred.transports
          ? (JSON.parse(cred.transports) as AuthenticatorTransportFuture[])
          : undefined,
      })),
      userVerification: 'preferred',
    });

    await saveChallenge(db, {
      userId: user.id,
      challenge: options.challenge,
      type: 'authentication',
    });

    return c.json(options);
  })
  // Step 2: verify the assertion and mint a token. Returns the raw token once.
  .post('/', authMiddleware, zValidator('json', issueSchema), async (c) => {
    const { name, response } = c.req.valid('json');
    const db = c.get('db');
    const user = c.get('user');

    const authResponse = response as unknown as AuthenticationResponseJSON;
    const credentialRow = await getCredentialByCredentialId(db, authResponse.id);
    // The presented passkey must belong to the logged-in user — otherwise a
    // stolen session could mint a token using someone else's authenticator.
    if (!credentialRow || credentialRow.userId !== user.id) {
      throw new AppError('パスキーの検証に失敗しました', 401, 'WEBAUTHN_AUTH_FAILED');
    }

    const verification = await verifyAuthenticationResponse({
      response: authResponse,
      expectedChallenge: async (challenge) => {
        const record = await getAndDeleteChallenge(db, challenge);
        return (
          record !== null &&
          record.type === 'authentication' &&
          record.userId === user.id
        );
      },
      expectedOrigin: c.env.RP_ORIGIN,
      expectedRPID: c.env.RP_ID,
      credential: {
        id: credentialRow.credentialId,
        publicKey: base64urlToUint8Array(credentialRow.publicKey) as Uint8Array<ArrayBuffer>,
        counter: credentialRow.counter,
        transports: credentialRow.transports
          ? (JSON.parse(credentialRow.transports) as AuthenticatorTransportFuture[])
          : undefined,
      },
    });

    if (!verification.verified) {
      throw new AppError('パスキー認証に失敗しました', 401, 'WEBAUTHN_AUTH_FAILED');
    }

    await updateCredentialCounter(
      db,
      credentialRow.credentialId,
      verification.authenticationInfo.newCounter
    );

    const created = await createMcpToken(db, user.id, name);
    return c.json(created, 201);
  })
  .get('/', authMiddleware, async (c) => {
    const db = c.get('db');
    const user = c.get('user');
    const tokens = await listMcpTokens(db, user.id);
    return c.json({ tokens });
  })
  .delete('/:id', authMiddleware, async (c) => {
    const db = c.get('db');
    const user = c.get('user');
    const id = c.req.param('id');

    const revoked = await revokeMcpToken(db, id, user.id);
    if (!revoked) {
      throw new AppError(
        'トークンが見つからないか、既に失効済みです',
        404,
        'MCP_TOKEN_NOT_FOUND'
      );
    }
    return c.json({ success: true });
  });
