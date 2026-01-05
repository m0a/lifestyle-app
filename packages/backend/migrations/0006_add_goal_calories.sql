-- Add goal_calories column to users table
ALTER TABLE users ADD COLUMN goal_calories INTEGER DEFAULT 2000;

-- Set default value for existing users
UPDATE users SET goal_calories = 2000 WHERE goal_calories IS NULL;
