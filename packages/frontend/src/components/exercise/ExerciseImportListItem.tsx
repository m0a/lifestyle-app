import { memo } from 'react';
import type { ExerciseImportSummary } from '@lifestyle-app/shared';

interface ExerciseImportListItemProps {
  exercise: ExerciseImportSummary;
  onSelect: (exercise: ExerciseImportSummary) => void;
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

export const ExerciseImportListItem = memo(function ExerciseImportListItem({
  exercise,
  onSelect,
}: ExerciseImportListItemProps) {
  const handleClick = () => {
    onSelect(exercise);
  };

  const muscleGroupLabel = exercise.muscleGroup
    ? muscleGroupLabels[exercise.muscleGroup] || exercise.muscleGroup
    : null;

  const muscleGroupColor = exercise.muscleGroup
    ? muscleGroupColors[exercise.muscleGroup] || muscleGroupColors['other']
    : muscleGroupColors['other'];

  // Accessible label for screen readers
  const ariaLabel = `${exercise.exerciseType}、${muscleGroupLabel || ''}、${exercise.displaySets}、${exercise.timestamp}を取り込む`;

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full text-left rounded-lg border border-gray-200 p-4 hover:border-orange-300 hover:bg-orange-50 hover:shadow-md transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
      aria-label={ariaLabel}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 mb-1">
            {exercise.exerciseType}
          </h3>
          {muscleGroupLabel && (
            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${muscleGroupColor}`}>
              {muscleGroupLabel}
            </span>
          )}
        </div>
        <span className="text-sm text-gray-500 ml-2">
          {exercise.timestamp}
        </span>
      </div>

      <div className="text-sm text-gray-600">
        {exercise.displaySets}
      </div>
    </button>
  );
});
