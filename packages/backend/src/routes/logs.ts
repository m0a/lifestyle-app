import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { errorLogSchema } from '@lifestyle-app/shared';

type Bindings = {
  DB: D1Database;
};

export const logs = new Hono<{ Bindings: Bindings }>()
  .post('/error', zValidator('json', errorLogSchema), async (c) => {
    const error = c.req.valid('json');
    const { requestId, userId } = error;

    // Enhanced logging with Request ID and User ID for traceability
    const logPrefix = requestId ? `[${requestId}]` : '[NO_REQUEST_ID]';
    const userInfo = userId ? ` [User: ${userId}]` : ' [Unauthenticated]';

    console.error(`${logPrefix}${userInfo} [Frontend Error]`, JSON.stringify(error, null, 2));

    return c.json({ received: true });
  });
