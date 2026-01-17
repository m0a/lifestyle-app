-- Migration: Convert recorded_at from UTC (Z) format to JST offset format (+09:00)
-- All existing data is assumed to be recorded in Japan (JST)
--
-- Before: 2026-01-16T23:00:00Z (UTC midnight = JST 8am next day)
-- After:  2026-01-17T08:00:00+09:00 (local time with offset preserved)
--
-- This is a safe, reversible transformation:
-- - No schema changes
-- - Only affects value format
-- - UTC timestamps are converted to JST with +09:00 offset

-- weight_records: Convert Z format to +09:00 offset
UPDATE weight_records
SET recorded_at = strftime('%Y-%m-%dT%H:%M:%S', datetime(recorded_at, '+9 hours')) || '+09:00'
WHERE recorded_at LIKE '%Z';

-- meal_records: Convert Z format to +09:00 offset
UPDATE meal_records
SET recorded_at = strftime('%Y-%m-%dT%H:%M:%S', datetime(recorded_at, '+9 hours')) || '+09:00'
WHERE recorded_at LIKE '%Z';

-- exercise_records: Convert Z format to +09:00 offset
UPDATE exercise_records
SET recorded_at = strftime('%Y-%m-%dT%H:%M:%S', datetime(recorded_at, '+9 hours')) || '+09:00'
WHERE recorded_at LIKE '%Z';
