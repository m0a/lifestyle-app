import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
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

const meals = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// All meal routes require authentication
meals.use('*', authMiddleware);

// Query schema with mealType filter
const mealQuerySchema = dateRangeSchema.extend({
  mealType: mealTypeSchema.optional(),
});

// Create meal record
meals.post('/', zValidator('json', createMealSchema), async (c) => {
  const input = c.req.valid('json');
  const db = c.get('db');
  const user = c.get('user');

  const mealService = new MealService(db);
  const meal = await mealService.create(user.id, input);

  return c.json({ meal }, 201);
});

// Get all meal records for user
meals.get('/', zValidator('query', mealQuerySchema), async (c) => {
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
});

// Get calorie summary
meals.get('/summary', zValidator('query', dateRangeSchema), async (c) => {
  const query = c.req.valid('query');
  const db = c.get('db');
  const user = c.get('user');

  const mealService = new MealService(db);
  const summary = await mealService.getCalorieSummary(user.id, {
    startDate: query.startDate,
    endDate: query.endDate,
  });

  return c.json({ summary });
});

// Get today's summary
meals.get('/today', async (c) => {
  const db = c.get('db');
  const user = c.get('user');

  const mealService = new MealService(db);
  const summary = await mealService.getTodaysSummary(user.id);

  return c.json({ summary });
});

// Get single meal record
meals.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = c.get('db');
  const user = c.get('user');

  const mealService = new MealService(db);
  const meal = await mealService.findById(id, user.id);

  return c.json({ meal });
});

// Update meal record
meals.patch('/:id', zValidator('json', updateMealSchema), async (c) => {
  const id = c.req.param('id');
  const input = c.req.valid('json');
  const db = c.get('db');
  const user = c.get('user');

  const mealService = new MealService(db);
  const meal = await mealService.update(id, user.id, input);

  return c.json({ meal });
});

// Delete meal record
meals.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const db = c.get('db');
  const user = c.get('user');

  const mealService = new MealService(db);
  await mealService.delete(id, user.id);

  return c.body(null, 204);
});

export { meals };
