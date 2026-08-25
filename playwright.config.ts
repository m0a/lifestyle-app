import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env['CI'];

// Ports are overridable because several git worktrees of this repo are often
// running at once and Vite silently falls back to the next free port. Point the
// suite at whichever instance is actually under test:
//   E2E_BASE_URL=http://localhost:5175 pnpm test:e2e
const frontendUrl =
  process.env['E2E_BASE_URL'] ?? (isCI ? 'http://localhost:4174' : 'http://localhost:5174');

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI ? 'list' : 'html',
  timeout: 30000,
  // Auth is passkey-only, so E2E tests provision themselves: each installs a
  // CDP virtual authenticator and signs up a fresh account (tests/helpers/e2e.ts).
  // Global setup only sanity-checks that a local D1 exists. Before running E2E
  // tests locally, apply migrations:
  //   pnpm --filter @lifestyle-app/backend db:migrate:local
  globalSetup: isCI ? undefined : './tests/setup/e2e-global-setup.ts',
  use: {
    baseURL: frontendUrl,
    trace: 'on-first-retry',
  },
  projects: isCI
    ? [
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
        },
      ]
    : [
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
        },
        {
          name: 'Mobile Chrome',
          use: { ...devices['Pixel 5'] },
        },
      ],
  webServer: [
    // Backend server (Wrangler)
    {
      command: 'pnpm dev:backend',
      url: 'http://localhost:8787/api/health',
      // CI: servers are started by CI workflow, so reuse existing
      // Local: start if not running, reuse if already running
      reuseExistingServer: true,
      timeout: 120000,
      env: {
        NODE_ENV: 'test',
      },
    },
    // Frontend server (Vite)
    {
      command: isCI ? 'pnpm --filter @lifestyle-app/frontend preview' : 'pnpm dev',
      url: frontendUrl,
      reuseExistingServer: true,
      timeout: 60000,
    },
  ],
});
