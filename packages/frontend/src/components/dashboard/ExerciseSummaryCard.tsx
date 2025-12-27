import { Link } from 'react-router-dom';

interface ExerciseSummaryCardProps {
  totalMinutes: number;
  sessionCount: number;
  averageMinutes: number;
  byType: Record<string, number>;
  targetMinutes?: number;
}

export function ExerciseSummaryCard({
  totalMinutes,
  sessionCount,
  averageMinutes,
  byType,
  targetMinutes = 150, // WHO recommendation
}: ExerciseSummaryCardProps) {
  const hasData = sessionCount > 0;
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
    <div
      className="rounded-lg border border-gray-200 bg-white p-6"
      data-testid="exercise-summary-card"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">運動サマリー</h3>
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
              {formatDuration(totalMinutes)}
            </span>
          </div>

          {/* Progress bar toward weekly goal */}
          <div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
              <div
                className={`h-full rounded-full transition-all ${
                  isAchieved ? 'bg-green-500' : 'bg-orange-500'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              週間目標: {formatDuration(targetMinutes)} ({Math.round(progress)}%)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">運動回数</p>
              <p className="font-medium text-gray-900">{sessionCount}回</p>
            </div>
            <div>
              <p className="text-gray-500">平均時間</p>
              <p className="font-medium text-gray-900">
                {formatDuration(Math.round(averageMinutes))}
              </p>
            </div>
          </div>

          {sortedTypes.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">種目別</p>
              <div className="space-y-1">
                {sortedTypes.slice(0, 3).map(([type, minutes]) => (
                  <div
                    key={type}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-700">{type}</span>
                    <span className="font-medium text-gray-900">
                      {formatDuration(minutes)}
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
            運動を記録する →
          </Link>
        </div>
      )}
    </div>
  );
}
