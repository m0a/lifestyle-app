import { useQuery } from '@tanstack/react-query';
import { resolveWeeklyMealTargets } from '@lifestyle-app/shared';
import { api } from '../lib/client';

/**
 * ホーム画面の「週ごとのPFC」カード用。/api/dashboard/trends のローリング週と、
 * 参照線に使うユーザー個別の脂質目標(#170)をまとめて取る。
 *
 * useDashboard を使わないのは、あちらが summary / goals も引くため。ホームは
 * この2本だけあればよい。
 */
const TREND_WEEKS = 4;

export function useWeeklyPfcTrend() {
  const trendsQuery = useQuery({
    queryKey: ['dashboard', 'trends', TREND_WEEKS],
    queryFn: async () => {
      const res = await api.dashboard.trends.$get({ query: { weeks: String(TREND_WEEKS) } });
      if (!res.ok) throw new Error('Failed to fetch trends');
      return res.json();
    },
  });

  const profileQuery = useQuery({
    queryKey: ['user', 'profile'],
    queryFn: async () => {
      const res = await api.user.profile.$get();
      if (!res.ok) throw new Error('Failed to fetch profile');
      return res.json();
    },
  });

  return {
    weeks: trendsQuery.data,
    isLoading: trendsQuery.isLoading,
    // プロフィール取得前/未設定は WEEKLY_MEAL_TARGETS の既定値に落ちる。
    fatPctTarget: resolveWeeklyMealTargets({ fatPct: profileQuery.data?.targetFatPct }).fatPct,
  };
}
