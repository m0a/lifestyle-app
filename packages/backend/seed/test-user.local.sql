-- Local / CI-only seed: E2E/統合テスト用ユーザー (test@example.com / test1234)
--
-- Issue #96: 以前は migration 0028 がこのユーザーを INSERT していたが、
-- マイグレーションは本番(health-tracker-db)にも適用されるため、既知クレデンシャルの
-- アカウントが本番に常設されていた。0032 で全環境から削除し、テストユーザーは
-- 「ローカル D1 にのみ」適用するこの seed で供給する方式へ移行した。
--
-- 適用先は wrangler d1 execute --local のみ（.github/workflows/ci.yml の E2E ジョブ /
-- ローカル開発の `pnpm db:seed:local`）。preview / production には決して適用しない。
--
-- CI の Playwright は globalSetup を無効化しているため(playwright.config.ts)、
-- E2E のテストユーザーはこの seed が唯一の供給元になる。

DELETE FROM users WHERE email = 'test@example.com';

INSERT INTO users (id, email, password_hash, created_at, updated_at, email_verified, goal_calories)
VALUES (
  'e2e-test-user-00000000-0000-0000-0000-000000000001',
  'test@example.com',
  '$2a$10$8H6bb2j4r7FsSTvZmOxMmeGLA8yWqnr/zGnCaqdQBqGxHRymX510.',
  datetime('now'),
  datetime('now'),
  1,
  2000
);
