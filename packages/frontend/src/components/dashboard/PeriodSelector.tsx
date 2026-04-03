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
    <div className="inline-flex rounded-lg bg-gray-100 p-0.5">
      {PERIODS.map((period) => (
        <button
          key={period.value}
          onClick={() => onChange(period.value)}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
            value === period.value
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}
