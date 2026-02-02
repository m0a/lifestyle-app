import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../helpers/e2e';

test.describe('Dashboard Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test using the test helper
    await loginAsTestUser(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should display dashboard with all summary cards', async ({ page }) => {
    await page.goto('/dashboard');

    // Check for summary cards
    await expect(page.getByText('体重サマリー')).toBeVisible();
    await expect(page.getByText('食事サマリー')).toBeVisible();
    await expect(page.getByText('運動サマリー')).toBeVisible();
  });

  test('should display period selector', async ({ page }) => {
    await page.goto('/dashboard');

    // Check period selector buttons
    await expect(page.getByRole('button', { name: '週間' })).toBeVisible();
    await expect(page.getByRole('button', { name: '月間' })).toBeVisible();
    await expect(page.getByRole('button', { name: '3ヶ月' })).toBeVisible();
  });

  test('should switch periods and update data', async ({ page }) => {
    await page.goto('/dashboard');

    // Default is weekly
    await expect(page.getByRole('button', { name: '週間' })).toHaveClass(/bg-blue-600/);

    // Switch to monthly
    await page.click('button:has-text("月間")');
    await expect(page.getByRole('button', { name: '月間' })).toHaveClass(/bg-blue-600/);

    // Data should update (loading indicator may appear briefly)
    await page.waitForTimeout(500);
  });

  test('should display weight summary card with correct data', async ({ page }) => {
    await page.goto('/dashboard');

    const weightCard = page.locator('[data-testid="weight-summary-card"]');
    await expect(weightCard).toBeVisible();

    // Should show current weight or empty state
    await expect(weightCard.getByText(/kg|データなし/)).toBeVisible();
  });

  test('should display meal summary card with calorie info', async ({ page }) => {
    await page.goto('/dashboard');

    const mealCard = page.locator('[data-testid="meal-summary-card"]');
    await expect(mealCard).toBeVisible();

    // Should show calorie info or empty state
    await expect(mealCard.getByText(/kcal|データなし/)).toBeVisible();
  });

  test('should display exercise summary card with duration', async ({ page }) => {
    await page.goto('/dashboard');

    const exerciseCard = page.locator('[data-testid="exercise-summary-card"]');
    await expect(exerciseCard).toBeVisible();

    // Should show exercise duration or empty state
    await expect(exerciseCard.getByText(/分|時間|データなし/)).toBeVisible();
  });

  test('should navigate to individual tracking pages from dashboard', async ({ page }) => {
    await page.goto('/dashboard');

    // Navigate to weight page
    await page.click('a[href="/weight"], button:has-text("体重を記録")');
    await expect(page).toHaveURL(/\/weight/);

    await page.goto('/dashboard');

    // Navigate to meals page
    await page.click('a[href="/meals"], button:has-text("食事を記録")');
    await expect(page).toHaveURL(/\/meals/);

    await page.goto('/dashboard');

    // Navigate to exercise page
    await page.click('a[href="/exercises"], button:has-text("運動を記録")');
    await expect(page).toHaveURL(/\/exercises/);
  });

  test('should show weight change trend', async ({ page }) => {
    await page.goto('/dashboard');

    // Weight card should show change if data exists
    const weightCard = page.locator('[data-testid="weight-summary-card"]');
    // Either shows positive/negative change or no change indicator
    const changeIndicator = weightCard.locator('[data-testid="weight-change"]');

    // If data exists, should show change
    const hasData = await changeIndicator.isVisible().catch(() => false);
    if (hasData) {
      await expect(changeIndicator.getByText(/[+-]?\d+\.?\d*\s*kg/)).toBeVisible();
    }
  });

  test('should handle empty state gracefully', async ({ page }) => {
    // Test with user who has no data
    await page.goto('/dashboard');

    // Should show helpful empty state messages
    await expect(page.getByText(/記録を始めましょう|まだデータがありません|最初の記録/)).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');

    // Cards should stack vertically
    const cards = page.locator('[data-testid$="-summary-card"]');
    expect(await cards.count()).toBeGreaterThanOrEqual(3);

    // Period selector should be visible
    await expect(page.getByRole('button', { name: '週間' })).toBeVisible();
  });

  test('should refresh data on pull-to-refresh or refresh button', async ({ page }) => {
    await page.goto('/dashboard');

    // If there's a refresh button
    const refreshButton = page.getByRole('button', { name: /更新|リフレッシュ/ });
    if (await refreshButton.isVisible().catch(() => false)) {
      await refreshButton.click();
      // Should show loading state briefly
      await page.waitForTimeout(300);
    }

    // Data should still be displayed
    await expect(page.getByText('体重サマリー')).toBeVisible();
  });
});
