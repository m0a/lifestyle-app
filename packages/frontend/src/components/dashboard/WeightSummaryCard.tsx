import { Link } from 'react-router-dom';

interface WeightSummaryCardProps {
  startWeight: number | null;
  endWeight: number | null;
  change: number | null;
  recordCount: number;
}

export function WeightSummaryCard({
  startWeight: _startWeight,
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
    if (value === null) return 'text-gray-400';
    if (value < 0) return 'text-emerald-600';
    if (value > 0) return 'text-red-500';
    return 'text-gray-500';
  };

  return (
    <div className="card p-5" data-testid="weight-summary-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
            </svg>
          </span>
          <h3 className="text-sm font-semibold text-gray-900">体重</h3>
        </div>
        <Link to="/weight" className="text-xs text-gray-400 hover:text-blue-600 transition-colors">
          詳細 →
        </Link>
      </div>

      {hasData ? (
        <div className="space-y-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-gray-900 tabular-nums">
              {endWeight?.toFixed(1)}
            </span>
            <span className="text-sm text-gray-400">kg</span>
          </div>

          <div className="flex items-center gap-2" data-testid="weight-change">
            <span className={`text-sm font-medium ${getChangeColor(change)}`}>
              {formatChange(change)}
            </span>
            {change !== null && (
              <span className="text-xs text-gray-400">
                {change < 0 ? '減少' : change > 0 ? '増加' : '維持'}
              </span>
            )}
          </div>

          <div className="text-xs text-gray-400">
            記録: {recordCount}回
          </div>
        </div>
      ) : (
        <div className="py-4 text-center">
          <p className="text-sm text-gray-400">データなし</p>
          <Link to="/weight" className="mt-1 inline-block text-xs text-blue-600 hover:text-blue-700">
            体重を記録する →
          </Link>
        </div>
      )}
    </div>
  );
}
