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
  // Size with strong contrast: dot level (2px) to large (12px)
  const sizeMap: Record<number, string> = {
    0: '2px',
    1: '5px',
    2: '8px',
    3: '12px',
  };

  // Black-based colors
  const colorMap: Record<number, string> = {
    0: 'bg-gray-300',
    1: 'bg-gray-500',
    2: 'bg-gray-700',
    3: 'bg-black',
  };

  const size = sizeMap[activity.level] || '2px';
  const color = colorMap[activity.level] || 'bg-gray-300';

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
