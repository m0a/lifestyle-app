-- Migration 0035: meal_food_items.photo_id を ON DELETE SET NULL → CASCADE に変更（#101）
--
-- 背景: 写真削除時はアプリ側で明細(meal_food_items)も削除し totals を再計算する実装に
--   統一した（共通関数 deletePhotosWithFoodItems）。FK の SET NULL は実態と逆（明細を
--   孤児として残す）で死蔵していたため CASCADE に揃える。これで万一 meal_photos 行を
--   直接削除しても紐づく明細が自動削除され、孤児化を防ぐ（多層防御）。
--
-- SQLite は FK の ON DELETE を ALTER で変更できないためテーブル再構築（0031 と同手法）。
-- meal_food_items は被参照テーブルが無いため DROP/RENAME は安全。
-- 既存 photo_id は SET NULL の性質上 NULL か有効な meal_photos.id のみ（dangling 無し）
-- のため、CASCADE FK 付き新テーブルへの移行は FK 違反を起こさない。
-- カラム順・インデックス名は schema.ts(Drizzle 定義) に合わせる
-- （photo_id index 名は 0031 で解消済みの実態 idx_meal_food_items_photo）。

CREATE TABLE meal_food_items_new (
  id TEXT PRIMARY KEY NOT NULL,
  meal_id TEXT NOT NULL,
  photo_id TEXT,
  name TEXT NOT NULL,
  portion TEXT NOT NULL,
  calories INTEGER NOT NULL,
  protein REAL NOT NULL,
  fat REAL NOT NULL,
  carbs REAL NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (meal_id) REFERENCES meal_records(id) ON DELETE CASCADE,
  FOREIGN KEY (photo_id) REFERENCES meal_photos(id) ON DELETE CASCADE
);

INSERT INTO meal_food_items_new (
  id, meal_id, photo_id, name, portion, calories, protein, fat, carbs, created_at
)
SELECT
  id, meal_id, photo_id, name, portion, calories, protein, fat, carbs, created_at
FROM meal_food_items;

DROP TABLE meal_food_items;

ALTER TABLE meal_food_items_new RENAME TO meal_food_items;

CREATE INDEX idx_food_items_meal ON meal_food_items(meal_id);
CREATE INDEX idx_meal_food_items_photo ON meal_food_items(photo_id);
