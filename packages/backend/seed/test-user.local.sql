-- Local / CI-only seed: 統合テスト用の固定ユーザー2件
--
-- Issue #96: 以前は migration がテストユーザーを INSERT していたが、マイグレーションは
-- 本番(health-tracker-db)にも適用されるため、既知クレデンシャルのアカウントが本番に
-- 常設されていた。テストユーザーは「ローカル D1 にのみ」適用するこの seed で供給する。
--
-- 適用先は wrangler d1 execute --local のみ（.github/workflows/ci.yml の E2E/統合ジョブ /
-- ローカル開発の `pnpm db:seed:local`）。preview / production には決して適用しない。
--
-- パスキー一本化以降、パスワードは存在しないので既知クレデンシャル自体が無い。
-- ここで供給するのは「統合テストが cookie を署名する相手となるユーザー行」だけで、
-- 認証情報は含まれない（tests/helpers/integration.ts の TEST_ACCOUNTS と対応）。
--
-- E2E(Playwright)はこの seed を使わない。仮想認証器でテストごとに新規登録するため
-- (tests/helpers/e2e.ts)。
--
-- email は死んだ NOT NULL UNIQUE 列（migration 0043 参照）。合成アドレスは制約を
-- 満たすためだけに入れている。

INSERT OR IGNORE INTO users (id, email, display_name, goal_calories, created_at, updated_at)
VALUES (
  'integration-test-user-0001',
  'integration-test-user-0001@passkey.invalid',
  'テストユーザー',
  2000,
  datetime('now'),
  datetime('now')
);

INSERT OR IGNORE INTO users (id, email, display_name, goal_calories, created_at, updated_at)
VALUES (
  'integration-test-user-0002',
  'integration-test-user-0002@passkey.invalid',
  '別のユーザー',
  2000,
  datetime('now'),
  datetime('now')
);
