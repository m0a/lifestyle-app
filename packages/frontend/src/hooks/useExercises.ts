import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/client';
import type {
  CreateExerciseSetsInput,
  UpdateExerciseInput,
  ExerciseRecord,
  ExerciseImportSummary,
  RecentExerciseItem,
} from '@lifestyle-app/shared';

interface UseExercisesOptions {
  startDate?: string;
  endDate?: string;
  exerciseType?: string;
}

export function useExercises(options?: UseExercisesOptions) {
  const queryClient = useQueryClient();

  const exercisesQuery = useQuery({
    queryKey: ['exercises', options],
    queryFn: async () => {
      const query: Record<string, string> = {};
      if (options?.startDate) query['startDate'] = options.startDate;
      if (options?.endDate) query['endDate'] = options.endDate;
      if (options?.exerciseType) query['exerciseType'] = options.exerciseType;

      const res = await api.exercises.$get({ query });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Failed to fetch exercises' }));
        throw new Error((error as { message?: string }).message || 'Failed to fetch exercises');
      }
      return res.json();
    },
    select: (data) => data.exercises,
  });

  const weeklySummaryQuery = useQuery({
    queryKey: ['exercises', 'weekly-summary'],
    queryFn: async () => {
      const res = await api.exercises.weekly.$get();
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Failed to fetch weekly summary' }));
        throw new Error((error as { message?: string }).message || 'Failed to fetch weekly summary');
      }
      return res.json();
    },
    select: (data) => data.summary,
  });

  const exerciseTypesQuery = useQuery({
    queryKey: ['exercises', 'types'],
    queryFn: async () => {
      const res = await api.exercises.types.$get();
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Failed to fetch exercise types' }));
        throw new Error((error as { message?: string }).message || 'Failed to fetch exercise types');
      }
      return res.json();
    },
    select: (data) => data.types as { exerciseType: string; muscleGroup: string | null }[],
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateExerciseSetsInput) => {
      const res = await api.exercises.$post({ json: input });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Failed to create exercise' }));
        throw new Error((error as { message?: string }).message || 'Failed to create exercise');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateExerciseInput }) => {
      const res = await api.exercises[':id'].$patch({ param: { id }, json: input });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Failed to update exercise' }));
        throw new Error((error as { message?: string }).message || 'Failed to update exercise');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.exercises[':id'].$delete({ param: { id } });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Failed to delete exercise' }));
        throw new Error((error as { message?: string }).message || 'Failed to delete exercise');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
    },
  });

  const fetchLastRecord = async (exerciseType: string): Promise<ExerciseRecord | null> => {
    const encodedType = encodeURIComponent(exerciseType);
    const res = await api.exercises.last[':exerciseType'].$get({ param: { exerciseType: encodedType } });
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    return data.exercise;
  };

  return {
    exercises: exercisesQuery.data ?? [],
    weeklySummary: weeklySummaryQuery.data,
    exerciseTypes: exerciseTypesQuery.data ?? [],
    isLoading: exercisesQuery.isLoading,
    error: exercisesQuery.error,
    create: createMutation.mutate,
    update: updateMutation.mutate,
    remove: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    createError: createMutation.error,
    updateError: updateMutation.error,
    deleteError: deleteMutation.error,
    fetchLastRecord,
  };
}

// Hook for fetching exercises by specific date
export function useExercisesByDate(date: string | null) {
  return useQuery({
    queryKey: ['exercises', 'by-date', date],
    queryFn: async () => {
      if (!date) {
        return { exercises: [], count: 0 };
      }

      const res = await api.exercises['by-date'].$get({
        query: { date },
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Failed to fetch exercises' }));
        throw new Error((error as { message?: string }).message || 'Failed to fetch exercises');
      }

      return res.json();
    },
    select: (data) => data.exercises as ExerciseImportSummary[],
    enabled: !!date,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for fetching recent unique exercises
export function useRecentExercises(limit: number = 10) {
  return useQuery({
    queryKey: ['exercises', 'recent', limit],
    queryFn: async () => {
      const res = await api.exercises.recent.$get({
        query: { limit: limit.toString() },
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Failed to fetch recent exercises' }));
        throw new Error((error as { message?: string }).message || 'Failed to fetch recent exercises');
      }

      return res.json();
    },
    select: (data) => data.exercises as RecentExerciseItem[],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
