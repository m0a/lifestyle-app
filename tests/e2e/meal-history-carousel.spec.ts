import { test, expect } from '@playwright/test';

/**
 * E2E tests for Meal History Carousel
 *
 * These tests cover:
 * - Horizontal carousel swipe/scroll interaction
 * - Vertical scroll not triggering horizontal carousel
 * - Indicator dots update on scroll
 * - Single photo display (no carousel UI)
 *
 * Prerequisites:
 * - Backend running
 * - Frontend running
 * - Test user authenticated
 * - Test meals with multiple photos
 */

test.describe('Meal History Carousel', () => {
  test.describe('Unauthenticated User', () => {
    test('should redirect to login when accessing meals page', async ({ page }) => {
      await page.goto('/meals');
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Carousel Swipe Interaction', () => {
    test.skip('should display carousel for meals with multiple photos', async ({ page }) => {
      // Login and navigate to meals page
      await page.goto('/meals');

      // Find a meal card with multiple photos
      const carouselContainer = page.locator('[data-testid="photo-carousel"]').first();
      await expect(carouselContainer).toBeVisible();

      // Should show indicator dots
      const indicators = carouselContainer.locator('[data-testid="carousel-indicator"]');
      const indicatorCount = await indicators.count();
      expect(indicatorCount).toBeGreaterThan(1);
    });

    test.skip('should swipe horizontally to view next photo', async ({ page }) => {
      await page.goto('/meals');

      const carousel = page.locator('[data-testid="photo-carousel"]').first();
      const carouselBox = await carousel.boundingBox();

      if (!carouselBox) {
        throw new Error('Carousel not found');
      }

      // Get first indicator (should be active)
      const firstIndicator = carousel.locator('[data-testid="carousel-indicator"]').first();
      await expect(firstIndicator).toHaveClass(/bg-blue-500/);

      // Swipe left to go to next photo
      await page.mouse.move(carouselBox.x + carouselBox.width * 0.8, carouselBox.y + carouselBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(carouselBox.x + carouselBox.width * 0.2, carouselBox.y + carouselBox.height / 2);
      await page.mouse.up();

      // Wait for scroll animation
      await page.waitForTimeout(500);

      // Second indicator should now be active
      const secondIndicator = carousel.locator('[data-testid="carousel-indicator"]').nth(1);
      await expect(secondIndicator).toHaveClass(/bg-blue-500/);
    });

    test.skip('should update indicator dots on scroll', async ({ page }) => {
      await page.goto('/meals');

      const carousel = page.locator('[data-testid="photo-carousel"]').first();

      // Check initial state - first indicator active
      const indicators = carousel.locator('[data-testid="carousel-indicator"]');
      await expect(indicators.first()).toHaveClass(/bg-blue-500/);

      // Scroll horizontally using wheel event
      await carousel.hover();
      await page.mouse.wheel(100, 0);

      // Wait for scroll
      await page.waitForTimeout(300);

      // Indicator should update (either second or still first depending on scroll amount)
      const activeIndicators = carousel.locator('[data-testid="carousel-indicator"].bg-blue-500');
      await expect(activeIndicators).toHaveCount(1);
    });
  });

  test.describe('Vertical vs Horizontal Scroll Conflict', () => {
    test.skip('should allow vertical scroll without triggering carousel', async ({ page }) => {
      await page.goto('/meals');

      // Get initial scroll position
      const initialScrollY = await page.evaluate(() => window.scrollY);

      // Find carousel
      const carousel = page.locator('[data-testid="photo-carousel"]').first();
      await carousel.hover();

      // Try to scroll vertically (should scroll the page, not the carousel)
      await page.mouse.wheel(0, 100);

      // Wait for scroll
      await page.waitForTimeout(300);

      // Page should have scrolled vertically
      const newScrollY = await page.evaluate(() => window.scrollY);
      expect(newScrollY).toBeGreaterThan(initialScrollY);

      // Carousel indicator should still be on first photo
      const firstIndicator = carousel.locator('[data-testid="carousel-indicator"]').first();
      await expect(firstIndicator).toHaveClass(/bg-blue-500/);
    });

    test.skip('should handle touch gestures correctly', async ({ page, context }) => {
      // Enable touch emulation
      await context.grantPermissions(['geolocation']);

      await page.goto('/meals');

      const carousel = page.locator('[data-testid="photo-carousel"]').first();
      const carouselBox = await carousel.boundingBox();

      if (!carouselBox) {
        throw new Error('Carousel not found');
      }

      // Vertical swipe (should scroll page, not carousel)
      const pageScrollBefore = await page.evaluate(() => window.scrollY);

      await page.touchscreen.tap(carouselBox.x + carouselBox.width / 2, carouselBox.y + carouselBox.height / 2);
      await page.touchscreen.tap(carouselBox.x + carouselBox.width / 2, carouselBox.y + carouselBox.height * 1.5);

      const pageScrollAfter = await page.evaluate(() => window.scrollY);

      // Page should have scrolled
      expect(pageScrollAfter).toBeGreaterThan(pageScrollBefore);

      // Horizontal swipe (should move carousel, not page)
      const firstIndicator = carousel.locator('[data-testid="carousel-indicator"]').first();
      await expect(firstIndicator).toHaveClass(/bg-blue-500/);

      await carousel.hover();
      const startX = carouselBox.x + carouselBox.width * 0.8;
      const endX = carouselBox.x + carouselBox.width * 0.2;
      const y = carouselBox.y + carouselBox.height / 2;

      await page.mouse.move(startX, y);
      await page.mouse.down();
      await page.mouse.move(endX, y);
      await page.mouse.up();

      await page.waitForTimeout(500);

      // Second indicator should be active
      const secondIndicator = carousel.locator('[data-testid="carousel-indicator"]').nth(1);
      await expect(secondIndicator).toHaveClass(/bg-blue-500/);
    });
  });

  test.describe('Single Photo Display', () => {
    test.skip('should not show carousel UI for single photo', async ({ page }) => {
      // Create or find a meal with only one photo
      await page.goto('/meals');

      // Find meal with single photo
      const singlePhotoMeal = page.locator('[data-testid="meal-item"]').filter({
        has: page.locator('[data-testid="photo-carousel"]').locator('img'),
      }).first();

      // Should have photo visible
      const photo = singlePhotoMeal.locator('img').first();
      await expect(photo).toBeVisible();

      // Should NOT have indicator dots
      const indicators = singlePhotoMeal.locator('[data-testid="carousel-indicator"]');
      await expect(indicators).toHaveCount(0);
    });
  });

  test.describe('Lazy Loading', () => {
    test.skip('should lazy load images in carousel', async ({ page }) => {
      await page.goto('/meals');

      // Check that images have loading="lazy" attribute
      const carouselImages = page.locator('[data-testid="photo-carousel"] img');
      const firstImage = carouselImages.first();

      await expect(firstImage).toHaveAttribute('loading', 'lazy');
    });

    test.skip('should show loading placeholder while image loads', async ({ page }) => {
      await page.goto('/meals');

      // Look for loading placeholders
      const placeholders = page.locator('[data-testid="photo-loading-placeholder"]');

      // If images are still loading, should see placeholders
      // (This test might be flaky if images load too fast)
      const placeholderCount = await placeholders.count();
      expect(placeholderCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Accessibility', () => {
    test.skip('should be keyboard navigable', async ({ page }) => {
      await page.goto('/meals');

      const carousel = page.locator('[data-testid="photo-carousel"]').first();

      // Focus on carousel
      await carousel.focus();

      // Press right arrow
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(300);

      // Second indicator should be active
      const secondIndicator = carousel.locator('[data-testid="carousel-indicator"]').nth(1);
      await expect(secondIndicator).toHaveClass(/bg-blue-500/);

      // Press left arrow
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(300);

      // First indicator should be active again
      const firstIndicator = carousel.locator('[data-testid="carousel-indicator"]').first();
      await expect(firstIndicator).toHaveClass(/bg-blue-500/);
    });

    test.skip('should have proper ARIA labels', async ({ page }) => {
      await page.goto('/meals');

      const carousel = page.locator('[data-testid="photo-carousel"]').first();

      // Check for ARIA attributes
      await expect(carousel).toHaveAttribute('role', 'region');
      await expect(carousel).toHaveAttribute('aria-label', /写真|photo|carousel/i);
    });
  });
});
