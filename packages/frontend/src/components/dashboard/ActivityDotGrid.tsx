import { useState, useCallback, useRef } from 'react';
import type { DailyActivity } from '../../hooks/useActivityDots';

interface ActivityDotGridProps {
  activities: DailyActivity[];
  isLoading?: boolean;
}

interface FocusState {
  index: number;
  x: number;
  y: number;
}

const COLUMNS = 25;
const BASE_SIZES = [2, 6, 12, 18]; // Level 0-3 base sizes
const MAX_SCALE = 3; // Maximum scale factor for center dot
const LENS_RADIUS = 3; // Number of dots affected by lens

/**
 * 800 dots grid with fisheye lens effect on touch/hover.
 * Shows date, weight, calories, exercise in the center of the lens.
 */
export function ActivityDotGrid({ activities, isLoading }: ActivityDotGridProps) {
  const [focus, setFocus] = useState<FocusState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate which dot is being hovered
    const cellWidth = rect.width / COLUMNS;
    const cellHeight = cellWidth; // Square cells
    const col = Math.floor(x / cellWidth);
    const row = Math.floor(y / cellHeight);
    const index = row * COLUMNS + col;

    if (index >= 0 && index < activities.length) {
      setFocus({ index, x, y });
    }
  }, [activities.length]);

  const handlePointerLeave = useCallback(() => {
    setFocus(null);
  }, []);

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

  const focusedActivity = focus !== null ? activities[focus.index] : null;

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="grid gap-1 touch-none"
        style={{
          gridTemplateColumns: `repeat(${COLUMNS}, 1fr)`,
        }}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        {activities.map((activity, index) => (
          <Dot
            key={activity.date}
            activity={activity}
            index={index}
            focusIndex={focus?.index ?? null}
          />
        ))}
      </div>

      {/* Info popup */}
      {focus !== null && focusedActivity && (
        <InfoPopup activity={focusedActivity} x={focus.x} y={focus.y} />
      )}
    </div>
  );
}

interface DotProps {
  activity: DailyActivity;
  index: number;
  focusIndex: number | null;
}

function Dot({ activity, index, focusIndex }: DotProps) {
  // Calculate distance from focus
  let scale = 1;
  if (focusIndex !== null) {
    const focusRow = Math.floor(focusIndex / COLUMNS);
    const focusCol = focusIndex % COLUMNS;
    const row = Math.floor(index / COLUMNS);
    const col = index % COLUMNS;

    const distance = Math.sqrt(
      Math.pow(row - focusRow, 2) + Math.pow(col - focusCol, 2)
    );

    if (distance <= LENS_RADIUS) {
      // Smooth falloff: max scale at center, 1 at edge
      scale = 1 + (MAX_SCALE - 1) * Math.pow(1 - distance / LENS_RADIUS, 2);
    }
  }

  const baseSize = BASE_SIZES[activity.level] || 2;
  const size = baseSize * scale;

  // Black-based colors
  const colorMap: Record<number, string> = {
    0: 'bg-gray-300',
    1: 'bg-gray-500',
    2: 'bg-gray-700',
    3: 'bg-black',
  };

  const color = colorMap[activity.level] || 'bg-gray-300';

  return (
    <div
      className="flex items-center justify-center"
      style={{
        aspectRatio: '1',
      }}
    >
      <span
        className={`rounded-full ${color} transition-all duration-75`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
        }}
      />
    </div>
  );
}

interface InfoPopupProps {
  activity: DailyActivity;
  x: number;
  y: number;
}

function InfoPopup({ activity, x, y }: InfoPopupProps) {
  const date = new Date(activity.date);
  const dateStr = date.toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg bg-black/90 px-3 py-2 text-center text-white shadow-lg"
      style={{
        left: x,
        top: y - 80, // Position above the touch point
      }}
    >
      <div className="text-sm font-bold">{dateStr}</div>
      <div className="mt-1 flex gap-2 text-xs">
        {activity.hasWeight && (
          <span className="rounded bg-gray-700 px-1">体重</span>
        )}
        {activity.hasMeal && (
          <span className="rounded bg-gray-700 px-1">食事</span>
        )}
        {activity.hasExercise && (
          <span className="rounded bg-gray-700 px-1">運動</span>
        )}
      </div>
      {activity.level === 0 && (
        <div className="mt-1 text-xs text-gray-400">記録なし</div>
      )}
    </div>
  );
}
