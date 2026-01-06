import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/client';
import { getApiUrl } from '../lib/api';

export function useMealPhotos(mealId: string) {
  const queryClient = useQueryClient();

  const photosQuery = useQuery({
    queryKey: ['meals', mealId, 'photos'],
    queryFn: async () => {
      const res = await api.meals[':id'].photos.$get({ param: { id: mealId } });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Failed to fetch photos' }));
        throw new Error((error as { message?: string }).message || 'Failed to fetch photos');
      }
      return res.json();
    },
    enabled: !!mealId,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('photo', file);

      const res = await fetch(getApiUrl(`/api/meals/${mealId}/photos`), {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Failed to upload photo' }));
        throw new Error((error as { message?: string }).message || 'Failed to upload photo');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals', mealId, 'photos'] });
      queryClient.invalidateQueries({ queryKey: ['meals'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (photoId: string) => {
      const res = await api.meals[':id'].photos[':photoId'].$delete({
        param: { id: mealId, photoId },
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Failed to delete photo' }));
        throw new Error((error as { message?: string }).message || 'Failed to delete photo');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals', mealId, 'photos'] });
      queryClient.invalidateQueries({ queryKey: ['meals'] });
    },
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['meals', mealId, 'photos'] });
  };

  return {
    photos: photosQuery.data?.photos ?? [],
    totals: photosQuery.data?.totals,
    isLoading: photosQuery.isLoading,
    error: photosQuery.error,
    upload: uploadMutation.mutate,
    uploadAsync: uploadMutation.mutateAsync,
    remove: deleteMutation.mutate,
    refresh,
    isUploading: uploadMutation.isPending,
    isDeleting: deleteMutation.isPending,
    uploadError: uploadMutation.error,
    deleteError: deleteMutation.error,
  };
}
