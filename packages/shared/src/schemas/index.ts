import { z } from 'zod';

// Datetime schema that accepts both ISO format and datetime-local format
// datetime-local: "2025-12-31T10:13"
// ISO: "2025-12-31T10:13:00.000Z"
const datetimeSchema = z.string().transform((val, ctx) => {
  // If already ISO format with timezone, use as-is
  if (val.includes('Z') || val.includes('+') || /[+-]\d{2}:\d{2}$/.test(val)) {
    const date = new Date(val);
    if (isNaN(date.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid datetime',
      });
      return z.NEVER;
    }
    return val;
  }

  // Convert datetime-local format to ISO
  const date = new Date(val);
  if (isNaN(date.getTime())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Invalid datetime',
    });
    return z.NEVER;
  }
  return date.toISOString();
});

// Enums
export const mealTypeSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);
export type MealType = z.infer<typeof mealTypeSchema>;

// User schemas
export const registerSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上必要です').max(100),
  goalWeight: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => {
      if (val === '' || val === null || val === undefined) return undefined;
      const num = typeof val === 'number' ? val : parseFloat(val);
      return isNaN(num) ? undefined : num;
    })
    .refine((val) => val === undefined || (val >= 20 && val <= 300), {
      message: '目標体重は20-300kgの範囲で入力してください',
    }),
  goalCalories: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => {
      if (val === '' || val === null || val === undefined) return undefined;
      const num = typeof val === 'number' ? val : parseInt(val, 10);
      return isNaN(num) ? undefined : num;
    })
    .refine((val) => val === undefined || (val >= 500 && val <= 10000), {
      message: '目標カロリーは500-10000kcalの範囲で入力してください',
    }),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const updateUserSchema = z.object({
  goalWeight: z.number().min(20).max(300).optional(),
  goalCalories: z.number().int().min(500).max(10000).optional(),
});

export const updateGoalsSchema = z.object({
  goalWeight: z.number().min(20).max(300).nullable().optional(),
  goalCalories: z.number().int().min(500).max(10000).nullable().optional(),
});

// Weight schemas
export const createWeightSchema = z.object({
  weight: z.number().min(20, '体重は20kg以上で入力してください').max(300, '体重は300kg以下で入力してください'),
  recordedAt: datetimeSchema,
});

export const updateWeightSchema = z.object({
  weight: z.number().min(20).max(300).optional(),
  recordedAt: datetimeSchema.optional(),
});

// Meal schemas
export const createMealSchema = z.object({
  mealType: mealTypeSchema,
  content: z.string().min(1, '食事内容を入力してください').max(1000),
  calories: z.number().int().min(0).max(10000).optional(),
  recordedAt: datetimeSchema,
});

export const updateMealSchema = z.object({
  mealType: mealTypeSchema.optional(),
  content: z.string().min(1).max(1000).optional(),
  calories: z.number().int().min(0).max(10000).optional(),
  recordedAt: datetimeSchema.optional(),
});

// Muscle group schema
export const muscleGroupSchema = z.enum(['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'other']);

// Exercise set schema (for individual set input)
export const exerciseSetInputSchema = z.object({
  reps: z.number().int().min(1, '1回以上で入力してください').max(100, '100回以下で入力してください'),
  weight: z.number().min(0).max(500).nullable().optional(),
  variation: z.string().max(50).optional(),
});

// Exercise schemas (strength training optimized - per-set recording)
export const createExerciseSetsSchema = z.object({
  exerciseType: z.string().min(1, '種目を選択してください').max(100),
  muscleGroup: muscleGroupSchema.optional(),
  sets: z.array(exerciseSetInputSchema).min(1, '1セット以上入力してください'),
  recordedAt: datetimeSchema,
});

// Legacy schema for backward compatibility
export const createExerciseSchema = z.object({
  exerciseType: z.string().min(1, '種目を選択してください').max(100),
  muscleGroup: muscleGroupSchema.optional(),
  sets: z.number().int().min(1, '1セット以上で入力してください').max(20, '20セット以下で入力してください'),
  reps: z.number().int().min(1, '1回以上で入力してください').max(100, '100回以下で入力してください'),
  weight: z.number().min(0).max(500).nullable().optional(),
  recordedAt: datetimeSchema,
});

export const updateExerciseSchema = z.object({
  exerciseType: z.string().min(1).max(100).optional(),
  muscleGroup: muscleGroupSchema.optional(),
  reps: z.number().int().min(1).max(100).optional(),
  weight: z.number().min(0).max(500).nullable().optional(),
  variation: z.string().max(50).nullable().optional(),
  recordedAt: datetimeSchema.optional(),
});

// Add set to existing exercise group
export const addSetSchema = z.object({
  date: z.string().date(),
  reps: z.number().int().min(1, '1回以上で入力してください').max(100),
  weight: z.number().min(0).max(500).nullable().optional(),
  variation: z.string().max(50).optional(),
});

// Import session schema
export const importSessionSchema = z.object({
  sourceDate: z.string().date(),
  targetDate: z.string().date(),
  exerciseTypes: z.array(z.string()).optional(),
});

// Date range schema for queries
export const dateRangeSchema = z.object({
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
});

// Exercise query schema (extends date range with exerciseType filter)
export const exerciseQuerySchema = z.object({
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  exerciseType: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

// Dashboard schema
export const dashboardPeriodSchema = z.enum(['week', 'month']);
export type DashboardPeriod = z.infer<typeof dashboardPeriodSchema>;

// Activity dots schema (800 dots visualization)
export const activityQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(1000).optional().default(800),
});

export const dailyActivitySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hasMeal: z.boolean(),
  hasWeight: z.boolean(),
  hasExercise: z.boolean(),
  level: z.number().int().min(0).max(3),
  // Actual values for display
  weight: z.number().nullable(),
  calories: z.number().nullable(),
  exerciseSets: z.number().nullable(),
});

export const dailyActivityResponseSchema = z.object({
  activities: z.array(dailyActivitySchema),
  startDate: z.string(),
  endDate: z.string(),
});

export type ActivityQuery = z.infer<typeof activityQuerySchema>;
export type DailyActivity = z.infer<typeof dailyActivitySchema>;
export type DailyActivityResponse = z.infer<typeof dailyActivityResponseSchema>;

// Max RM schemas (for training image feature)
export const maxRMQuerySchema = z.object({
  exerciseTypes: z.string().optional(), // Comma-separated exercise types
});

export const maxRMRecordSchema = z.object({
  exerciseType: z.string(),
  maxRM: z.number(),
  achievedAt: z.string(),
});

export const maxRMResponseSchema = z.object({
  maxRMs: z.array(maxRMRecordSchema),
});

// Meal dates query schema (for calendar feature)
export const mealDatesQuerySchema = z.object({
  year: z.coerce.number().int().min(1970).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  timezone: z.string().optional(),
});

export const mealDatesResponseSchema = z.object({
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
});

export type MealDatesQuery = z.infer<typeof mealDatesQuerySchema>;
export type MealDatesResponse = z.infer<typeof mealDatesResponseSchema>;

// Meal analysis schemas
export * from './meal-analysis';

// Logging schemas
export * from './log';

// Exercise import schemas
export * from './exercise';

// Email and token schemas
export * from './email';
export * from './token';
