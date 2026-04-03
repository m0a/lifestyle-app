import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useMeals } from '../hooks/useMeals';
import { MealList } from '../components/meal/MealList';
import { CalorieSummary } from '../components/meal/CalorieSummary';
import { SmartMealInput } from '../components/meal/SmartMealInput';
import { AIUsageBanner } from '../components/meal/AIUsageBanner';
import { useAIDailyUsage } from '../hooks/useAIDailyUsage';
import { mealAnalysisApi } from '../lib/api';
import { api } from '../lib/client';
import { getTodayDateString } from '../lib/dateValidation';
import type { MealType, MealRecord } from '@lifestyle-app/shared';
import { MEAL_TYPE_LABELS } from '@lifestyle-app/shared';

export function Meal() {
  const [filterType, setFilterType] = useState<MealType | ''>('');
  const { dailyUsage, isLoading: isUsageLoading } = useAIDailyUsage();

  // Get today's date string for filtering
  const todayDate = useMemo(() => getTodayDateString(), []);

  // Fetch user profile for goal calories
  const { data: profile } = useQuery({
    queryKey: ['user', 'profile'],
    queryFn: async () => {
      const res = await api.user.profile.$get();
      if (!res.ok) throw new Error('Failed to fetch profile');
      return res.json();
    },
  });

  // Filter meals by today's date and optional meal type
  const mealsOptions = useMemo(() => ({
    startDate: todayDate,
    endDate: todayDate,
    ...(filterType ? { mealType: filterType } : {}),
  }), [todayDate, filterType]);

  const {
    meals,
    todaySummary,
    isLoading,
    error,
    remove,
    refresh,
    isDeleting,
  } = useMeals(mealsOptions);

  // Save meal from SmartMealInput
  const handleSmartSave = useCallback(async (mealId: string, mealType: MealType, recordedAt?: string) => {
    await mealAnalysisApi.saveMealAnalysis(mealId, mealType, recordedAt);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-emerald-200 border-t-emerald-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card bg-red-50 p-4">
        <p className="text-sm text-red-700">データの読み込みに失敗しました</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">食事記録</h1>

      {/* Today's Summary */}
      {todaySummary && (
        <CalorieSummary
          totalCalories={todaySummary.totalCalories}
          averageCalories={todaySummary.averageCalories}
          count={todaySummary.count}
          totalMeals={todaySummary.totalMeals}
          targetCalories={profile?.goalCalories ?? undefined}
          totalProtein={todaySummary.totalProtein ?? 0}
          totalFat={todaySummary.totalFat ?? 0}
          totalCarbs={todaySummary.totalCarbs ?? 0}
        />
      )}

      {/* Smart Meal Input */}
      <div>
        <h2 className="mb-2 text-sm font-semibold text-gray-900">食事記録</h2>
        <div className="mb-2">
          <AIUsageBanner dailyUsage={dailyUsage} isLoading={isUsageLoading} />
        </div>
        <SmartMealInput onSave={handleSmartSave} onRefresh={refresh} />
      </div>

      {/* Filter and Today's History */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">今日の記録</h2>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as MealType | '')}
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">すべて</option>
            {Object.entries(MEAL_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Empty state when no meals today */}
        {meals.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-sm text-gray-400">今日の記録はありません</p>
            <p className="mt-1 text-xs text-gray-300">
              上のフォームから食事を記録してください
            </p>
          </div>
        ) : (
          <MealList
            meals={meals as MealRecord[]}
            onDelete={remove}
            isDeleting={isDeleting}
          />
        )}

        {/* Link to meal history page */}
        <div className="mt-4 text-center">
          <Link
            to="/meals/history"
            className="text-xs text-emerald-600 hover:text-emerald-700 hover:underline"
          >
            過去の記録を見る →
          </Link>
        </div>
      </div>
    </div>
  );
}
