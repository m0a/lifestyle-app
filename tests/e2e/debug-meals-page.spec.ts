import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../helpers/e2e';

/**
 * Debug test to check meals page content
 */
test.describe('Debug Meals Page', () => {
  test('should show meals page content after login', async ({ page }) => {
    // Login
    await loginAsTestUser(page);

    // Navigate to meals page
    await page.goto('/meals');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Take screenshot
    await page.screenshot({ path: 'test-results/debug-meals-page.png', fullPage: true });

    // Log page title
    const title = await page.title();
    console.log('Page title:', title);

    // Log current URL
    console.log('Current URL:', page.url());

    // Check if SmartMealInput is visible
    const mealInput = page.locator('input[placeholder*="食事内容"]');
    const isInputVisible = await mealInput.isVisible();
    console.log('Meal input visible:', isInputVisible);

    // Check for any buttons
    const allButtons = await page.locator('button').all();
    console.log('Number of buttons:', allButtons.length);

    // Log button texts
    for (let i = 0; i < allButtons.length; i++) {
      const btn = allButtons[i];
      const text = await btn.textContent();
      const isVisible = await btn.isVisible();
      console.log(`Button ${i}: "${text}" (visible: ${isVisible})`);
    }

    // Check for multi-photo button specifically
    const multiPhotoButton = page.locator('button', { hasText: '複数写真' });
    const multiPhotoExists = await multiPhotoButton.count();
    console.log('Multi-photo button count:', multiPhotoExists);

    if (multiPhotoExists > 0) {
      const multiPhotoVisible = await multiPhotoButton.isVisible();
      const multiPhotoText = await multiPhotoButton.textContent();
      console.log('Multi-photo button visible:', multiPhotoVisible);
      console.log('Multi-photo button text:', multiPhotoText);
    }

    // Get page HTML for inspection
    const html = await page.content();
    console.log('Page contains "複数写真":', html.includes('複数写真'));
    console.log('Page contains "📸":', html.includes('📸'));
  });
});
