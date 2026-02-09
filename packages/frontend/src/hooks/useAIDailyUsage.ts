import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { api } from '../lib/client';
import type { AIDailyUsage } from '@lifestyle-app/shared';

const QUERY_KEY = ['ai-usage', 'daily'] as const;

export function useAIDailyUsage() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<AIDailyUsage>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await api.user['ai-usage'].daily.$get();
      if (!res.ok) throw new Error('Failed to fetch AI daily usage');
      return res.json() as Promise<AIDailyUsage>;
    },
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    staleTime: 60 * 1000, // 1 minute
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  }, [queryClient]);

  return {
    dailyUsage: data ?? null,
    isLoading,
    error,
    invalidate,
  };
}
