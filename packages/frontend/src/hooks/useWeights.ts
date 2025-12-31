import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/client';
import type {
  CreateWeightInput,
  UpdateWeightInput,
} from '@lifestyle-app/shared';

interface UseWeightsOptions {
  startDate?: string;
  endDate?: string;
}

export function useWeights(options?: UseWeightsOptions) {
  const queryClient = useQueryClient();

  const weightsQuery = useQuery({
    queryKey: ['weights', options],
    queryFn: async () => {
      const query: Record<string, string> = {};
      if (options?.startDate) query.startDate = options.startDate;
      if (options?.endDate) query.endDate = options.endDate;

      const res = await api.weights.$get({ query });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Failed to fetch weights' }));
        throw new Error((error as { message?: string }).message || 'Failed to fetch weights');
      }
      return res.json();
    },
    select: (data) => data.weights,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateWeightInput) => {
      const res = await api.weights.$post({ json: input });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Failed to create weight' }));
        throw new Error((error as { message?: string }).message || 'Failed to create weight');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weights'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateWeightInput }) => {
      const res = await api.weights[':id'].$patch({ param: { id }, json: input });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Failed to update weight' }));
        throw new Error((error as { message?: string }).message || 'Failed to update weight');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weights'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.weights[':id'].$delete({ param: { id } });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Failed to delete weight' }));
        throw new Error((error as { message?: string }).message || 'Failed to delete weight');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weights'] });
    },
  });

  return {
    weights: weightsQuery.data ?? [],
    isLoading: weightsQuery.isLoading,
    error: weightsQuery.error,
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
