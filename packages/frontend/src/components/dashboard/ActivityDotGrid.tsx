import { useMemo } from 'react';
import type { DailyActivity } from '../../hooks/useActivityDots';

interface ActivityDotGridProps {
  activities: DailyActivity[];
  isLoading?: boolean;
}

/**
 * 800 dots grid visualization for daily activity tracking.
 * Each dot represents one day, with size indicating the number of activities recorded.
 *
 * Layout: 40 columns x 20 rows = 800 dots
 * Mobile-optimized: fits in ~320px width (40 x 8px per dot)
 */
export function ActivityDotGrid({ activities, isLoading }: ActivityDotGridProps) {
  // Calculate statistics
  const stats = useMemo(() => {
    const total = activities.length;
    const level3 = activities.filter(a => a.level === 3).length;
    const level2 = activities.filter(a => a.level === 2).length;
    const level1 = activities.filter(a => a.level === 1).length;
    const level0 = activities.filter(a => a.level === 0).length;
    const completionRate = total > 0 ? Math.round((level3 / total) * 100) : 0;

    return { total, level3, level2, level1, level0, completionRate };
  }, [activities]);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      {/* Header with stats */}
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-medium text-gray-700">
          {stats.total}日間の記録
        </div>
        <div className="text-sm text-gray-500">
          達成率: <span className="font-semibold text-green-600">{stats.completionRate}%</span>
        </div>
      </div>

      {/* Dot Grid - 40 columns */}
      <div
        className="grid gap-[2px]"
        style={{
          gridTemplateColumns: 'repeat(40, 1fr)',
        }}
      >
        {activities.map((activity) => (
          <Dot key={activity.date} activity={activity} />
        ))}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <span
            className="inline-block rounded-full bg-gray-200"
            style={{ width: '6px', height: '6px' }}
          />
          <span>未入力</span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className="inline-block rounded-full bg-green-300"
            style={{ width: '6px', height: '6px' }}
          />
          <span>1種類</span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className="inline-block rounded-full bg-green-500"
            style={{ width: '6px', height: '6px' }}
          />
          <span>2種類</span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className="inline-block rounded-full bg-green-700"
            style={{ width: '6px', height: '6px' }}
          />
          <span>全記録</span>
        </div>
      </div>

      {/* Period info */}
      <div className="mt-2 flex justify-between text-xs text-gray-400">
        <span>{formatDate(activities[0]?.date)}</span>
        <span>{formatDate(activities[activities.length - 1]?.date)}</span>
      </div>
    </div>
  );
}

interface DotProps {
  activity: DailyActivity;
}

function Dot({ activity }: DotProps) {
  // Dot size based on level (3-6px, centered in 8px cell)
  const sizeMap: Record<number, string> = {
    0: '3px',
    1: '4px',
    2: '5px',
    3: '6px',
  };

  // Color based on level
  const colorMap: Record<number, string> = {
    0: 'bg-gray-200',
    1: 'bg-green-300',
    2: 'bg-green-500',
    3: 'bg-green-700',
  };

  const size = sizeMap[activity.level] || '3px';
  const color = colorMap[activity.level] || 'bg-gray-200';

  // Create tooltip content
  const tooltip = getTooltip(activity);

  return (
    <div
      className="flex items-center justify-center"
      style={{
        width: '100%',
        aspectRatio: '1',
        minHeight: '6px',
      }}
      title={tooltip}
    >
      <span
        className={`rounded-full ${color} transition-transform hover:scale-150`}
        style={{
          width: size,
          height: size,
          minWidth: size,
          minHeight: size,
        }}
      />
    </div>
  );
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function getTooltip(activity: DailyActivity): string {
  const date = formatDate(activity.date);
  const records: string[] = [];

  if (activity.hasMeal) records.push('食事');
  if (activity.hasWeight) records.push('体重');
  if (activity.hasExercise) records.push('運動');

  if (records.length === 0) {
    return `${date}: 記録なし`;
  }

  return `${date}: ${records.join('・')}`;
}
