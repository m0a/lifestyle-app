/**
 * Playwright Global Setup
 *
 * This script runs before all E2E tests to ensure the test environment is properly configured.
 * It resets the test user to ensure consistent test runs.
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKEND_DIR = path.join(__dirname, '../../packages/backend');
const DB_PATH = path.join(
  BACKEND_DIR,
  '.wrangler/state/v3/d1/miniflare-D1DatabaseObject'
);

// Test user configuration - must match what's in tests/helpers/e2e.ts
const TEST_USER = {
  id: 'e2e-test-user-00000000-0000-0000-0000-000000000001',
  email: 'test@example.com',
  // bcrypt hash for 'test1234' with cost factor 10
  passwordHash: '$2a$10$rNb.lauAzHAvpfZ0xxXd7uWpi4tfKv1qRpdeJ1lKVskLosJq86mlu',
  emailVerified: 1,
};

export default async function globalSetup() {
  console.log('[E2E Setup] Ensuring test user is configured...');

  try {
    // Find the SQLite database file
    const findDbCommand = `find "${DB_PATH}" -name "*.sqlite" 2>/dev/null | head -1`;
    const dbFile = execSync(findDbCommand, { encoding: 'utf-8' }).trim();

    if (!dbFile) {
      console.log('[E2E Setup] No local database found. Migrations may need to be run first.');
      console.log('[E2E Setup] Run: pnpm --filter @lifestyle-app/backend db:migrate:local');
      return;
    }

    console.log(`[E2E Setup] Found database: ${dbFile}`);

    // Reset the test user with the correct password hash
    // Use heredoc to avoid shell variable interpolation of $ in bcrypt hash
    const sql = `
DELETE FROM users WHERE email = '${TEST_USER.email}';
INSERT INTO users (id, email, password_hash, created_at, updated_at, email_verified, goal_calories)
VALUES (
  '${TEST_USER.id}',
  '${TEST_USER.email}',
  '${TEST_USER.passwordHash}',
  datetime('now'),
  datetime('now'),
  ${TEST_USER.emailVerified},
  2000
);`;

    // Use heredoc (<<'EOF') with single quotes to prevent shell variable expansion
    execSync(`sqlite3 "${dbFile}" <<'EOF'
${sql}
EOF`, { encoding: 'utf-8', shell: '/bin/bash' });

    // Verify the user was created correctly
    const verifyCommand = `sqlite3 "${dbFile}" "SELECT email, email_verified FROM users WHERE email = '${TEST_USER.email}';"`;
    const result = execSync(verifyCommand, { encoding: 'utf-8' }).trim();

    if (result.includes(TEST_USER.email)) {
      console.log('[E2E Setup] Test user configured successfully.');
    } else {
      console.error('[E2E Setup] Warning: Test user may not have been created correctly.');
    }
  } catch (error) {
    console.error('[E2E Setup] Error setting up test user:', error);
    console.log('[E2E Setup] E2E tests may fail if the test user is not configured correctly.');
  }
}
