import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import { zValidator } from '@hono/zod-validator';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  AuthenticatorTransportFuture,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/server';
import {
  passkeyRegisterVerifySchema,
  passkeyAuthVerifySchema,
} from '@lifestyle-app/shared';
import { authMiddleware, createSessionToken } from '../../middleware/auth';
import { AppError } from '../../middleware/error';
import type { Database } from '../../db';
import {
  saveChallenge,
  getAndDeleteChallenge,
  saveCredential,
  getCredentialsByUserId,
  getCredentialByCredentialId,
  updateCredentialCounter,
  deleteCredential,
  base64urlToUint8Array,
  uint8ArrayToBase64url,
} from '../../services/webauthn.service';
import { AuthService } from '../../services/auth';

type Bindings = {
  DB: D1Database;
  ENVIRONMENT: string;
  RP_ID: string;
  RP_NAME: string;
  RP_ORIGIN: string;
};

type Variables = {
  db: Database;
  user: { id: string; email: string };
};

// Authenticated sub-chain (uses authMiddleware)
const authedRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()
  .use(authMiddleware)
  .post('/register/options', async (c) => {
    const user = c.get('user');
    const db = c.get('db');

    const existing = await getCredentialsByUserId(db, user.id);

    const options = await generateRegistrationOptions({
      rpName: c.env.RP_NAME,
      rpID: c.env.RP_ID,
      userName: user.email,
      userID: new TextEncoder().encode(user.id),
      attestationType: 'none',
      excludeCredentials: existing.map((cred) => ({
        id: cred.credentialId,
        transports: cred.transports
          ? (JSON.parse(cred.transports) as AuthenticatorTransportFuture[])
          : undefined,
      })),
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'preferred',
      },
    });

    await saveChallenge(db, {
      userId: user.id,
      challenge: options.challenge,
      type: 'registration',
    });

    return c.json(options);
  })
  .post(
    '/register/verify',
    zValidator('json', passkeyRegisterVerifySchema),
    async (c) => {
      const { response, name } = c.req.valid('json');
      const user = c.get('user');
      const db = c.get('db');

      const verification = await verifyRegistrationResponse({
        response: response as unknown as RegistrationResponseJSON,
        expectedChallenge: async (challenge) => {
          const record = await getAndDeleteChallenge(db, challenge);
          return record !== null && record.userId === user.id && record.type === 'registration';
        },
        expectedOrigin: c.env.RP_ORIGIN,
        expectedRPID: c.env.RP_ID,
      });

      if (!verification.verified || !verification.registrationInfo) {
        throw new AppError('パスキーの検証に失敗しました', 400, 'WEBAUTHN_VERIFICATION_FAILED');
      }

      const { credential, credentialDeviceType, credentialBackedUp } =
        verification.registrationInfo;

      const transports =
        (response as unknown as RegistrationResponseJSON).response?.transports ?? undefined;

      const saved = await saveCredential(db, user.id, {
        credentialId: credential.id,
        publicKey: uint8ArrayToBase64url(credential.publicKey),
        counter: credential.counter,
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
        transports,
        name,
      });

      return c.json({
        verified: true,
        credentialId: saved.credentialId,
        name: saved.name,
      });
    },
  )
  .get('/credentials', async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const credentials = await getCredentialsByUserId(db, user.id);
    return c.json({
      credentials: credentials.map((cred) => ({
        id: cred.id,
        credentialId: cred.credentialId,
        name: cred.name,
        deviceType: cred.deviceType,
        backedUp: cred.backedUp === 1,
        lastUsedAt: cred.lastUsedAt,
        createdAt: cred.createdAt,
      })),
    });
  })
  .delete('/credentials/:credentialId', async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const credentialId = c.req.param('credentialId');

    const all = await getCredentialsByUserId(db, user.id);
    const target = all.find((cred) => cred.credentialId === credentialId);
    if (!target) {
      throw new AppError('パスキーが見つかりません', 404, 'CREDENTIAL_NOT_FOUND');
    }

    // Phase 2 guard: if user has no password and this is their last credential,
    // refuse deletion to avoid account lockout. In Phase 1 password is always set,
    // so this branch is a no-op but keeps the guard logic stable.
    const userRecord = await new AuthService(db).getUserById(user.id);
    const hasPassword = Boolean((userRecord as { passwordHash?: string | null }).passwordHash);
    if (!hasPassword && all.length <= 1) {
      throw new AppError(
        '最後のパスキーは削除できません',
        400,
        'LAST_CREDENTIAL',
      );
    }

    await deleteCredential(db, credentialId, user.id);
    return c.json({ success: true });
  });

// Public routes
export const webauthn = new Hono<{ Bindings: Bindings; Variables: Variables }>()
  .route('/', authedRoutes)
  .post('/authenticate/options', async (c) => {
    const db = c.get('db');

    const options = await generateAuthenticationOptions({
      rpID: c.env.RP_ID,
      allowCredentials: [],
      userVerification: 'preferred',
    });

    await saveChallenge(db, {
      userId: null,
      challenge: options.challenge,
      type: 'authentication',
    });

    return c.json(options);
  })
  .post(
    '/authenticate/verify',
    zValidator('json', passkeyAuthVerifySchema),
    async (c) => {
      const { response } = c.req.valid('json');
      const db = c.get('db');

      const authResponse = response as unknown as AuthenticationResponseJSON;
      const credentialRow = await getCredentialByCredentialId(db, authResponse.id);
      if (!credentialRow) {
        throw new AppError('認証情報が見つかりません', 401, 'CREDENTIAL_NOT_FOUND');
      }

      const verification = await verifyAuthenticationResponse({
        response: authResponse,
        expectedChallenge: async (challenge) => {
          const record = await getAndDeleteChallenge(db, challenge);
          return record !== null && record.type === 'authentication';
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
        verification.authenticationInfo.newCounter,
      );

      const authService = new AuthService(db);
      const user = await authService.getUserById(credentialRow.userId);

      const token = createSessionToken(user.id);
      const isProduction = c.env.ENVIRONMENT === 'production';
      setCookie(c, 'session', token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'Lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });

      return c.json({ user });
    },
  );
