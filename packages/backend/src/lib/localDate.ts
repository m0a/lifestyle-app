/**
 * Local-date helpers for filtering recorded_at on the DB side (#103).
 *
 * recorded_at is stored as an offset-aware ISO string whose first 10 characters
 * are the local date ("2026-01-17T08:00:00+09:00" -> "2026-01-17"). Because of
 * that prefix property, a local-date range filter can be pushed into SQL as a
 * lexicographic range on recorded_at itself — and it is EXACTLY equivalent to
 * the JS `extractLocalDate(recordedAt)` comparison:
 *
 *   extractLocalDate(r) >= start   <=>   r >= start
 *   extractLocalDate(r) <= end     <=>   r <  nextLocalDate(end)
 *
 * (The upper bound is exclusive of the *next* day so the whole `end` day is
 * included regardless of the time/offset suffix.) Using these against the
 * idx_*_user_date indexes turns a full-history scan into a range scan.
 */

/** First 10 chars (YYYY-MM-DD): the local date of an offset-aware ISO string. */
export function extractLocalDate(recordedAt: string): string {
  return recordedAt.slice(0, 10);
}

/**
 * The day after a YYYY-MM-DD local date, as YYYY-MM-DD. Used as an EXCLUSIVE
 * upper bound so that `recordedAt < nextLocalDate(end)` includes every record
 * on the `end` day (any time/offset).
 */
export function nextLocalDate(localDate: string): string {
  const base = extractLocalDate(localDate);
  const d = new Date(`${base}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
