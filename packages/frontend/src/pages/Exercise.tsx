import { useState, useEffect } from 'react';
import { useExercises } from '../hooks/useExercises';
import { StrengthInput } from '../components/exercise/StrengthInput';
import { ExerciseList } from '../components/exercise/ExerciseList';
import { ExerciseSummary } from '../components/exercise/ExerciseSummary';

export function Exercise() {
  const [filterType, setFilterType] = useState<string>('');
  const [allExerciseTypes, setAllExerciseTypes] = useState<string[]>([]);

  const {
    exercises,
    weeklySummary,
    exerciseTypes,
    isLoading,
    error,
    create,
    update,
    remove,
    isCreating,
    isUpdating,
    isDeleting,
    createError,
    fetchLastRecord,
  } = useExercises({ exerciseType: filterType || undefined });

  // Update available exercise types when exercises change (without filter)
  useEffect(() => {
    if (!filterType && exercises.length > 0) {
      const types = [...new Set(exercises.map((e) => e.exerciseType))].sort();
      setAllExerciseTypes(types);
    }
  }, [exercises, filterType]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-t-transparent" />
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
        <h1 className="text-2xl font-bold text-gray-900">運動記録</h1>
        <p className="mt-1 text-gray-600">日々の筋トレを記録して、健康的な習慣を身につけましょう</p>
      </div>

      {/* Weekly Summary */}
      {weeklySummary && (
        <ExerciseSummary
          totalSets={weeklySummary.totalSets}
          totalReps={weeklySummary.totalReps}
          count={weeklySummary.count}
          byType={weeklySummary.byType}
        />
      )}

      {/* Input Form */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">筋トレを記録</h2>
        <StrengthInput
          onSubmit={create}
          isLoading={isCreating}
          error={createError}
          onFetchLastRecord={fetchLastRecord}
          customTypes={exerciseTypes}
        />
      </div>

      {/* History List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">記録履歴</h2>
          {allExerciseTypes.length > 0 && (
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="">すべての種目</option>
              {allExerciseTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          )}
        </div>
        <ExerciseList
          exercises={exercises}
          onUpdate={update}
          onDelete={remove}
          isUpdating={isUpdating}
          isDeleting={isDeleting}
        />
      </div>
    </div>
  );
}
