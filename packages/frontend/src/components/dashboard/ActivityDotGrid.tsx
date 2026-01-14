import type { DailyActivity } from '../../hooks/useActivityDots';

interface ActivityDotGridProps {
  activities: DailyActivity[];
  isLoading?: boolean;
}

/**
 * 800 dots grid visualization for daily activity tracking.
 * Simple, minimal design - just dots with size indicating activity level.
 *
 * Layout: 25 columns x 32 rows = 800 dots (taller for better visibility)
 */
export function ActivityDotGrid({ activities, isLoading }: ActivityDotGridProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
      </div>
    );
  }

  if (activities.length === 0) {
    return null;
  }

  return (
    <div
      className="grid gap-1"
      style={{
        gridTemplateColumns: 'repeat(25, 1fr)',
      }}
    >
      {activities.map((activity) => (
        <Dot key={activity.date} activity={activity} />
      ))}
    </div>
  );
}

interface DotProps {
  activity: DailyActivity;
}

function Dot({ activity }: DotProps) {
  // Larger dot sizes for better visibility (4-10px)
  const sizeMap: Record<number, string> = {
    0: '4px',
    1: '6px',
    2: '8px',
    3: '10px',
  };

  // Color based on level
  const colorMap: Record<number, string> = {
    0: 'bg-gray-200',
    1: 'bg-green-300',
    2: 'bg-green-500',
    3: 'bg-green-700',
  };

  const size = sizeMap[activity.level] || '4px';
  const color = colorMap[activity.level] || 'bg-gray-200';

  return (
    <div
      className="flex items-center justify-center"
      style={{
        aspectRatio: '1',
      }}
    >
      <span
        className={`rounded-full ${color}`}
        style={{
          width: size,
          height: size,
        }}
      />
    </div>
  );
}
