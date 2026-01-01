import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createExerciseSchema, updateExerciseSchema, dateRangeSchema, exerciseQuerySchema } from '@lifestyle-app/shared';
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

// Chain format for RPC type inference
// All exercise routes require authentication
export const exercises = new Hono<{ Bindings: Bindings; Variables: Variables }>()
  .use(authMiddleware)
  .post('/', zValidator('json', createExerciseSchema), async (c) => {
    const input = c.req.valid('json');
    const db = c.get('db');
    const user = c.get('user');

    const exerciseService = new ExerciseService(db);
    const exercise = await exerciseService.create(user.id, input);

    return c.json({ exercise }, 201);
  })
  .get('/', zValidator('query', exerciseQuerySchema), async (c) => {
    const query = c.req.valid('query');
    const db = c.get('db');
    const user = c.get('user');

    const exerciseService = new ExerciseService(db);
    const exercisesList = await exerciseService.findByUserId(user.id, {
      startDate: query.startDate,
      endDate: query.endDate,
      exerciseType: query.exerciseType,
      limit: query.limit,
    });

    return c.json({ exercises: exercisesList });
  })
  .get('/weekly', async (c) => {
    const db = c.get('db');
    const user = c.get('user');

    const exerciseService = new ExerciseService(db);
    const summary = await exerciseService.getWeeklySummary(user.id);

    return c.json({ summary });
  })
  .get('/summary', zValidator('query', dateRangeSchema), async (c) => {
    const query = c.req.valid('query');
    const db = c.get('db');
    const user = c.get('user');

    const exerciseService = new ExerciseService(db);
    const summary = await exerciseService.getSummary(user.id, {
      startDate: query.startDate,
      endDate: query.endDate,
    });

    return c.json({ summary });
  })
  .get('/last/:exerciseType', async (c) => {
    const exerciseType = decodeURIComponent(c.req.param('exerciseType'));
    const db = c.get('db');
    const user = c.get('user');

    const exerciseService = new ExerciseService(db);
    const exercise = await exerciseService.getLastByType(user.id, exerciseType);

    return c.json({ exercise });
  })
  .get('/types', async (c) => {
    const db = c.get('db');
    const user = c.get('user');

    const exerciseService = new ExerciseService(db);
    const types = await exerciseService.getExerciseTypes(user.id);

    return c.json({ types });
  })
  .get('/:id', async (c) => {
    const id = c.req.param('id');
    const db = c.get('db');
    const user = c.get('user');

    const exerciseService = new ExerciseService(db);
    const exercise = await exerciseService.findById(id, user.id);

    return c.json({ exercise });
  })
  .patch('/:id', zValidator('json', updateExerciseSchema), async (c) => {
    const id = c.req.param('id');
    const input = c.req.valid('json');
    const db = c.get('db');
    const user = c.get('user');

    const exerciseService = new ExerciseService(db);
    const exercise = await exerciseService.update(id, user.id, input);

    return c.json({ exercise });
  })
  .delete('/:id', async (c) => {
    const id = c.req.param('id');
    const db = c.get('db');
    const user = c.get('user');

    const exerciseService = new ExerciseService(db);
    await exerciseService.delete(id, user.id);

    return c.json({ message: 'Deleted' });
  });
