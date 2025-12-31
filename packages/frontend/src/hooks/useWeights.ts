import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type {
  WeightRecord,
  CreateWeightInput,
  UpdateWeightInput,
} from '@lifestyle-app/shared';

interface WeightsResponse {
  weights: WeightRecord[];
}

interface WeightResponse {
  weight: WeightRecord;
}

interface UseWeightsOptions {
  startDate?: string;
  endDate?: string;
}

export function useWeights(options?: UseWeightsOptions) {
  const queryClient = useQueryClient();

  const queryParams = new URLSearchParams();
  if (options?.startDate) queryParams.set('startDate', options.startDate);
  if (options?.endDate) queryParams.set('endDate', options.endDate);

  const queryString = queryParams.toString();
  const endpoint = `/api/weights${queryString ? `?${queryString}` : ''}`;

  const weightsQuery = useQuery({
    queryKey: ['weights', options],
    queryFn: () => api.get<WeightsResponse>(endpoint),
    select: (data) => data.weights,
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateWeightInput) =>
      api.post<WeightResponse>('/api/weights', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weights'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateWeightInput }) =>
      api.patch<WeightResponse>(`/api/weights/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weights'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/weights/${id}`),
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
