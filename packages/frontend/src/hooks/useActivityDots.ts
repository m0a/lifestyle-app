import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/client';

export interface DailyActivity {
  date: string;
  hasMeal: boolean;
  hasWeight: boolean;
  hasExercise: boolean;
  level: number;
  weight: number | null;
  calories: number | null;
  exerciseSets: number | null;
}

export interface DailyActivityResponse {
  activities: DailyActivity[];
  startDate: string;
  endDate: string;
}

export function useActivityDots(days: number = 800) {
  return useQuery({
    queryKey: ['dashboard', 'activity', days],
    queryFn: async (): Promise<DailyActivityResponse> => {
      const res = await api.dashboard.activity.$get({
        query: { days: String(days) },
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Failed to fetch activity' }));
        throw new Error((error as { message?: string }).message || 'Failed to fetch activity');
      }
      return res.json() as Promise<DailyActivityResponse>;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
}
