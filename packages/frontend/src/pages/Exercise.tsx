import { useNavigate } from 'react-router-dom';
import { useExercises } from '../hooks/useExercises';
import { StrengthInput } from '../components/exercise/StrengthInput';
import { ExerciseList } from '../components/exercise/ExerciseList';
import { ExerciseSummary } from '../components/exercise/ExerciseSummary';
import { RestTimer } from '../components/exercise/RestTimer';

export function Exercise() {
  const navigate = useNavigate();

  // Get today's date for the image generation link
  const today = new Date().toISOString().split('T')[0];

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
    fetchLastSession,
  } = useExercises();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-orange-200 border-t-orange-500" />
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
      <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">運動記録</h1>

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
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">筋トレを記録</h2>
          <RestTimer defaultSeconds={60} incrementSeconds={60} />
        </div>
        <StrengthInput
          onSubmit={create}
          isLoading={isCreating}
          error={createError}
          onFetchLastRecord={fetchLastRecord}
          onFetchLastSession={fetchLastSession}
          customTypes={exerciseTypes}
        />
      </div>

      {/* History List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-900">記録履歴</h2>
            <button
              onClick={() => navigate(`/exercises/image?date=${today}`)}
              className="flex items-center gap-1 bg-orange-500 text-white px-2.5 py-1 rounded-lg text-xs font-medium hover:bg-orange-600 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              共有
            </button>
          </div>
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
