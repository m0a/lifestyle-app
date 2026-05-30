-- ============================================================
-- Lifestyle App — 本番DB 実スキーマ (health-tracker-db)
-- Cloudflare D1 / database_id: 86957e0a-04b6-4530-9b64-79ea36c64ba5
-- 取得日: 2026-05-30 / 更新: 2026-05-31 (migration 0031 適用後) / region: APAC (KIX)
-- 取得元: sqlite_master (本番リモート, wrangler d1 execute DB --remote)
--
-- ※ これは実DBのDDLそのもの。migration 0031 でドリフトを解消し、現在 Drizzle 定義(schema.ts)と整合。
--    詳細は db-schema.html の「ドリフト解消済み」セクション参照。
-- ============================================================

-- ===== ユーザー基盤 =====
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  goal_weight REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
, goal_calories INTEGER DEFAULT 2000, email_verified INTEGER NOT NULL DEFAULT 0);
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_users_email_verified ON users(email_verified);

-- ===== 記録系 =====
CREATE TABLE weight_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weight REAL NOT NULL,
  recorded_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_weight_user_date ON weight_records(user_id, recorded_at);

-- 0031 で再構築済み: set_number に NOT NULL 付与、カラム順を Drizzle 定義に整列
CREATE TABLE exercise_records (
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
CREATE INDEX idx_exercise_user_date ON exercise_records (user_id, recorded_at);
CREATE INDEX idx_exercise_user_type_date ON exercise_records (user_id, exercise_type, recorded_at);

-- ===== 食事ドメイン =====
CREATE TABLE meal_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meal_type TEXT NOT NULL,
  content TEXT NOT NULL,
  calories INTEGER,
  recorded_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
, photo_key TEXT,                          -- ★レガシー列: 本番に物理残存 (Drizzle定義には無い)
  total_protein REAL, total_fat REAL, total_carbs REAL, analysis_source TEXT);
CREATE INDEX idx_meal_user_date ON meal_records(user_id, recorded_at);

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
CREATE INDEX idx_meal_photos_meal ON meal_photos(meal_id, display_order);

CREATE TABLE meal_food_items (
  id TEXT PRIMARY KEY,
  meal_id TEXT NOT NULL REFERENCES meal_records(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  portion TEXT NOT NULL,
  calories INTEGER NOT NULL,
  protein REAL NOT NULL,
  fat REAL NOT NULL,
  carbs REAL NOT NULL,
  created_at TEXT NOT NULL
, photo_id TEXT REFERENCES meal_photos(id) ON DELETE SET NULL);   -- photo_id は 0007 で後付け
CREATE INDEX idx_food_items_meal ON meal_food_items(meal_id);
CREATE INDEX idx_meal_food_items_photo ON meal_food_items(photo_id);  -- 注: Drizzleは idx_food_items_photo

CREATE TABLE meal_chat_messages (
  id TEXT PRIMARY KEY,
  meal_id TEXT NOT NULL REFERENCES meal_records(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  applied_changes TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_chat_messages_meal ON meal_chat_messages(meal_id, created_at);

-- ===== AI利用ログ =====
CREATE TABLE `ai_usage_records` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `feature_type` text NOT NULL,
  `prompt_tokens` integer NOT NULL,
  `completion_tokens` integer NOT NULL,
  `total_tokens` integer NOT NULL,
  `created_at` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX `idx_ai_usage_user_date` ON `ai_usage_records` (`user_id`, `created_at`);

-- ===== メール / トークン =====
CREATE TABLE password_reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX idx_password_reset_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_expires_at ON password_reset_tokens(expires_at);

CREATE TABLE email_verification_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX idx_email_verification_token ON email_verification_tokens(token);
CREATE INDEX idx_email_verification_user_id ON email_verification_tokens(user_id);
CREATE INDEX idx_email_verification_expires_at ON email_verification_tokens(expires_at);

CREATE TABLE email_change_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  old_email TEXT NOT NULL,
  new_email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  confirmed_at INTEGER,
  cancelled_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX idx_email_change_token ON email_change_requests(token);
CREATE INDEX idx_email_change_user_id ON email_change_requests(user_id);
CREATE INDEX idx_email_change_expires_at ON email_change_requests(expires_at);
CREATE INDEX idx_email_change_new_email ON email_change_requests(new_email);

CREATE TABLE email_delivery_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  email_type TEXT NOT NULL CHECK (email_type IN ('password_reset', 'email_verification', 'email_change')),
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0 AND retry_count <= 3),
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX idx_email_logs_user_id ON email_delivery_logs(user_id);
CREATE INDEX idx_email_logs_status ON email_delivery_logs(status);
CREATE INDEX idx_email_logs_created_at ON email_delivery_logs(created_at);
CREATE INDEX idx_email_logs_email_type ON email_delivery_logs(email_type);

CREATE TABLE email_rate_limits (
  ip TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0 AND count <= 10),
  expires_at INTEGER NOT NULL
);

-- ===== Passkey / WebAuthn =====
CREATE TABLE passkey_credentials (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  device_type TEXT NOT NULL,
  backed_up INTEGER NOT NULL DEFAULT 0,
  transports TEXT,
  name TEXT,
  last_used_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_passkey_user_id ON passkey_credentials(user_id);

CREATE TABLE webauthn_challenges (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  challenge TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_webauthn_challenge_expires ON webauthn_challenges(expires_at);

-- ============================================================
-- 適用済みマイグレーション (d1_migrations): 全21件
--   0000_glamorous_cloak / 0001_initial / 0002_strength_training /
--   0003_add_muscle_group / 0004_set_management / 0005_add_ai_usage_records /
--   0006_add_goal_calories / 0007_add_meal_photos / 0008_migrate_legacy_photos /
--   0009_clear_migrated_photo_keys / 0021_email_logs / 0022_password_reset_tokens /
--   0023_user_email_verified / 0024_email_verification_tokens / 0025_email_change_requests /
--   0026_timezone_offset / 0027_migrate_remaining_legacy_photos / 0028_add_e2e_test_user /
--   0029_add_exercise_memo / 0030_passkey_webauthn /
--   0031_resolve_schema_drift  ← set_number NOT NULL化 + meal_records.photo_key 削除（ドリフト解消）
--
-- 本番データ件数 (2026-05-30 時点, 計 2,561 行):
--   users:7  weight_records:66  exercise_records:286  meal_records:315
--   meal_photos:253  meal_food_items:981  meal_chat_messages:226  ai_usage_records:417
--   password_reset_tokens:0  email_verification_tokens:0  email_change_requests:0
--   email_delivery_logs:8  email_rate_limits:1  passkey_credentials:1  webauthn_challenges:0
-- ============================================================
