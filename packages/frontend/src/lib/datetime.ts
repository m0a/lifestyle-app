import { formatInTimeZone } from 'date-fns-tz';

/**
 * Converts a Date object to ISO 8601 string with local timezone offset.
 * Uses the browser's timezone (from Intl API).
 *
 * @example
 * // In Japan (JST +09:00):
 * toLocalISOString(new Date('2026-01-17T08:00:00'))
 * // Returns: "2026-01-17T08:00:00+09:00"
 *
 * @example
 * // In New York (EST -05:00):
 * toLocalISOString(new Date('2026-01-17T08:00:00'))
 * // Returns: "2026-01-17T08:00:00-05:00"
 */
export const toLocalISOString = (date: Date): string => {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return formatInTimeZone(date, tz, "yyyy-MM-dd'T'HH:mm:ssXXX");
};

/**
 * Creates a Date object from datetime-local input value and returns
 * ISO 8601 string with local timezone offset.
 *
 * @example
 * // datetime-local input value: "2026-01-17T08:00"
 * // In Japan (JST +09:00):
 * fromDatetimeLocal("2026-01-17T08:00")
 * // Returns: "2026-01-17T08:00:00+09:00"
 */
export const fromDatetimeLocal = (datetimeLocalValue: string): string => {
  const date = new Date(datetimeLocalValue);
  return toLocalISOString(date);
};
