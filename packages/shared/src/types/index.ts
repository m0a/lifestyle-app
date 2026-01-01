import { z } from 'zod';
import {
  registerSchema,
  loginSchema,
  updateUserSchema,
  createWeightSchema,
  updateWeightSchema,
  createMealSchema,
  updateMealSchema,
  createExerciseSchema,
  updateExerciseSchema,
  type MealType,
  type DashboardPeriod,
} from '../schemas';

// Infer types from schemas
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateWeightInput = z.infer<typeof createWeightSchema>;
export type UpdateWeightInput = z.infer<typeof updateWeightSchema>;
export type CreateMealInput = z.infer<typeof createMealSchema>;
export type UpdateMealInput = z.infer<typeof updateMealSchema>;
export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;
export type UpdateExerciseInput = z.infer<typeof updateExerciseSchema>;
// MealType and DashboardPeriod are exported from schemas/index.ts

// Entity types
export interface User {
  id: string;
  email: string;
  goalWeight: number | null;
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
  sets: number;
  reps: number;
  weight: number | null;
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
