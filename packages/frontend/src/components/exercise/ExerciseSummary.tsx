interface ExerciseSummaryProps {
  totalMinutes: number;
  count: number;
  byType: Record<string, number>;
  targetMinutes?: number;
}

export function ExerciseSummary({
  totalMinutes,
  count,
  byType,
  targetMinutes = 150, // WHO recommended: 150 minutes/week
}: ExerciseSummaryProps) {
  const progress = Math.min((totalMinutes / targetMinutes) * 100, 100);
  const isAchieved = totalMinutes >= targetMinutes;

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}分`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}時間${mins}分` : `${hours}時間`;
  };

  // Sort by duration descending
  const sortedTypes = Object.entries(byType).sort(([, a], [, b]) => b - a);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* Total Time */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-500">今週の運動時間</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">
          {formatDuration(totalMinutes)}
        </p>
        <div className="mt-2">
          <div className="h-2 overflow-hidden rounded-full bg-gray-200">
            <div
              className={`h-full rounded-full transition-all ${
                isAchieved ? 'bg-green-500' : 'bg-orange-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            目標: {formatDuration(targetMinutes)}/週
          </p>
        </div>
      </div>

      {/* Session Count */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-500">運動回数</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">
          {count} <span className="text-sm font-normal">回</span>
        </p>
        <p className="mt-2 text-xs text-gray-500">
          平均: {count > 0 ? formatDuration(Math.round(totalMinutes / count)) : '-'}/回
        </p>
      </div>

      {/* By Type */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 sm:col-span-2 lg:col-span-1">
        <p className="text-sm text-gray-500 mb-2">種目別</p>
        {sortedTypes.length > 0 ? (
          <div className="space-y-2">
            {sortedTypes.slice(0, 4).map(([type, minutes]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{type}</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatDuration(minutes)}
                </span>
              </div>
            ))}
            {sortedTypes.length > 4 && (
              <p className="text-xs text-gray-500">
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
