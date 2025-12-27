import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createExerciseSchema, updateExerciseSchema, dateRangeSchema } from '@lifestyle-app/shared';
import { ExerciseService } from '../services/exercise';
import { authMiddleware } from '../middleware/auth';
import type { Database } from '../db';

type Bindings = {
  DB: D1Database;
};

type Variables = {
  db: Database;
  user: { id: string; email: string };
};

const exercises = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// All exercise routes require authentication
exercises.use('*', authMiddleware);

// Create exercise record
exercises.post('/', zValidator('json', createExerciseSchema), async (c) => {
  const input = c.req.valid('json');
  const db = c.get('db');
  const user = c.get('user');

  const exerciseService = new ExerciseService(db);
  const exercise = await exerciseService.create(user.id, input);

  return c.json({ exercise }, 201);
});

// Get all exercise records for user
exercises.get('/', zValidator('query', dateRangeSchema), async (c) => {
  const query = c.req.valid('query');
  const db = c.get('db');
  const user = c.get('user');

  const exerciseService = new ExerciseService(db);
  const exercisesList = await exerciseService.findByUserId(user.id, {
    startDate: query.startDate,
    endDate: query.endDate,
  });

  return c.json({ exercises: exercisesList });
});

// Get weekly summary
exercises.get('/weekly', async (c) => {
  const db = c.get('db');
  const user = c.get('user');

  const exerciseService = new ExerciseService(db);
  const summary = await exerciseService.getWeeklySummary(user.id);

  return c.json({ summary });
});

// Get summary for date range
exercises.get('/summary', zValidator('query', dateRangeSchema), async (c) => {
  const query = c.req.valid('query');
  const db = c.get('db');
  const user = c.get('user');

  const exerciseService = new ExerciseService(db);
  const summary = await exerciseService.getSummary(user.id, {
    startDate: query.startDate,
    endDate: query.endDate,
  });

  return c.json({ summary });
});

// Get single exercise record
exercises.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = c.get('db');
  const user = c.get('user');

  const exerciseService = new ExerciseService(db);
  const exercise = await exerciseService.findById(id, user.id);

  return c.json({ exercise });
});

// Update exercise record
exercises.patch('/:id', zValidator('json', updateExerciseSchema), async (c) => {
  const id = c.req.param('id');
  const input = c.req.valid('json');
  const db = c.get('db');
  const user = c.get('user');

  const exerciseService = new ExerciseService(db);
  const exercise = await exerciseService.update(id, user.id, input);

  return c.json({ exercise });
});

// Delete exercise record
exercises.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const db = c.get('db');
  const user = c.get('user');

  const exerciseService = new ExerciseService(db);
  await exerciseService.delete(id, user.id);

  return c.body(null, 204);
});

export { exercises };
