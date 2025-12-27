import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createWeightSchema, updateWeightSchema, dateRangeSchema } from '@lifestyle-app/shared';
import { WeightService } from '../services/weight';
import { authMiddleware } from '../middleware/auth';
import type { Database } from '../db';

type Bindings = {
  DB: D1Database;
};

type Variables = {
  db: Database;
  user: { id: string; email: string };
};

const weights = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// All weight routes require authentication
weights.use('*', authMiddleware);

// Create weight record
weights.post('/', zValidator('json', createWeightSchema), async (c) => {
  const input = c.req.valid('json');
  const db = c.get('db');
  const user = c.get('user');

  const weightService = new WeightService(db);
  const weight = await weightService.create(user.id, input);

  return c.json({ weight }, 201);
});

// Get all weight records for user
weights.get('/', zValidator('query', dateRangeSchema), async (c) => {
  const query = c.req.valid('query');
  const db = c.get('db');
  const user = c.get('user');

  const weightService = new WeightService(db);
  const weights = await weightService.findByUserId(user.id, {
    startDate: query.startDate,
    endDate: query.endDate,
  });

  return c.json({ weights });
});

// Get single weight record
weights.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = c.get('db');
  const user = c.get('user');

  const weightService = new WeightService(db);
  const weight = await weightService.findById(id, user.id);

  return c.json({ weight });
});

// Update weight record
weights.patch('/:id', zValidator('json', updateWeightSchema), async (c) => {
  const id = c.req.param('id');
  const input = c.req.valid('json');
  const db = c.get('db');
  const user = c.get('user');

  const weightService = new WeightService(db);
  const weight = await weightService.update(id, user.id, input);

  return c.json({ weight });
});

// Delete weight record
weights.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const db = c.get('db');
  const user = c.get('user');

  const weightService = new WeightService(db);
  await weightService.delete(id, user.id);

  return c.body(null, 204);
});

export { weights };
