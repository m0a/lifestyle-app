import { test, expect } from '@playwright/test';

test.describe('User Settings - Export and Delete', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|weight|meals|exercises)/);
  });

  test('should navigate to settings page', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: '設定' })).toBeVisible();
  });

  test.describe('Data Export', () => {
    test('should display export section', async ({ page }) => {
      await page.goto('/settings');
      await expect(page.getByText('データエクスポート')).toBeVisible();
      await expect(page.getByRole('button', { name: /エクスポート/ })).toBeVisible();
    });

    test('should trigger JSON export download', async ({ page }) => {
      await page.goto('/settings');

      // Wait for download to start
      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("JSONでエクスポート")');
      const download = await downloadPromise;

      // Verify download
      expect(download.suggestedFilename()).toMatch(/health-data.*\.json$/);
    });

    test('should trigger CSV export download', async ({ page }) => {
      await page.goto('/settings');

      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("CSVでエクスポート")');
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toMatch(/health-data.*\.csv$/);
    });

    test('should show success message after export', async ({ page }) => {
      await page.goto('/settings');

      await page.click('button:has-text("JSONでエクスポート")');

      // Wait for success message or download
      await expect(page.getByText(/エクスポート|ダウンロード/)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Account Deletion', () => {
    test('should display delete account section', async ({ page }) => {
      await page.goto('/settings');
      await expect(page.getByText('アカウント削除')).toBeVisible();
      await expect(page.getByRole('button', { name: /削除/ })).toBeVisible();
    });

    test('should show confirmation dialog before deletion', async ({ page }) => {
      await page.goto('/settings');

      await page.click('button:has-text("アカウントを削除")');

      // Confirmation dialog should appear
      await expect(page.getByText('本当に削除しますか')).toBeVisible();
      await expect(page.getByRole('button', { name: 'キャンセル' })).toBeVisible();
      await expect(page.getByRole('button', { name: '削除する' })).toBeVisible();
    });

    test('should require confirmation input', async ({ page }) => {
      await page.goto('/settings');

      await page.click('button:has-text("アカウントを削除")');

      // Should require typing "削除" to confirm
      const confirmButton = page.getByRole('button', { name: '削除する' });
      await expect(confirmButton).toBeDisabled();

      await page.fill('input[placeholder="削除"]', '削除');
      await expect(confirmButton).toBeEnabled();
    });

    test('should cancel deletion on cancel button click', async ({ page }) => {
      await page.goto('/settings');

      await page.click('button:has-text("アカウントを削除")');
      await page.click('button:has-text("キャンセル")');

      // Dialog should close
      await expect(page.getByText('本当に削除しますか')).not.toBeVisible();
    });

    test('should delete account and redirect to home', async ({ page }) => {
      // Create a test user specifically for deletion
      await page.goto('/register');
      const uniqueEmail = `delete-test-${Date.now()}@example.com`;
      await page.fill('input[name="email"]', uniqueEmail);
      await page.fill('input[name="password"]', 'password123');
      await page.fill('input[name="name"]', 'Delete Test');
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(dashboard|weight)/);

      // Go to settings and delete
      await page.goto('/settings');
      await page.click('button:has-text("アカウントを削除")');
      await page.fill('input[placeholder="削除"]', '削除');
      await page.click('button:has-text("削除する")');

      // Should redirect to login or home
      await page.waitForURL(/\/(login|$)/);

      // Try to access protected route - should fail
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Profile Settings', () => {
    test('should display user email', async ({ page }) => {
      await page.goto('/settings');
      await expect(page.getByText('test@example.com')).toBeVisible();
    });

    test('should display user name if set', async ({ page }) => {
      await page.goto('/settings');
      // Name may or may not be displayed depending on registration
      const nameElement = page.locator('[data-testid="user-name"]');
      if (await nameElement.isVisible()) {
        await expect(nameElement).not.toBeEmpty();
      }
    });
  });

  test.describe('AI Usage Display', () => {
    test('should display AI usage section', async ({ page }) => {
      await page.goto('/settings');
      await expect(page.getByText('AI使用量')).toBeVisible();
    });

    test('should display monthly tokens', async ({ page }) => {
      await page.goto('/settings');
      await expect(page.getByTestId('ai-monthly-tokens')).toBeVisible();
      await expect(page.getByText('今月のトークン')).toBeVisible();
    });

    test('should display total tokens', async ({ page }) => {
      await page.goto('/settings');
      await expect(page.getByTestId('ai-total-tokens')).toBeVisible();
      await expect(page.getByText('累計トークン')).toBeVisible();
    });

    test('should display token values as numbers', async ({ page }) => {
      await page.goto('/settings');

      // Wait for the AI usage section to load
      await page.waitForSelector('[data-testid="ai-monthly-tokens"]');

      const monthlyTokens = await page.getByTestId('ai-monthly-tokens').textContent();
      const totalTokens = await page.getByTestId('ai-total-tokens').textContent();

      // Values should be numeric (possibly with comma formatting)
      expect(monthlyTokens).toMatch(/^[\d,]+$/);
      expect(totalTokens).toMatch(/^[\d,]+$/);
    });

    test('should display explanation text', async ({ page }) => {
      await page.goto('/settings');
      await expect(page.getByText(/トークンはAI機能.*で消費されます/)).toBeVisible();
    });
  });
});
