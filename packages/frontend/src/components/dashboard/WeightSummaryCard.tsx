import { Link } from 'react-router-dom';

interface WeightSummaryCardProps {
  startWeight: number | null;
  endWeight: number | null;
  change: number | null;
  recordCount: number;
}

export function WeightSummaryCard({
  startWeight,
  endWeight,
  change,
  recordCount,
}: WeightSummaryCardProps) {
  const hasData = endWeight !== null;

  const formatChange = (value: number | null) => {
    if (value === null) return null;
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)} kg`;
  };

  const getChangeColor = (value: number | null) => {
    if (value === null) return 'text-gray-500';
    if (value < 0) return 'text-green-600';
    if (value > 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div
      className="rounded-lg border border-gray-200 bg-white p-6"
      data-testid="weight-summary-card"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">体重サマリー</h3>
        <Link
          to="/weight"
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          詳細 →
        </Link>
      </div>

      {hasData ? (
        <div className="space-y-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">
              {endWeight?.toFixed(1)}
            </span>
            <span className="text-lg text-gray-500">kg</span>
          </div>

          <div
            className="flex items-center gap-2"
            data-testid="weight-change"
          >
            <span className={`text-sm font-medium ${getChangeColor(change)}`}>
              {formatChange(change)}
            </span>
            {change !== null && (
              <span className="text-xs text-gray-500">
                {change < 0 ? '減少' : change > 0 ? '増加' : '維持'}
              </span>
            )}
          </div>

          <div className="text-xs text-gray-500">
            期間中の記録: {recordCount}回
          </div>
        </div>
      ) : (
        <div className="py-6 text-center">
          <p className="text-gray-500">データなし</p>
          <Link
            to="/weight"
            className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-800"
          >
            体重を記録する →
          </Link>
        </div>
      )}
    </div>
  );
}
