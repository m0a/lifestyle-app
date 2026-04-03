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
  const sortedTypes = Object.entries(byType).sort(([, a], [, b]) => b.sets - a.sets);

  return (
    <div className="card p-5" data-testid="exercise-summary-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </span>
          <h3 className="text-sm font-semibold text-gray-900">筋トレ</h3>
        </div>
        <Link to="/exercises" className="text-xs text-gray-400 hover:text-orange-500 transition-colors">
          詳細 →
        </Link>
      </div>

      {hasData ? (
        <div className="space-y-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-gray-900 tabular-nums">
              {totalSets}
            </span>
            <span className="text-sm text-gray-400">セット</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-400">運動回数</p>
              <p className="font-semibold text-gray-900">{sessionCount}回</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">総レップ数</p>
              <p className="font-semibold text-gray-900">{totalReps}回</p>
            </div>
          </div>

          {sortedTypes.length > 0 && (
            <div className="space-y-1.5">
              {sortedTypes.slice(0, 3).map(([type, stats]) => (
                <div key={type} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 truncate">{type}</span>
                  <span className="font-medium text-gray-900 tabular-nums">
                    {stats.sets}×{Math.round(stats.reps / stats.sets)}
                  </span>
                </div>
              ))}
              {sortedTypes.length > 3 && (
                <p className="text-xs text-gray-400">
                  他 {sortedTypes.length - 3} 種目
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="py-4 text-center">
          <p className="text-sm text-gray-400">データなし</p>
          <Link to="/exercises" className="mt-1 inline-block text-xs text-orange-500 hover:text-orange-600">
            筋トレを記録する →
          </Link>
        </div>
      )}
    </div>
  );
}
