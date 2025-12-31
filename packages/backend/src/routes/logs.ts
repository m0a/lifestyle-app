import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

type Bindings = {
  DB: D1Database;
};

const errorLogSchema = z.object({
  message: z.string(),
  stack: z.string().optional(),
  url: z.string(),
  userAgent: z.string().optional(),
  timestamp: z.string(),
  extra: z.record(z.unknown()).optional(),
});

export const logs = new Hono<{ Bindings: Bindings }>()
  .post('/error', zValidator('json', errorLogSchema), async (c) => {
    const error = c.req.valid('json');

    // Log to console (appears in Cloudflare Workers logs)
    console.error('[Frontend Error]', JSON.stringify(error, null, 2));

    return c.json({ received: true });
  });
