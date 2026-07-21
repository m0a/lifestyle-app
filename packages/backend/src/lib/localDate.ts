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

/** Japan Standard Time is a fixed UTC+9 (no DST) — the app's implicit local zone. */
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

interface JstParts { y: number; mo: number; d: number; h: number; mi: number; s: number }

function jstParts(iso: string): JstParts | null {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  // Shift the absolute instant by +9h, then read UTC fields to get JST wall clock.
  const t = new Date(ms + JST_OFFSET_MS);
  return {
    y: t.getUTCFullYear(),
    mo: t.getUTCMonth() + 1,
    d: t.getUTCDate(),
    h: t.getUTCHours(),
    mi: t.getUTCMinutes(),
    s: t.getUTCSeconds(),
  };
}

/**
 * Normalize any ISO timestamp to a JST wall-clock string "YYYY-MM-DD HH:mm".
 *
 * Most recorded_at values carry a "+09:00" offset and pass through unchanged in
 * wall-clock terms; a few legacy rows are stored as bare UTC "Z" (pre-#159) and
 * would otherwise display 9 hours early. Parsing to an absolute instant and
 * re-rendering at +09:00 makes both forms consistent. Falls back to the raw
 * input if unparseable.
 */
export function toJstDisplay(iso: string): string {
  const p = jstParts(iso);
  if (!p) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${p.y}-${pad(p.mo)}-${pad(p.d)} ${pad(p.h)}:${pad(p.mi)}`;
}

/**
 * The JST local date (YYYY-MM-DD) of any ISO timestamp, whether it is offset-aware
 * ("+09:00") or bare UTC ("Z"). Unlike extractLocalDate (which trusts the string's
 * first 10 chars and is therefore wrong for "Z" rows), this converts to JST first.
 */
export function extractJstDate(iso: string): string {
  const p = jstParts(iso);
  if (!p) return iso.slice(0, 10);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${p.y}-${pad(p.mo)}-${pad(p.d)}`;
}

/**
 * Render an instant as a JST offset-aware ISO string suitable for `recorded_at`.
 *
 * This is the single writer-side source of truth for the storage convention: every
 * recorded_at must come out of here (or from a client string that already carries an
 * offset). Bare UTC "Z" values break both the lexicographic ORDER BY and the
 * extractLocalDate prefix property that the range filters depend on.
 *
 * The output must satisfy two properties:
 *   1. Its first 10 chars are the JST calendar date (extractLocalDate works on it).
 *   2. String comparison between two outputs matches chronological order.
 */
export function toJstIsoString(date: Date): string {
  const p = jstParts(date.toISOString());
  if (!p) return date.toISOString();
  const pad = (n: number) => String(n).padStart(2, '0');

  // Second resolution, no milliseconds: existing "+09:00" rows and the 0026/0040
  // backfills are all second-precision, and mixing ".sss" back in would reintroduce
  // two shapes competing in the same string comparison.
  return `${p.y}-${pad(p.mo)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}:${pad(p.s)}+09:00`;
}

/** Sunday-through-Saturday range containing the supplied local date. */
export function getWeekDateRange(localDate: string): { startDate: string; endDate: string } {
  const date = new Date(`${extractLocalDate(localDate)}T00:00:00Z`);
  const start = new Date(date);
  start.setUTCDate(date.getUTCDate() - date.getUTCDay());

  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}
