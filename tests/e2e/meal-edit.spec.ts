import { test, expect } from '@playwright/test';

test.describe('Meal Edit Mode', () => {
  test.describe('Authenticated User with AI-analyzed meal', () => {
    // T008: E2E test for edit mode entry
    test.skip('should enter edit mode when clicking edit button on MealDetail page', async ({ page }) => {
      // Navigate to meal detail page (assuming a meal exists)
      await page.goto('/meals/test-meal-id');

      // Click the edit button
      await page.getByRole('button', { name: '編集する' }).click();

      // Should show edit mode indicator
      await expect(page.getByText('編集中')).toBeVisible();

      // Should show edit mode header
      await expect(page.getByText('編集モード')).toBeVisible();

      // Should show cancel and save buttons
      await expect(page.getByRole('button', { name: 'キャンセル' })).toBeVisible();
      await expect(page.getByRole('button', { name: /保存/ })).toBeVisible();
    });

    // T009: E2E test for food item edit
    test.skip('should edit food item name and calories in edit mode', async ({ page }) => {
      await page.goto('/meals/test-meal-id');
      await page.getByRole('button', { name: '編集する' }).click();

      // Click edit button on first food item
      await page.getByRole('button', { name: '✏️' }).first().click();

      // Should show edit form
      await expect(page.getByPlaceholder('食材名')).toBeVisible();

      // Edit the food item name
      await page.getByPlaceholder('食材名').fill('テスト食材');
      await page.getByPlaceholder('kcal').fill('200');

      // Save the edit
      await page.getByRole('button', { name: '保存' }).click();

      // Should show success message
      await expect(page.getByText('食材を更新しました')).toBeVisible();

      // Should show updated food item
      await expect(page.getByText('テスト食材')).toBeVisible();
    });

    // T010: E2E test for food item add
    test.skip('should add new food item in edit mode', async ({ page }) => {
      await page.goto('/meals/test-meal-id');
      await page.getByRole('button', { name: '編集する' }).click();

      // Click add food button
      await page.getByRole('button', { name: '+ 食材を追加' }).click();

      // Fill in the new food item form
      await page.getByPlaceholder('食材名').fill('新しい食材');
      await page.getByPlaceholder('kcal').fill('150');
      await page.getByPlaceholder('P (g)').fill('10');
      await page.getByPlaceholder('F (g)').fill('5');
      await page.getByPlaceholder('C (g)').fill('20');

      // Save the new item
      await page.getByRole('button', { name: '保存' }).click();

      // Should show success message
      await expect(page.getByText('食材を追加しました')).toBeVisible();

      // Should show the new food item in the list
      await expect(page.getByText('新しい食材')).toBeVisible();
    });

    // T011: E2E test for food item delete
    test.skip('should delete food item in edit mode', async ({ page }) => {
      await page.goto('/meals/test-meal-id');
      await page.getByRole('button', { name: '編集する' }).click();

      // Get initial food item count
      const initialCount = await page.locator('.rounded-lg.border.p-3').count();

      // Click delete button on first food item
      await page.getByRole('button', { name: '🗑️' }).first().click();

      // Should show success message
      await expect(page.getByText('食材を削除しました')).toBeVisible();

      // Should have one less food item
      const finalCount = await page.locator('.rounded-lg.border.p-3').count();
      expect(finalCount).toBeLessThan(initialCount);
    });

    // T012: E2E test for totals recalculation
    test.skip('should recalculate totals after food item edit', async ({ page }) => {
      await page.goto('/meals/test-meal-id');
      await page.getByRole('button', { name: '編集する' }).click();

      // Get initial total calories (from the totals section)
      const initialCaloriesText = await page.locator('.bg-blue-50 .text-blue-600').textContent();
      const initialCalories = parseInt(initialCaloriesText || '0');

      // Edit a food item to change calories
      await page.getByRole('button', { name: '✏️' }).first().click();
      await page.getByPlaceholder('kcal').fill('999');
      await page.getByRole('button', { name: '保存' }).click();

      // Wait for update
      await page.waitForTimeout(500);

      // Get new total calories
      const newCaloriesText = await page.locator('.bg-blue-50 .text-blue-600').textContent();
      const newCalories = parseInt(newCaloriesText || '0');

      // Totals should have changed
      expect(newCalories).not.toBe(initialCalories);
    });

    // Additional test: Cancel edit mode with unsaved changes
    test.skip('should show confirmation when canceling with unsaved changes', async ({ page }) => {
      await page.goto('/meals/test-meal-id');
      await page.getByRole('button', { name: '編集する' }).click();

      // Make a change
      await page.getByRole('button', { name: '✏️' }).first().click();
      await page.getByPlaceholder('食材名').fill('変更された食材');
      await page.getByRole('button', { name: '保存' }).click();

      // Wait for save
      await page.waitForTimeout(500);

      // Click cancel
      page.on('dialog', (dialog) => dialog.dismiss());
      await page.getByText('← キャンセル').click();

      // Should still be in edit mode (dialog was dismissed)
      await expect(page.getByText('編集中')).toBeVisible();
    });

    // Test: Save and exit edit mode
    test.skip('should save and exit edit mode successfully', async ({ page }) => {
      await page.goto('/meals/test-meal-id');
      await page.getByRole('button', { name: '編集する' }).click();

      // Click save button
      await page.getByRole('button', { name: /保存して終了/ }).click();

      // Should show success message
      await expect(page.getByText('変更を保存しました')).toBeVisible();

      // Should return to detail view (not edit mode)
      await expect(page.getByText('編集中')).not.toBeVisible();
      await expect(page.getByRole('button', { name: '編集する' })).toBeVisible();
    });
  });

  // User Story 2: AI Chat Support in Edit Mode
  test.describe('AI Chat in Edit Mode', () => {
    // T021: E2E test for AI chat in edit mode
    test.skip('should open AI chat in edit mode', async ({ page }) => {
      await page.goto('/meals/test-meal-id');
      await page.getByRole('button', { name: '編集する' }).click();

      // Toggle chat visibility
      await page.getByRole('button', { name: /チャット/ }).click();

      // Chat interface should be visible
      await expect(page.getByPlaceholder('メッセージを入力')).toBeVisible();
      await expect(page.getByRole('button', { name: '送信' })).toBeVisible();
    });

    // T022: E2E test for applying AI suggestion
    test.skip('should apply AI suggestion to food items', async ({ page }) => {
      await page.goto('/meals/test-meal-id');
      await page.getByRole('button', { name: '編集する' }).click();
      await page.getByRole('button', { name: /チャット/ }).click();

      // Send a message to AI
      await page.getByPlaceholder('メッセージを入力').fill('ご飯を半分にしたい');
      await page.getByRole('button', { name: '送信' }).click();

      // Wait for AI response
      await page.waitForSelector('text=適用する', { timeout: 30000 });

      // Apply the suggestion
      await page.getByRole('button', { name: '適用する' }).click();

      // Should show success message
      await expect(page.getByText('変更を適用しました')).toBeVisible();
    });
  });

  // User Story 3: Photo Management in Edit Mode
  test.describe('Photo Management in Edit Mode', () => {
    // T030: E2E test for photo add in edit mode
    test.skip('should add photo to meal without photo', async ({ page }) => {
      await page.goto('/meals/meal-without-photo');
      await page.getByRole('button', { name: '編集する' }).click();

      // Click add photo button
      await page.getByRole('button', { name: /写真を追加/ }).click();

      // File input should be triggered (mocked in real test)
      await expect(page.locator('input[type="file"]')).toBeVisible();
    });

    // T031: E2E test for photo delete in edit mode
    test.skip('should delete photo from meal', async ({ page }) => {
      await page.goto('/meals/meal-with-photo');
      await page.getByRole('button', { name: '編集する' }).click();

      // Click delete photo button
      await page.getByRole('button', { name: /写真を削除/ }).click();

      // Confirmation dialog
      await expect(page.getByText('本当に写真を削除しますか？')).toBeVisible();
      await page.getByRole('button', { name: '削除' }).click();

      // Photo should be removed
      await expect(page.getByText('写真を削除しました')).toBeVisible();
    });
  });

  test.describe('Manual meal (without AI analysis)', () => {
    test.skip('should still show edit mode for manual meals', async ({ page }) => {
      // Navigate to a manually created meal
      await page.goto('/meals/manual-meal-id');

      // Edit button should be visible
      await expect(page.getByRole('button', { name: '編集する' })).toBeVisible();

      // Click edit button
      await page.getByRole('button', { name: '編集する' }).click();

      // Should enter edit mode
      await expect(page.getByText('編集中')).toBeVisible();

      // Should show add food button even if no food items exist
      await expect(page.getByRole('button', { name: '+ 食材を追加' })).toBeVisible();
    });
  });
});
