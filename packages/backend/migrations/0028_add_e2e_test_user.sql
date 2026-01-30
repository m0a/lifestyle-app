-- Add E2E test user for automated testing
-- Email: test@example.com
-- Password: password123

INSERT OR IGNORE INTO users (id, email, password_hash, created_at, email_verified)
VALUES (
  'e2e-test-user-00000000-0000-0000-0000-000000000001',
  'test@example.com',
  '$2a$10$8g1MUb0JVkgIleLItTAg0uXokzt0W46/TaAnLfLukCFB8KW1jt4Gq',
  datetime('now'),
  1
);
