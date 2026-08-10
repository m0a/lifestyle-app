import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type TooltipItem,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { WeightRecord } from '@lifestyle-app/shared';
import { useAuthStore } from '../../stores/authStore';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface WeightChartProps {
  weights: WeightRecord[];
}

type PresetKey = '7d' | '30d' | '90d' | 'all';

interface Preset {
  key: PresetKey;
  label: string;
  days: number | null;
}

const PRESETS: Preset[] = [
  { key: '7d', label: '1週間', days: 7 },
  { key: '30d', label: '1ヶ月', days: 30 },
  { key: '90d', label: '3ヶ月', days: 90 },
  { key: 'all', label: '全期間', days: null },
];

const MAP_WIDTH = 600;
const MAP_HEIGHT = 48;
const MAP_PADDING = 4;

const DAY_MS = 24 * 60 * 60 * 1000;

function startIndexForSpan(
  weights: WeightRecord[],
  fromEnd: number,
  days: number | null
): number {
  if (weights.length === 0 || fromEnd < 0) return 0;
  if (days === null) return 0;
  const endTime = new Date(weights[fromEnd]!.recordedAt).getTime();
  const spanMs = days * DAY_MS;
  for (let i = fromEnd; i >= 0; i--) {
    if (endTime - new Date(weights[i]!.recordedAt).getTime() > spanMs) {
      return i + 1;
    }
  }
  return 0;
}

export function WeightChart({ weights }: WeightChartProps) {
  const { user } = useAuthStore();

  // Sort by date ascending for chart display
  const sortedWeights = useMemo(
    () =>
      [...weights].sort(
        (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
      ),
    [weights]
  );

  const [preset, setPreset] = useState<PresetKey>('30d');
  const [endIndex, setEndIndex] = useState(() => sortedWeights.length - 1);
  const dragRef = useRef<{ startPointerIdx: number; startEndIdx: number } | null>(
    null
  );

  const lastIndex = sortedWeights.length - 1;

  // Reset window to the latest data whenever data set changes
  useEffect(() => {
    setEndIndex(lastIndex);
  }, [lastIndex]);

  const presetDef = PRESETS.find((p) => p.key === preset) ?? PRESETS[0]!;
  const windowStart = startIndexForSpan(
    sortedWeights,
    endIndex,
    presetDef.days
  );
  const visibleWeights = sortedWeights.slice(windowStart, endIndex + 1);

  const labels = visibleWeights.map((w) =>
    new Date(w.recordedAt).toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
    })
  );

  const data = {
    labels,
    datasets: [
      {
        label: '体重 (kg)',
        data: visibleWeights.map((w) => w.weight),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      ...(user?.goalWeight
        ? [
            {
              label: '目標体重',
              data: visibleWeights.map(() => user.goalWeight),
              borderColor: 'rgb(34, 197, 94)',
              backgroundColor: 'transparent',
              borderDash: [5, 5],
              pointRadius: 0,
              fill: false,
            },
          ]
        : []),
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: '体重推移',
      },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<'line'>) => {
            const y = context.parsed.y;
            return `${context.dataset.label}: ${y !== null ? y.toFixed(1) : 0} kg`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        title: {
          display: true,
          text: 'kg',
        },
      },
    },
  };

  // Overview minimap geometry
  const minWeight = sortedWeights.length > 0
    ? Math.min(...sortedWeights.map((w) => w.weight))
    : 0;
  const maxWeight = sortedWeights.length > 0
    ? Math.max(...sortedWeights.map((w) => w.weight))
    : 0;
  const weightSpan = maxWeight - minWeight;

  const mapY = (value: number) => {
    if (weightSpan === 0) return MAP_HEIGHT / 2;
    return (
      MAP_HEIGHT -
      MAP_PADDING -
      ((value - minWeight) / weightSpan) * (MAP_HEIGHT - MAP_PADDING * 2)
    );
  };

  const mapX = (index: number) =>
    sortedWeights.length > 1
      ? (index / (sortedWeights.length - 1)) * MAP_WIDTH
      : 0;

  const overviewPoints = sortedWeights
    .map((w, i) => `${mapX(i).toFixed(2)},${mapY(w.weight).toFixed(2)}`)
    .join(' ');

  const windowX1 = mapX(windowStart);
  const windowX2 = mapX(endIndex);

  const indexFromPointerX = (clientX: number, rectLeft: number, rectWidth: number) => {
    if (sortedWeights.length <= 1) return 0;
    const ratio = (clientX - rectLeft) / rectWidth;
    return Math.round(Math.min(1, Math.max(0, ratio)) * (sortedWeights.length - 1));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (preset === 'all' || sortedWeights.length <= 1) return;
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    const rect = target.getBoundingClientRect();
    dragRef.current = {
      startPointerIdx: indexFromPointerX(e.clientX, rect.left, rect.width),
      startEndIdx: endIndex,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const currentIdx = indexFromPointerX(e.clientX, rect.left, rect.width);
    const delta = currentIdx - drag.startPointerIdx;
    setEndIndex(Math.min(lastIndex, Math.max(0, drag.startEndIdx + delta)));
  };

  const endPointerDrag = () => {
    dragRef.current = null;
  };

  const formattedRange =
    visibleWeights.length > 0
      ? `${new Date(visibleWeights[0]!.recordedAt).toLocaleDateString('ja-JP')} 〜 ${new Date(
          visibleWeights[visibleWeights.length - 1]!.recordedAt
        ).toLocaleDateString('ja-JP')}`
      : '';

  if (weights.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
        <p className="text-gray-500">まだ体重の記録がありません</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => {
                setPreset(p.key);
                setEndIndex(lastIndex);
              }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                preset === p.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {formattedRange && (
          <p className="text-xs text-gray-400 tabular-nums">{formattedRange}</p>
        )}
      </div>

      <div className="h-64 sm:h-80">
        <Line data={data} options={options} />
      </div>

      {preset !== 'all' && sortedWeights.length > 1 && (
        <div
          className="mt-4 touch-none select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endPointerDrag}
          onPointerCancel={endPointerDrag}
        >
          <p className="mb-1 text-xs text-gray-400">スクロール: バーを左右にドラッグ</p>
          <div
            className="relative cursor-grab active:cursor-grabbing"
            role="slider"
            aria-label="表示期間のスクロール"
            aria-valuemin={0}
            aria-valuemax={lastIndex}
            aria-valuenow={endIndex}
            aria-valuetext={`${visibleWeights.length}件を表示`}
          >
            <svg
              viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
              className="h-12 w-full"
              preserveAspectRatio="none"
            >
              <polyline
                points={overviewPoints}
                fill="none"
                stroke="#e2e8f0"
                strokeWidth={2}
              />
              {typeof user?.goalWeight === 'number' && (
                <line
                  x1={0}
                  x2={MAP_WIDTH}
                  y1={mapY(user.goalWeight)}
                  y2={mapY(user.goalWeight)}
                  stroke="rgb(34, 197, 94)"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  opacity={0.6}
                />
              )}
              <rect
                x={windowX1}
                y={MAP_PADDING}
                width={Math.max(windowX2 - windowX1, 24)}
                height={MAP_HEIGHT - MAP_PADDING * 2}
                rx={4}
                fill="rgba(59, 130, 246, 0.18)"
                stroke="rgb(59, 130, 246)"
                strokeWidth={2}
              />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}