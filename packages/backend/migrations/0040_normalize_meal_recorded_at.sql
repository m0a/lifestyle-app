-- Migration: Re-normalize meal_records.recorded_at from UTC ("Z") to JST offset ("+09:00")
--
-- Migration 0026 did this same conversion once, but it only cleaned existing rows —
-- the writers that emit "Z" were left in place (ai-chat.ts set_datetime, the
-- meal-analysis recordedAt fallbacks, and ai-analysis's formatDateWithOffset
-- fallback), so "Z" rows kept accumulating. Those writers are fixed in the same
-- release as this migration; this pass cleans up what they already wrote.
--
-- Why it matters: recorded_at is TEXT and is both sorted (ORDER BY recorded_at DESC)
-- and range-filtered (lexicographic, via extractLocalDate's first-10-chars property)
-- as a raw string. A "Z" row sorts as if it were 9 hours earlier than it is, so it
-- lands in the wrong position among "+09:00" rows.
--
-- Before: 2026-07-20T08:09:59.018Z   (sorts under "T08", displays as 17:09 JST)
-- After:  2026-07-20T17:09:59+09:00  (sorts under "T17", displays as 17:09 JST)
--
-- Safety: verified against production before writing this migration.
--   - 49 of 380 meal_records rows are "Z"; weight_records and exercise_records have 0.
--   - 0 of those 49 have a UTC hour >= 15, i.e. none represent a JST time between
--     00:00 and 08:59. So no row's first 10 chars change, and no record moves to a
--     different calendar day. Only the ordering within a day changes.
-- Sub-second precision is dropped to match the existing "+09:00" rows, which are
-- second-resolution.

UPDATE meal_records
SET recorded_at = strftime('%Y-%m-%dT%H:%M:%S', datetime(recorded_at, '+9 hours')) || '+09:00'
WHERE recorded_at LIKE '%Z';
