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
  passkeySignupOptionsSchema,
  passkeySignupVerifySchema,
} from '@lifestyle-app/shared';
import { authMiddleware, createSessionToken, resolveSessionSecret } from '../../middleware/auth';
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
  SESSION_SECRET?: string;
  RP_ID: string;
  RP_NAME: string;
  RP_ORIGIN: string;
};

type Variables = {
  db: Database;
  user: { id: string; email: string };
};

// Public + authenticated routes. authMiddleware is attached per-route to avoid
// leaking into sibling routes via Hono's middleware chain semantics.
export const webauthn = new Hono<{ Bindings: Bindings; Variables: Variables }>()
  // --- Passkey-only signup (unauthenticated) -------------------------------
  // Distinct from /register/*, which adds a passkey to an already-authenticated
  // account. Here no user row exists yet, so the id the account will be created
  // with and its label ride on the challenge row (migration 0042). Nothing is
  // looked up by email or name, so there is no account to enumerate.
  .post('/signup/options', zValidator('json', passkeySignupOptionsSchema), async (c) => {
    const { displayName } = c.req.valid('json');
    const db = c.get('db');

    const userId = crypto.randomUUID();

    // Required and already trimmed by the schema, so it is safe to use as-is for
    // both users.display_name and the authenticator's userName (the label the OS
    // passkey manager lists this account under, which the app cannot change later).
    const label = displayName;

    const options = await generateRegistrationOptions({
      rpName: c.env.RP_NAME,
      rpID: c.env.RP_ID,
      // userName and userDisplayName are separate WebAuthn fields; passkey
      // managers may surface either, so both get the label rather than leaving
      // user.displayName blank.
      userName: label,
      userDisplayName: label,
      userID: new TextEncoder().encode(userId),
      attestationType: 'none',
      excludeCredentials: [],
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'preferred',
      },
    });

    await saveChallenge(db, {
      userId: null,
      challenge: options.challenge,
      type: 'signup',
      signupUserId: userId,
      signupDisplayName: label,
    });

    return c.json(options);
  })
  .post('/signup/verify', zValidator('json', passkeySignupVerifySchema), async (c) => {
    const { response, name } = c.req.valid('json');
    const db = c.get('db');

    // The challenge row is the only trusted carrier of "which account is being
    // created": it is looked up by the challenge the authenticator signed over,
    // so the client cannot swap in a different id or label after the fact.
    let pending: { userId: string; displayName: string } | null = null;

    // @simplewebauthn throws (rather than returning verified: false) on a
    // malformed response. This route is unauthenticated, so a bad payload must
    // not surface as a 500.
    const verification = await verifyRegistrationResponse({
      response: response as unknown as RegistrationResponseJSON,
      expectedChallenge: async (challenge) => {
        const record = await getAndDeleteChallenge(db, challenge);
        if (!record || record.type !== 'signup') return false;
        if (!record.signupUserId || !record.signupDisplayName) return false;
        pending = {
          userId: record.signupUserId,
          displayName: record.signupDisplayName,
        };
        return true;
      },
      expectedOrigin: c.env.RP_ORIGIN,
      expectedRPID: c.env.RP_ID,
    }).catch(() => null);

    if (!verification?.verified || !verification.registrationInfo || !pending) {
      throw new AppError('パスキーの検証に失敗しました', 400, 'WEBAUTHN_VERIFICATION_FAILED');
    }
    const { userId: pendingUserId, displayName: pendingDisplayName } = pending as {
      userId: string;
      displayName: string;
    };

    const authService = new AuthService(db);
    const user = await authService.createPasskeyUser(pendingUserId, pendingDisplayName);

    const { credential, credentialDeviceType, credentialBackedUp } =
      verification.registrationInfo;

    await saveCredential(db, user.id, {
      credentialId: credential.id,
      publicKey: uint8ArrayToBase64url(credential.publicKey),
      counter: credential.counter,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      transports: credential.transports,
      name,
    });

    const token = await createSessionToken(user.id, resolveSessionSecret(c.env));
    const isProduction = c.env.ENVIRONMENT === 'production';
    setCookie(c, 'session', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'Lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return c.json({ user }, 201);
  })
  .post('/register/options', authMiddleware, async (c) => {
    const user = c.get('user');
    const db = c.get('db');

    const existing = await getCredentialsByUserId(db, user.id);

    const options = await generateRegistrationOptions({
      rpName: c.env.RP_NAME,
      rpID: c.env.RP_ID,
      userName: user.email,
      userDisplayName: user.email,
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
    authMiddleware,
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
      }).catch(() => null);

      if (!verification?.verified || !verification.registrationInfo) {
        throw new AppError('パスキーの検証に失敗しました', 400, 'WEBAUTHN_VERIFICATION_FAILED');
      }

      const { credential, credentialDeviceType, credentialBackedUp } =
        verification.registrationInfo;

      const saved = await saveCredential(db, user.id, {
        credentialId: credential.id,
        publicKey: uint8ArrayToBase64url(credential.publicKey),
        counter: credential.counter,
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
        transports: credential.transports,
        name,
      });

      return c.json({
        verified: true,
        credentialId: saved.credentialId,
        name: saved.name,
      });
    },
  )
  .get('/credentials', authMiddleware, async (c) => {
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
  .delete('/credentials/:credentialId', authMiddleware, async (c) => {
    const user = c.get('user');
    const db = c.get('db');
    const credentialId = c.req.param('credentialId');

    // Passkey-only accounts exist from this point on, so the last credential can
    // never be removed — doing so would lock the account out with no fallback.
    // Applied to every account (not just passkey-only ones) because password
    // login is being removed outright in the follow-up change.
    const existing = await getCredentialsByUserId(db, user.id);
    if (existing.length <= 1) {
      throw new AppError(
        '最後のパスキーは削除できません。先に別のパスキーを登録してください',
        400,
        'LAST_CREDENTIAL',
      );
    }

    const deleted = await deleteCredential(db, credentialId, user.id);
    if (!deleted) {
      throw new AppError('パスキーが見つかりません', 404, 'CREDENTIAL_NOT_FOUND');
    }
    return c.json({ success: true });
  })
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
      // The wrapper schema does not check the response's inner shape, so a
      // missing id would reach the DB lookup as undefined and fail there. This
      // route is unauthenticated: reject it as bad input, not a 500.
      if (typeof authResponse?.id !== 'string' || authResponse.id.length === 0) {
        throw new AppError('認証情報が見つかりません', 401, 'CREDENTIAL_NOT_FOUND');
      }
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
      }).catch(() => null);

      if (!verification?.verified) {
        throw new AppError('パスキー認証に失敗しました', 401, 'WEBAUTHN_AUTH_FAILED');
      }

      await updateCredentialCounter(
        db,
        credentialRow.credentialId,
        verification.authenticationInfo.newCounter,
      );

      const authService = new AuthService(db);
      const user = await authService.getUserById(credentialRow.userId);

      const token = await createSessionToken(user.id, resolveSessionSecret(c.env));
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
