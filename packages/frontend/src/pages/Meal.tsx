import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useMeals } from '../hooks/useMeals';
import { MealList } from '../components/meal/MealList';
import { CalorieSummary } from '../components/meal/CalorieSummary';
import { SmartMealInput } from '../components/meal/SmartMealInput';
import { mealAnalysisApi } from '../lib/api';
import { api } from '../lib/client';
import { getTodayDateString } from '../lib/dateValidation';
import type { MealType, MealRecord } from '@lifestyle-app/shared';
import { MEAL_TYPE_LABELS } from '@lifestyle-app/shared';

export function Meal() {
  const [filterType, setFilterType] = useState<MealType | ''>('');

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
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <p className="text-red-700">データの読み込みに失敗しました</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">食事記録</h1>
        <p className="mt-1 text-gray-600">日々の食事を記録して、カロリー管理をしましょう</p>
      </div>

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

      {/* Smart Meal Input (T018) */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">食事記録</h2>
        <SmartMealInput onSave={handleSmartSave} onRefresh={refresh} />
      </div>

      {/* Filter and Today's History */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">今日の記録</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="filter" className="text-sm text-gray-600">
                フィルター:
              </label>
              <select
                id="filter"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as MealType | '')}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              >
                <option value="">すべて</option>
                {Object.entries(MEAL_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Empty state when no meals today */}
        {meals.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-gray-500">今日の記録はありません</p>
            <p className="mt-2 text-sm text-gray-400">
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
            className="text-sm text-green-600 hover:text-green-700 hover:underline"
          >
            過去の記録を見る →
          </Link>
        </div>
      </div>
    </div>
  );
}
