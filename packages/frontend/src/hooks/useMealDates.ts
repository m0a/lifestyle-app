import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/client';

interface UseMealDatesOptions {
  year: number;
  month: number;
}

// ユーザーのタイムゾーン名を取得（例: 'Asia/Tokyo'）
const getUserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export function useMealDates(options: UseMealDatesOptions) {
  const { year, month } = options;
  const timezone = getUserTimezone();

  const query = useQuery({
    queryKey: ['meals', 'dates', year, month, timezone],
    queryFn: async () => {
      const res = await api.meals.dates.$get({
        query: {
          year: String(year),
          month: String(month),
          timezone,
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
