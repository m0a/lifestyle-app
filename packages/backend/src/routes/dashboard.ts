import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { WEEKLY_MEAL_TARGETS, resolveWeeklyMealTargets, weeklyMealSummaryQuerySchema } from '@lifestyle-app/shared';
import { DashboardService } from '../services/dashboard';
import { MealService } from '../services/meal';
import { WeightService } from '../services/weight';
import { ExerciseService } from '../services/exercise';
import { UserService } from '../services/user';
import { computeWeeklyMealSummary } from '../lib/weeklyMealSummary';
import { authMiddleware } from '../middleware/auth';
import type { Bindings, Variables } from '../types';

/** Shift a YYYY-MM-DD date by whole days (UTC date math is safe on date-only strings). */
function shiftDate(dateStr: string, deltaDays: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

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

const activityQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(1000).optional().default(800),
});

// Chain format for RPC type inference
// All dashboard routes require authentication
export const dashboard = new Hono<{ Bindings: Bindings; Variables: Variables }>()
  .use(authMiddleware)
  .get('/summary', zValidator('query', periodQuerySchema), async (c) => {
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
  })
  .get('/trends', zValidator('query', trendQuerySchema), async (c) => {
    const user = c.get('user');
    const { weeks } = c.req.valid('query');
    const db = c.get('db');
    const service = new DashboardService(db);

    const trends = await service.getWeeklyTrend(user.id, weeks);

    return c.json(trends);
  })
  .get('/goals', zValidator('query', goalsQuerySchema), async (c) => {
    const user = c.get('user');
    const goals = c.req.valid('query');
    const db = c.get('db');
    const service = new DashboardService(db);

    const progress = await service.getGoalProgress(user.id, goals);

    return c.json(progress);
  })
  .get('/activity', zValidator('query', activityQuerySchema), async (c) => {
    const user = c.get('user');
    const { days } = c.req.valid('query');
    const db = c.get('db');
    const service = new DashboardService(db);

    const activity = await service.getDailyActivity(user.id, days);

    return c.json(activity);
  })
  .get(
    '/weekly-meal-summary',
    zValidator('query', weeklyMealSummaryQuerySchema),
    async (c) => {
      const user = c.get('user');
      const { today } = c.req.valid('query');
      const db = c.get('db');

      // The 7-day window ends on the client's local "today".
      const endDate = today;
      const startDate = shiftDate(today, -(WEEKLY_MEAL_TARGETS.windowDays - 1));
      // Widen the weight fetch so the moving average at startDate is smoothed by
      // the preceding week rather than starting cold.
      const weightStart = shiftDate(startDate, -WEEKLY_MEAL_TARGETS.weightMaWindow);

      const [meals, weights, exercises, profile] = await Promise.all([
        new MealService(db).findByUserId(user.id, { startDate, endDate }),
        new WeightService(db).findByUserId(user.id, { startDate: weightStart, endDate }),
        new ExerciseService(db).findByUserId(user.id, { startDate, endDate }),
        new UserService(db).getProfile(user.id),
      ]);

      // Layer this user's saved overrides (#170) onto the global defaults; unset
      // fields (NULL) fall back to WEEKLY_MEAL_TARGETS.
      const targets = resolveWeeklyMealTargets({
        dailyCalorieLimit: profile?.targetDailyCalorieLimit,
        proteinPct: profile?.targetProteinPct,
        fatPct: profile?.targetFatPct,
        proteinFloorPerDay: profile?.targetProteinFloorPerDay,
        highFatDaysLimit: profile?.targetHighFatDaysLimit,
        exerciseDaysTarget: profile?.targetExerciseDays,
      });

      const summary = computeWeeklyMealSummary(meals, weights, exercises, {
        startDate,
        endDate,
        targets,
      });

      return c.json(summary);
    }
  );
