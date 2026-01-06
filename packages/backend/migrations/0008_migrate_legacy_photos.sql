-- Migrate existing photos from meal_records.photo_key to meal_photos table
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
    SELECT 1 FROM meal_photos WHERE meal_id = meal_records.id AND photo_key = meal_records.photo_key
  );
