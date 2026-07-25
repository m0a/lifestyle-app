import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/client';
import type { MealDaySummary } from '@lifestyle-app/shared';

interface UseMealDatesOptions {
  year: number;
  month: number;
}

export function useMealDates(options: UseMealDatesOptions) {
  const { year, month } = options;

  const query = useQuery({
    queryKey: ['meals', 'dates', year, month],
    queryFn: async () => {
      const res = await api.meals.dates.$get({
        query: {
          year: String(year),
          month: String(month),
        },
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Failed to fetch meal dates' }));
        throw new Error((error as { message?: string }).message || 'Failed to fetch meal dates');
      }
      return res.json();
    },
    // `days` may be missing when the response comes from a service-worker cache
    // written before per-day totals shipped — fall back to dates-only so the
    // calendar still renders (without dots) instead of crashing.
    select: (data) => ({
      dates: new Set(data.dates),
      days: new Map<string, MealDaySummary>(
        (data.days ?? []).map((d) => [d.date, d] as const)
      ),
    }),
  });

  return {
    datesWithMeals: query.data?.dates ?? new Set<string>(),
    daySummaries: query.data?.days ?? new Map<string, MealDaySummary>(),
    isLoading: query.isLoading,
    error: query.error,
  };
}
