import { z } from 'zod';
import {
  registerSchema,
  loginSchema,
  updateUserSchema,
  updateGoalsSchema,
  createWeightSchema,
  updateWeightSchema,
  createMealSchema,
  updateMealSchema,
  createExerciseSchema,
  createExerciseSetsSchema,
  updateExerciseSchema,
  maxRMQuerySchema,
  maxRMRecordSchema,
  maxRMResponseSchema,
  type MealType,
  type DashboardPeriod,
} from '../schemas';

// Training image types
export * from './training-image';

// Infer types from schemas
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateGoalsInput = z.infer<typeof updateGoalsSchema>;
export type CreateWeightInput = z.infer<typeof createWeightSchema>;
export type UpdateWeightInput = z.infer<typeof updateWeightSchema>;
export type CreateMealInput = z.infer<typeof createMealSchema>;
export type UpdateMealInput = z.infer<typeof updateMealSchema>;
export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;
export type CreateExerciseSetsInput = z.infer<typeof createExerciseSetsSchema>;
export type UpdateExerciseInput = z.infer<typeof updateExerciseSchema>;
export type MaxRMQueryInput = z.infer<typeof maxRMQuerySchema>;
export type MaxRMRecordType = z.infer<typeof maxRMRecordSchema>;
export type MaxRMResponseType = z.infer<typeof maxRMResponseSchema>;
// MealType and DashboardPeriod are exported from schemas/index.ts

// Entity types
export interface User {
  id: string;
  email: string;
  goalWeight: number | null;
  goalCalories: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface WeightRecord {
  id: string;
  userId: string;
  weight: number;
  recordedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface MealRecord {
  id: string;
  userId: string;
  mealType: MealType;
  content: string;
  calories: number | null;
  photoKey: string | null;
  totalProtein: number | null;
  totalFat: number | null;
  totalCarbs: number | null;
  analysisSource: 'ai' | 'manual' | null;
  recordedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExerciseRecord {
  id: string;
  userId: string;
  exerciseType: string;
  muscleGroup: string | null;
  setNumber: number;
  reps: number;
  weight: number | null;
  variation: string | null;
  recordedAt: string;
  createdAt: string;
  updatedAt: string;
}

// API Response types
export interface AuthResponse {
  user: User;
}

export interface ErrorResponse {
  message: string;
  code?: string;
}

// Dashboard types
export interface WeightSummary {
  current: number | null;
  change: number | null;
  data: WeightRecord[];
}

export interface MealSummary {
  totalCalories: number;
  averageCalories: number;
  count: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
}

export interface ExerciseSummary {
  totalSets: number;
  totalReps: number;
  count: number;
  byType: Record<string, { sets: number; reps: number }>;
}

export interface DashboardSummary {
  period: DashboardPeriod;
  weights: WeightSummary;
  meals: MealSummary;
  exercises: ExerciseSummary;
}

// Export data type
export interface ExportData {
  user: User;
  weights: WeightRecord[];
  meals: MealRecord[];
  exercises: ExerciseRecord[];
  exportedAt: string;
}

// AI Usage Tracking types
export const AIFeatureTypeSchema = z.enum(['image_analysis', 'text_analysis', 'chat']);
export type AIFeatureType = z.infer<typeof AIFeatureTypeSchema>;

export const AIUsageSummarySchema = z.object({
  totalTokens: z.number().int().min(0),
  monthlyTokens: z.number().int().min(0),
});
export type AIUsageSummary = z.infer<typeof AIUsageSummarySchema>;
