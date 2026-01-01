import { test, expect } from '@playwright/test';

/**
 * E2E tests for AI Meal Photo Analysis Flow
 *
 * These tests cover:
 * - Photo capture and analysis
 * - Manual food item adjustment
 * - Chat-based adjustment
 * - History viewing
 *
 * Prerequisites:
 * - Backend running with AI API key
 * - Frontend running
 * - Test user authenticated
 */

test.describe('Meal Photo Analysis Flow', () => {
  test.describe('Unauthenticated User', () => {
    test('should redirect to login when accessing analysis page', async ({ page }) => {
      await page.goto('/meals/analyze');
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Photo Capture', () => {
    test.skip('should display photo capture options', async ({ page }) => {
      await page.goto('/meals/analyze');

      // Camera button
      await expect(page.getByRole('button', { name: /カメラ|撮影/i })).toBeVisible();

      // File picker button
      await expect(page.getByRole('button', { name: /ギャラリー|選択/i })).toBeVisible();
    });

    test.skip('should allow photo selection from gallery', async ({ page }) => {
      await page.goto('/meals/analyze');

      // Upload test image
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('tests/fixtures/meal-photo.jpg');

      // Should show preview
      await expect(page.locator('img[alt*="プレビュー"]')).toBeVisible();
    });

    test.skip('should show analyzing state during AI analysis', async ({ page }) => {
      await page.goto('/meals/analyze');

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('tests/fixtures/meal-photo.jpg');

      // Click analyze button
      await page.getByRole('button', { name: /分析|解析/i }).click();

      // Should show loading indicator
      await expect(page.getByText(/分析中|解析中/i)).toBeVisible();
    });

    test.skip('should display analysis results', async ({ page }) => {
      await page.goto('/meals/analyze');

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('tests/fixtures/meal-photo.jpg');

      await page.getByRole('button', { name: /分析|解析/i }).click();

      // Wait for analysis to complete (may take up to 10 seconds)
      await expect(page.getByText(/食材|品目/i)).toBeVisible({ timeout: 15000 });

      // Should show food items
      await expect(page.locator('[data-testid="food-item"]')).toHaveCount.greaterThan(0);

      // Should show totals
      await expect(page.getByText(/合計|総カロリー/i)).toBeVisible();
    });

    test.skip('should handle non-food image', async ({ page }) => {
      await page.goto('/meals/analyze');

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('tests/fixtures/not-food.jpg');

      await page.getByRole('button', { name: /分析|解析/i }).click();

      // Should show error message
      await expect(page.getByText(/食事.*認識|識別.*できません/i)).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Manual Adjustment', () => {
    test.skip('should allow editing food item', async ({ page }) => {
      // Navigate to existing analysis result
      await page.goto('/meals/analyze');

      // ... complete analysis first ...

      // Click edit on a food item
      await page.locator('[data-testid="food-item"]').first().getByRole('button', { name: /編集/i }).click();

      // Should show edit form
      await expect(page.getByLabel(/名前/i)).toBeVisible();
      await expect(page.getByLabel(/カロリー/i)).toBeVisible();

      // Edit values
      await page.getByLabel(/カロリー/i).fill('300');
      await page.getByRole('button', { name: /保存/i }).click();

      // Should update totals
      await expect(page.getByText('300')).toBeVisible();
    });

    test.skip('should allow adding food item', async ({ page }) => {
      await page.goto('/meals/analyze');

      // Click add button
      await page.getByRole('button', { name: /追加|食材を追加/i }).click();

      // Fill in new food item
      await page.getByLabel(/名前/i).fill('味噌汁');
      await page.getByLabel(/カロリー/i).fill('40');
      await page.getByRole('button', { name: /保存/i }).click();

      // Should show new item in list
      await expect(page.getByText('味噌汁')).toBeVisible();
    });

    test.skip('should allow deleting food item', async ({ page }) => {
      await page.goto('/meals/analyze');

      const initialCount = await page.locator('[data-testid="food-item"]').count();

      // Click delete on a food item
      await page.locator('[data-testid="food-item"]').first().getByRole('button', { name: /削除/i }).click();

      // Confirm deletion
      await page.getByRole('button', { name: /確認|はい/i }).click();

      // Should update list
      await expect(page.locator('[data-testid="food-item"]')).toHaveCount(initialCount - 1);
    });

    test.skip('should update totals after modification', async ({ page }) => {
      await page.goto('/meals/analyze');

      // Get initial total
      const initialTotal = await page.locator('[data-testid="total-calories"]').textContent();

      // Add a food item
      await page.getByRole('button', { name: /追加/i }).click();
      await page.getByLabel(/名前/i).fill('おにぎり');
      await page.getByLabel(/カロリー/i).fill('200');
      await page.getByRole('button', { name: /保存/i }).click();

      // Check total updated
      const newTotal = await page.locator('[data-testid="total-calories"]').textContent();
      expect(Number(newTotal)).toBeGreaterThan(Number(initialTotal));
    });
  });

  test.describe('Chat Adjustment', () => {
    test.skip('should open chat panel', async ({ page }) => {
      await page.goto('/meals/analyze');

      // Click chat button
      await page.getByRole('button', { name: /チャット|相談/i }).click();

      // Should show chat panel
      await expect(page.locator('[data-testid="chat-panel"]')).toBeVisible();
      await expect(page.getByPlaceholder(/メッセージ|質問/i)).toBeVisible();
    });

    test.skip('should send message and receive streaming response', async ({ page }) => {
      await page.goto('/meals/analyze');

      await page.getByRole('button', { name: /チャット/i }).click();

      // Send message
      await page.getByPlaceholder(/メッセージ/i).fill('カロリーを減らしたいです');
      await page.getByRole('button', { name: /送信/i }).click();

      // Should show user message
      await expect(page.locator('[data-testid="chat-message-user"]')).toBeVisible();

      // Should show streaming response (may take a few seconds)
      await expect(page.locator('[data-testid="chat-message-assistant"]')).toBeVisible({ timeout: 10000 });
    });

    test.skip('should display change suggestions as buttons', async ({ page }) => {
      await page.goto('/meals/analyze');

      await page.getByRole('button', { name: /チャット/i }).click();

      await page.getByPlaceholder(/メッセージ/i).fill('ご飯を追加してください');
      await page.getByRole('button', { name: /送信/i }).click();

      // Wait for response with suggestions
      await expect(page.getByRole('button', { name: /適用|変更を適用/i })).toBeVisible({ timeout: 15000 });
    });

    test.skip('should apply chat suggestions', async ({ page }) => {
      await page.goto('/meals/analyze');

      await page.getByRole('button', { name: /チャット/i }).click();

      await page.getByPlaceholder(/メッセージ/i).fill('サラダを追加してください');
      await page.getByRole('button', { name: /送信/i }).click();

      // Wait for and click apply button
      await page.getByRole('button', { name: /適用/i }).click({ timeout: 15000 });

      // Should update food items list
      await expect(page.getByText('サラダ')).toBeVisible();
    });

    test.skip('should maintain conversation history', async ({ page }) => {
      await page.goto('/meals/analyze');

      await page.getByRole('button', { name: /チャット/i }).click();

      // Send first message
      await page.getByPlaceholder(/メッセージ/i).fill('こんにちは');
      await page.getByRole('button', { name: /送信/i }).click();

      await expect(page.locator('[data-testid="chat-message-assistant"]')).toBeVisible({ timeout: 10000 });

      // Send second message
      await page.getByPlaceholder(/メッセージ/i).fill('何を追加すればいい？');
      await page.getByRole('button', { name: /送信/i }).click();

      // Should have multiple messages
      await expect(page.locator('[data-testid="chat-message-user"]')).toHaveCount(2);
    });
  });

  test.describe('Save Flow', () => {
    test.skip('should save meal with meal type selection', async ({ page }) => {
      await page.goto('/meals/analyze');

      // Complete analysis...

      // Select meal type
      await page.getByLabel(/食事タイプ/i).selectOption('lunch');

      // Click save
      await page.getByRole('button', { name: /保存|記録/i }).click();

      // Should navigate to history or show success
      await expect(page.getByText(/保存しました|記録しました/i)).toBeVisible();
    });

    test.skip('should show saved meal in history', async ({ page }) => {
      // After saving, navigate to history
      await page.goto('/meals');

      // Should show the saved meal with photo
      await expect(page.locator('img[alt*="食事"]')).toBeVisible();
    });
  });

  test.describe('History View', () => {
    test.skip('should display meal with photo in list', async ({ page }) => {
      await page.goto('/meals');

      // Meals with photos should show thumbnails
      await expect(page.locator('[data-testid="meal-thumbnail"]')).toBeVisible();
    });

    test.skip('should show AI badge for AI-analyzed meals', async ({ page }) => {
      await page.goto('/meals');

      // AI-analyzed meals should have a badge
      await expect(page.locator('[data-testid="ai-badge"]')).toBeVisible();
    });

    test.skip('should show macros in list view', async ({ page }) => {
      await page.goto('/meals');

      // Should show protein, fat, carbs
      await expect(page.getByText(/P\d+g/)).toBeVisible();
      await expect(page.getByText(/F\d+g/)).toBeVisible();
      await expect(page.getByText(/C\d+g/)).toBeVisible();
    });

    test.skip('should display full detail when clicked', async ({ page }) => {
      await page.goto('/meals');

      // Click on a meal
      await page.locator('[data-testid="meal-item"]').first().click();

      // Should show detail view with photo
      await expect(page.locator('[data-testid="meal-photo-full"]')).toBeVisible();

      // Should show food items list
      await expect(page.locator('[data-testid="food-item"]')).toHaveCount.greaterThan(0);

      // Should show chat history if exists
      await expect(page.locator('[data-testid="chat-history"]')).toBeVisible();
    });
  });
});
