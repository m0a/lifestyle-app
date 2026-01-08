import { memo } from 'react';
import type { ExerciseImportSummary } from '@lifestyle-app/shared';
import { ExerciseImportListItem } from './ExerciseImportListItem';
import { ExerciseListSkeleton } from './ExerciseListSkeleton';

interface ExerciseImportListProps {
  exercises: ExerciseImportSummary[];
  onSelect: (exercise: ExerciseImportSummary) => void;
  isLoading?: boolean;
}

export const ExerciseImportList = memo(function ExerciseImportList({
  exercises,
  onSelect,
  isLoading = false,
}: ExerciseImportListProps) {
  if (isLoading) {
    return (
      <div role="status" aria-label="読み込み中">
        <ExerciseListSkeleton />
      </div>
    );
  }

  if (exercises.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500" role="status" aria-live="polite">
        この日はエクササイズが記録されていません
      </div>
    );
  }

  return (
    <div className="space-y-3" role="list" aria-label="選択可能なエクササイズ">
      {exercises.map((exercise) => (
        <div key={exercise.id} role="listitem">
          <ExerciseImportListItem
            exercise={exercise}
            onSelect={onSelect}
          />
        </div>
      ))}
    </div>
  );
});
