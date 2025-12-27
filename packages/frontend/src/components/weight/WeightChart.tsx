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
} from 'chart.js';
import { Line } from 'react-chartjs-2';
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

export function WeightChart({ weights }: WeightChartProps) {
  const { user } = useAuthStore();

  // Sort by date ascending for chart display
  const sortedWeights = [...weights].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
  );

  const labels = sortedWeights.map((w) =>
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
        data: sortedWeights.map((w) => w.weight),
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
              data: sortedWeights.map(() => user.goalWeight),
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
          label: (context: { dataset: { label?: string }; parsed: { y: number } }) => {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)} kg`;
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

  if (weights.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
        <p className="text-gray-500">まだ体重の記録がありません</p>
      </div>
    );
  }

  return (
    <div className="h-64 sm:h-80">
      <Line data={data} options={options} />
    </div>
  );
}
