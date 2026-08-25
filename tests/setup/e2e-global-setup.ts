/**
 * Playwright Global Setup
 *
 * Passkey-only auth means there is no shared test account to provision: each
 * test installs a virtual authenticator and signs up its own account (see
 * tests/helpers/e2e.ts). All this needs to do is confirm the local D1 database
 * exists, since a missing one fails every test with a confusing error.
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(
  __dirname,
  '../../packages/backend/.wrangler/state/v3/d1/miniflare-D1DatabaseObject'
);

export default async function globalSetup() {
  try {
    // Pick by content: miniflare keeps a metadata.sqlite next to the database
    // and `head -1` can easily land on the wrong one.
    const dbFile = execSync(
      `for f in $(find "${DB_PATH}" -name "*.sqlite" 2>/dev/null); do ` +
        `if [ "$(sqlite3 "$f" "SELECT count(*) FROM sqlite_master WHERE name='users'" 2>/dev/null)" = "1" ]; ` +
        `then echo "$f"; break; fi; done`,
      { encoding: 'utf-8', shell: '/bin/bash' }
    ).trim();

    if (!dbFile) {
      console.warn('[E2E Setup] No local database found. Run migrations first:');
      console.warn('[E2E Setup]   pnpm --filter @lifestyle-app/backend db:migrate:local');
      return;
    }

    console.log(`[E2E Setup] Using database: ${dbFile}`);
  } catch (error) {
    console.error('[E2E Setup] Could not check the local database:', error);
  }
}
