import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type {
  MealRecord,
  CreateMealInput,
  UpdateMealInput,
  MealType,
  MealSummary,
} from '@lifestyle-app/shared';

interface MealsResponse {
  meals: MealRecord[];
}

interface MealResponse {
  meal: MealRecord;
}

interface SummaryResponse {
  summary: MealSummary & { totalMeals: number };
}

interface UseMealsOptions {
  startDate?: string;
  endDate?: string;
  mealType?: MealType;
}

export function useMeals(options?: UseMealsOptions) {
  const queryClient = useQueryClient();

  const queryParams = new URLSearchParams();
  if (options?.startDate) queryParams.set('startDate', options.startDate);
  if (options?.endDate) queryParams.set('endDate', options.endDate);
  if (options?.mealType) queryParams.set('mealType', options.mealType);

  const queryString = queryParams.toString();
  const endpoint = `/api/meals${queryString ? `?${queryString}` : ''}`;

  const mealsQuery = useQuery({
    queryKey: ['meals', options],
    queryFn: () => api.get<MealsResponse>(endpoint),
    select: (data) => data.meals,
  });

  const todaySummaryQuery = useQuery({
    queryKey: ['meals', 'today-summary'],
    queryFn: () => api.get<SummaryResponse>('/api/meals/today'),
    select: (data) => data.summary,
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateMealInput) =>
      api.post<MealResponse>('/api/meals', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateMealInput }) =>
      api.patch<MealResponse>(`/api/meals/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/meals/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals'] });
    },
  });

  return {
    meals: mealsQuery.data ?? [],
    todaySummary: todaySummaryQuery.data,
    isLoading: mealsQuery.isLoading,
    error: mealsQuery.error,
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
