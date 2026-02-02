-- Add E2E test user for automated testing
-- Email: test@example.com
-- Password: test1234

-- First, delete any existing test user to ensure clean state
DELETE FROM users WHERE email = 'test@example.com';

-- Then insert the test user with verified email
INSERT INTO users (id, email, password_hash, created_at, updated_at, email_verified)
VALUES (
  'e2e-test-user-00000000-0000-0000-0000-000000000001',
  'test@example.com',
  '$2a$10$8H6bb2j4r7FsSTvZmOxMmeGLA8yWqnr/zGnCaqdQBqGxHRymX510.',
  datetime('now'),
  datetime('now'),
  1
);
