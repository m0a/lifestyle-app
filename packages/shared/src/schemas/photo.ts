import { z } from 'zod';

export const mealPhotoSchema = z.object({
  id: z.string(),
  mealId: z.string(),
  photoKey: z.string(),
  displayOrder: z.number().int().min(0).max(9),
  analysisStatus: z.enum(['pending', 'analyzing', 'complete', 'failed']).nullable(),
  calories: z.number().int().nullable(),
  protein: z.number().nullable(),
  fat: z.number().nullable(),
  carbs: z.number().nullable(),
  createdAt: z.string(),
});

export type MealPhoto = z.infer<typeof mealPhotoSchema>;

export const addPhotoRequestSchema = z.object({
  displayOrder: z.number().int().min(0).max(9).optional(),
});

export const photoDeleteRequestSchema = z.object({
  photoId: z.string(),
});

export const reorderPhotosSchema = z.object({
  photoOrders: z
    .array(
      z.object({
        photoId: z.string(),
        displayOrder: z.number().int().min(0).max(9),
      })
    )
    .min(1)
    .max(10),
});
