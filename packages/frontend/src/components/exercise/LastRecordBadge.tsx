import type { ExerciseRecord } from '@lifestyle-app/shared';

interface LastRecordBadgeProps {
  record: ExerciseRecord | null;
  sessionCount?: number;
  onCopy: () => void;
  isLoading?: boolean;
}

export function LastRecordBadge({ record, sessionCount = 1, onCopy, isLoading }: LastRecordBadgeProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
        読み込み中...
      </div>
    );
  }

  if (!record) {
    return null;
  }

  const formatExercise = (exercise: ExerciseRecord) => {
    const weightStr = exercise.weight ? ` ${exercise.weight}kg` : '';
    return `${exercise.reps}回${weightStr}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2">
      <div className="flex-1">
        <span className="text-sm text-gray-600">
          前回: {sessionCount > 1 ? `${sessionCount}セット` : formatExercise(record)}
        </span>
        <span className="ml-2 text-xs text-gray-400">
          ({formatDate(record.recordedAt)})
        </span>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="rounded bg-orange-100 px-3 py-1 text-sm font-medium text-orange-700 hover:bg-orange-200 transition-colors"
      >
        前回と同じ
      </button>
    </div>
  );
}
