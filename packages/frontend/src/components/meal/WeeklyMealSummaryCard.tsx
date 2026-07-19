import type { WeeklyMealSummary } from '@lifestyle-app/shared';

interface WeeklyMealSummaryCardProps {
  summary: WeeklyMealSummary;
}

type Status = 'good' | 'warn' | 'bad' | 'none';

const dotClass: Record<Status, string> = {
  good: 'bg-emerald-400',
  warn: 'bg-amber-400',
  bad: 'bg-red-400',
  none: 'bg-gray-300',
};

const leverClass: Record<Status, string> = {
  good: 'text-emerald-600',
  warn: 'text-amber-600',
  bad: 'text-red-500',
  none: 'text-gray-400',
};

/** One evaluation tile: value + target band + status dot + a single "明日のレバー". */
function Metric({
  label,
  value,
  unit,
  band,
  status,
  lever,
  valueClass,
}: {
  label: string;
  value: string;
  unit?: string;
  band: string;
  status: Status;
  lever: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-gray-400">{label}</p>
        <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass[status]}`} />
      </div>
      <p className={`mt-1 text-lg font-bold tabular-nums ${valueClass ?? 'text-gray-900'}`}>
        {value}
        {unit && <span className="text-xs font-normal text-gray-400"> {unit}</span>}
      </p>
      <p className="mt-0.5 text-[10px] text-gray-400">{band}</p>
      <p className={`mt-1 text-[11px] ${leverClass[status]}`}>{lever}</p>
    </div>
  );
}

/**
 * "この1週間" card: answers "傾向は正しいか?" over the trailing 7 days — kept
 * separate from the today card (which answers "予算内に収めたか?"). Each of the
 * six metrics carries a target band and one actionable lever. For this user's
 * fatty-liver plan the PFC balance (fat share) is the primary signal, not total
 * calories. Bands/targets come from the API (WEEKLY_MEAL_TARGETS) so this
 * component holds no magic thresholds of its own.
 */
export function WeeklyMealSummaryCard({ summary }: WeeklyMealSummaryCardProps) {
  const { targets, windowDays } = summary;
  const noData = summary.recordedMealDays === 0;

  // metric 1 — 7-day average calories (over recorded days)
  const calOver = summary.avgCalories - targets.dailyCalorieLimit;
  const calStatus: Status = noData ? 'none' : calOver <= 0 ? 'good' : 'bad';
  const calLever = noData
    ? '記録がありません'
    : calOver > 0
      ? `1日あたり −${Math.round(calOver)}kcal で帯内`
      : '帯内をキープできています';

  // metric 2 — PFC balance % (primary signal; fat share drives it)
  const fatOver = summary.fatPct > targets.fatPct;
  const proteinLow = summary.proteinPct < targets.proteinPct;
  const pfcStatus: Status = noData ? 'none' : fatOver || proteinLow ? 'bad' : 'good';
  const pfcLever = noData
    ? '記録がありません'
    : fatOver
      ? `脂質を約${Math.round(summary.fatPct - targets.fatPct)}pt下げる（脂の多い一品を置換）`
      : proteinLow
        ? 'たんぱく質の比率を上げる'
        : 'バランス良好';

  // metric 3 — protein floor achievement days (user's biggest lever)
  const floorStatus: Status = noData
    ? 'none'
    : summary.proteinFloorDays >= 5
      ? 'good'
      : summary.proteinFloorDays >= 2
        ? 'warn'
        : 'bad';
  const floorLever =
    summary.proteinFloorDays >= windowDays
      ? '全日クリア'
      : `1日${targets.proteinFloorPerDay}g（≒各食30g）を1日でも増やす`;

  // metric 4 — high-fat days
  const fatDaysStatus: Status = noData ? 'none' : summary.highFatDays <= targets.highFatDaysLimit ? 'good' : 'bad';
  const fatDaysLever =
    summary.highFatDays > targets.highFatDaysLimit
      ? `${summary.highFatDays - targets.highFatDaysLimit}日分、脂質の高い食事を置換`
      : `目安 ≤${targets.highFatDaysLimit}日/週 の範囲内`;

  // metric 5 — weight moving-average direction (the diet's answer-check)
  const dir = summary.weightDirection;
  const weightStatus: Status = dir === 'none' ? 'none' : dir === 'up' ? 'bad' : 'good';
  const weightArrow = dir === 'down' ? '↓' : dir === 'up' ? '↑' : dir === 'flat' ? '→' : '—';
  const weightValue =
    dir === 'none'
      ? 'データ不足'
      : `${weightArrow} ${summary.weightDeltaKg > 0 ? '+' : ''}${summary.weightDeltaKg.toFixed(1)}kg`;
  const weightValueClass = dir === 'down' ? 'text-emerald-600' : dir === 'up' ? 'text-red-500' : undefined;

  // metric 6 — completeness (analysis only bites once records are filled in)
  const completeStatus: Status =
    summary.recordedMealDays >= windowDays ? 'good' : summary.recordedMealDays >= 4 ? 'warn' : 'bad';
  const missingDays = windowDays - summary.recordedMealDays;
  const completeLever = missingDays <= 0 ? `${windowDays}日すべて記録済み` : `${missingDays}日分 未記録`;

  const rangeLabel = `${summary.startDate.slice(5)}〜${summary.endDate.slice(5)}`;

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-900">この1週間</h2>
        <span className="text-[11px] text-gray-400">傾向は正しいか（{rangeLabel}）</span>
      </div>
      <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        <Metric
          label="7日平均カロリー"
          value={summary.avgCalories.toLocaleString()}
          unit="kcal/日"
          band={`目標 ≤${targets.dailyCalorieLimit.toLocaleString()}・記録${summary.recordedMealDays}日平均`}
          status={calStatus}
          lever={calLever}
          valueClass={calStatus === 'bad' ? 'text-red-500' : undefined}
        />
        <Metric
          label="PFCバランス（主指標）"
          value={`P${summary.proteinPct} F${summary.fatPct} C${summary.carbsPct}`}
          unit="%"
          band={`P≥${targets.proteinPct} F≤${targets.fatPct} C≈${targets.carbsPct}`}
          status={pfcStatus}
          lever={pfcLever}
          valueClass={fatOver ? 'text-red-500' : undefined}
        />
        <Metric
          label="たんぱく質 下限達成"
          value={`${summary.proteinFloorDays}/${windowDays}`}
          unit="日"
          band={`1日${targets.proteinFloorPerDay}g 到達`}
          status={floorStatus}
          lever={floorLever}
        />
        <Metric
          label="脂質過多だった日"
          value={`${summary.highFatDays}/${windowDays}`}
          unit="日"
          band={`目安 ≤${targets.highFatDaysLimit}日/週`}
          status={fatDaysStatus}
          lever={fatDaysLever}
          valueClass={fatDaysStatus === 'bad' ? 'text-red-500' : undefined}
        />
        <Metric
          label="体重(7日平均)の向き"
          value={weightValue}
          band="減少で緑・食事の答え合わせ"
          status={weightStatus}
          lever={dir === 'none' ? '体重を数日記録すると出ます' : '7日移動平均の推移'}
          valueClass={weightValueClass}
        />
        <Metric
          label="記録できた日数"
          value={`${summary.recordedMealDays}/${windowDays}`}
          unit="日"
          band={`体重 ${summary.recordedWeightDays}/${windowDays}日`}
          status={completeStatus}
          lever={completeLever}
        />
      </div>
    </div>
  );
}
