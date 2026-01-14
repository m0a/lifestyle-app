import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import type { DailyActivity } from '../../hooks/useActivityDots';

interface ActivityDotGridProps {
  activities: DailyActivity[];
  isLoading?: boolean;
}

interface FocusTarget {
  col: number;
  row: number;
  cellSize: number;
}

interface LensPosition {
  col: number;
  row: number;
  index: number;
  centerX: number;
  centerY: number;
  cellSize: number;
}

const COLUMNS = 25;
const BASE_SIZES = [2, 6, 12, 18]; // Level 0-3 base sizes
const MAX_SCALE = 5; // Maximum scale factor for center dot
const LENS_RADIUS = 4; // Number of dots affected by lens
const LERP_SPEED = 0.15; // Smoothing factor (0-1, lower = smoother)

/**
 * 800 dots grid with fisheye lens effect on touch/hover.
 * Shows date, weight, calories, exercise in the center of the lens.
 */
export function ActivityDotGrid({ activities, isLoading }: ActivityDotGridProps) {
  const [target, setTarget] = useState<FocusTarget | null>(null);
  const [lens, setLens] = useState<LensPosition | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentPosRef = useRef({ col: 0, row: 0 });
  const animationRef = useRef<number>();

  // Reverse activities so newest is at top-left
  const reversedActivities = useMemo(
    () => [...activities].reverse(),
    [activities]
  );

  // Smooth animation loop
  useEffect(() => {
    if (!target) {
      setLens(null);
      return;
    }

    const animate = () => {
      const current = currentPosRef.current;

      // Lerp toward target
      current.col += (target.col - current.col) * LERP_SPEED;
      current.row += (target.row - current.row) * LERP_SPEED;

      // Calculate snapped index for the activity lookup
      const snappedCol = Math.round(current.col);
      const snappedRow = Math.round(current.row);
      const index = snappedRow * COLUMNS + snappedCol;

      if (index >= 0 && index < reversedActivities.length) {
        setLens({
          col: current.col,
          row: current.row,
          index,
          centerX: (current.col + 0.5) * target.cellSize,
          centerY: (current.row + 0.5) * target.cellSize,
          cellSize: target.cellSize,
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [target, reversedActivities.length]);

  // On pointer down, jump immediately to new position (like lifting mouse)
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const cellWidth = rect.width / COLUMNS;
    const col = Math.floor(x / cellWidth);
    const row = Math.floor(y / cellWidth);
    const index = row * COLUMNS + col;

    if (index >= 0 && index < reversedActivities.length) {
      // Immediately jump to new position
      currentPosRef.current = { col, row };
      setTarget({ col, row, cellSize: cellWidth });
    }
  }, [reversedActivities.length]);

  // On pointer move, smoothly follow (like dragging mouse)
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!containerRef.current || !target) return; // Only follow if already touching

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const cellWidth = rect.width / COLUMNS;
    const col = Math.floor(x / cellWidth);
    const row = Math.floor(y / cellWidth);
    const index = row * COLUMNS + col;

    if (index >= 0 && index < reversedActivities.length) {
      setTarget({ col, row, cellSize: cellWidth });
    }
  }, [reversedActivities.length, target]);

  const handlePointerLeave = useCallback(() => {
    setTarget(null);
  }, []);

  const handlePointerUp = useCallback(() => {
    setTarget(null);
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

  const focusedActivity = lens !== null ? reversedActivities[lens.index] : null;

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="grid gap-1 touch-none"
        style={{
          gridTemplateColumns: `repeat(${COLUMNS}, 1fr)`,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
      >
        {reversedActivities.map((activity, index) => (
          <Dot
            key={activity.date}
            activity={activity}
            index={index}
            lensPos={lens}
          />
        ))}
      </div>

      {/* Lens circle indicator */}
      {lens !== null && (
        <LensCircle
          centerX={lens.centerX}
          centerY={lens.centerY}
          radius={LENS_RADIUS * lens.cellSize}
        />
      )}

      {/* Info popup - fixed at top */}
      {lens !== null && focusedActivity && (
        <InfoPopup activity={focusedActivity} />
      )}
    </div>
  );
}

interface DotProps {
  activity: DailyActivity;
  index: number;
  lensPos: LensPosition | null;
}

function Dot({ activity, index, lensPos }: DotProps) {
  // Calculate distance from lens center (using smooth float position)
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  if (lensPos !== null) {
    const row = Math.floor(index / COLUMNS);
    const col = index % COLUMNS;

    // Use smooth lens position for distance calculation
    const dx = col - lensPos.col;
    const dy = row - lensPos.row;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= LENS_RADIUS && distance > 0) {
      // Smooth falloff: max scale at center, 1 at edge
      const factor = Math.pow(1 - distance / LENS_RADIUS, 2);
      scale = 1 + (MAX_SCALE - 1) * factor;

      // Pull dots toward center (fisheye distortion effect)
      const pullStrength = factor * 8; // pixels to pull toward center
      offsetX = -(dx / distance) * pullStrength;
      offsetY = -(dy / distance) * pullStrength;
    } else if (distance < 0.5) {
      // Very close to center
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

function LensCircle({ centerX, centerY, radius }: { centerX: number; centerY: number; radius: number }) {
  return (
    <div
      className="pointer-events-none absolute rounded-full border-2 border-gray-400/50"
      style={{
        left: centerX - radius,
        top: centerY - radius,
        width: radius * 2,
        height: radius * 2,
      }}
    />
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
      {activity.level > 0 ? (
        <div className="mt-1 flex justify-center gap-3 text-xs">
          {activity.weight !== null && (
            <span className="rounded bg-white/20 px-2 py-0.5">
              {activity.weight.toFixed(1)}kg
            </span>
          )}
          {activity.calories !== null && (
            <span className="rounded bg-white/20 px-2 py-0.5">
              {activity.calories}kcal
            </span>
          )}
          {activity.exerciseSets !== null && (
            <span className="rounded bg-white/20 px-2 py-0.5">
              {activity.exerciseSets}セット
            </span>
          )}
        </div>
      ) : (
        <div className="mt-1 text-xs text-gray-400">記録なし</div>
      )}
      {/* Arrow pointing down */}
      <div className="absolute left-1/2 top-full -translate-x-1/2 border-8 border-transparent border-t-black/95" />
    </div>
  );
}
