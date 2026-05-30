-- Migration 0031: スキーマドリフト解消（本番/preview DB を Drizzle 定義に整合させる）
--
-- 背景: schema.ts(Drizzle定義) と本番/preview D1 の実スキーマに4点の乖離があった。
--   #1 meal_food_items の photo_id index 名: 定義 idx_food_items_photo / DB 実態 idx_meal_food_items_photo
--   #2 exercise_records.set_number: 定義 .notNull() / DB は NOT NULL 無し
--   #3 users.goal_calories: 定義 .default() 無し / DB は DEFAULT 2000
--   #4 meal_records.photo_key: 定義に無いレガシー列が DB に残存（meal_photos へ移行済み）
--
-- #1 #3 は DB 実態が正しく、schema.ts 側を実態に合わせて修正済み（本マイグレーションでの DB 変更は不要）。
-- 本マイグレーションでは DB 側を定義に寄せる #2 #4 を扱う。
--
-- データ検証（2026-05-30 時点）:
--   set_number: 本番286行/preview25行とも NULL 0件・min 1・max 11 → NOT NULL 化は安全
--   meal_records.photo_key: 本番315行/preview70行とも non-null 0件 → DROP COLUMN は安全

-- ============================================================
-- #2 exercise_records.set_number に NOT NULL を付与（SQLite は ALTER COLUMN 不可のためテーブル再構築）
--    exercise_records は被参照テーブルが無いため DROP/RENAME は安全。
--    カラム順は Drizzle 定義(schema.ts)に合わせる。
-- ============================================================
CREATE TABLE exercise_records_new (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  exercise_type TEXT NOT NULL,
  muscle_group TEXT,
  set_number INTEGER NOT NULL DEFAULT 1,
  reps INTEGER NOT NULL,
  weight REAL,
  variation TEXT,
  memo TEXT,
  recorded_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO exercise_records_new (
  id, user_id, exercise_type, muscle_group, set_number, reps, weight, variation, memo, recorded_at, created_at, updated_at
)
SELECT
  id, user_id, exercise_type, muscle_group, COALESCE(set_number, 1), reps, weight, variation, memo, recorded_at, created_at, updated_at
FROM exercise_records;

DROP TABLE exercise_records;

ALTER TABLE exercise_records_new RENAME TO exercise_records;

CREATE INDEX idx_exercise_user_date ON exercise_records(user_id, recorded_at);
CREATE INDEX idx_exercise_user_type_date ON exercise_records(user_id, exercise_type, recorded_at);

-- ============================================================
-- #4 meal_records.photo_key（レガシー列）を削除
--    photo_key は index/FK に未使用のため DROP COLUMN は安全。
-- ============================================================
ALTER TABLE meal_records DROP COLUMN photo_key;
