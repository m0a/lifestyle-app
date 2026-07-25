import { useState, useMemo } from 'react';
import { evaluateDayNutrition } from '@lifestyle-app/shared';
import type { DayNutritionTargets, DayNutritionVerdict } from '@lifestyle-app/shared';
import { useMealDates } from '../../hooks/useMealDates';

interface MealCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  /** Thresholds the per-day dots are judged against (per-user overrides applied). */
  targets: DayNutritionTargets;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
const MONTHS = [
  '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月',
];

/**
 * One dot per check, in the order カロリー → 脂質 → たんぱく質.
 *
 * Pass/fail is encoded as fill vs ring rather than green vs red: the shape
 * survives a 6px dot, colour-vision differences, and a sunlit phone screen,
 * none of which a red/green pair does. `null` means "not judged" (a day with a
 * single record — see DayNutritionVerdict.sparse).
 */
function dotClassName(ok: boolean | null, onSelectedCell: boolean): string {
  const base = 'h-1.5 w-1.5 rounded-full';
  if (ok === null) return `${base} ${onSelectedCell ? 'bg-white/40' : 'bg-gray-300'}`;
  if (ok) return `${base} ${onSelectedCell ? 'bg-white' : 'bg-emerald-500'}`;
  return `${base} border-[1.5px] ${onSelectedCell ? 'border-white/70' : 'border-gray-400'}`;
}

/** The three dot states for a day, or null when the day has no records at all. */
function dotStates(verdict: DayNutritionVerdict | null): (boolean | null)[] | null {
  if (!verdict) return null;
  if (verdict.sparse) return [null, null, null];
  return [verdict.calorieOk, verdict.fatOk, verdict.proteinOk];
}

/** Spell the dots out for screen readers, which cannot see fill vs ring. */
function dayAriaLabel(day: number, verdict: DayNutritionVerdict | null): string {
  if (!verdict) return `${day}日 記録なし`;
  if (verdict.sparse) return `${day}日 記録1件のみ`;
  const say = (label: string, ok: boolean) => `${label}${ok ? '達成' : '未達'}`;
  return `${day}日 ${say('カロリー', verdict.calorieOk)} ${say('脂質', verdict.fatOk)} ${say('たんぱく質', verdict.proteinOk)}`;
}

export function MealCalendar({ selectedDate, onDateSelect, targets }: MealCalendarProps) {
  // Track the currently displayed month (can be different from selected date's month)
  const [displayYear, setDisplayYear] = useState(selectedDate.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(selectedDate.getMonth());

  // Fetch per-day nutrition totals for the displayed month
  const { daySummaries, isLoading } = useMealDates({
    year: displayYear,
    month: displayMonth + 1, // API uses 1-12
  });

  // Judge every day of the month once per data/target change.
  const verdicts = useMemo(() => {
    const map = new Map<string, DayNutritionVerdict>();
    for (const [date, summary] of daySummaries) {
      map.set(date, evaluateDayNutrition(summary, targets));
    }
    return map;
  }, [daySummaries, targets]);

  // Calculate calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(displayYear, displayMonth, 1);
    const lastDay = new Date(displayYear, displayMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];

    // Add empty slots for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  }, [displayYear, displayMonth]);

  // Navigation handlers
  const goToPreviousMonth = () => {
    if (displayMonth === 0) {
      setDisplayYear(displayYear - 1);
      setDisplayMonth(11);
    } else {
      setDisplayMonth(displayMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (displayMonth === 11) {
      setDisplayYear(displayYear + 1);
      setDisplayMonth(0);
    } else {
      setDisplayMonth(displayMonth + 1);
    }
  };

  // Verdict for a day, or null when the day has no records
  const verdictFor = (day: number): DayNutritionVerdict | null => {
    const dateStr = `${displayYear}-${String(displayMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return verdicts.get(dateStr) ?? null;
  };

  // Check if a day is the selected date
  const isSelected = (day: number): boolean => {
    return (
      selectedDate.getFullYear() === displayYear &&
      selectedDate.getMonth() === displayMonth &&
      selectedDate.getDate() === day
    );
  };

  // Check if a day is today
  const isToday = (day: number): boolean => {
    const today = new Date();
    return (
      today.getFullYear() === displayYear &&
      today.getMonth() === displayMonth &&
      today.getDate() === day
    );
  };

  // Handle day click
  const handleDayClick = (day: number) => {
    const newDate = new Date(displayYear, displayMonth, day);
    onDateSelect(newDate);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 md:max-w-lg md:mx-auto">
      {/* Header with month navigation */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={goToPreviousMonth}
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
          aria-label="前月"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-lg font-semibold text-gray-900">
          {displayYear}年{MONTHS[displayMonth]}
        </h3>
        <button
          onClick={goToNextMonth}
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
          aria-label="翌月"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="mb-2 flex justify-center">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
        </div>
      )}

      {/* Weekday headers */}
      <div className="mb-2 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((day, index) => (
          <div
            key={day}
            className={`py-2 text-center text-sm font-medium ${
              index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-gray-600'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => {
          const dots = day !== null ? dotStates(verdictFor(day)) : null;
          return (
            <div key={index} className="aspect-square">
              {/* pb-2.5 lifts the centred number clear of the dots pinned to the
                  bottom edge — at a 320px viewport a cell is only ~38px, and
                  without it the digits and dots collide. */}
              {day !== null ? (
                <button
                  onClick={() => handleDayClick(day)}
                  aria-label={dayAriaLabel(day, verdictFor(day))}
                  className={`relative flex h-full w-full flex-col items-center justify-center rounded-lg pb-2.5 text-sm transition-colors ${
                    isSelected(day)
                      ? 'bg-green-600 text-white'
                      : isToday(day)
                      ? 'bg-green-100 text-green-800'
                      : 'hover:bg-gray-100'
                  } ${
                    index % 7 === 0 ? 'text-red-500' : index % 7 === 6 ? 'text-blue-500' : ''
                  } ${isSelected(day) ? '!text-white' : ''}`}
                >
                  <span>{day}</span>
                  {/* PFC verdict: カロリー / 脂質 / たんぱく質 */}
                  {dots && (
                    <span className="absolute bottom-1 flex gap-[3px]">
                      {dots.map((ok, i) => (
                        <span key={i} className={dotClassName(ok, isSelected(day))} />
                      ))}
                    </span>
                  )}
                </button>
              ) : (
                <div className="h-full w-full" />
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 space-y-1.5 text-xs text-gray-500">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>達成</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full border-[1.5px] border-gray-400" />
            <span>未達</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
            <span>記録1件のみ</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded bg-green-100" />
            <span>今日</span>
          </div>
        </div>
        <p className="text-center text-[11px] text-gray-400">
          左から カロリー / 脂質 / たんぱく質
        </p>
      </div>
    </div>
  );
}
