import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/client';
import type {
  CreateMealInput,
  UpdateMealInput,
  MealType,
} from '@lifestyle-app/shared';

interface UseMealsOptions {
  startDate?: string;
  endDate?: string;
  mealType?: MealType;
}

export function useMeals(options?: UseMealsOptions) {
  const queryClient = useQueryClient();

  const mealsQuery = useQuery({
    queryKey: ['meals', options],
    queryFn: async () => {
      const query: Record<string, string> = {};
      if (options?.startDate) query['startDate'] = options.startDate;
      if (options?.endDate) query['endDate'] = options.endDate;
      if (options?.mealType) query['mealType'] = options.mealType;

      const res = await api.meals.$get({ query });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Failed to fetch meals' }));
        throw new Error((error as { message?: string }).message || 'Failed to fetch meals');
      }
      return res.json();
    },
    select: (data) => data.meals,
  });

  const todaySummaryQuery = useQuery({
    queryKey: ['meals', 'today-summary'],
    queryFn: async () => {
      // Pass timezone offset so server can calculate "today" correctly
      const timezoneOffset = new Date().getTimezoneOffset();
      const res = await api.meals.today.$get({
        query: { timezoneOffset: String(timezoneOffset) },
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Failed to fetch today summary' }));
        throw new Error((error as { message?: string }).message || 'Failed to fetch today summary');
      }
      return res.json();
    },
    select: (data) => data.summary,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateMealInput) => {
      const res = await api.meals.$post({ json: input });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Failed to create meal' }));
        throw new Error((error as { message?: string }).message || 'Failed to create meal');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateMealInput }) => {
      const res = await api.meals[':id'].$patch({ param: { id }, json: input });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Failed to update meal' }));
        throw new Error((error as { message?: string }).message || 'Failed to update meal');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.meals[':id'].$delete({ param: { id } });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Failed to delete meal' }));
        throw new Error((error as { message?: string }).message || 'Failed to delete meal');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals'] });
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['meals'] });
  };

  return {
    meals: mealsQuery.data ?? [],
    todaySummary: todaySummaryQuery.data,
    isLoading: mealsQuery.isLoading,
    error: mealsQuery.error,
    create: createMutation.mutate,
    update: updateMutation.mutate,
    remove: deleteMutation.mutate,
    refresh,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    createError: createMutation.error,
    updateError: updateMutation.error,
    deleteError: deleteMutation.error,
  };
}
