-- Add muscle_group column to exercise_records
-- This allows custom exercise types to be associated with a muscle group
ALTER TABLE `exercise_records` ADD COLUMN `muscle_group` text;
