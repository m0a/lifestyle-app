import type { Period } from '../../hooks/useDashboard';

interface PeriodSelectorProps {
  value: Period;
  onChange: (period: Period) => void;
}

const PERIODS: { value: Period; label: string }[] = [
  { value: 'week', label: '週間' },
  { value: 'month', label: '月間' },
  { value: 'quarter', label: '3ヶ月' },
  { value: 'year', label: '年間' },
];

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="flex gap-2">
      {PERIODS.map((period) => (
        <button
          key={period.value}
          onClick={() => onChange(period.value)}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            value === period.value
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}
