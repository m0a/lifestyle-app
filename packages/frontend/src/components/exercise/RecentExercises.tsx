import { memo } from 'react';
import type { RecentExerciseItem } from '@lifestyle-app/shared';

interface RecentExercisesProps {
  exercises: RecentExerciseItem[];
  onSelect: (exercise: RecentExerciseItem) => void;
  isLoading?: boolean;
}

const muscleGroupLabels: Record<string, string> = {
  chest: '胸',
  back: '背中',
  legs: '脚',
  shoulders: '肩',
  arms: '腕',
  core: '体幹',
  other: 'その他',
};

const muscleGroupColors: Record<string, string> = {
  chest: 'bg-red-100 text-red-700',
  back: 'bg-blue-100 text-blue-700',
  legs: 'bg-green-100 text-green-700',
  shoulders: 'bg-yellow-100 text-yellow-700',
  arms: 'bg-purple-100 text-purple-700',
  core: 'bg-pink-100 text-pink-700',
  other: 'bg-gray-100 text-gray-600',
};

export const RecentExercises = memo(function RecentExercises({
  exercises,
  onSelect,
  isLoading = false,
}: RecentExercisesProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-4" role="status" aria-label="読み込み中">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
      </div>
    );
  }

  if (exercises.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-gray-500" role="status" aria-live="polite">
        最近のトレーニング記録がありません
      </div>
    );
  }

  return (
    <div className="space-y-2" role="list" aria-label="最近のワークアウト">
      {exercises.map((exercise) => {
        const muscleGroupLabel = exercise.muscleGroup
          ? muscleGroupLabels[exercise.muscleGroup] || exercise.muscleGroup
          : null;

        const muscleGroupColor = exercise.muscleGroup
          ? muscleGroupColors[exercise.muscleGroup] || muscleGroupColors['other']
          : muscleGroupColors['other'];

        // Accessible label for screen readers
        const ariaLabel = `${exercise.exerciseType}、${muscleGroupLabel || ''}、${exercise.preview}、${exercise.lastPerformedDate} ${exercise.lastPerformedTime}を取り込む`;

        return (
          <div key={exercise.id} role="listitem">
            <button
              type="button"
              onClick={() => onSelect(exercise)}
              className="w-full text-left rounded-lg border border-gray-200 p-3 hover:border-orange-300 hover:bg-orange-50 hover:shadow-md transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
              aria-label={ariaLabel}
            >
            <div className="flex items-start justify-between mb-1">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900 mb-1">
                  {exercise.exerciseType}
                </h4>
                {muscleGroupLabel && (
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${muscleGroupColor}`}>
                    {muscleGroupLabel}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 ml-2">
                <div>{exercise.lastPerformedDate}</div>
                <div>{exercise.lastPerformedTime}</div>
              </div>
            </div>

            <div className="text-xs text-gray-600">
              {exercise.preview}
            </div>
          </button>
          </div>
        );
      })}
    </div>
  );
});
