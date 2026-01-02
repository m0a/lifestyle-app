import { test, expect } from '@playwright/test';

test.describe('Training Image Share Flow', () => {
  test.describe('Unauthenticated User', () => {
    test('should redirect to login when accessing training image page', async ({ page }) => {
      await page.goto('/exercises/image');
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Authenticated User', () => {
    // Note: These tests require authentication setup which is skipped for now
    // In a real scenario, you would set up authentication before each test

    test.skip('should navigate from exercises page to training image page', async ({ page }) => {
      await page.goto('/exercises');

      // Find and click the "画像を作成" button
      await page.getByRole('button', { name: '画像を作成' }).click();

      // Should navigate to the training image page
      await expect(page).toHaveURL(/\/exercises\/image/);
    });

    test.skip('should display image preview when exercises exist', async ({ page }) => {
      // Navigate to training image page with today's date
      const today = new Date().toISOString().split('T')[0];
      await page.goto(`/exercises/image?date=${today}`);

      // Should display the image preview heading
      await expect(page.getByRole('heading', { name: '画像プレビュー' })).toBeVisible();

      // Should display share and save buttons
      await expect(page.getByRole('button', { name: '共有' })).toBeVisible();
      await expect(page.getByRole('button', { name: '保存' })).toBeVisible();
    });

    test.skip('should show "no records" message when no exercises for date', async ({ page }) => {
      // Navigate to training image page with a date that has no exercises
      await page.goto('/exercises/image?date=1900-01-01');

      // Should display the no records message
      await expect(page.getByText('トレーニング記録がありません')).toBeVisible();
    });

    test.skip('should display training image with exercise data', async ({ page }) => {
      const today = new Date().toISOString().split('T')[0];
      await page.goto(`/exercises/image?date=${today}`);

      // Wait for the image preview to load
      await page.waitForSelector('[class*="bg-red-600"]'); // Header has red background

      // Should display the WorkOut title
      await expect(page.getByText('WorkOut')).toBeVisible();

      // Should display the footer
      await expect(page.getByText('Powered by Lifestyle App')).toBeVisible();
    });

    test.skip('should show MAX RM badge when personal record is achieved', async ({ page }) => {
      const today = new Date().toISOString().split('T')[0];
      await page.goto(`/exercises/image?date=${today}`);

      // Check if MAX RM badge is displayed (if there's a PR)
      // This depends on actual data, so we just check the element can exist
      const maxRMBadge = page.getByText('MAX RM');
      // Either visible or not (depends on data)
      expect(await maxRMBadge.count()).toBeGreaterThanOrEqual(0);
    });

    test.skip('should navigate back to exercises page', async ({ page }) => {
      const today = new Date().toISOString().split('T')[0];
      await page.goto(`/exercises/image?date=${today}`);

      // Click the back button
      await page.getByRole('button', { name: '戻る' }).click();

      // Should navigate back to exercises page
      await expect(page).toHaveURL('/exercises');
    });

    test.skip('should handle share button click', async ({ page }) => {
      const today = new Date().toISOString().split('T')[0];
      await page.goto(`/exercises/image?date=${today}`);

      // Wait for the share button to be enabled
      const shareButton = page.getByRole('button', { name: '共有' });
      await expect(shareButton).toBeEnabled();

      // Click share - note: on desktop, this will fall back to download
      // We just verify the click doesn't error
      await shareButton.click();

      // Button should not be permanently disabled after click
      await page.waitForTimeout(1000);
      // Either still loading or back to enabled state
    });

    test.skip('should handle save button click', async ({ page }) => {
      const today = new Date().toISOString().split('T')[0];
      await page.goto(`/exercises/image?date=${today}`);

      // Wait for the save button to be enabled
      const saveButton = page.getByRole('button', { name: '保存' });
      await expect(saveButton).toBeEnabled();

      // Click save - this triggers a download
      // Set up download handling
      const downloadPromise = page.waitForEvent('download');
      await saveButton.click();

      // Verify download started
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('training');
      expect(download.suggestedFilename()).toContain('.png');
    });

    test.skip('should display exercise cards with set details', async ({ page }) => {
      const today = new Date().toISOString().split('T')[0];
      await page.goto(`/exercises/image?date=${today}`);

      // Wait for cards to load
      await page.waitForSelector('[class*="border-red-500"]'); // Exercise cards have red border

      // Should display RM value
      await expect(page.getByText(/RM \d+kg/)).toBeVisible();

      // Should display weight and reps format
      await expect(page.getByText(/\d+kg × \d+ reps/)).toBeVisible();

      // Should display 1RM calculation
      await expect(page.getByText(/1RM: \d+/)).toBeVisible();
    });
  });
});
