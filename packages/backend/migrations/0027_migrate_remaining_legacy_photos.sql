-- Migrate remaining photos from meal_records.photo_key to meal_photos table
-- This catches any photos that were added after the initial migration (0008/0009)

-- Step 1: Migrate photos that don't already exist in meal_photos
INSERT INTO meal_photos (id, meal_id, photo_key, display_order, analysis_status, calories, protein, fat, carbs, created_at)
SELECT
  'legacy-' || id,
  id,
  photo_key,
  0,
  CASE WHEN analysis_source = 'ai' THEN 'complete' ELSE 'pending' END,
  CASE WHEN analysis_source = 'ai' THEN calories ELSE NULL END,
  CASE WHEN analysis_source = 'ai' THEN total_protein ELSE NULL END,
  CASE WHEN analysis_source = 'ai' THEN total_fat ELSE NULL END,
  CASE WHEN analysis_source = 'ai' THEN total_carbs ELSE NULL END,
  created_at
FROM meal_records
WHERE photo_key IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM meal_photos WHERE meal_id = meal_records.id
  );

-- Step 2: Clear all remaining photo_keys in meal_records
UPDATE meal_records SET photo_key = NULL WHERE photo_key IS NOT NULL;
