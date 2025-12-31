import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export type Period = 'week' | 'month' | 'quarter' | 'year';

interface WeightSummary {
  startWeight: number | null;
  endWeight: number | null;
  change: number | null;
  minWeight: number | null;
  maxWeight: number | null;
  recordCount: number;
}

interface MealSummary {
  totalCalories: number;
  mealCount: number;
  averageCalories: number;
  byType: Record<string, number>;
}

interface ExerciseSummary {
  totalMinutes: number;
  sessionCount: number;
  averageMinutes: number;
  byType: Record<string, number>;
}

interface DashboardSummary {
  weight: WeightSummary;
  meals: MealSummary;
  exercises: ExerciseSummary;
  period: {
    startDate: string;
    endDate: string;
  };
}

interface WeeklyTrendItem {
  weekStart: string;
  weekEnd: string;
  weight: number | null;
  totalCalories: number;
  exerciseMinutes: number;
}

interface GoalProgress {
  weight: {
    current: number | null;
    target: number;
    progress: number;
    remaining: number | null;
  };
  exercise: {
    current: number;
    target: number;
    progress: number;
  };
  calories: {
    average: number;
    target: number;
    difference: number;
  };
}

interface UseDashboardOptions {
  period?: Period;
  startDate?: string;
  endDate?: string;
}

export function useDashboard(options: UseDashboardOptions = {}) {
  const { period = 'week', startDate, endDate } = options;

  const summaryQuery = useQuery<DashboardSummary>({
    queryKey: ['dashboard', 'summary', period, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate && endDate) {
        params.set('startDate', startDate);
        params.set('endDate', endDate);
      } else {
        params.set('period', period);
      }
      return api.get<DashboardSummary>(`/api/dashboard/summary?${params.toString()}`);
    },
  });

  const trendsQuery = useQuery<WeeklyTrendItem[]>({
    queryKey: ['dashboard', 'trends'],
    queryFn: async () => {
      return api.get<WeeklyTrendItem[]>('/api/dashboard/trends?weeks=4');
    },
  });

  const goalsQuery = useQuery<GoalProgress>({
    queryKey: ['dashboard', 'goals'],
    queryFn: async () => {
      return api.get<GoalProgress>('/api/dashboard/goals');
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
