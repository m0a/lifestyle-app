import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { MealRecord } from '@lifestyle-app/shared';
import { MEAL_TYPE_LABELS } from '@lifestyle-app/shared';
import { getPhotoUrl } from '../../lib/api';

interface MealListProps {
  meals: MealRecord[];
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

export function MealList({
  meals,
  onDelete,
  isDeleting,
}: MealListProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    onDelete(id);
    setDeleteConfirmId(null);
  };

  const getMealTypeColor = (mealType: string) => {
    switch (mealType) {
      case 'breakfast':
        return 'bg-yellow-100 text-yellow-800';
      case 'lunch':
        return 'bg-blue-100 text-blue-800';
      case 'dinner':
        return 'bg-purple-100 text-purple-800';
      case 'snack':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (meals.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
        <p className="text-gray-500">まだ食事の記録がありません</p>
      </div>
    );
  }

  // Group meals by date
  const groupedMeals = meals.reduce(
    (groups, meal) => {
      const date = new Date(meal.recordedAt).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(meal);
      return groups;
    },
    {} as Record<string, MealRecord[]>
  );

  return (
    <div className="space-y-6">
      {Object.entries(groupedMeals).map(([date, dateMeals]) => (
        <div key={date}>
          <h3 className="mb-3 text-sm font-medium text-gray-500">{date}</h3>
          <div className="space-y-3">
            {dateMeals.map((meal) => (
              <div
                key={meal.id}
                className="rounded-lg border border-gray-200 bg-white p-4"
              >
                {deleteConfirmId === meal.id ? (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">この記録を削除しますか？</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(meal.id)}
                        disabled={isDeleting}
                        className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        削除する
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="rounded bg-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-300"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    {/* Photo thumbnail - clickable to detail */}
                    {meal.photoKey && (
                      <Link to={`/meals/${meal.id}`} className="flex-shrink-0">
                        <img
                          src={getPhotoUrl(meal.photoKey) || undefined}
                          alt={meal.content}
                          className="h-16 w-16 rounded-lg object-cover hover:opacity-80 transition-opacity"
                        />
                      </Link>
                    )}
                    <div className="flex flex-1 items-start justify-between">
                      <Link to={`/meals/${meal.id}`} className="flex-1 hover:opacity-80 transition-opacity">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${getMealTypeColor(
                              meal.mealType
                            )}`}
                          >
                            {MEAL_TYPE_LABELS[meal.mealType as keyof typeof MEAL_TYPE_LABELS]}
                          </span>
                          {/* Analysis source badge */}
                          {meal.analysisSource && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs ${
                                meal.analysisSource === 'ai'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {meal.analysisSource === 'ai' ? 'AI分析' : '手動入力'}
                            </span>
                          )}
                          <span className="text-sm text-gray-500">
                            {new Date(meal.recordedAt).toLocaleTimeString('ja-JP', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="mt-1 text-gray-900">{meal.content}</p>
                        {/* Nutrition info */}
                        <div className="mt-1 flex flex-wrap gap-2 text-sm text-gray-500">
                          {meal.calories != null && (
                            <span className="font-medium text-gray-700">
                              {meal.calories.toLocaleString()} kcal
                            </span>
                          )}
                          {meal.totalProtein != null && (
                            <span>P: {meal.totalProtein}g</span>
                          )}
                          {meal.totalFat != null && (
                            <span>F: {meal.totalFat}g</span>
                          )}
                          {meal.totalCarbs != null && (
                            <span>C: {meal.totalCarbs}g</span>
                          )}
                        </div>
                      </Link>
                      <div className="flex gap-2">
                        <Link
                          to={`/meals/${meal.id}`}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          詳細
                        </Link>
                        <button
                          onClick={() => setDeleteConfirmId(meal.id)}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
