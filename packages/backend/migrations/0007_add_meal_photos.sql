-- Create meal_photos table
CREATE TABLE meal_photos (
  id TEXT PRIMARY KEY,
  meal_id TEXT NOT NULL,
  photo_key TEXT NOT NULL,
  display_order INTEGER NOT NULL CHECK (display_order >= 0 AND display_order < 10),
  analysis_status TEXT CHECK (analysis_status IN ('pending', 'analyzing', 'complete', 'failed')),
  calories INTEGER CHECK (calories >= 0),
  protein REAL CHECK (protein >= 0),
  fat REAL CHECK (fat >= 0),
  carbs REAL CHECK (carbs >= 0),
  created_at TEXT NOT NULL,
  FOREIGN KEY (meal_id) REFERENCES meal_records(id) ON DELETE CASCADE
);

-- Create index for efficient photo retrieval
CREATE INDEX idx_meal_photos_meal ON meal_photos(meal_id, display_order);

-- Add photo_id to meal_food_items (optional - for linking items to specific photos)
ALTER TABLE meal_food_items ADD COLUMN photo_id TEXT REFERENCES meal_photos(id) ON DELETE SET NULL;
CREATE INDEX idx_meal_food_items_photo ON meal_food_items(photo_id);
