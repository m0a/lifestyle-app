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

const verdictClass: Record<Status, string> = {
  good: 'text-emerald-600',
  warn: 'text-amber-600',
  bad: 'text-red-500',
  none: 'text-gray-400',
};

/**
 * One evaluation tile. The MAIN line is a plain-language verdict (初心者向けの
 * ひとこと) — numbers are demoted to the small `sub` line so symbols like %/g/≥≤≈
 * never lead. `sub` optionally holds richer content (e.g. the PFC breakdown bar).
 */
function Metric({
  label,
  verdict,
  status,
  sub,
}: {
  label: string;
  verdict: string;
  status: Status;
  sub?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-gray-400">{label}</p>
        <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass[status]}`} />
      </div>
      <p className={`mt-1 text-base font-bold ${verdictClass[status]}`}>{verdict}</p>
      {sub && <div className="mt-0.5 text-[10px] text-gray-400">{sub}</div>}
    </div>
  );
}

/** Stacked P/F/C bar — makes the "カロリー内訳" visible without reading percentages. */
function PfcBar({ p, f, c }: { p: number; f: number; c: number }) {
  return (
    <div>
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
        <span className="bg-emerald-400" style={{ width: `${p}%` }} />
        <span className="bg-amber-300" style={{ width: `${c}%` }} />
        <span className="bg-red-400" style={{ width: `${f}%` }} />
      </div>
      <p className="mt-1 tabular-nums">
        たんぱく{Math.round(p)}％・糖質{Math.round(c)}％・脂質{Math.round(f)}％
      </p>
    </div>
  );
}

/** The single flags the primary-lever picker reasons over. */
interface LeverFlags {
  fatOver: boolean; // 脂質シェアが目標超過
  proteinLow: boolean; // たんぱくシェアが目標未満
  calOver: boolean; // 平均カロリーが上限超過
  noExercise: boolean; // 週の運動日数が0
}

/**
 * Pick the ONE "次の一手" to show, even when several metrics are red. Priority is
 * a product decision (locked in with the user): 脂質 > たんぱく質 > カロリー > 運動,
 * reflecting the fatty-liver plan where fat share is the primary lever.
 */
function selectPrimaryLever(flags: LeverFlags): string {
  // Priority order (locked in): 脂質 > たんぱく質 > カロリー > 運動. First match wins;
  // '' when nothing is red hides the banner. Wording stays 日常語 — no g/%/≥≤≈.
  if (flags.fatOver) return '脂の多い一品を、高たんぱく低脂質のものに置き換え';
  if (flags.proteinLow) return 'もう一品、たんぱく質（肉・魚・卵・豆）を足す';
  if (flags.calOver) return '食べる量を少しだけ減らす';
  if (flags.noExercise) return '今週どこかで軽く体を動かす';
  return '';
}

/**
 * "この1週間" card (案A: カード改良版). Answers "傾向は正しいか?" over the trailing
 * 7 days. Each tile leads with a plain-language verdict; %/g/≥≤≈ are demoted to the
 * sub line or the PFC bar. A single "次の一手" banner condenses multiple reds into one
 * action (fat-first). Bands/targets come from the API (WEEKLY_MEAL_TARGETS).
 */
export function WeeklyMealSummaryCard({ summary }: WeeklyMealSummaryCardProps) {
  const { targets, windowDays } = summary;
  const noData = summary.recordedMealDays === 0;
  const na = <span className="text-gray-300">—</span>;

  // --- weight direction (the diet's answer-check) ---
  const dir = summary.weightDirection;
  const weightStatus: Status = dir === 'none' ? 'none' : dir === 'up' ? 'bad' : dir === 'flat' ? 'warn' : 'good';
  const weightVerdict =
    dir === 'down' ? '下がってる' : dir === 'up' ? '増えてる' : dir === 'flat' ? '横ばい' : 'データ不足';
  const weightArrow = dir === 'down' ? '↓' : dir === 'up' ? '↑' : dir === 'flat' ? '→' : '';
  const weightSub =
    dir === 'none' ? '体重を数日記録すると出ます' : `7日平均 ${weightArrow}${Math.abs(summary.weightDeltaKg).toFixed(1)}kg`;

  // --- calories eaten ---
  const calOver = summary.avgCalories > targets.dailyCalorieLimit;
  const calStatus: Status = noData ? 'none' : calOver ? 'bad' : 'good';
  const calVerdict = noData ? '記録なし' : calOver ? '多め' : 'ちょうど良い';

  // --- PFC balance ---
  const fatOver = summary.fatPct > targets.fatPct;
  const proteinLow = summary.proteinPct < targets.proteinPct;
  const pfcStatus: Status = noData ? 'none' : fatOver || proteinLow ? 'bad' : 'good';
  const pfcVerdict = noData
    ? '記録なし'
    : fatOver && proteinLow
      ? '脂多め・たんぱく不足'
      : fatOver
        ? '脂が多め'
        : proteinLow
          ? 'たんぱくもう少し'
          : 'ちょうど良い';

  // --- protein floor achievement (this user's biggest lever) ---
  const floorStatus: Status = noData
    ? 'none'
    : summary.proteinFloorDays >= 5
      ? 'good'
      : summary.proteinFloorDays >= 2
        ? 'warn'
        : 'bad';
  const floorVerdict = noData
    ? '記録なし'
    : summary.proteinFloorDays >= windowDays
      ? '足りてる'
      : summary.proteinFloorDays >= 2
        ? 'もう少し'
        : '足りない';

  // --- high-fat days ---
  const fatDaysStatus: Status = noData ? 'none' : summary.highFatDays <= targets.highFatDaysLimit ? 'good' : 'bad';
  const fatDaysVerdict = noData ? '記録なし' : summary.highFatDays <= targets.highFatDaysLimit ? 'ちょうど良い' : '多め';

  // --- exercise (metric 7) ---
  const exStatus: Status =
    summary.exerciseDays >= targets.exerciseDaysTarget ? 'good' : summary.exerciseDays >= 1 ? 'warn' : 'bad';
  const exVerdict =
    summary.exerciseDays >= targets.exerciseDaysTarget ? 'できてる' : summary.exerciseDays >= 1 ? 'もう少し' : 'してない';

  // --- completeness ---
  const completeStatus: Status =
    summary.recordedMealDays >= windowDays ? 'good' : summary.recordedMealDays >= 4 ? 'warn' : 'bad';
  const completeVerdict = summary.recordedMealDays >= windowDays ? 'できてる' : 'あと少し';

  const lever = noData
    ? ''
    : selectPrimaryLever({ fatOver, proteinLow, calOver, noExercise: summary.exerciseDays === 0 });

  const rangeLabel = `${summary.startDate.slice(5)}〜${summary.endDate.slice(5)}`;

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-900">この1週間</h2>
        <span className="text-[11px] text-gray-400">傾向は正しいか（{rangeLabel}）</span>
      </div>

      {lever && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2">
          <span className="shrink-0 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
            次の一手
          </span>
          <p className="text-[13px] font-semibold text-red-600">{lever}</p>
        </div>
      )}

      <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        <Metric
          label="体重の向き"
          verdict={weightVerdict}
          status={weightStatus}
          sub={<span className="tabular-nums">{weightSub}</span>}
        />
        <Metric
          label="食べた量"
          verdict={calVerdict}
          status={calStatus}
          sub={
            noData ? (
              na
            ) : (
              <span className="tabular-nums">
                1日 {summary.avgCalories.toLocaleString()}kcal／糖質{Math.round(summary.avgCarbsG)}g・たんぱく
                {Math.round(summary.avgProteinG)}g・脂質{Math.round(summary.avgFatG)}g
              </span>
            )
          }
        />
        <Metric
          label="PFCバランス"
          verdict={pfcVerdict}
          status={pfcStatus}
          sub={noData ? na : <PfcBar p={summary.proteinPct} f={summary.fatPct} c={summary.carbsPct} />}
        />
        <Metric
          label="たんぱく質"
          verdict={floorVerdict}
          status={floorStatus}
          sub={
            noData ? (
              na
            ) : (
              <span className="tabular-nums">
                足りた日 {summary.proteinFloorDays}/{windowDays}日（目安1日{targets.proteinFloorPerDay}g）
              </span>
            )
          }
        />
        <Metric
          label="脂質"
          verdict={fatDaysVerdict}
          status={fatDaysStatus}
          sub={noData ? na : <span className="tabular-nums">多かった日 {summary.highFatDays}/{windowDays}日</span>}
        />
        <Metric
          label="運動"
          verdict={exVerdict}
          status={exStatus}
          sub={
            <span className="tabular-nums">
              {summary.exerciseDays}/{windowDays}日・{summary.exerciseSessions}回（目安{targets.exerciseDaysTarget}日/週）
            </span>
          }
        />
        <Metric
          label="記録の継続"
          verdict={completeVerdict}
          status={completeStatus}
          sub={
            <span className="tabular-nums">
              食事 {summary.recordedMealDays}/{windowDays}・体重 {summary.recordedWeightDays}/{windowDays}
            </span>
          }
        />
      </div>
    </div>
  );
}
