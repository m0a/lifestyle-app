import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/client';

export type Period = 'week' | 'month' | 'quarter' | 'year';

interface UseDashboardOptions {
  period?: Period;
  startDate?: string;
  endDate?: string;
}

export function useDashboard(options: UseDashboardOptions = {}) {
  const { period = 'week', startDate, endDate } = options;

  const summaryQuery = useQuery({
    queryKey: ['dashboard', 'summary', period, startDate, endDate],
    queryFn: async () => {
      const query: Record<string, string> = {};
      if (startDate && endDate) {
        query['startDate'] = startDate;
        query['endDate'] = endDate;
      } else {
        query['period'] = period;
      }
      const res = await api.dashboard.summary.$get({ query });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Failed to fetch summary' }));
        throw new Error((error as { message?: string }).message || 'Failed to fetch summary');
      }
      return res.json();
    },
  });

  const trendsQuery = useQuery({
    queryKey: ['dashboard', 'trends'],
    queryFn: async () => {
      const res = await api.dashboard.trends.$get({ query: { weeks: '4' } });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Failed to fetch trends' }));
        throw new Error((error as { message?: string }).message || 'Failed to fetch trends');
      }
      return res.json();
    },
  });

  const goalsQuery = useQuery({
    queryKey: ['dashboard', 'goals'],
    queryFn: async () => {
      const res = await api.dashboard.goals.$get({ query: {} });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Failed to fetch goals' }));
        throw new Error((error as { message?: string }).message || 'Failed to fetch goals');
      }
      return res.json();
    },
  });

  return {
    // Summary data
    summary: summaryQuery.data,
    isSummaryLoading: summaryQuery.isLoading,
    summaryError: summaryQuery.error,

    // Trends data
    trends: trendsQuery.data,
    isTrendsLoading: trendsQuery.isLoading,
    trendsError: trendsQuery.error,

    // Goals data
    goals: goalsQuery.data,
    isGoalsLoading: goalsQuery.isLoading,
    goalsError: goalsQuery.error,

    // Combined loading state
    isLoading: summaryQuery.isLoading || trendsQuery.isLoading || goalsQuery.isLoading,

    // Refetch all
    refetch: () => {
      summaryQuery.refetch();
      trendsQuery.refetch();
      goalsQuery.refetch();
    },
  };
}
