import { useExercises } from '../hooks/useExercises';
import { ExerciseInput } from '../components/exercise/ExerciseInput';
import { ExerciseList } from '../components/exercise/ExerciseList';
import { ExerciseSummary } from '../components/exercise/ExerciseSummary';

export function Exercise() {
  const {
    exercises,
    weeklySummary,
    isLoading,
    error,
    create,
    update,
    remove,
    isCreating,
    isUpdating,
    isDeleting,
    createError,
  } = useExercises();

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
        <p className="mt-1 text-gray-600">日々の運動を記録して、健康的な習慣を身につけましょう</p>
      </div>

      {/* Weekly Summary */}
      {weeklySummary && (
        <ExerciseSummary
          totalMinutes={weeklySummary.totalMinutes}
          count={weeklySummary.count}
          byType={weeklySummary.byType}
        />
      )}

      {/* Input Form */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">運動を記録</h2>
        <ExerciseInput
          onSubmit={create}
          isLoading={isCreating}
          error={createError}
        />
      </div>

      {/* History List */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">記録履歴</h2>
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
