import { Link } from 'react-router-dom';

interface ExerciseSummaryCardProps {
  totalSets: number;
  totalReps: number;
  sessionCount: number;
  byType: Record<string, { sets: number; reps: number }>;
}

export function ExerciseSummaryCard({
  totalSets,
  totalReps,
  sessionCount,
  byType,
}: ExerciseSummaryCardProps) {
  const hasData = sessionCount > 0;

  // Sort by sets descending
  const sortedTypes = Object.entries(byType).sort(([, a], [, b]) => b.sets - a.sets);

  return (
    <div
      className="rounded-lg border border-gray-200 bg-white p-6"
      data-testid="exercise-summary-card"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">筋トレサマリー</h3>
        <Link
          to="/exercises"
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          詳細 →
        </Link>
      </div>

      {hasData ? (
        <div className="space-y-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">
              {totalSets}
            </span>
            <span className="text-lg text-gray-600">セット</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">運動回数</p>
              <p className="font-medium text-gray-900">{sessionCount}回</p>
            </div>
            <div>
              <p className="text-gray-500">総レップ数</p>
              <p className="font-medium text-gray-900">{totalReps}回</p>
            </div>
          </div>

          {sortedTypes.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">種目別</p>
              <div className="space-y-1">
                {sortedTypes.slice(0, 3).map(([type, stats]) => (
                  <div
                    key={type}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-700">{type}</span>
                    <span className="font-medium text-gray-900">
                      {stats.sets}×{Math.round(stats.reps / stats.sets)}
                    </span>
                  </div>
                ))}
                {sortedTypes.length > 3 && (
                  <p className="text-xs text-gray-500">
                    他 {sortedTypes.length - 3} 種目
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="py-6 text-center">
          <p className="text-gray-500">データなし</p>
          <Link
            to="/exercises"
            className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-800"
          >
            筋トレを記録する →
          </Link>
        </div>
      )}
    </div>
  );
}
