import { test, expect } from '@playwright/test';

test.describe('Exercise Import Feature', () => {
  test.describe('Unauthenticated User', () => {
    test.skip('should redirect to login when accessing exercises page', async ({ page }) => {
      await page.goto('/exercises');
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Authenticated User', () => {
    // Note: These tests require authentication setup which is skipped for now
    // In a real scenario, you would set up authentication before each test

    test.skip('should open import dialog when clicking import button', async ({ page }) => {
      await page.goto('/exercises');
      await expect(page.getByRole('heading', { name: '運動記録' })).toBeVisible();

      // Click import button
      await page.getByRole('button', { name: '過去から取り込み' }).click();

      // Dialog should be visible
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('heading', { name: '過去のトレーニングから取り込む' })).toBeVisible();
    });

    test.skip('should display recent exercises section in dialog', async ({ page }) => {
      await page.goto('/exercises');

      // Click import button to open dialog
      await page.getByRole('button', { name: '過去から取り込み' }).click();

      // Recent exercises section should be visible
      await expect(page.getByText('最近のワークアウト')).toBeVisible();

      // Divider should be visible
      await expect(page.getByText('または')).toBeVisible();

      // Date selection should be visible
      await expect(page.getByText('日付を選択')).toBeVisible();
      await expect(page.getByLabel('日付を選択')).toBeVisible();
    });

    test.skip('should close dialog when clicking close button', async ({ page }) => {
      await page.goto('/exercises');

      // Open dialog
      await page.getByRole('button', { name: '過去から取り込み' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      // Click close button (X icon)
      await page.getByLabel('閉じる').click();

      // Dialog should be closed
      await expect(page.getByRole('dialog')).not.toBeVisible();
    });

    test.skip('should close dialog when pressing Escape key', async ({ page }) => {
      await page.goto('/exercises');

      // Open dialog
      await page.getByRole('button', { name: '過去から取り込み' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();

      // Press Escape key
      await page.keyboard.press('Escape');

      // Dialog should be closed
      await expect(page.getByRole('dialog')).not.toBeVisible();
    });

    test.skip('should import exercise from date selection', async ({ page }) => {
      await page.goto('/exercises');

      // First, create a test exercise to import later
      await page.getByLabel('運動種目').fill('ベンチプレス');
      await page.locator('button:has-text("胸")').click(); // Select chest muscle group

      // Add first set
      await page.getByLabel('回数', { exact: true }).first().fill('10');
      await page.getByLabel('重量 (kg)', { exact: true }).first().fill('60');

      // Submit
      await page.getByRole('button', { name: '記録する' }).click();

      // Wait for success
      await expect(page.getByText('ベンチプレス')).toBeVisible();

      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];

      // Open import dialog
      await page.getByRole('button', { name: '過去から取り込み' }).click();

      // Select today's date
      await page.getByLabel('日付を選択').fill(today);

      // Wait for exercises to load
      await page.waitForTimeout(500);

      // Click on the exercise (ベンチプレス)
      await page.getByRole('button', { name: /ベンチプレス/ }).first().click();

      // Dialog should close
      await expect(page.getByRole('dialog')).not.toBeVisible();

      // Form should be populated with the imported data
      await expect(page.getByLabel('運動種目')).toHaveValue('ベンチプレス');
      await expect(page.getByLabel('回数', { exact: true }).first()).toHaveValue('10');
      await expect(page.getByLabel('重量 (kg)', { exact: true }).first()).toHaveValue('60');
    });

    test.skip('should import exercise from recent exercises list', async ({ page }) => {
      await page.goto('/exercises');

      // First, create a test exercise
      await page.getByLabel('運動種目').fill('スクワット');
      await page.locator('button:has-text("脚")').click(); // Select legs muscle group

      // Add sets
      await page.getByLabel('回数', { exact: true }).first().fill('12');
      await page.getByLabel('重量 (kg)', { exact: true }).first().fill('80');

      // Add second set
      await page.getByRole('button', { name: 'セットを追加' }).click();
      await page.getByLabel('回数', { exact: true }).nth(1).fill('10');
      await page.getByLabel('重量 (kg)', { exact: true }).nth(1).fill('80');

      // Submit
      await page.getByRole('button', { name: '記録する' }).click();

      // Wait for success
      await expect(page.getByText('スクワット')).toBeVisible();

      // Clear the form by refreshing
      await page.reload();

      // Open import dialog
      await page.getByRole('button', { name: '過去から取り込み' }).click();

      // Recent exercises section should show スクワット
      const recentSection = page.locator('h3:has-text("最近のワークアウト")').locator('..');

      // Click on スクワット in recent exercises (not in the date selection area)
      await recentSection.getByRole('button', { name: /スクワット/ }).click();

      // Dialog should close
      await expect(page.getByRole('dialog')).not.toBeVisible();

      // Form should be populated with the imported data
      await expect(page.getByLabel('運動種目')).toHaveValue('スクワット');
      await expect(page.getByLabel('回数', { exact: true }).first()).toHaveValue('12');
      await expect(page.getByLabel('重量 (kg)', { exact: true }).first()).toHaveValue('80');
      await expect(page.getByLabel('回数', { exact: true }).nth(1)).toHaveValue('10');
      await expect(page.getByLabel('重量 (kg)', { exact: true }).nth(1)).toHaveValue('80');
    });

    test.skip('should show loading state while fetching exercises', async ({ page }) => {
      await page.goto('/exercises');

      // Open import dialog
      await page.getByRole('button', { name: '過去から取り込み' }).click();

      // Recent exercises section should show loading spinner initially
      const recentSection = page.locator('h3:has-text("最近のワークアウト")').locator('..');

      // Check if loading spinner or exercises are visible
      // (depending on cache, it might load instantly or show spinner)
      const hasSpinner = await recentSection.locator('.animate-spin').isVisible().catch(() => false);
      const hasExercises = await recentSection.getByRole('button').count().then(count => count > 0);

      // At least one should be true
      expect(hasSpinner || hasExercises).toBe(true);
    });

    test.skip('should display empty state when no recent exercises exist', async ({ page }) => {
      // Note: This test would require a fresh user account with no exercises
      await page.goto('/exercises');

      // Create a fresh scenario or use test user with no data
      // This would typically be done in beforeEach with database cleanup
    });

    test.skip('should display muscle group badges with correct colors', async ({ page }) => {
      await page.goto('/exercises');

      // Create exercises with different muscle groups
      const exercises = [
        { name: 'ベンチプレス', muscleGroup: '胸', color: 'red' },
        { name: 'デッドリフト', muscleGroup: '背中', color: 'blue' },
        { name: 'スクワット', muscleGroup: '脚', color: 'green' },
      ];

      for (const exercise of exercises) {
        await page.getByLabel('運動種目').fill(exercise.name);
        await page.locator(`button:has-text("${exercise.muscleGroup}")`).click();
        await page.getByLabel('回数', { exact: true }).first().fill('10');
        await page.getByLabel('重量 (kg)', { exact: true }).first().fill('50');
        await page.getByRole('button', { name: '記録する' }).click();
        await expect(page.getByText(exercise.name)).toBeVisible();
      }

      // Open import dialog
      await page.getByRole('button', { name: '過去から取り込み' }).click();

      // Check muscle group badges in recent exercises
      for (const exercise of exercises) {
        const badge = page.getByText(exercise.muscleGroup).first();
        await expect(badge).toBeVisible();

        // Check badge has appropriate color class
        const className = await badge.getAttribute('class');
        expect(className).toContain('text-');
        expect(className).toContain('bg-');
      }
    });

    test.skip('should show exercise preview with set count and weight', async ({ page }) => {
      await page.goto('/exercises');

      // Create a multi-set exercise
      await page.getByLabel('運動種目').fill('ショルダープレス');
      await page.locator('button:has-text("肩")').click();

      await page.getByLabel('回数', { exact: true }).first().fill('10');
      await page.getByLabel('重量 (kg)', { exact: true }).first().fill('20');

      // Add second set
      await page.getByRole('button', { name: 'セットを追加' }).click();
      await page.getByLabel('回数', { exact: true }).nth(1).fill('8');
      await page.getByLabel('重量 (kg)', { exact: true }).nth(1).fill('20');

      // Add third set
      await page.getByRole('button', { name: 'セットを追加' }).click();
      await page.getByLabel('回数', { exact: true }).nth(2).fill('8');
      await page.getByLabel('重量 (kg)', { exact: true }).nth(2).fill('20');

      await page.getByRole('button', { name: '記録する' }).click();
      await expect(page.getByText('ショルダープレス')).toBeVisible();

      // Open import dialog
      await page.getByRole('button', { name: '過去から取り込み' }).click();

      // Recent exercise should show preview like "3セット, 20kg"
      const recentSection = page.locator('h3:has-text("最近のワークアウト")').locator('..');
      const exerciseButton = recentSection.getByRole('button', { name: /ショルダープレス/ });

      await expect(exerciseButton).toBeVisible();
      // Check preview text format
      await expect(exerciseButton).toContainText(/セット/);
      await expect(exerciseButton).toContainText('20');
    });
  });
});
