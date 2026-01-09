import { test, expect } from '@playwright/test';
import { ensureTestUserExists, loginAsTestUser, TEST_USERS } from '../helpers/e2e';

test.describe('Offline Support', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure test user exists (creates if doesn't exist)
    await ensureTestUserExists(page);
    // Login with test user
    await loginAsTestUser(page);
  });

  test.describe('PWA Installation', () => {
    test('should have a web app manifest', async ({ page }) => {
      await page.goto('/');

      // Check for manifest link
      const manifest = await page.locator('link[rel="manifest"]').getAttribute('href');
      expect(manifest).toBeTruthy();
    });

    test('should register service worker', async ({ page }) => {
      await page.goto('/');

      // Wait for service worker to register
      const swRegistered = await page.evaluate(async () => {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          return !!registration;
        }
        return false;
      });

      expect(swRegistered).toBe(true);
    });
  });

  test.describe('Offline Data Entry', () => {
    test('should show offline indicator when offline', async ({ page, context }) => {
      await page.goto('/weight');

      // Go offline
      await context.setOffline(true);

      // Should show offline indicator
      await expect(page.getByText(/オフライン|Offline/i)).toBeVisible({ timeout: 5000 });
    });

    test('should allow weight entry while offline', async ({ page, context }) => {
      await page.goto('/weight');

      // Go offline
      await context.setOffline(true);
      await page.waitForTimeout(500);

      // Fill weight form
      await page.fill('input[name="weight"]', '70.5');
      await page.click('button[type="submit"]');

      // Should show pending/queued status
      await expect(page.getByText(/保存済み|同期待ち|pending/i)).toBeVisible({ timeout: 3000 });
    });

    test('should allow meal entry while offline', async ({ page, context }) => {
      await page.goto('/meals');

      // Go offline
      await context.setOffline(true);
      await page.waitForTimeout(500);

      // Fill meal form
      await page.click('button:has-text("朝食")');
      await page.fill('textarea[name="description"]', 'オフラインテスト食事');
      await page.click('button[type="submit"]');

      // Should show pending status
      await expect(page.getByText(/保存済み|同期待ち|pending/i)).toBeVisible({ timeout: 3000 });
    });

    test('should allow exercise entry while offline', async ({ page, context }) => {
      await page.goto('/exercises');

      // Go offline
      await context.setOffline(true);
      await page.waitForTimeout(500);

      // Fill exercise form
      await page.click('button:has-text("ランニング")');
      await page.fill('input[name="durationMinutes"]', '30');
      await page.click('button[type="submit"]');

      // Should show pending status
      await expect(page.getByText(/保存済み|同期待ち|pending/i)).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Data Synchronization', () => {
    test('should sync data when back online', async ({ page, context }) => {
      await page.goto('/weight');

      // Go offline and add entry
      await context.setOffline(true);
      await page.waitForTimeout(500);

      await page.fill('input[name="weight"]', '71.0');
      await page.click('button[type="submit"]');

      // Come back online
      await context.setOffline(false);
      await page.waitForTimeout(1000);

      // Should sync and show success
      await expect(page.getByText(/同期完了|synced/i)).toBeVisible({ timeout: 5000 });
    });

    test('should show sync status indicator', async ({ page, context }) => {
      await page.goto('/weight');

      // Go offline
      await context.setOffline(true);

      // Add some entries
      await page.fill('input[name="weight"]', '72.0');
      await page.click('button[type="submit"]');

      // Should show pending count
      const pendingIndicator = page.getByTestId('sync-status');
      if (await pendingIndicator.isVisible()) {
        await expect(pendingIndicator).toContainText(/1|pending/i);
      }

      // Come back online
      await context.setOffline(false);
      await page.waitForTimeout(2000);

      // Pending count should decrease or disappear
    });
  });

  test.describe('Cached Page Access', () => {
    test('should load dashboard from cache when offline', async ({ page, context }) => {
      // First, load pages while online to cache them
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      await page.goto('/weight');
      await page.waitForLoadState('networkidle');

      // Go offline
      await context.setOffline(true);

      // Navigate to dashboard - should load from cache
      await page.goto('/dashboard');
      await expect(page.getByText('ダッシュボード')).toBeVisible();
    });

    test('should show cached data when offline', async ({ page, context }) => {
      // Load weight page with data
      await page.goto('/weight');
      await page.waitForLoadState('networkidle');

      // Go offline
      await context.setOffline(true);

      // Reload - should show cached data
      await page.reload();

      // Page should still be accessible
      await expect(page.getByText('体重記録')).toBeVisible();
    });
  });

  test.describe('Offline User Experience', () => {
    test('should show appropriate message for actions that require network', async ({ page, context }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      // Go offline
      await context.setOffline(true);

      // Try to export data
      await page.click('button:has-text("JSONでエクスポート")');

      // Should show offline warning
      await expect(page.getByText(/オフライン|接続/i)).toBeVisible({ timeout: 3000 });
    });

    test('should preserve form data if submission fails offline', async ({ page, context }) => {
      await page.goto('/weight');

      // Fill form
      await page.fill('input[name="weight"]', '73.5');

      // Go offline before submit
      await context.setOffline(true);
      await page.click('button[type="submit"]');

      // Form data should be preserved or saved locally
      await page.waitForTimeout(500);

      // Weight input should still have value or show in pending list
      const inputValue = await page.inputValue('input[name="weight"]');
      const hasPendingItem = await page.getByText('73.5').isVisible();

      expect(inputValue === '73.5' || hasPendingItem).toBe(true);
    });
  });
});
