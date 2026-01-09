import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createExerciseSetsSchema, updateExerciseSchema, dateRangeSchema, exerciseQuerySchema, maxRMQuerySchema, exerciseImportQuerySchema, recentExercisesQuerySchema } from '@lifestyle-app/shared';
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
  // New: Create multiple sets at once
  .post('/', zValidator('json', createExerciseSetsSchema), async (c) => {
    const input = c.req.valid('json');
    const db = c.get('db');
    const user = c.get('user');

    const exerciseService = new ExerciseService(db);
    const exercisesList = await exerciseService.createSets(user.id, input);

    return c.json({ exercises: exercisesList }, 201);
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
  .get('/max-rm', zValidator('query', maxRMQuerySchema), async (c) => {
    const query = c.req.valid('query');
    const db = c.get('db');
    const user = c.get('user');

    // Parse comma-separated exercise types if provided
    const exerciseTypes = query.exerciseTypes
      ? query.exerciseTypes.split(',').map((t) => t.trim()).filter(Boolean)
      : undefined;

    const exerciseService = new ExerciseService(db);
    const maxRMs = await exerciseService.getMaxRMs(user.id, exerciseTypes);

    return c.json({ maxRMs });
  })
  .get('/sessions', async (c) => {
    const cursor = c.req.query('cursor');
    const limitStr = c.req.query('limit');
    const limit = limitStr ? parseInt(limitStr, 10) : undefined;
    const db = c.get('db');
    const user = c.get('user');

    const exerciseService = new ExerciseService(db);
    const result = await exerciseService.getRecentSessions(user.id, { cursor, limit });

    return c.json(result);
  })
  .get('/by-date', zValidator('query', exerciseImportQuerySchema), async (c) => {
    const query = c.req.valid('query');
    const db = c.get('db');
    const user = c.get('user');

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(query.date)) {
      return c.json({ message: 'Invalid date format' }, 400);
    }

    // Parse and validate date value
    const date = new Date(query.date);
    if (isNaN(date.getTime())) {
      return c.json({ message: 'Invalid date format' }, 400);
    }

    // Get exercises for the specified date
    const exerciseService = new ExerciseService(db);

    // Query exercises for the full day (00:00:00 to 23:59:59)
    const startDate = `${query.date}T00:00:00.000Z`;
    const endDate = `${query.date}T23:59:59.999Z`;

    const exercises = await exerciseService.findByUserId(user.id, {
      startDate,
      endDate,
    });

    // Aggregate sets by exercise type
    const aggregated = exerciseService.aggregateExerciseSets(exercises);

    return c.json({
      exercises: aggregated,
      count: aggregated.length,
    });
  })
  .get('/recent', zValidator('query', recentExercisesQuerySchema), async (c) => {
    const query = c.req.valid('query');
    const db = c.get('db');
    const user = c.get('user');

    const exerciseService = new ExerciseService(db);

    // Get all exercises for the user
    const allExercises = await exerciseService.findByUserId(user.id);

    // Get recent unique exercises
    const recentExercises = exerciseService.getRecentUniqueExercises(
      allExercises,
      query.limit
    );

    return c.json({
      exercises: recentExercises,
      count: recentExercises.length,
    });
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
