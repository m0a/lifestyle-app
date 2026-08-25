/**
 * Integration Test Helpers
 *
 * Auth is passkey-only, and a WebAuthn ceremony cannot be performed over plain
 * HTTP from Node — it needs an authenticator. So instead of logging in, these
 * helpers seed a user row straight into the local D1 file and mint the same
 * signed session cookie the server would have issued.
 *
 * This deliberately avoids adding a test-only login endpoint: nothing extra
 * ships in the production worker. It works because createSessionToken and
 * resolveSessionSecret are the very functions the server uses, so an unset
 * SESSION_SECRET makes both sides agree on the development default.
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createSessionToken,
  resolveSessionSecret,
} from '../../packages/backend/src/middleware/auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const API_BASE = process.env.TEST_API_BASE || 'http://localhost:8787';

const D1_STATE_DIR = path.join(
  __dirname,
  '../../packages/backend/.wrangler/state/v3/d1/miniflare-D1DatabaseObject'
);

let cachedDbFile: string | null = null;

function localDbFile(): string {
  if (cachedDbFile) return cachedDbFile;

  // The directory holds more than one .sqlite (miniflare keeps its own
  // metadata.sqlite alongside the database), and their order is not defined —
  // so pick by content rather than by position.
  const candidates = execSync(`find "${D1_STATE_DIR}" -name "*.sqlite" 2>/dev/null`, {
    encoding: 'utf-8',
  })
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const found = candidates.find((file) => {
    try {
      return (
        execSync(`sqlite3 "${file}" "SELECT count(*) FROM sqlite_master WHERE name='users'"`, {
          encoding: 'utf-8',
        }).trim() === '1'
      );
    } catch {
      return false;
    }
  });

  if (!found) {
    throw new Error(
      'Local D1 database not found (no .sqlite file contains a `users` table). Run: ' +
        'pnpm --filter @lifestyle-app/backend db:migrate:local'
    );
  }
  cachedDbFile = found;
  return found;
}

function sqlite(sql: string): string {
  // The running worker holds the same file open, so a write can collide with
  // miniflare's. busy_timeout makes sqlite3 wait for the lock instead of failing
  // the test outright.
  return execSync(`sqlite3 "${localDbFile()}" <<'EOF'\nPRAGMA busy_timeout = 10000;\n${sql}\nEOF`, {
    encoding: 'utf-8',
    shell: '/bin/bash',
  });
}

function sqliteRead(sql: string): string {
  return execSync(`sqlite3 -readonly "${localDbFile()}" "${sql.replace(/"/g, '\\"')}"`, {
    encoding: 'utf-8',
  }).trim();
}

/**
 * Fixed accounts shared by the integration suite.
 *
 * Deliberately fixed rather than per-test: the running worker holds the same
 * SQLite file open and does NOT wait for locks (it fails with SQLITE_BUSY), so
 * every write from here can break an in-flight request. Fixed ids let the common
 * path be a read — `ensureUser` only writes the first time a suite runs against
 * a fresh database, and reads take a shared lock that coexists with the worker.
 */
const TEST_ACCOUNTS = {
  default: { id: 'integration-test-user-0001', displayName: 'テストユーザー' },
  secondary: { id: 'integration-test-user-0002', displayName: '別のユーザー' },
} as const;

type TestAccountRole = keyof typeof TEST_ACCOUNTS;

function ensureUser(role: TestAccountRole): string {
  const { id, displayName } = TEST_ACCOUNTS[role];

  const exists = sqliteRead(`SELECT count(*) FROM users WHERE id = '${id}';`) === '1';
  if (!exists) {
    const now = new Date().toISOString();
    // email is a dead NOT NULL UNIQUE column (see migration 0043); the synthetic
    // value only exists to satisfy the constraint.
    sqlite(
      `INSERT OR IGNORE INTO users (id, email, display_name, goal_calories, created_at, updated_at) ` +
        `VALUES ('${id}', '${id}@passkey.invalid', '${displayName}', 2000, '${now}', '${now}');`
    );
  }

  return id;
}

/**
 * Session for integration tests: a seeded user plus its signed cookie.
 */
export class TestSession {
  private constructor(
    readonly userId: string,
    private readonly sessionCookie: string
  ) {}

  static async create(role: TestAccountRole = 'default'): Promise<TestSession> {
    const id = ensureUser(role);
    const secret = resolveSessionSecret({ ENVIRONMENT: process.env.ENVIRONMENT ?? 'test' });
    const token = await createSessionToken(id, secret);
    return new TestSession(id, `session=${token}`);
  }

  /**
   * fetch() against the API with this session's cookie attached.
   */
  async request(pathname: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set('Cookie', this.sessionCookie);
    return fetch(`${API_BASE}${pathname}`, { ...init, headers });
  }

  getCookie(): string {
    return this.sessionCookie;
  }

  async logout(): Promise<void> {
    await this.request('/api/auth/logout', { method: 'POST' });
  }

  /**
   * No-op: the accounts are fixed and reused, so there is nothing to tear down.
   * Deleting them would mean a write per test — exactly what causes SQLITE_BUSY
   * against the running worker. Tests that create records clean up their own.
   */
  cleanup(): void {
    // intentionally empty
  }
}

export async function createTestSession(role: TestAccountRole = 'default'): Promise<TestSession> {
  return TestSession.create(role);
}
