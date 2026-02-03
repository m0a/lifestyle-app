import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env['CI'];

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI ? 'list' : 'html',
  timeout: 30000,
  // Global setup ensures test user is properly configured before tests run
  // Before running E2E tests locally, ensure migrations are applied:
  //   pnpm --filter @lifestyle-app/backend db:migrate:local
  globalSetup: './tests/setup/e2e-global-setup.ts',
  use: {
    baseURL: isCI ? 'http://localhost:4173' : 'http://localhost:5173',
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
      url: isCI ? 'http://localhost:4173' : 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 60000,
    },
  ],
});
