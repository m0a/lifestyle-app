interface CalorieSummaryProps {
  totalCalories: number;
  averageCalories: number;
  count: number;
  totalMeals: number;
  targetCalories?: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
  /** 履歴画面用のラベル表示 */
  isHistory?: boolean;
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
  isHistory = false,
}: CalorieSummaryProps) {
  const progress = Math.min((totalCalories / targetCalories) * 100, 100);
  const remaining = targetCalories - totalCalories;
  const isOverTarget = remaining < 0;
  const dayLabel = isHistory ? 'この日' : '今日';

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="card p-4">
        <p className="text-xs text-gray-400">{dayLabel}のカロリー</p>
        <p className="mt-1 text-xl font-bold text-gray-900 tabular-nums sm:text-2xl">
          {totalCalories.toLocaleString()} <span className="text-xs font-normal text-gray-400">kcal</span>
        </p>
        <p className="mt-1 text-xs text-gray-400">
          P: {totalProtein.toFixed(1)}g  F: {totalFat.toFixed(1)}g  C: {totalCarbs.toFixed(1)}g
        </p>
        <div className="mt-2">
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full transition-all ${
                isOverTarget ? 'bg-red-400' : 'bg-emerald-400'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] text-gray-400">
            目標: {targetCalories.toLocaleString()} kcal
          </p>
        </div>
      </div>

      <div className="card p-4">
        <p className="text-xs text-gray-400">残りカロリー</p>
        <p
          className={`mt-1 text-xl font-bold tabular-nums sm:text-2xl ${
            isOverTarget ? 'text-red-500' : 'text-emerald-600'
          }`}
        >
          {isOverTarget ? '+' : ''}
          {Math.abs(remaining).toLocaleString()}{' '}
          <span className="text-xs font-normal text-gray-400">kcal</span>
        </p>
        <p className="mt-2 text-xs text-gray-400">
          {isOverTarget ? '目標を超過しています' : 'まだ食べられます'}
        </p>
      </div>

      <div className="card p-4">
        <p className="text-xs text-gray-400">平均カロリー/食</p>
        <p className="mt-1 text-xl font-bold text-gray-900 tabular-nums sm:text-2xl">
          {averageCalories.toLocaleString()}{' '}
          <span className="text-xs font-normal text-gray-400">kcal</span>
        </p>
        <p className="mt-2 text-xs text-gray-400">
          カロリー記録: {count}件
        </p>
      </div>

      <div className="card p-4">
        <p className="text-xs text-gray-400">{dayLabel}の食事数</p>
        <p className="mt-1 text-xl font-bold text-gray-900 tabular-nums sm:text-2xl">
          {totalMeals} <span className="text-xs font-normal text-gray-400">食</span>
        </p>
        <p className="mt-2 text-xs text-gray-400">
          カロリー記録率: {totalMeals > 0 ? Math.round((count / totalMeals) * 100) : 0}%
        </p>
      </div>
    </div>
  );
}
