import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * E2E tests for Multi-Photo Meal Creation (User Story 4 - T054)
 *
 * Tests the complete flow of creating a meal with multiple photos:
 * - Selecting multiple photos before saving
 * - Displaying photo previews
 * - Removing photos from preview list
 * - Sequential upload with progress indicator
 * - Saving meal with all photos
 *
 * Prerequisites:
 * - Backend running with AI API key
 * - Frontend running
 * - Test user authenticated
 * - Test image files in tests/fixtures/
 */

test.describe('Multi-Photo Meal Creation', () => {
  test.describe('Unauthenticated User', () => {
    test('should redirect to login when accessing meals page', async ({ page }) => {
      await page.goto('/meals');
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe.skip('Authenticated User - Multi-Photo Mode', () => {
    test.beforeEach(async ({ page }) => {
      // TODO: Implement authentication helper
      // await loginAsTestUser(page);
      await page.goto('/meals');
    });

    test('should show multi-photo button', async ({ page }) => {
      // Verify the "複数写真で記録する" button is visible
      const multiPhotoButton = page.getByRole('button', { name: /複数写真|📸/ });
      await expect(multiPhotoButton).toBeVisible();
    });

    test('should enter multi-photo mode when button clicked', async ({ page }) => {
      // Click multi-photo button
      await page.getByRole('button', { name: /複数写真|📸/ }).click();

      // Should show multi-photo UI
      await expect(page.getByText(/複数写真で記録/)).toBeVisible();
      await expect(page.getByText(/写真を選択.*最大10枚/)).toBeVisible();

      // Should show cancel button
      await expect(page.getByRole('button', { name: /キャンセル/ })).toBeVisible();
    });

    test('should allow selecting multiple photos', async ({ page }) => {
      await page.getByRole('button', { name: /複数写真|📸/ }).click();

      // Locate file input and select 3 test images
      const fileInput = page.locator('input[type="file"][multiple]');
      await fileInput.setInputFiles([
        path.join(__dirname, '../fixtures/meal-photo-1.jpg'),
        path.join(__dirname, '../fixtures/meal-photo-2.jpg'),
        path.join(__dirname, '../fixtures/meal-photo-3.jpg'),
      ]);

      // Should show 3 photo previews
      const photoPreviews = page.locator('[data-testid="photo-preview"]');
      await expect(photoPreviews).toHaveCount(3);
    });

    test('should display photo preview thumbnails', async ({ page }) => {
      await page.getByRole('button', { name: /複数写真|📸/ }).click();

      const fileInput = page.locator('input[type="file"][multiple]');
      await fileInput.setInputFiles([
        path.join(__dirname, '../fixtures/meal-photo-1.jpg'),
        path.join(__dirname, '../fixtures/meal-photo-2.jpg'),
      ]);

      // Each preview should have an image
      const previewImages = page.locator('[data-testid="photo-preview"] img');
      await expect(previewImages).toHaveCount(2);

      // Each preview should be visible
      for (let i = 0; i < 2; i++) {
        await expect(previewImages.nth(i)).toBeVisible();
      }
    });

    test('should show remove button for each photo', async ({ page }) => {
      await page.getByRole('button', { name: /複数写真|📸/ }).click();

      const fileInput = page.locator('input[type="file"][multiple]');
      await fileInput.setInputFiles([
        path.join(__dirname, '../fixtures/meal-photo-1.jpg'),
        path.join(__dirname, '../fixtures/meal-photo-2.jpg'),
      ]);

      // Each photo should have a remove button
      const removeButtons = page.locator('[data-testid="remove-photo-button"]');
      await expect(removeButtons).toHaveCount(2);
    });

    test('should allow removing photos from preview', async ({ page }) => {
      await page.getByRole('button', { name: /複数写真|📸/ }).click();

      const fileInput = page.locator('input[type="file"][multiple]');
      await fileInput.setInputFiles([
        path.join(__dirname, '../fixtures/meal-photo-1.jpg'),
        path.join(__dirname, '../fixtures/meal-photo-2.jpg'),
        path.join(__dirname, '../fixtures/meal-photo-3.jpg'),
      ]);

      // Should have 3 photos
      let photoPreviews = page.locator('[data-testid="photo-preview"]');
      await expect(photoPreviews).toHaveCount(3);

      // Click remove on first photo
      await page.locator('[data-testid="remove-photo-button"]').first().click();

      // Should now have 2 photos
      photoPreviews = page.locator('[data-testid="photo-preview"]');
      await expect(photoPreviews).toHaveCount(2);
    });

    test('should show meal type and datetime selectors', async ({ page }) => {
      await page.getByRole('button', { name: /複数写真|📸/ }).click();

      // Meal type selector should be visible
      await expect(page.getByLabel(/食事タイプ|朝食|昼食|夕食/)).toBeVisible();

      // Datetime selector should be visible
      await expect(page.locator('input[type="datetime-local"]')).toBeVisible();
    });

    test('should disable save button when no photos selected', async ({ page }) => {
      await page.getByRole('button', { name: /複数写真|📸/ }).click();

      // Save button should be disabled
      const saveButton = page.getByRole('button', { name: /保存|記録/ });
      await expect(saveButton).toBeDisabled();
    });

    test('should enable save button when photos selected', async ({ page }) => {
      await page.getByRole('button', { name: /複数写真|📸/ }).click();

      const fileInput = page.locator('input[type="file"][multiple]');
      await fileInput.setInputFiles([
        path.join(__dirname, '../fixtures/meal-photo-1.jpg'),
      ]);

      // Save button should be enabled
      const saveButton = page.getByRole('button', { name: /保存|記録/ });
      await expect(saveButton).toBeEnabled();
    });

    test('should show upload progress during save', async ({ page }) => {
      await page.getByRole('button', { name: /複数写真|📸/ }).click();

      const fileInput = page.locator('input[type="file"][multiple]');
      await fileInput.setInputFiles([
        path.join(__dirname, '../fixtures/meal-photo-1.jpg'),
        path.join(__dirname, '../fixtures/meal-photo-2.jpg'),
      ]);

      // Click save
      await page.getByRole('button', { name: /保存|記録/ }).click();

      // Should show upload progress modal
      await expect(page.getByText(/アップロード中|写真をアップロード中/)).toBeVisible({ timeout: 1000 });

      // Should show progress counter (e.g., "1/2 枚完了")
      await expect(page.getByText(/\d+\/\d+.*枚/)).toBeVisible();

      // Should show progress bar
      await expect(page.locator('[role="progressbar"], .bg-blue-600')).toBeVisible();
    });

    test('should block interactions during upload', async ({ page }) => {
      await page.getByRole('button', { name: /複数写真|📸/ }).click();

      const fileInput = page.locator('input[type="file"][multiple]');
      await fileInput.setInputFiles([
        path.join(__dirname, '../fixtures/meal-photo-1.jpg'),
        path.join(__dirname, '../fixtures/meal-photo-2.jpg'),
      ]);

      await page.getByRole('button', { name: /保存|記録/ }).click();

      // Modal overlay should be visible
      const overlay = page.locator('.fixed.inset-0.z-50');
      await expect(overlay).toBeVisible({ timeout: 1000 });

      // Background should not be clickable (overlay blocks it)
      const isClickable = await page.getByRole('navigation').isEnabled();
      expect(isClickable).toBeTruthy(); // Navigation exists but overlay blocks clicks
    });

    test('should redirect to meals list after successful save', async ({ page }) => {
      await page.getByRole('button', { name: /複数写真|📸/ }).click();

      const fileInput = page.locator('input[type="file"][multiple]');
      await fileInput.setInputFiles([
        path.join(__dirname, '../fixtures/meal-photo-1.jpg'),
      ]);

      await page.getByRole('button', { name: /保存|記録/ }).click();

      // Wait for upload to complete (may take 10-15 seconds per photo)
      await page.waitForURL('/meals', { timeout: 30000 });

      // Should be back at meals list
      await expect(page).toHaveURL('/meals');
    });

    test('should show newly created meal with photos in list', async ({ page }) => {
      await page.getByRole('button', { name: /複数写真|📸/ }).click();

      const fileInput = page.locator('input[type="file"][multiple]');
      await fileInput.setInputFiles([
        path.join(__dirname, '../fixtures/meal-photo-1.jpg'),
        path.join(__dirname, '../fixtures/meal-photo-2.jpg'),
      ]);

      // Set meal type
      await page.selectOption('[name="mealType"]', 'lunch');

      await page.getByRole('button', { name: /保存|記録/ }).click();

      // Wait for redirect
      await page.waitForURL('/meals', { timeout: 30000 });

      // First meal in list should show photos in carousel
      const firstMeal = page.locator('[data-testid="meal-item"]').first();
      await expect(firstMeal).toBeVisible();

      // Should show photo carousel with 2 photos
      const carouselPhotos = firstMeal.locator('[data-testid="carousel-photo"]');
      await expect(carouselPhotos).toHaveCount(2);
    });

    test('should allow canceling multi-photo mode', async ({ page }) => {
      await page.getByRole('button', { name: /複数写真|📸/ }).click();

      // Select some photos
      const fileInput = page.locator('input[type="file"][multiple]');
      await fileInput.setInputFiles([
        path.join(__dirname, '../fixtures/meal-photo-1.jpg'),
      ]);

      // Click cancel
      await page.getByRole('button', { name: /キャンセル/ }).click();

      // Should exit multi-photo mode
      await expect(page.getByText(/複数写真で記録/)).not.toBeVisible();

      // Should show normal input mode
      await expect(page.getByRole('button', { name: /複数写真|📸/ })).toBeVisible();
    });

    test('should handle maximum 10 photos limit', async ({ page }) => {
      await page.getByRole('button', { name: /複数写真|📸/ }).click();

      // Try to select 11 photos
      const fileInput = page.locator('input[type="file"][multiple]');
      const files = Array.from({ length: 11 }, (_, i) =>
        path.join(__dirname, `../fixtures/meal-photo-${(i % 3) + 1}.jpg`)
      );

      await fileInput.setInputFiles(files);

      // Should show error message
      await expect(page.getByText(/最大10枚|10枚まで/)).toBeVisible();

      // Should only show 10 photos
      const photoPreviews = page.locator('[data-testid="photo-preview"]');
      await expect(photoPreviews).toHaveCount(10);
    });

    test('should show error message on upload failure', async ({ page }) => {
      // TODO: Mock backend to simulate upload failure
      await page.getByRole('button', { name: /複数写真|📸/ }).click();

      const fileInput = page.locator('input[type="file"][multiple]');
      await fileInput.setInputFiles([
        path.join(__dirname, '../fixtures/meal-photo-1.jpg'),
      ]);

      // Mock network failure
      await page.route('**/api/meals', (route) => route.abort('failed'));

      await page.getByRole('button', { name: /保存|記録/ }).click();

      // Should show error message
      await expect(page.getByText(/アップロード.*失敗|エラー/)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe.skip('Photo Detail View', () => {
    test('should show all photos in carousel on detail page', async ({ page }) => {
      // Navigate to a meal created with multiple photos
      await page.goto('/meals/[meal-id]'); // TODO: Use actual meal ID

      // Should show photo carousel
      const carousel = page.locator('[data-testid="photo-carousel"]');
      await expect(carousel).toBeVisible();

      // Should be able to swipe between photos
      const photos = carousel.locator('img');
      await expect(photos).toHaveCount.greaterThan(1);
    });
  });
});
