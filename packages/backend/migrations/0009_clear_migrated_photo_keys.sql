-- Clear photo_key from meal_records for photos that have been migrated to meal_photos
-- This prevents double management of the same photo
UPDATE meal_records
SET photo_key = NULL
WHERE id IN (
  SELECT meal_id
  FROM meal_photos
  WHERE id LIKE 'legacy-%'
);
