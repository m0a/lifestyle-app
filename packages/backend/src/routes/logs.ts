import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { bodyLimit } from 'hono/body-limit';
import { zValidator } from '@hono/zod-validator';
import { errorLogSchema } from '@lifestyle-app/shared';
import { resolveSessionSecret, verifySessionToken } from '../middleware/auth';

type Bindings = {
  DB: D1Database;
  SESSION_SECRET?: string;
  ENVIRONMENT?: string;
};

/**
 * Hard cap on the request body. The Zod schema already bounds every field,
 * but rejecting oversized bodies up front avoids parsing attacker-controlled
 * megabyte payloads at all.
 */
const MAX_BODY_SIZE_BYTES = 32 * 1024;

/**
 * Error log intake.
 *
 * Intentionally does NOT require authentication: frontend errors can occur
 * before login (e.g. on the login page itself). Instead of trusting a
 * client-sent userId, the user id is derived server-side from the session
 * cookie when one is present and valid; otherwise the entry is logged as
 * "anonymous". Abuse is bounded by the body size cap plus strict Zod field
 * length limits (see errorLogSchema in @lifestyle-app/shared).
 */
export const logs = new Hono<{ Bindings: Bindings }>()
  .post(
    '/error',
    bodyLimit({
      maxSize: MAX_BODY_SIZE_BYTES,
      onError: (c) => c.json({ message: 'リクエストボディが大きすぎます' }, 413),
    }),
    zValidator('json', errorLogSchema),
    async (c) => {
      const error = c.req.valid('json');
      const { requestId } = error;

      // Optional auth: resolve the user id from the session cookie only.
      // Never trust a client-supplied user id.
      let userId = 'anonymous';
      const sessionToken = getCookie(c, 'session');
      if (sessionToken) {
        try {
          const secret = resolveSessionSecret(
            c.env as { SESSION_SECRET?: string; ENVIRONMENT?: string }
          );
          const payload = await verifySessionToken(sessionToken, secret);
          if (payload) {
            userId = payload.userId;
          }
        } catch {
          // Misconfigured secret (production without SESSION_SECRET):
          // still accept the log, just without user attribution.
        }
      }

      // Enhanced logging with Request ID and User ID for traceability
      const logPrefix = requestId ? `[${requestId}]` : '[NO_REQUEST_ID]';
      const userInfo = ` [User: ${userId}]`;

      console.error(`${logPrefix}${userInfo} [Frontend Error]`, JSON.stringify(error, null, 2));

      return c.json({ received: true });
    }
  );
