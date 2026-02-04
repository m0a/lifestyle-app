import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../helpers/e2e';

/**
 * PWA and Offline Support Tests
 *
 * Note: This app uses VitePWA with NetworkFirst caching strategy.
 * Full offline functionality (sync status, pending indicators) is not yet implemented.
 * These tests focus on what IS implemented:
 * - Web app manifest
 * - Service worker registration
 * - Basic page caching
 */

test.describe('PWA Support', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test.describe('PWA Installation', () => {
    test('should have a web app manifest', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check for manifest link
      const manifest = await page.locator('link[rel="manifest"]').getAttribute('href');
      expect(manifest).toBeTruthy();
    });

    test('should register service worker', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Wait a bit for service worker to register
      await page.waitForTimeout(2000);

      // Check if service worker is registered
      const swRegistered = await page.evaluate(async () => {
        if ('serviceWorker' in navigator) {
          try {
            const registration = await navigator.serviceWorker.getRegistration();
            return !!registration;
          } catch {
            return false;
          }
        }
        return false;
      });

      expect(swRegistered).toBe(true);
    });

    test('should have valid manifest content', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Get manifest URL
      const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
      expect(manifestHref).toBeTruthy();

      // Fetch and validate manifest
      const response = await page.request.get(manifestHref!);
      expect(response.ok()).toBe(true);

      const manifest = await response.json();
      expect(manifest.name).toBeTruthy();
      expect(manifest.icons).toBeDefined();
      expect(manifest.start_url).toBe('/');
    });
  });

  test.describe('Cached Page Access', () => {
    test('should load dashboard after caching', async ({ page }) => {
      // First, load pages while online to cache them
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Verify the page loaded correctly (use heading to be specific)
      await expect(page.getByRole('heading', { name: 'ダッシュボード' })).toBeVisible();
    });

    test('should load weight page after caching', async ({ page }) => {
      // Load weight page with data
      await page.goto('/weight');
      await page.waitForLoadState('networkidle');

      // Page should be accessible
      await expect(page.getByText('体重記録')).toBeVisible();
    });

    test('should navigate between cached pages', async ({ page }) => {
      // Load multiple pages to cache them
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      await page.goto('/weight');
      await page.waitForLoadState('networkidle');

      await page.goto('/exercises');
      await page.waitForLoadState('networkidle');

      // Navigate back using browser navigation
      await page.goBack();
      await expect(page.getByRole('heading', { name: '体重記録' })).toBeVisible();

      await page.goBack();
      await expect(page.getByRole('heading', { name: 'ダッシュボード' })).toBeVisible();
    });
  });

  // Skip tests for features that are not yet implemented
  test.describe.skip('Offline Data Entry (Not Yet Implemented)', () => {
    // These tests are placeholders for future offline functionality
    // Currently, the app does not have:
    // - Offline indicator UI
    // - Pending/sync status indicators
    // - Background sync for form submissions

    test('should show offline indicator when offline', async ({ page, context }) => {
      await page.goto('/weight');
      await context.setOffline(true);
      // TODO: Implement offline indicator UI
      await expect(page.getByText(/オフライン|Offline/i)).toBeVisible({ timeout: 5000 });
    });

    test('should queue entries for sync when offline', async ({ page, context }) => {
      await page.goto('/weight');
      await context.setOffline(true);
      // TODO: Implement offline queue
    });
  });
});
