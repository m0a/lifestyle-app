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

  // Sort meal types by count
  const sortedTypes = Object.entries(byType).sort(([, a], [, b]) => b - a);

  return (
    <div
      className="rounded-lg border border-gray-200 bg-white p-6"
      data-testid="meal-summary-card"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">食事サマリー</h3>
        <Link
          to="/meals"
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          詳細 →
        </Link>
      </div>

      {hasData ? (
        <div className="space-y-4">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">
                {totalCalories.toLocaleString()}
              </span>
              <span className="text-lg text-gray-500">kcal</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              P: {totalProtein.toFixed(1)}g F: {totalFat.toFixed(1)}g C: {totalCarbs.toFixed(1)}g
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">食事回数</p>
              <p className="font-medium text-gray-900">{mealCount}回</p>
            </div>
            <div>
              <p className="text-gray-500">1日あたり</p>
              <p className="font-medium text-gray-900">
                {Math.round(averageCalories).toLocaleString()} kcal
              </p>
            </div>
          </div>

          {sortedTypes.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">内訳</p>
              <div className="flex flex-wrap gap-2">
                {sortedTypes.map(([type, count]) => (
                  <span
                    key={type}
                    className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800"
                  >
                    {MEAL_TYPE_LABELS[type] || type}: {count}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="py-6 text-center">
          <p className="text-gray-500">データなし</p>
          <Link
            to="/meals"
            className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-800"
          >
            食事を記録する →
          </Link>
        </div>
      )}
    </div>
  );
}
