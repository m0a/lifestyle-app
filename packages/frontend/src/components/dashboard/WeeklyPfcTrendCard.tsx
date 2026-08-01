import { KCAL_PER_GRAM, macroKcal } from '@lifestyle-app/shared';
import { describeFatShareDelta, type FatShareDeltaTone } from '../../lib/fatShareDelta';

/**
 * One rolling 7-day bucket from GET /api/dashboard/trends. Declared structurally
 * (rather than importing the RPC type) so the card only depends on the fields it
 * actually renders.
 */
interface WeeklyPfcPoint {
  weekStart: string;
  weekEnd: string;
  mealDays: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
  avgCalories: number;
  avgProtein: number;
  avgFat: number;
  avgCarbs: number;
  /** 脂質のエネルギーシェア(0-100, 未丸め)。マクロ未分析の週は null。 */
  fatPct: number | null;
}

interface WeeklyPfcTrendCardProps {
  /** 古い週 → 新しい週 の順（APIの並びのまま）。 */
  weeks: WeeklyPfcPoint[];
  /** 脂質シェアの上限(%)。resolveWeeklyMealTargets().fatPct を渡す。 */
  fatPctTarget: number;
}

const deltaClass: Record<FatShareDeltaTone, string> = {
  better: 'text-emerald-600',
  worse: 'text-amber-600',
  flat: 'text-gray-400',
  none: 'text-gray-300',
};

/**
 * 積み上げPFCバー。色と並び（P=緑 → C=琥珀 → F=赤）は WeeklyMealSummaryCard の
 * PfcBar と同一にしてある。脂質が最後＝右端に積まれるので、「脂質シェアが目標以下」は
 * 「赤い帯の左端が (100 - 目標)% より右」と読める。参照線はその位置に1本引くだけでよく、
 * 合否の色分け（今回スコープ外）を持ち込まずに目標の位置だけ示せる。
 */
function StackedPfcBar({
  proteinPct,
  carbsPct,
  fatPct,
  fatPctTarget,
}: {
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
  fatPctTarget: number;
}) {
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-100">
      <div className="flex h-full w-full">
        <span className="bg-emerald-400" style={{ width: `${proteinPct}%` }} />
        <span className="bg-amber-300" style={{ width: `${carbsPct}%` }} />
        <span className="bg-red-400" style={{ width: `${fatPct}%` }} />
      </div>
      {/* 線は赤帯(bg-red-400)の上に来ることが多いので、薄いグレーだと沈んで見えない。 */}
      <span
        aria-hidden
        className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-gray-800/70"
        style={{ left: `${100 - fatPctTarget}%` }}
      />
    </div>
  );
}

/** "01-04" → "1/4" */
function shortDate(isoDate: string): string {
  const [, month, day] = isoDate.split('-');
  return `${Number(month)}/${Number(day)}`;
}

/**
 * 週次のPFC推移カード。1日単位のブレに振り回されずに脂質シェアの傾向を見るための
 * ビュー（体重を移動平均で見るのと同じ発想）。週の区切りは /trends のローリング窓
 * （今日から7日ずつ遡る）で、暦週ではない。
 */
export function WeeklyPfcTrendCard({ weeks, fatPctTarget }: WeeklyPfcTrendCardProps) {
  const rows = weeks.map((week, i) => {
    const macro = macroKcal(week.totalProtein, week.totalFat, week.totalCarbs);
    // シェアは3つとも同じ分母（PFC由来kcal）で出す。摂取カロリーを分母にすると
    // 未計上分（アルコール等）でシェアが歪み、カレンダーのドットと食い違う。
    const shares =
      macro > 0
        ? {
            protein: ((week.totalProtein * KCAL_PER_GRAM.protein) / macro) * 100,
            carbs: ((week.totalCarbs * KCAL_PER_GRAM.carbs) / macro) * 100,
            fat: ((week.totalFat * KCAL_PER_GRAM.fat) / macro) * 100,
          }
        : null;
    return {
      week,
      shares,
      delta: describeFatShareDelta(week.fatPct, weeks[i - 1]?.fatPct),
      isLatest: i === weeks.length - 1,
    };
  });

  // PFCは写真のAI解析（またはfood item）経由でしか入らないので、「食事はあるが
  // マクロが1件も無い」状態が普通に起きる。行を4本とも「PFC未分析」で埋めるより、
  // 何をすれば出るのかを1行で言うほうが親切。
  const hasAnyShares = rows.some((r) => r.shares !== null);
  const hasAnyMeals = rows.some((r) => r.week.mealDays > 0);

  return (
    <div className="card p-4 sm:p-5" data-testid="weekly-pfc-trend-card">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-900">週ごとのPFC</h2>
        <span className="text-[11px] text-gray-400">脂質シェアの推移（{weeks.length}週）</span>
      </div>

      {!hasAnyShares ? (
        <p className="mt-4 text-center text-sm text-gray-400">
          {hasAnyMeals
            ? '食事の写真をAI解析するとPFCの推移が出ます'
            : '食事を記録すると週ごとの推移が出ます'}
        </p>
      ) : (
        <>
          <div className="mt-3 space-y-3">
            {rows.map(({ week, shares, delta, isLatest }) => (
              <div key={week.weekStart}>
                <div className="flex items-baseline justify-between gap-2 text-[11px]">
                  <span className="text-gray-500 tabular-nums">
                    {shortDate(week.weekStart)}〜{shortDate(week.weekEnd)}
                    {isLatest && (
                      <span className="ml-1.5 rounded bg-gray-100 px-1 py-px text-[10px] text-gray-500">
                        今週
                      </span>
                    )}
                  </span>
                  <span className="flex items-baseline gap-1.5 tabular-nums">
                    {week.fatPct != null ? (
                      <span className="font-semibold text-gray-900">
                        脂質 {week.fatPct.toFixed(1)}%
                      </span>
                    ) : (
                      // 食事はあるがマクロが未分析の週を「記録なし」と書くと嘘になる
                      // （手入力の食事や、写真解析前の食事はカロリーだけを持つ）。
                      <span className="text-gray-300">
                        {week.mealDays > 0 ? 'PFC未分析' : '記録なし'}
                      </span>
                    )}
                    {delta.text && (
                      <span className={`text-[10px] ${deltaClass[delta.tone]}`}>{delta.text}</span>
                    )}
                  </span>
                </div>
                <div className="mt-1">
                  {shares ? (
                    <StackedPfcBar
                      proteinPct={shares.protein}
                      carbsPct={shares.carbs}
                      fatPct={shares.fat}
                      fatPctTarget={fatPctTarget}
                    />
                  ) : (
                    <div className="h-2 w-full rounded-full bg-gray-100" />
                  )}
                </div>
                {week.mealDays > 0 && (
                  <p className="mt-1 text-[10px] text-gray-400 tabular-nums">
                    1日 {Math.round(week.avgCalories).toLocaleString()}kcal
                    {/* マクロ未分析の週はカロリーだけ分かっているので、そこまでは出す。 */}
                    {shares && (
                      <>
                        ・P{Math.round(week.avgProtein)}g F{Math.round(week.avgFat)}g C
                        {Math.round(week.avgCarbs)}g
                      </>
                    )}
                    （記録{week.mealDays}日）
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-3 border-t border-gray-100 pt-2.5 text-[10px] text-gray-400">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm bg-emerald-400" />
                たんぱく質
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm bg-amber-300" />
                炭水化物
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm bg-red-400" />
                脂質
              </span>
            </div>
            {/* 脂質は右端に積まれるので、線を「越える／越えない」で読める。 */}
            <p className="mt-1 flex items-center gap-1">
              <span className="h-2.5 w-0.5 shrink-0 bg-gray-800/70" />
              縦線は脂質{fatPctTarget}%の位置。赤がここを越えると多めです
            </p>
          </div>
        </>
      )}
    </div>
  );
}
