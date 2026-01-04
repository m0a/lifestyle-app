interface CalorieSummaryProps {
  totalCalories: number;
  averageCalories: number;
  count: number;
  totalMeals: number;
  targetCalories?: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
}

export function CalorieSummary({
  totalCalories,
  averageCalories,
  count,
  totalMeals,
  targetCalories = 2000,
  totalProtein,
  totalFat,
  totalCarbs,
}: CalorieSummaryProps) {
  const progress = Math.min((totalCalories / targetCalories) * 100, 100);
  const remaining = targetCalories - totalCalories;
  const isOverTarget = remaining < 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-500">今日のカロリー</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">
          {totalCalories.toLocaleString()} <span className="text-sm font-normal">kcal</span>
        </p>
        <p className="mt-1 text-xs text-gray-500">
          P: {totalProtein.toFixed(1)}g F: {totalFat.toFixed(1)}g C: {totalCarbs.toFixed(1)}g
        </p>
        <div className="mt-2">
          <div className="h-2 overflow-hidden rounded-full bg-gray-200">
            <div
              className={`h-full rounded-full transition-all ${
                isOverTarget ? 'bg-red-500' : 'bg-green-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            目標: {targetCalories.toLocaleString()} kcal
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-500">残りカロリー</p>
        <p
          className={`mt-1 text-2xl font-bold ${
            isOverTarget ? 'text-red-600' : 'text-green-600'
          }`}
        >
          {isOverTarget ? '+' : ''}
          {Math.abs(remaining).toLocaleString()}{' '}
          <span className="text-sm font-normal">kcal</span>
        </p>
        <p className="mt-2 text-xs text-gray-500">
          {isOverTarget ? '目標を超過しています' : 'まだ食べられます'}
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-500">平均カロリー/食</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">
          {averageCalories.toLocaleString()}{' '}
          <span className="text-sm font-normal">kcal</span>
        </p>
        <p className="mt-2 text-xs text-gray-500">
          カロリー記録: {count}件
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-500">今日の食事数</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">
          {totalMeals} <span className="text-sm font-normal">食</span>
        </p>
        <p className="mt-2 text-xs text-gray-500">
          カロリー記録率: {totalMeals > 0 ? Math.round((count / totalMeals) * 100) : 0}%
        </p>
      </div>
    </div>
  );
}
