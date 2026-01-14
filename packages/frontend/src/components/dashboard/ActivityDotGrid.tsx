import { useState, useCallback, useRef, useMemo } from 'react';
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
const MAX_SCALE = 5; // Maximum scale factor for center dot
const LENS_RADIUS = 4; // Number of dots affected by lens

/**
 * 800 dots grid with fisheye lens effect on touch/hover.
 * Shows date, weight, calories, exercise in the center of the lens.
 */
export function ActivityDotGrid({ activities, isLoading }: ActivityDotGridProps) {
  const [focus, setFocus] = useState<FocusState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reverse activities so newest is at top-left
  const reversedActivities = useMemo(
    () => [...activities].reverse(),
    [activities]
  );

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

    if (index >= 0 && index < reversedActivities.length) {
      setFocus({ index, x, y });
    }
  }, [reversedActivities.length]);

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

  if (reversedActivities.length === 0) {
    return null;
  }

  const focusedActivity = focus !== null ? reversedActivities[focus.index] : null;

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
        {reversedActivities.map((activity, index) => (
          <Dot
            key={activity.date}
            activity={activity}
            index={index}
            focusIndex={focus?.index ?? null}
          />
        ))}
      </div>

      {/* Info popup - fixed at top */}
      {focus !== null && focusedActivity && (
        <InfoPopup activity={focusedActivity} />
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
  let offsetX = 0;
  let offsetY = 0;

  if (focusIndex !== null) {
    const focusRow = Math.floor(focusIndex / COLUMNS);
    const focusCol = focusIndex % COLUMNS;
    const row = Math.floor(index / COLUMNS);
    const col = index % COLUMNS;

    const dx = col - focusCol;
    const dy = row - focusRow;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= LENS_RADIUS && distance > 0) {
      // Smooth falloff: max scale at center, 1 at edge
      const factor = Math.pow(1 - distance / LENS_RADIUS, 2);
      scale = 1 + (MAX_SCALE - 1) * factor;

      // Pull dots toward center (fisheye distortion effect)
      const pullStrength = factor * 8; // pixels to pull toward center
      offsetX = -(dx / distance) * pullStrength;
      offsetY = -(dy / distance) * pullStrength;
    } else if (distance === 0) {
      scale = MAX_SCALE;
    }
  }

  const baseSize = BASE_SIZES[activity.level] || 2;

  // Black-based colors
  const colorMap: Record<number, string> = {
    0: 'bg-gray-300',
    1: 'bg-gray-500',
    2: 'bg-gray-700',
    3: 'bg-black',
  };

  const color = colorMap[activity.level] || 'bg-gray-300';

  // Use transform scale instead of width/height to avoid layout shifts
  return (
    <div
      className="flex items-center justify-center"
      style={{
        aspectRatio: '1',
      }}
    >
      <span
        className={`rounded-full ${color} transition-transform duration-100`}
        style={{
          width: `${baseSize}px`,
          height: `${baseSize}px`,
          transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
        }}
      />
    </div>
  );
}

function InfoPopup({ activity }: { activity: DailyActivity }) {
  const date = new Date(activity.date);
  const dateStr = date.toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
  });

  // Fixed position at top of grid
  return (
    <div className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-black/95 px-4 py-2 text-center text-white shadow-xl">
      <div className="text-base font-bold">{dateStr}</div>
      <div className="mt-1 flex justify-center gap-2 text-xs">
        {activity.hasWeight && (
          <span className="rounded bg-white/20 px-2 py-0.5">体重</span>
        )}
        {activity.hasMeal && (
          <span className="rounded bg-white/20 px-2 py-0.5">食事</span>
        )}
        {activity.hasExercise && (
          <span className="rounded bg-white/20 px-2 py-0.5">運動</span>
        )}
      </div>
      {activity.level === 0 && (
        <div className="mt-1 text-xs text-gray-400">記録なし</div>
      )}
      {/* Arrow pointing down */}
      <div className="absolute left-1/2 top-full -translate-x-1/2 border-8 border-transparent border-t-black/95" />
    </div>
  );
}
