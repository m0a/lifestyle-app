import { Link } from 'react-router-dom';

interface MealSummaryCardProps {
  totalCalories: number;
  mealCount: number;
  averageCalories: number;
  byType: Record<string, number>;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
}

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: '朝食',
  lunch: '昼食',
  dinner: '夕食',
  snack: '間食',
};

export function MealSummaryCard({
  totalCalories,
  mealCount,
  averageCalories,
  byType,
  totalProtein,
  totalFat,
  totalCarbs,
}: MealSummaryCardProps) {
  const hasData = mealCount > 0;
  const sortedTypes = Object.entries(byType).sort(([, a], [, b]) => b - a);

  return (
    <div className="card p-5" data-testid="meal-summary-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.379a48.474 48.474 0 00-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12" />
            </svg>
          </span>
          <h3 className="text-sm font-semibold text-gray-900">食事</h3>
        </div>
        <Link to="/meals" className="text-xs text-gray-400 hover:text-emerald-600 transition-colors">
          詳細 →
        </Link>
      </div>

      {hasData ? (
        <div className="space-y-3">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold text-gray-900 tabular-nums">
                {totalCalories.toLocaleString()}
              </span>
              <span className="text-sm text-gray-400">kcal</span>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              P: {totalProtein.toFixed(1)}g  F: {totalFat.toFixed(1)}g  C: {totalCarbs.toFixed(1)}g
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-400">食事回数</p>
              <p className="font-semibold text-gray-900">{mealCount}回</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">1日平均</p>
              <p className="font-semibold text-gray-900">
                {Math.round(averageCalories).toLocaleString()} kcal
              </p>
            </div>
          </div>

          {sortedTypes.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {sortedTypes.map(([type, count]) => (
                <span
                  key={type}
                  className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
                >
                  {MEAL_TYPE_LABELS[type] || type}: {count}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="py-4 text-center">
          <p className="text-sm text-gray-400">データなし</p>
          <Link to="/meals" className="mt-1 inline-block text-xs text-emerald-600 hover:text-emerald-700">
            食事を記録する →
          </Link>
        </div>
      )}
    </div>
  );
}
