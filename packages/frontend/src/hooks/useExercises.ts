import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/client';
import type {
  CreateExerciseInput,
  UpdateExerciseInput,
} from '@lifestyle-app/shared';

interface UseExercisesOptions {
  startDate?: string;
  endDate?: string;
}

export function useExercises(options?: UseExercisesOptions) {
  const queryClient = useQueryClient();

  const exercisesQuery = useQuery({
    queryKey: ['exercises', options],
    queryFn: async () => {
      const res = await api.exercises.$get({
        query: {
          startDate: options?.startDate,
          endDate: options?.endDate,
        },
      });
      if (!res.ok) throw new Error('Failed to fetch exercises');
      return res.json();
    },
    select: (data) => data.exercises,
  });

  const weeklySummaryQuery = useQuery({
    queryKey: ['exercises', 'weekly-summary'],
    queryFn: async () => {
      const res = await api.exercises.weekly.$get();
      if (!res.ok) throw new Error('Failed to fetch weekly summary');
      return res.json();
    },
    select: (data) => data.summary,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateExerciseInput) => {
      const res = await api.exercises.$post({
        json: input,
      });
      if (!res.ok) throw new Error('Failed to create exercise');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateExerciseInput }) => {
      const res = await api.exercises[':id'].$patch({
        param: { id },
        json: input,
      });
      if (!res.ok) throw new Error('Failed to update exercise');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.exercises[':id'].$delete({
        param: { id },
      });
      if (!res.ok) throw new Error('Failed to delete exercise');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
    },
  });

  return {
    exercises: exercisesQuery.data ?? [],
    weeklySummary: weeklySummaryQuery.data,
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
  };
}
