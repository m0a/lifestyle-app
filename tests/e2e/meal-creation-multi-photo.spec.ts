import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { loginAsTestUser, ensureTestUserExists } from '../helpers/e2e';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * E2E tests for Unified Photo Meal Flow (Issue #82)
 *
 * Tests the unified photo selection → AI analysis → review → save flow:
 * - Opening photo selector modal via 📷 button
 * - Selecting multiple photos with preview
 * - Removing photos from preview
 * - Starting analysis
 * - Canceling the flow
 *
 * Prerequisites:
 * - Backend running with AI API key
 * - Frontend running
 * - Test user authenticated
 * - Test image files in tests/fixtures/
 */

test.describe('Unified Photo Meal Flow', () => {
  test.describe('Unauthenticated User', () => {
    test('should redirect to login when accessing meals page', async ({ page }) => {
      await page.goto('/meals');
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Authenticated User - Photo Selector', () => {
    test.beforeEach(async ({ page }) => {
      await ensureTestUserExists(page);
      await loginAsTestUser(page);
      await page.goto('/meals');
      await page.waitForLoadState('networkidle');
    });

    test('should show photo button', async ({ page }) => {
      // The unified 📷 button should be visible
      const photoButton = page.getByRole('button', { name: /写真で分析/ });
      await expect(photoButton).toBeVisible();
    });

    test('should open photo selector modal when photo button clicked', async ({ page }) => {
      // Click the 📷 button
      await page.getByRole('button', { name: /写真で分析/ }).click();

      // Should show photo selector modal
      await expect(page.getByText('食事の写真を追加')).toBeVisible();
      await expect(page.getByRole('button', { name: /カメラで撮影/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /ライブラリ/ })).toBeVisible();

      // Should show cancel and analysis buttons
      await expect(page.getByRole('button', { name: /キャンセル/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /分析へ進む/ })).toBeVisible();
    });

    test('should allow selecting multiple photos in modal', async ({ page }) => {
      await page.getByRole('button', { name: /写真で分析/ }).click();

      // Find the file input (multiple) in the modal
      const fileInput = page.locator('input[type="file"][multiple]');
      await fileInput.setInputFiles([
        path.join(__dirname, '../fixtures/meal-photo-1.jpg'),
        path.join(__dirname, '../fixtures/meal-photo-2.jpg'),
        path.join(__dirname, '../fixtures/meal-photo-3.jpg'),
      ]);

      // Should show 3 photo previews
      const previewImages = page.locator('.aspect-square img');
      await expect(previewImages).toHaveCount(3);

      // Should show photo count
      await expect(page.getByText(/3\/10 枚選択中/)).toBeVisible();
    });

    test('should display photo preview thumbnails', async ({ page }) => {
      await page.getByRole('button', { name: /写真で分析/ }).click();

      const fileInput = page.locator('input[type="file"][multiple]');
      await fileInput.setInputFiles([
        path.join(__dirname, '../fixtures/meal-photo-1.jpg'),
        path.join(__dirname, '../fixtures/meal-photo-2.jpg'),
      ]);

      // Each preview should have a visible image
      const previewImages = page.locator('.aspect-square img');
      await expect(previewImages).toHaveCount(2);

      for (let i = 0; i < 2; i++) {
        await expect(previewImages.nth(i)).toBeVisible();
      }
    });

    test('should show remove button for each photo', async ({ page }) => {
      await page.getByRole('button', { name: /写真で分析/ }).click();

      const fileInput = page.locator('input[type="file"][multiple]');
      await fileInput.setInputFiles([
        path.join(__dirname, '../fixtures/meal-photo-1.jpg'),
        path.join(__dirname, '../fixtures/meal-photo-2.jpg'),
      ]);

      // Each photo should have a remove button (✕)
      const removeButtons = page.locator('.aspect-square button');
      await expect(removeButtons).toHaveCount(2);
    });

    test('should allow removing photos from preview', async ({ page }) => {
      await page.getByRole('button', { name: /写真で分析/ }).click();

      const fileInput = page.locator('input[type="file"][multiple]');
      await fileInput.setInputFiles([
        path.join(__dirname, '../fixtures/meal-photo-1.jpg'),
        path.join(__dirname, '../fixtures/meal-photo-2.jpg'),
        path.join(__dirname, '../fixtures/meal-photo-3.jpg'),
      ]);

      // Should have 3 photos
      let previewImages = page.locator('.aspect-square img');
      await expect(previewImages).toHaveCount(3);

      // Click remove on first photo
      await page.locator('.aspect-square button').first().click();

      // Should now have 2 photos
      previewImages = page.locator('.aspect-square img');
      await expect(previewImages).toHaveCount(2);
    });

    test('should disable analysis button when no photos selected', async ({ page }) => {
      await page.getByRole('button', { name: /写真で分析/ }).click();

      // Analysis button should be disabled
      const analysisButton = page.getByRole('button', { name: /分析へ進む/ });
      await expect(analysisButton).toBeDisabled();
    });

    test('should enable analysis button when photos selected', async ({ page }) => {
      await page.getByRole('button', { name: /写真で分析/ }).click();

      const fileInput = page.locator('input[type="file"][multiple]');
      await fileInput.setInputFiles([
        path.join(__dirname, '../fixtures/meal-photo-1.jpg'),
      ]);

      // Analysis button should be enabled
      const analysisButton = page.getByRole('button', { name: /分析へ進む/ });
      await expect(analysisButton).toBeEnabled();
    });

    test('should allow canceling photo selection', async ({ page }) => {
      await page.getByRole('button', { name: /写真で分析/ }).click();

      // Modal should be visible
      await expect(page.getByText('食事の写真を追加')).toBeVisible();

      // Select some photos
      const fileInput = page.locator('input[type="file"][multiple]');
      await fileInput.setInputFiles([
        path.join(__dirname, '../fixtures/meal-photo-1.jpg'),
      ]);

      // Click cancel
      await page.getByRole('button', { name: /キャンセル/ }).first().click();

      // Modal should close, back to normal input
      await expect(page.getByText('食事の写真を追加')).not.toBeVisible();
      await expect(page.getByRole('button', { name: /写真で分析/ })).toBeVisible();
    });

    test('should handle maximum 10 photos limit', async ({ page }) => {
      await page.getByRole('button', { name: /写真で分析/ }).click();

      const fileInput = page.locator('input[type="file"][multiple]');

      // Add 10 photos
      const files10 = Array.from({ length: 10 }, (_, i) =>
        path.join(__dirname, `../fixtures/meal-photo-${(i % 3) + 1}.jpg`)
      );

      await fileInput.setInputFiles(files10);

      // Should show 10 photos
      const previewImages = page.locator('.aspect-square img');
      await expect(previewImages).toHaveCount(10);

      // Should show 10/10 count
      await expect(page.getByText(/10\/10 枚選択中/)).toBeVisible();

      // Camera/library buttons should be hidden (at max)
      await expect(page.getByRole('button', { name: /カメラで撮影/ })).not.toBeVisible();
    });

    test('should not show old multi-photo button', async ({ page }) => {
      // The old "📸 複数写真で記録する" link should NOT exist
      const oldButton = page.getByText(/複数写真で記録する/);
      await expect(oldButton).not.toBeVisible();
    });

    test('should keep text input working alongside photo button', async ({ page }) => {
      // Text input should still be visible and functional
      const textInput = page.getByPlaceholder(/食事内容を入力/);
      await expect(textInput).toBeVisible();

      const submitButton = page.getByRole('button', { name: /記録推論/ });
      await expect(submitButton).toBeVisible();
    });
  });

  test.describe('Photo Detail View', () => {
    test.beforeEach(async ({ page }) => {
      await ensureTestUserExists(page);
      await loginAsTestUser(page);
    });

    test.skip('should show all photos in carousel on detail page', async ({ page }) => {
      // TODO: Create a meal with multiple photos first, then test detail view
      await page.goto('/meals/[meal-id]');

      const carousel = page.locator('[data-testid="photo-carousel"]');
      await expect(carousel).toBeVisible();

      const photos = carousel.locator('img');
      await expect(photos).toHaveCount.greaterThan(1);
    });
  });
});
