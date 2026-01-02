import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/client';
import { transformToImageData, formatDateForImage } from '../lib/training-image-transform';
import type { TrainingImageData, ExerciseRecord, MaxRMRecord } from '@lifestyle-app/shared';

interface UseTrainingImageOptions {
  date: string; // YYYY-MM-DD format
}

interface UseTrainingImageResult {
  imageData: TrainingImageData | null;
  isLoading: boolean;
  error: Error | null;
  hasExercises: boolean;
}

/**
 * Hook to fetch and transform exercise data for training image generation
 *
 * @param options - Options including the date to fetch exercises for
 * @returns Training image data, loading state, and error
 */
export function useTrainingImage({ date }: UseTrainingImageOptions): UseTrainingImageResult {
  // Fetch exercises for the specified date
  const exercisesQuery = useQuery({
    queryKey: ['exercises', 'forImage', date],
    queryFn: async () => {
      const startDate = date;
      const endDate = date;

      const res = await api.exercises.$get({
        query: { startDate, endDate },
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Failed to fetch exercises' }));
        throw new Error((error as { message?: string }).message || 'Failed to fetch exercises');
      }

      return res.json();
    },
    select: (data) => data.exercises as ExerciseRecord[],
  });

  // Get unique exercise types from the exercises
  const exerciseTypes = exercisesQuery.data
    ? [...new Set(exercisesQuery.data.map((e) => e.exerciseType))]
    : [];

  // Fetch max RM records for the exercise types
  const maxRMQuery = useQuery({
    queryKey: ['exercises', 'maxRM', exerciseTypes.join(',')],
    queryFn: async () => {
      if (exerciseTypes.length === 0) {
        return { maxRMs: [] };
      }

      const res = await api.exercises['max-rm'].$get({
        query: { exerciseTypes: exerciseTypes.join(',') },
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Failed to fetch max RM' }));
        throw new Error((error as { message?: string }).message || 'Failed to fetch max RM');
      }

      return res.json();
    },
    select: (data) => data.maxRMs as MaxRMRecord[],
    enabled: exercisesQuery.isSuccess && exerciseTypes.length > 0,
  });

  // Transform data when both queries are ready
  const isLoading = exercisesQuery.isLoading || (exerciseTypes.length > 0 && maxRMQuery.isLoading);
  const error = exercisesQuery.error || maxRMQuery.error;

  let imageData: TrainingImageData | null = null;
  if (exercisesQuery.data) {
    const exercises = exercisesQuery.data;
    const maxRMRecords = maxRMQuery.data ?? [];
    const formattedDate = formatDateForImage(date);

    imageData = transformToImageData(exercises, formattedDate, maxRMRecords);
  }

  return {
    imageData,
    isLoading,
    error: error instanceof Error ? error : error ? new Error(String(error)) : null,
    hasExercises: (exercisesQuery.data?.length ?? 0) > 0,
  };
}
