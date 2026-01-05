import { useState, useMemo } from 'react';
import { useMealDates } from '../../hooks/useMealDates';

interface MealCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
const MONTHS = [
  '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月',
];

export function MealCalendar({ selectedDate, onDateSelect }: MealCalendarProps) {
  // Track the currently displayed month (can be different from selected date's month)
  const [displayYear, setDisplayYear] = useState(selectedDate.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(selectedDate.getMonth());

  // Fetch dates with meal records for the displayed month
  const { datesWithMeals, isLoading } = useMealDates({
    year: displayYear,
    month: displayMonth + 1, // API uses 1-12
  });

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

  // Check if a day has meal records
  const hasMeals = (day: number): boolean => {
    const dateStr = `${displayYear}-${String(displayMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return datesWithMeals.has(dateStr);
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
    <div className="rounded-lg border border-gray-200 bg-white p-4">
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
        {calendarDays.map((day, index) => (
          <div key={index} className="aspect-square">
            {day !== null ? (
              <button
                onClick={() => handleDayClick(day)}
                className={`relative flex h-full w-full flex-col items-center justify-center rounded-lg text-sm transition-colors ${
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
                {/* Meal indicator dot */}
                {hasMeals(day) && (
                  <span
                    className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${
                      isSelected(day) ? 'bg-white' : 'bg-green-500'
                    }`}
                  />
                )}
              </button>
            ) : (
              <div className="h-full w-full" />
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          <span>記録あり</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded bg-green-100" />
          <span>今日</span>
        </div>
      </div>
    </div>
  );
}
