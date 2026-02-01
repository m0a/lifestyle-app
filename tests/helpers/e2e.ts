/**
 * E2E Test Helpers for Playwright
 *
 * Provides utilities for E2E tests including:
 * - Authentication helpers
 * - Common page actions
 * - Test data setup
 */

import type { Page } from '@playwright/test';

export const TEST_USERS = {
  default: {
    email: 'test@example.com',
    password: 'test1234',
  },
  secondary: {
    email: 'test2@example.com',
    password: 'test1234',
  },
} as const;

/**
 * Login to the application via UI
 */
export async function loginAsTestUser(
  page: Page,
  email: string = TEST_USERS.default.email,
  password: string = TEST_USERS.default.password
): Promise<void> {
  // Navigate to login page
  await page.goto('/login');

  // Fill in credentials
  await page.getByLabel(/メールアドレス/i).fill(email);
  await page.getByLabel(/パスワード/i).fill(password);

  // Click login button and wait for navigation
  await Promise.all([
    page.waitForURL('/', { timeout: 10000 }),
    page.getByRole('button', { name: /ログイン/i }).click(),
  ]);

  // Wait for auth state to be updated
  await page.waitForLoadState('networkidle');
}

/**
 * Logout from the application
 */
async function logout(page: Page): Promise<void> {
  // Click on user menu or logout button
  // Adjust selector based on your UI
  const logoutButton = page.getByRole('button', { name: /ログアウト|logout/i });
  if (await logoutButton.isVisible()) {
    await logoutButton.click();
    await page.waitForURL('/login', { timeout: 5000 });
  }
}

/**
 * Register a new user (for test setup)
 */
async function registerTestUser(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto('/register');

  await page.getByLabel(/メールアドレス/i).fill(email);
  await page.getByLabel(/パスワード/i).fill(password);

  await page.getByRole('button', { name: /登録/i }).click();

  // Wait for successful registration (redirects to '/')
  await Promise.all([
    page.waitForURL('/', { timeout: 10000 }),
  ]);
}

/**
 * Ensure test user exists (try to register, ignore if already exists)
 */
export async function ensureTestUserExists(
  page: Page,
  email: string = TEST_USERS.default.email,
  password: string = TEST_USERS.default.password
): Promise<void> {
  try {
    await registerTestUser(page, email, password);
    // If registration succeeds, logout
    await logout(page);
  } catch {
    // User probably already exists, that's fine
  }
}

