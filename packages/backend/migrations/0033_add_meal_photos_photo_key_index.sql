-- #97: photo serving now verifies ownership by looking up meal_photos.photo_key
-- on every image request (join to meal_records.user_id). Add an index on
-- photo_key so that per-request lookup does not scan the table.
CREATE INDEX IF NOT EXISTS idx_meal_photos_photo_key ON meal_photos(photo_key);
