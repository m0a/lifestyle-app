import { z } from 'zod';

// Exercise Import Query Schemas

export const exerciseImportQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
});

export const recentExercisesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(10),
});

export const exerciseImportSelectionSchema = z.object({
  exerciseId: z.string().uuid('Invalid exercise ID'),
  action: z.enum(['add', 'replace']).optional(),
});

// Export inferred types
export type ExerciseImportQuery = z.infer<typeof exerciseImportQuerySchema>;
export type RecentExercisesQuery = z.infer<typeof recentExercisesQuerySchema>;
export type ExerciseImportSelection = z.infer<typeof exerciseImportSelectionSchema>;
