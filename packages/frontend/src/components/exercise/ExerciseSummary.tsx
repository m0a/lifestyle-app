interface ExerciseSummaryProps {
  totalSets: number;
  totalReps: number;
  count: number;
  byType: Record<string, { sets: number; reps: number }>;
}

export function ExerciseSummary({
  totalSets,
  totalReps,
  count,
  byType,
}: ExerciseSummaryProps) {
  // Sort by sets descending
  const sortedTypes = Object.entries(byType).sort(([, a], [, b]) => b.sets - a.sets);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {/* Total Sets */}
      <div className="card p-4">
        <p className="text-xs text-gray-400">今週の総セット数</p>
        <p className="mt-1 text-xl font-bold text-gray-900 tabular-nums sm:text-2xl">
          {totalSets} <span className="text-xs font-normal text-gray-400">セット</span>
        </p>
        <p className="mt-2 text-xs text-gray-400">
          総レップ数: {totalReps}回
        </p>
      </div>

      {/* Session Count */}
      <div className="card p-4">
        <p className="text-xs text-gray-400">運動回数</p>
        <p className="mt-1 text-xl font-bold text-gray-900 tabular-nums sm:text-2xl">
          {count} <span className="text-xs font-normal text-gray-400">回</span>
        </p>
        <p className="mt-2 text-xs text-gray-400">
          平均: {count > 0 ? Math.round(totalSets / count) : 0}セット/回
        </p>
      </div>

      {/* By Type */}
      <div className="card p-4 sm:col-span-2 lg:col-span-1">
        <p className="text-xs text-gray-400 mb-2">種目別</p>
        {sortedTypes.length > 0 ? (
          <div className="space-y-1.5">
            {sortedTypes.slice(0, 4).map(([type, stats]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 truncate">{type}</span>
                <span className="text-sm font-medium text-gray-900 tabular-nums">
                  {stats.sets}×{Math.round(stats.reps / stats.sets)}
                </span>
              </div>
            ))}
            {sortedTypes.length > 4 && (
              <p className="text-xs text-gray-400">
                他 {sortedTypes.length - 4} 種目
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400">データなし</p>
        )}
      </div>
    </div>
  );
}
