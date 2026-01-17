import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/client';

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
    select: (data) => new Set(data.dates),
  });

  return {
    datesWithMeals: query.data ?? new Set<string>(),
    isLoading: query.isLoading,
    error: query.error,
  };
}
