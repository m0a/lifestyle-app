-- Migration 0041: per-user weekly evaluation targets (#170)
--
-- The "この1週間" card evaluates every user against a single hardcoded
-- WEEKLY_MEAL_TARGETS (tuned for the owner's fatty-liver plan). Move the
-- goal-like values to per-user columns, mirroring goal_weight / goal_calories.
--
-- Deliberately NULLABLE with NO default: NULL means "unset", and the backend
-- coalesces it to WEEKLY_MEAL_TARGETS at read time (resolveWeeklyMealTargets).
-- That keeps unset users tracking the global default even if it is retuned,
-- and avoids baking today's numbers into every existing row.
--
-- windowDays / weightMaWindow (structural) and carbsPct (reference-only band)
-- stay global and are intentionally NOT stored per user.

ALTER TABLE users ADD COLUMN target_daily_calorie_limit INTEGER;
ALTER TABLE users ADD COLUMN target_protein_pct INTEGER;
ALTER TABLE users ADD COLUMN target_fat_pct INTEGER;
ALTER TABLE users ADD COLUMN target_protein_floor_per_day INTEGER;
ALTER TABLE users ADD COLUMN target_high_fat_days_limit INTEGER;
ALTER TABLE users ADD COLUMN target_exercise_days INTEGER;
