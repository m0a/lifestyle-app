import { useState } from 'react';
import type { MealRecord, UpdateMealInput } from '@lifestyle-app/shared';
import { MEAL_TYPE_LABELS } from '@lifestyle-app/shared';

interface MealListProps {
  meals: MealRecord[];
  onUpdate: (params: { id: string; input: UpdateMealInput }) => void;
  onDelete: (id: string) => void;
  isUpdating?: boolean;
  isDeleting?: boolean;
}

export function MealList({
  meals,
  onUpdate,
  onDelete,
  isUpdating,
  isDeleting,
}: MealListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>('');
  const [editCalories, setEditCalories] = useState<number | undefined>(undefined);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleEdit = (meal: MealRecord) => {
    setEditingId(meal.id);
    setEditContent(meal.content);
    setEditCalories(meal.calories ?? undefined);
  };

  const handleSave = (id: string) => {
    onUpdate({
      id,
      input: {
        content: editContent,
        calories: editCalories,
      },
    });
    setEditingId(null);
  };

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
                ) : editingId === meal.id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full rounded border border-gray-300 px-3 py-2"
                    />
                    <div className="flex items-center gap-4">
                      <input
                        type="number"
                        value={editCalories ?? ''}
                        onChange={(e) =>
                          setEditCalories(e.target.value ? parseInt(e.target.value) : undefined)
                        }
                        placeholder="カロリー"
                        className="w-32 rounded border border-gray-300 px-3 py-2"
                      />
                      <span className="text-gray-500">kcal</span>
                      <div className="ml-auto flex gap-2">
                        <button
                          onClick={() => handleSave(meal.id)}
                          disabled={isUpdating}
                          className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          保存
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded bg-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-300"
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${getMealTypeColor(
                            meal.mealType
                          )}`}
                        >
                          {MEAL_TYPE_LABELS[meal.mealType as keyof typeof MEAL_TYPE_LABELS]}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(meal.recordedAt).toLocaleTimeString('ja-JP', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="mt-2 text-gray-900">{meal.content}</p>
                      {meal.calories && (
                        <p className="mt-1 text-sm text-gray-500">
                          {meal.calories.toLocaleString()} kcal
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(meal)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(meal.id)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        削除
                      </button>
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
