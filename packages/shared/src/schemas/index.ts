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
  goalWeight: z.number().min(20).max(300).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const updateUserSchema = z.object({
  goalWeight: z.number().min(20).max(300).optional(),
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

// Exercise schemas
export const createExerciseSchema = z.object({
  exerciseType: z.string().min(1, '運動種目を入力してください').max(100),
  durationMinutes: z.number().int().min(1, '1分以上で入力してください').max(1440),
  recordedAt: datetimeSchema,
});

export const updateExerciseSchema = z.object({
  exerciseType: z.string().min(1).max(100).optional(),
  durationMinutes: z.number().int().min(1).max(1440).optional(),
  recordedAt: datetimeSchema.optional(),
});

// Date range schema for queries
export const dateRangeSchema = z.object({
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
});

// Dashboard schema
export const dashboardPeriodSchema = z.enum(['week', 'month']);
export type DashboardPeriod = z.infer<typeof dashboardPeriodSchema>;
