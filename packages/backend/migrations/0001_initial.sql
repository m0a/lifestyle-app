-- Migration: Initial schema
-- Created: 2025-12-27

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  goal_weight REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_email ON users(email);

-- Weight records table
CREATE TABLE IF NOT EXISTS weight_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weight REAL NOT NULL,
  recorded_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_weight_user_date ON weight_records(user_id, recorded_at);

-- Meal records table
CREATE TABLE IF NOT EXISTS meal_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meal_type TEXT NOT NULL,
  content TEXT NOT NULL,
  calories INTEGER,
  recorded_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_meal_user_date ON meal_records(user_id, recorded_at);

-- Exercise records table
CREATE TABLE IF NOT EXISTS exercise_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_type TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  recorded_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_exercise_user_date ON exercise_records(user_id, recorded_at);
