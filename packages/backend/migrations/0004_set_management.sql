-- Migration: Set Management
-- Description: Change from summary format (sets column) to per-set recording (set_number, variation columns)

-- Step 1: Add new columns
ALTER TABLE exercise_records ADD COLUMN set_number INTEGER DEFAULT 1;
ALTER TABLE exercise_records ADD COLUMN variation TEXT;

-- Step 2: Expand existing data
-- For each record with sets > 1, create additional records with setNumber 2, 3, etc.
-- This is done via application code after migration

-- Step 3: Update set_number to NOT NULL after data migration
-- Note: SQLite doesn't support ALTER COLUMN, so we handle this via application constraints

-- Step 4: Remove sets column
-- D1/modern SQLite supports DROP COLUMN
ALTER TABLE exercise_records DROP COLUMN sets;
