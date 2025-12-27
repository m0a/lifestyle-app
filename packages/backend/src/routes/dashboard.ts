import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { DashboardService } from '../services/dashboard';
import { authMiddleware } from '../middleware/auth';
import type { Bindings, Variables } from '../types';

const dashboard = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// All dashboard routes require authentication
dashboard.use('*', authMiddleware);

// Period presets
const PERIOD_DAYS = {
  week: 7,
  month: 30,
  quarter: 90,
  year: 365,
} as const;

const periodQuerySchema = z.object({
  period: z.enum(['week', 'month', 'quarter', 'year']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const trendQuerySchema = z.object({
  weeks: z.coerce.number().min(1).max(52).optional().default(4),
});

const goalsQuerySchema = z.object({
  targetWeight: z.coerce.number().positive().optional(),
  weeklyExerciseMinutes: z.coerce.number().positive().optional(),
  dailyCalories: z.coerce.number().positive().optional(),
});

// GET /api/dashboard/summary
dashboard.get('/summary', zValidator('query', periodQuerySchema), async (c) => {
  const user = c.get('user');
  const { period, startDate: startDateStr, endDate: endDateStr } = c.req.valid('query');
  const db = c.get('db');
  const service = new DashboardService(db);

  let startDate: Date;
  let endDate: Date;

  if (startDateStr && endDateStr) {
    // Custom date range
    startDate = new Date(startDateStr);
    endDate = new Date(endDateStr);
  } else {
    // Period preset
    endDate = new Date();
    startDate = new Date();
    const days = PERIOD_DAYS[period || 'week'];
    startDate.setDate(startDate.getDate() - days);
  }

  // Validate date range
  if (startDate > endDate) {
    return c.json({ error: 'Start date must be before end date' }, 400);
  }

  const summary = await service.getSummary(user.id, { startDate, endDate });

  return c.json(summary);
});

// GET /api/dashboard/trends
dashboard.get('/trends', zValidator('query', trendQuerySchema), async (c) => {
  const user = c.get('user');
  const { weeks } = c.req.valid('query');
  const db = c.get('db');
  const service = new DashboardService(db);

  const trends = await service.getWeeklyTrend(user.id, weeks);

  return c.json(trends);
});

// GET /api/dashboard/goals
dashboard.get('/goals', zValidator('query', goalsQuerySchema), async (c) => {
  const user = c.get('user');
  const goals = c.req.valid('query');
  const db = c.get('db');
  const service = new DashboardService(db);

  const progress = await service.getGoalProgress(user.id, goals);

  return c.json(progress);
});

export { dashboard };
