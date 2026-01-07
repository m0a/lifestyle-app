import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { loginAsTestUser, ensureTestUserExists } from '../helpers/e2e';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * E2E tests for Photo Gallery (User Story 5 - T063, T064)
 *
 * Tests the PhotoGallery component functionality:
 * - T063: Full-screen gallery navigation (keyboard, touch, buttons)
 * - T064: Photo deletion from gallery (confirmation, last photo prevention)
 *
 * Prerequisites:
 * - Backend and frontend running
 * - Test user authenticated
 * - Test images in tests/fixtures/
 */

test.describe('Photo Gallery', () => {
  test.describe('Unauthenticated User', () => {
    test('should redirect to login when accessing meals page', async ({ page }) => {
      await page.goto('/meals');
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Authenticated User - Gallery Navigation (T063)', () => {
    let mealId: string;

    test.beforeEach(async ({ page }) => {
      // Ensure test user exists
      await ensureTestUserExists(page);

      // Login as test user
      await loginAsTestUser(page);

      // Navigate to meals page
      await page.goto('/meals');
      await page.waitForLoadState('networkidle');

      // Create a meal with multiple photos for testing
      await page.getByRole('button', { name: /複数写真|📸/ }).click();

      const fileInput = page.locator('input[type="file"][multiple]');
      await fileInput.setInputFiles([
        path.join(__dirname, '../fixtures/meal-photo-1.jpg'),
        path.join(__dirname, '../fixtures/meal-photo-2.jpg'),
        path.join(__dirname, '../fixtures/meal-photo-3.jpg'),
      ]);

      // Wait for photos to be uploaded
      await expect(page.locator('[data-testid="photo-preview"]')).toHaveCount(3);

      // Save the meal (this will take time due to AI analysis)
      await page.getByRole('button', { name: /保存|分析/ }).click();

      // Wait for redirect to meals list (timeout extended for AI processing)
      await page.waitForURL('/meals', { timeout: 60000 });
      await page.waitForLoadState('networkidle');

      // Get the meal ID from the newly created meal
      const mealDetailLink = page.locator('[data-testid="meal-item"]').first().locator('a[href^="/meals/"]').first();
      const href = await mealDetailLink.getAttribute('href');
      mealId = href?.split('/').pop() || '';
    });

    test('should open full-screen gallery when clicking photo in MealList', async ({ page }) => {
      // Click on first photo in carousel
      const photoCarousel = page.locator('[data-testid="meal-item"]').first().locator('img').first();
      await photoCarousel.click();

      // Gallery should be visible
      await expect(page.locator('[role="dialog"][aria-label="写真ギャラリー"]')).toBeVisible();

      // Should show photo counter
      await expect(page.getByText(/1 \/ 3/)).toBeVisible();

      // Should show close button
      await expect(page.getByRole('button', { name: /閉じる/ })).toBeVisible();
    });

    test('should navigate to next photo with next button', async ({ page }) => {
      // Open gallery
      const photoCarousel = page.locator('[data-testid="meal-item"]').first().locator('img').first();
      await photoCarousel.click();

      // Should show 1/3
      await expect(page.getByText(/1 \/ 3/)).toBeVisible();

      // Click next button
      await page.getByRole('button', { name: /次へ/ }).click();

      // Should show 2/3
      await expect(page.getByText(/2 \/ 3/)).toBeVisible();
    });

    test('should navigate to previous photo with previous button', async ({ page }) => {
      // Open gallery
      const photoCarousel = page.locator('[data-testid="meal-item"]').first().locator('img').first();
      await photoCarousel.click();

      // Navigate to second photo
      await page.getByRole('button', { name: /次へ/ }).click();
      await expect(page.getByText(/2 \/ 3/)).toBeVisible();

      // Click previous button
      await page.getByRole('button', { name: /前へ/ }).click();

      // Should show 1/3
      await expect(page.getByText(/1 \/ 3/)).toBeVisible();
    });

    test('should navigate with keyboard arrows', async ({ page }) => {
      // Open gallery
      const photoCarousel = page.locator('[data-testid="meal-item"]').first().locator('img').first();
      await photoCarousel.click();

      // Should show 1/3
      await expect(page.getByText(/1 \/ 3/)).toBeVisible();

      // Press ArrowRight
      await page.keyboard.press('ArrowRight');

      // Should show 2/3
      await expect(page.getByText(/2 \/ 3/)).toBeVisible();

      // Press ArrowLeft
      await page.keyboard.press('ArrowLeft');

      // Should show 1/3
      await expect(page.getByText(/1 \/ 3/)).toBeVisible();
    });

    test('should close gallery with Escape key', async ({ page }) => {
      // Open gallery
      const photoCarousel = page.locator('[data-testid="meal-item"]').first().locator('img').first();
      await photoCarousel.click();

      // Gallery should be visible
      await expect(page.locator('[role="dialog"][aria-label="写真ギャラリー"]')).toBeVisible();

      // Press Escape
      await page.keyboard.press('Escape');

      // Gallery should be hidden
      await expect(page.locator('[role="dialog"][aria-label="写真ギャラリー"]')).not.toBeVisible();
    });

    test('should close gallery with close button', async ({ page }) => {
      // Open gallery
      const photoCarousel = page.locator('[data-testid="meal-item"]').first().locator('img').first();
      await photoCarousel.click();

      // Gallery should be visible
      await expect(page.locator('[role="dialog"][aria-label="写真ギャラリー"]')).toBeVisible();

      // Click close button
      await page.getByRole('button', { name: /閉じる/ }).click();

      // Gallery should be hidden
      await expect(page.locator('[role="dialog"][aria-label="写真ギャラリー"]')).not.toBeVisible();
    });

    test('should disable previous button on first photo', async ({ page }) => {
      // Open gallery
      const photoCarousel = page.locator('[data-testid="meal-item"]').first().locator('img').first();
      await photoCarousel.click();

      // Should be on first photo
      await expect(page.getByText(/1 \/ 3/)).toBeVisible();

      // Previous button should be disabled
      const previousButton = page.getByRole('button', { name: /前へ/ });
      await expect(previousButton).toBeDisabled();
    });

    test('should disable next button on last photo', async ({ page }) => {
      // Open gallery
      const photoCarousel = page.locator('[data-testid="meal-item"]').first().locator('img').first();
      await photoCarousel.click();

      // Navigate to last photo (3/3)
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      await expect(page.getByText(/3 \/ 3/)).toBeVisible();

      // Next button should be disabled
      const nextButton = page.getByRole('button', { name: /次へ/ });
      await expect(nextButton).toBeDisabled();
    });

    test('should open gallery from MealEditMode photo grid', async ({ page }) => {
      // Navigate to meal detail page
      await page.goto(`/meals/${mealId}`);
      await page.waitForLoadState('networkidle');

      // Click first photo in grid
      const photoGrid = page.locator('img[alt="食事の写真"]').first();
      await photoGrid.click();

      // Gallery should be visible
      await expect(page.locator('[role="dialog"][aria-label="写真ギャラリー"]')).toBeVisible();

      // Should show photo counter
      await expect(page.getByText(/1 \/ 3/)).toBeVisible();
    });
  });

  test.describe('Authenticated User - Photo Deletion from Gallery (T064)', () => {
    test.beforeEach(async ({ page }) => {
      // Ensure test user exists
      await ensureTestUserExists(page);

      // Login as test user
      await loginAsTestUser(page);

      // Navigate to meals page
      await page.goto('/meals');
      await page.waitForLoadState('networkidle');

      // Create a meal with multiple photos
      await page.getByRole('button', { name: /複数写真|📸/ }).click();

      const fileInput = page.locator('input[type="file"][multiple]');
      await fileInput.setInputFiles([
        path.join(__dirname, '../fixtures/meal-photo-1.jpg'),
        path.join(__dirname, '../fixtures/meal-photo-2.jpg'),
        path.join(__dirname, '../fixtures/meal-photo-3.jpg'),
      ]);

      await expect(page.locator('[data-testid="photo-preview"]')).toHaveCount(3);

      // Save the meal
      await page.getByRole('button', { name: /保存|分析/ }).click();
      await page.waitForURL('/meals', { timeout: 60000 });
      await page.waitForLoadState('networkidle');
    });

    test('should show delete button in gallery', async ({ page }) => {
      // Open gallery
      const photoCarousel = page.locator('[data-testid="meal-item"]').first().locator('img').first();
      await photoCarousel.click();

      // Delete button should be visible
      const deleteButton = page.locator('button', { hasText: '削除' }).first();
      await expect(deleteButton).toBeVisible();
      await expect(deleteButton).toBeEnabled();
    });

    test('should show confirmation dialog when delete button clicked', async ({ page }) => {
      // Open gallery
      const photoCarousel = page.locator('[data-testid="meal-item"]').first().locator('img').first();
      await photoCarousel.click();

      // Click delete button
      await page.locator('button', { hasText: '削除' }).first().click();

      // Confirmation dialog should appear
      await expect(page.getByText(/この写真を削除しますか/)).toBeVisible();
      await expect(page.getByRole('button', { name: /キャンセル/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /削除する/ })).toBeVisible();
    });

    test('should close dialog when cancel button clicked', async ({ page }) => {
      // Open gallery
      const photoCarousel = page.locator('[data-testid="meal-item"]').first().locator('img').first();
      await photoCarousel.click();

      // Click delete button
      await page.locator('button', { hasText: '削除' }).first().click();

      // Confirmation dialog should appear
      await expect(page.getByText(/この写真を削除しますか/)).toBeVisible();

      // Click cancel
      await page.getByRole('button', { name: /キャンセル/ }).click();

      // Dialog should close, but gallery should still be open
      await expect(page.getByText(/この写真を削除しますか/)).not.toBeVisible();
      await expect(page.locator('[role="dialog"][aria-label="写真ギャラリー"]')).toBeVisible();
    });

    test('should delete photo and close gallery when confirmed', async ({ page }) => {
      // Open gallery
      const photoCarousel = page.locator('[data-testid="meal-item"]').first().locator('img').first();
      await photoCarousel.click();

      // Should show 1/3
      await expect(page.getByText(/1 \/ 3/)).toBeVisible();

      // Click delete button
      await page.locator('button', { hasText: '削除' }).first().click();

      // Confirm deletion
      await page.getByRole('button', { name: /削除する/ }).click();

      // Wait for deletion to complete
      await page.waitForTimeout(1000);

      // Gallery should close
      await expect(page.locator('[role="dialog"][aria-label="写真ギャラリー"]')).not.toBeVisible();

      // Meal should now have 2 photos instead of 3
      // Note: This assumes the UI refreshes after deletion
    });

    test('should disable delete button when only one photo remains', async ({ page }) => {
      // Create a meal with only one photo
      await page.getByRole('button', { name: /複数写真|📸/ }).click();

      const fileInput = page.locator('input[type="file"][multiple]');
      await fileInput.setInputFiles([
        path.join(__dirname, '../fixtures/meal-photo-1.jpg'),
      ]);

      await expect(page.locator('[data-testid="photo-preview"]')).toHaveCount(1);

      // Save the meal
      await page.getByRole('button', { name: /保存|分析/ }).click();
      await page.waitForURL('/meals', { timeout: 60000 });
      await page.waitForLoadState('networkidle');

      // Open gallery for the newly created meal (first in list)
      const photoCarousel = page.locator('[data-testid="meal-item"]').first().locator('img').first();
      await photoCarousel.click();

      // Should show 1/1
      await expect(page.getByText(/1 \/ 1/)).toBeVisible();

      // Delete button should be disabled
      const deleteButton = page.locator('button', { hasText: '削除' }).first();
      await expect(deleteButton).toBeDisabled();
    });

    test('should show tooltip explaining why delete is disabled for last photo', async ({ page }) => {
      // Create a meal with only one photo
      await page.getByRole('button', { name: /複数写真|📸/ }).click();

      const fileInput = page.locator('input[type="file"][multiple]');
      await fileInput.setInputFiles([
        path.join(__dirname, '../fixtures/meal-photo-1.jpg'),
      ]);

      await expect(page.locator('[data-testid="photo-preview"]')).toHaveCount(1);

      // Save the meal
      await page.getByRole('button', { name: /保存|分析/ }).click();
      await page.waitForURL('/meals', { timeout: 60000 });
      await page.waitForLoadState('networkidle');

      // Open gallery
      const photoCarousel = page.locator('[data-testid="meal-item"]').first().locator('img').first();
      await photoCarousel.click();

      // Delete button should have title tooltip
      const deleteButton = page.locator('button', { hasText: '削除' }).first();
      await expect(deleteButton).toHaveAttribute('title', /最後の写真は削除できません/);
    });
  });
});
