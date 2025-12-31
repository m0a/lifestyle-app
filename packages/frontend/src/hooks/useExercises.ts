import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type {
  ExerciseRecord,
  CreateExerciseInput,
  UpdateExerciseInput,
  ExerciseSummary,
} from '@lifestyle-app/shared';

interface ExercisesResponse {
  exercises: ExerciseRecord[];
}

interface ExerciseResponse {
  exercise: ExerciseRecord;
}

interface WeeklySummaryResponse {
  summary: ExerciseSummary & { weekStart: string; weekEnd: string };
}

interface UseExercisesOptions {
  startDate?: string;
  endDate?: string;
}

export function useExercises(options?: UseExercisesOptions) {
  const queryClient = useQueryClient();

  const queryParams = new URLSearchParams();
  if (options?.startDate) queryParams.set('startDate', options.startDate);
  if (options?.endDate) queryParams.set('endDate', options.endDate);

  const queryString = queryParams.toString();
  const endpoint = `/api/exercises${queryString ? `?${queryString}` : ''}`;

  const exercisesQuery = useQuery({
    queryKey: ['exercises', options],
    queryFn: () => api.get<ExercisesResponse>(endpoint),
    select: (data) => data.exercises,
  });

  const weeklySummaryQuery = useQuery({
    queryKey: ['exercises', 'weekly-summary'],
    queryFn: () => api.get<WeeklySummaryResponse>('/api/exercises/weekly'),
    select: (data) => data.summary,
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateExerciseInput) =>
      api.post<ExerciseResponse>('/api/exercises', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateExerciseInput }) =>
      api.patch<ExerciseResponse>(`/api/exercises/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/exercises/${id}`),
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
