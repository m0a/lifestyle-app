-- Migration 0037: add updated_at to meal_photos and meal_food_items (#106)
--
-- Both tables are UPDATEd in place (photo analysis result/status; chat & manual
-- food-item edits) but only carried created_at, so the last-modified time was
-- untrackable. Add updated_at, NOT NULL to match the other records tables.
--
-- SQLite cannot ADD a NOT NULL column without a constant default, so we seed a
-- sentinel epoch default and immediately backfill every existing row to its
-- created_at. The application always supplies updated_at on write (Drizzle
-- $defaultFn on insert, $onUpdate on update), so the sentinel default is never
-- actually used for new rows — it exists only to satisfy the ADD COLUMN.

ALTER TABLE meal_photos ADD COLUMN updated_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z';
UPDATE meal_photos SET updated_at = created_at;

ALTER TABLE meal_food_items ADD COLUMN updated_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z';
UPDATE meal_food_items SET updated_at = created_at;
