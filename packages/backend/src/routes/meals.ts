import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createMealSchema, updateMealSchema, dateRangeSchema, mealTypeSchema } from '@lifestyle-app/shared';
import { MealService } from '../services/meal';
import { authMiddleware } from '../middleware/auth';
import type { Database } from '../db';

type Bindings = {
  DB: D1Database;
};

type Variables = {
  db: Database;
  user: { id: string; email: string };
};

// Query schema with mealType filter
const mealQuerySchema = dateRangeSchema.extend({
  mealType: mealTypeSchema.optional(),
});

// Chain format for RPC type inference
// All meal routes require authentication
export const meals = new Hono<{ Bindings: Bindings; Variables: Variables }>()
  .use(authMiddleware)
  .post('/', zValidator('json', createMealSchema), async (c) => {
    const input = c.req.valid('json');
    const db = c.get('db');
    const user = c.get('user');

    const mealService = new MealService(db);
    const meal = await mealService.create(user.id, input);

    return c.json({ meal }, 201);
  })
  .get('/', zValidator('query', mealQuerySchema), async (c) => {
    const query = c.req.valid('query');
    const db = c.get('db');
    const user = c.get('user');

    const mealService = new MealService(db);
    const mealsList = await mealService.findByUserId(user.id, {
      startDate: query.startDate,
      endDate: query.endDate,
      mealType: query.mealType,
    });

    return c.json({ meals: mealsList });
  })
  .get('/summary', zValidator('query', dateRangeSchema), async (c) => {
    const query = c.req.valid('query');
    const db = c.get('db');
    const user = c.get('user');

    const mealService = new MealService(db);
    const summary = await mealService.getCalorieSummary(user.id, {
      startDate: query.startDate,
      endDate: query.endDate,
    });

    return c.json({ summary });
  })
  .get('/today', async (c) => {
    const db = c.get('db');
    const user = c.get('user');

    const mealService = new MealService(db);
    const summary = await mealService.getTodaysSummary(user.id);

    return c.json({ summary });
  })
  .get('/:id', async (c) => {
    const id = c.req.param('id');
    const db = c.get('db');
    const user = c.get('user');

    const mealService = new MealService(db);
    const meal = await mealService.findById(id, user.id);

    return c.json({ meal });
  })
  .patch('/:id', zValidator('json', updateMealSchema), async (c) => {
    const id = c.req.param('id');
    const input = c.req.valid('json');
    const db = c.get('db');
    const user = c.get('user');

    const mealService = new MealService(db);
    const meal = await mealService.update(id, user.id, input);

    return c.json({ meal });
  })
  .delete('/:id', async (c) => {
    const id = c.req.param('id');
    const db = c.get('db');
    const user = c.get('user');

    const mealService = new MealService(db);
    await mealService.delete(id, user.id);

    return c.json({ message: 'Deleted' });
  });
