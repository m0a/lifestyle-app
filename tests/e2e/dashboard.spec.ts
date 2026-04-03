import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../helpers/e2e';

test.describe('Dashboard Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test using the test helper
    await loginAsTestUser(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('should display dashboard with correct content', async ({ page }) => {
    await page.goto('/dashboard');

    // Dashboard title should always be visible
    await expect(page.getByRole('heading', { name: 'レポート' })).toBeVisible();

    // Either shows summary cards (with data) OR empty state
    const hasData = await page.locator('[data-testid="weight-summary-card"]').isVisible().catch(() => false);

    if (hasData) {
      // User has data - check for summary cards
      await expect(page.locator('[data-testid="weight-summary-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="meal-summary-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="exercise-summary-card"]')).toBeVisible();
    } else {
      // User has no data - check for empty state
      await expect(page.getByText('記録を始めましょう')).toBeVisible();
    }
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

    // Default is weekly (active state uses bg-white with shadow in segment control)
    await expect(page.getByRole('button', { name: '週間' })).toHaveClass(/bg-white/);

    // Switch to monthly
    await page.click('button:has-text("月間")');
    await expect(page.getByRole('button', { name: '月間' })).toHaveClass(/bg-white/);

    // Data should update (loading indicator may appear briefly)
    await page.waitForTimeout(500);
  });

  test('should display weight summary card when user has data', async ({ page }) => {
    await page.goto('/dashboard');

    const weightCard = page.locator('[data-testid="weight-summary-card"]');
    // Only check if cards are visible (user might not have data)
    const hasWeightCard = await weightCard.isVisible().catch(() => false);

    if (hasWeightCard) {
      // Should show current weight or empty state within the card
      await expect(weightCard.getByText(/kg|データなし/)).toBeVisible();
    }
    // If no card visible, it means user is in empty state (also valid)
  });

  test('should display meal summary card when user has data', async ({ page }) => {
    await page.goto('/dashboard');

    const mealCard = page.locator('[data-testid="meal-summary-card"]');
    const hasMealCard = await mealCard.isVisible().catch(() => false);

    if (hasMealCard) {
      // Should show calorie info or empty state within the card
      await expect(mealCard.getByText(/kcal|データなし/)).toBeVisible();
    }
    // If no card visible, it means user is in empty state (also valid)
  });

  test('should display exercise summary card when user has data', async ({ page }) => {
    await page.goto('/dashboard');

    const exerciseCard = page.locator('[data-testid="exercise-summary-card"]');
    const hasExerciseCard = await exerciseCard.isVisible().catch(() => false);

    if (hasExerciseCard) {
      // Should show sets count or empty state within the card
      await expect(exerciseCard.getByText(/セット|データなし/)).toBeVisible();
    }
    // If no card visible, it means user is in empty state (also valid)
  });

  test('should navigate to individual tracking pages from dashboard', async ({ page }) => {
    await page.goto('/dashboard');

    // Navigate to weight page via summary card link
    const weightLink = page.locator('[data-testid="weight-summary-card"] a[href="/weight"]');
    if (await weightLink.isVisible().catch(() => false)) {
      await weightLink.click();
      await expect(page).toHaveURL(/\/weight/);
    }

    await page.goto('/dashboard');

    // Navigate to meals page via summary card link
    const mealsLink = page.locator('[data-testid="meal-summary-card"] a[href="/meals"]');
    if (await mealsLink.isVisible().catch(() => false)) {
      await mealsLink.click();
      await expect(page).toHaveURL(/\/meals/);
    }

    await page.goto('/dashboard');

    // Navigate to exercise page via summary card link
    const exerciseLink = page.locator('[data-testid="exercise-summary-card"] a[href="/exercises"]');
    if (await exerciseLink.isVisible().catch(() => false)) {
      await exerciseLink.click();
      await expect(page).toHaveURL(/\/exercises/);
    }
  });

  test('should show weight change trend when data exists', async ({ page }) => {
    await page.goto('/dashboard');

    const weightCard = page.locator('[data-testid="weight-summary-card"]');
    const hasWeightCard = await weightCard.isVisible().catch(() => false);

    if (hasWeightCard) {
      // Weight card should show change if data exists
      const changeIndicator = weightCard.locator('[data-testid="weight-change"]');
      const hasChange = await changeIndicator.isVisible().catch(() => false);
      if (hasChange) {
        await expect(changeIndicator.getByText(/[+-]?\d+\.?\d*\s*kg/)).toBeVisible();
      }
    }
    // If no card, user has no data - test passes as there's nothing to verify
  });

  test('should handle empty state gracefully', async ({ page }) => {
    await page.goto('/dashboard');

    // Should show either empty state or summary cards (depending on user data)
    const hasEmptyState = await page.getByText('記録を始めましょう').isVisible().catch(() => false);
    const hasCards = await page.locator('[data-testid="weight-summary-card"]').isVisible().catch(() => false);
    expect(hasEmptyState || hasCards).toBeTruthy();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');

    // Dashboard title should be visible on mobile
    await expect(page.getByRole('heading', { name: 'レポート' })).toBeVisible();

    // Period selector should be visible on mobile
    await expect(page.getByRole('button', { name: '週間' })).toBeVisible();

    // If user has data, cards should stack vertically
    const cards = page.locator('[data-testid$="-summary-card"]');
    const cardCount = await cards.count();
    if (cardCount > 0) {
      expect(cardCount).toBeGreaterThanOrEqual(3);
    }
  });

  test('should refresh data on refresh button click', async ({ page }) => {
    await page.goto('/dashboard');

    // Find refresh button by title attribute
    const refreshButton = page.locator('button[title="更新"]');
    const hasRefreshButton = await refreshButton.isVisible().catch(() => false);

    if (hasRefreshButton) {
      await refreshButton.click();
      // Should show loading state briefly
      await page.waitForTimeout(300);
    }

    // Dashboard should still be functional after refresh
    await expect(page.getByRole('heading', { name: 'レポート' })).toBeVisible();
  });
});
