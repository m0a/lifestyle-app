interface CalorieSummaryProps {
  totalCalories: number;
  averageCalories: number;
  count: number;
  totalMeals: number;
  targetCalories?: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
  /** PFCのグラム目標（resolvePfcGramTargetsで算出）。未指定なら目標線なし。 */
  proteinTarget?: number | null;
  fatTarget?: number | null;
  carbsTarget?: number | null;
  /** 履歴画面用のラベル表示 */
  isHistory?: boolean;
}

/** 目標に対する意味づけ。floor=下限(満たす), cap=上限(超で赤), reference=目安(中立) */
type MacroTone = 'floor' | 'cap' | 'reference';

function MacroBar({
  label,
  current,
  target,
  tone,
}: {
  label: string;
  current: number;
  target: number | null | undefined;
  tone: MacroTone;
}) {
  const hasTarget = target != null && target > 0;
  const progress = hasTarget ? Math.min((current / target) * 100, 100) : 0;

  let barColor = 'bg-sky-400'; // reference（炭水化物の目安）
  if (hasTarget && tone === 'floor') {
    barColor = current >= target ? 'bg-emerald-400' : 'bg-amber-400';
  } else if (hasTarget && tone === 'cap') {
    barColor = current > target ? 'bg-red-400' : 'bg-emerald-400';
  }

  return (
    <div>
      <div className="flex items-baseline justify-between text-[10px] text-gray-400">
        <span>{label}</span>
        <span className="tabular-nums">
          {current.toFixed(1)}
          {hasTarget ? ` / ${Math.round(target)}` : ''}g
        </span>
      </div>
      <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
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
  proteinTarget,
  fatTarget,
  carbsTarget,
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
        <div className="mt-2.5 space-y-1.5">
          <MacroBar label="P たんぱく質" current={totalProtein} target={proteinTarget} tone="floor" />
          <MacroBar label="F 脂質" current={totalFat} target={fatTarget} tone="cap" />
          <MacroBar label="C 炭水化物" current={totalCarbs} target={carbsTarget} tone="reference" />
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
