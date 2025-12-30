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
      const res = await api.dashboard.summary.$get({
        query: startDate && endDate
          ? { startDate, endDate }
          : { period },
      });
      if (!res.ok) throw new Error('Failed to fetch dashboard summary');
      return res.json();
    },
  });

  const trendsQuery = useQuery({
    queryKey: ['dashboard', 'trends'],
    queryFn: async () => {
      const res = await api.dashboard.trends.$get({
        query: { weeks: 4 },
      });
      if (!res.ok) throw new Error('Failed to fetch trends');
      return res.json();
    },
  });

  const goalsQuery = useQuery({
    queryKey: ['dashboard', 'goals'],
    queryFn: async () => {
      const res = await api.dashboard.goals.$get({
        query: {},
      });
      if (!res.ok) throw new Error('Failed to fetch goals');
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
