import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/client';

/**
 * Fetch the meal tab's "この1週間" evaluation for the 7 days ending on `today`
 * (client-local YYYY-MM-DD). The backend computes the six coaching metrics; this
 * hook just wires the RPC call + cache key.
 */
export function useWeeklyMealSummary(today: string) {
  return useQuery({
    queryKey: ['weekly-meal-summary', today],
    queryFn: async () => {
      const res = await api.dashboard['weekly-meal-summary'].$get({ query: { today } });
      if (!res.ok) {
        throw new Error('Failed to fetch weekly meal summary');
      }
      return res.json();
    },
  });
}
