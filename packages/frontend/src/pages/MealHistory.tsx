import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMeals } from '../hooks/useMeals';
import { MealList } from '../components/meal/MealList';
import { MealCalendar } from '../components/meal/MealCalendar';
import { getTodayDateString, formatDateString } from '../lib/dateValidation';
import type { MealRecord } from '@lifestyle-app/shared';

export function MealHistory() {
  // Initialize with today's date
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());

  // Fetch meals for the selected date
  const mealsOptions = useMemo(() => ({
    startDate: selectedDate,
    endDate: selectedDate,
  }), [selectedDate]);

  const {
    meals,
    isLoading,
    error,
    remove,
    isDeleting,
  } = useMeals(mealsOptions);

  // Format the selected date for display
  const formattedDate = useMemo(() => {
    const date = new Date(selectedDate + 'T00:00:00');
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
  }, [selectedDate]);

  // Handle date selection from calendar
  const handleDateSelect = (date: Date) => {
    setSelectedDate(formatDateString(date));
  };

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <p className="text-red-700">データの読み込みに失敗しました</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with back link */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">食事履歴</h1>
          <p className="mt-1 text-gray-600">過去の食事記録を確認できます</p>
        </div>
        <Link
          to="/meals"
          className="text-sm text-green-600 hover:text-green-700 hover:underline"
        >
          ← 今日の食事に戻る
        </Link>
      </div>

      {/* Calendar */}
      <MealCalendar
        selectedDate={new Date(selectedDate + 'T00:00:00')}
        onDateSelect={handleDateSelect}
      />

      {/* Selected date meals */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          {formattedDate}の記録
        </h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
          </div>
        ) : meals.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-gray-500">この日の記録はありません</p>
          </div>
        ) : (
          <MealList
            meals={meals as MealRecord[]}
            onDelete={remove}
            isDeleting={isDeleting}
          />
        )}
      </div>
    </div>
  );
}

export default MealHistory;
