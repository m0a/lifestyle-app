import { useState } from 'react';
import { useMeals } from '../hooks/useMeals';
import { MealInput } from '../components/meal/MealInput';
import { MealList } from '../components/meal/MealList';
import { CalorieSummary } from '../components/meal/CalorieSummary';
import type { MealType } from '@lifestyle-app/shared';
import { MEAL_TYPE_LABELS } from '@lifestyle-app/shared';

export function Meal() {
  const [filterType, setFilterType] = useState<MealType | ''>('');

  const {
    meals,
    todaySummary,
    isLoading,
    error,
    create,
    update,
    remove,
    isCreating,
    isUpdating,
    isDeleting,
    createError,
  } = useMeals(filterType ? { mealType: filterType } : undefined);

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
        />
      )}

      {/* Input Form */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">食事を記録</h2>
        <MealInput
          onSubmit={create}
          isLoading={isCreating}
          error={createError}
        />
      </div>

      {/* Filter and History */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">記録履歴</h2>
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
        <MealList
          meals={meals}
          onUpdate={update}
          onDelete={remove}
          isUpdating={isUpdating}
          isDeleting={isDeleting}
        />
      </div>
    </div>
  );
}
