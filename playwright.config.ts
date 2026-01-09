import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI ? 'list' : 'html',
  timeout: 30000,
  // Global setup disabled - test user is created via migration 0010_add_test_user.sql
  // globalSetup: './tests/setup/global-setup.ts',
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
      url: 'http://localhost:8787/health',
      reuseExistingServer: true, // CI: e2e.yml starts backend manually, reuse it
      timeout: 120000,
      env: {
        NODE_ENV: 'test',
      },
    },
    // Frontend server (Vite)
    {
      command: isCI ? 'pnpm --filter @lifestyle-app/frontend preview' : 'pnpm dev',
      url: isCI ? 'http://localhost:4173' : 'http://localhost:5173',
      reuseExistingServer: !isCI,
      timeout: 60000,
    },
  ],
});
