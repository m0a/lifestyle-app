import { test, expect } from '@playwright/test';

/**
 * E2E tests for Chat Photo Upload Flow
 *
 * These tests cover:
 * - Photo upload via chat interface
 * - AI analysis triggered from chat
 * - Progress indicator during upload
 * - Photo thumbnails in chat thread
 * - Continued typing while uploading
 *
 * Prerequisites:
 * - Backend running with AI API key and R2 storage
 * - Frontend running
 * - Test user authenticated
 * - Existing meal record
 */

test.describe('Chat Photo Upload Flow', () => {
  test.describe('Unauthenticated User', () => {
    test('should redirect to login when accessing meal detail', async ({ page }) => {
      // Try to access a meal detail page without auth
      await page.goto('/meals/test-meal-id');
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Photo Upload Button', () => {
    test.skip('should display Add Photo button in chat interface', async ({ page }) => {
      // Navigate to meal detail page (assumes authenticated user)
      await page.goto('/meals');
      await page.locator('[data-testid="meal-item"]').first().click();

      // Open chat panel
      await page.getByRole('button', { name: /チャット|相談/i }).click();

      // Should show Add Photo button
      await expect(page.getByRole('button', { name: /写真を追加|Add Photo/i })).toBeVisible();
    });

    test.skip('should open file picker when Add Photo button is clicked', async ({ page }) => {
      await page.goto('/meals');
      await page.locator('[data-testid="meal-item"]').first().click();
      await page.getByRole('button', { name: /チャット/i }).click();

      // Click Add Photo button
      await page.getByRole('button', { name: /写真を追加/i }).click();

      // Should trigger file input
      const fileInput = page.locator('input[type="file"]');
      await expect(fileInput).toBeAttached();
    });
  });

  test.describe('Upload Progress', () => {
    test.skip('should show upload progress indicator', async ({ page }) => {
      await page.goto('/meals');
      await page.locator('[data-testid="meal-item"]').first().click();
      await page.getByRole('button', { name: /チャット/i }).click();

      // Upload photo
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('tests/fixtures/meal-photo.jpg');

      // Should show progress indicator
      await expect(page.getByText(/アップロード中|Uploading/i)).toBeVisible();
    });

    test.skip('should allow typing while photo is uploading', async ({ page }) => {
      await page.goto('/meals');
      await page.locator('[data-testid="meal-item"]').first().click();
      await page.getByRole('button', { name: /チャット/i }).click();

      // Start photo upload (non-blocking)
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('tests/fixtures/meal-photo.jpg');

      // Should be able to type message immediately
      const messageInput = page.getByPlaceholder(/メッセージ|質問/i);
      await messageInput.fill('この写真について質問があります');

      // Message input should be enabled
      await expect(messageInput).toBeEnabled();
    });

    test.skip('should handle upload failure gracefully', async ({ page }) => {
      await page.goto('/meals');
      await page.locator('[data-testid="meal-item"]').first().click();
      await page.getByRole('button', { name: /チャット/i }).click();

      // Upload invalid file (too large or wrong format)
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('tests/fixtures/invalid-file.pdf');

      // Should show error message
      await expect(page.getByText(/アップロード.*失敗|エラー/i)).toBeVisible();
    });
  });

  test.describe('AI Analysis Response', () => {
    test.skip('should show acknowledgment message immediately after upload', async ({ page }) => {
      await page.goto('/meals');
      await page.locator('[data-testid="meal-item"]').first().click();
      await page.getByRole('button', { name: /チャット/i }).click();

      // Upload photo
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('tests/fixtures/meal-photo.jpg');

      // Should show assistant acknowledgment message
      await expect(page.getByText(/写真を追加.*分析|Analyzing photo/i)).toBeVisible({ timeout: 5000 });
    });

    test.skip('should display AI response with updated nutrition', async ({ page }) => {
      await page.goto('/meals');
      await page.locator('[data-testid="meal-item"]').first().click();
      await page.getByRole('button', { name: /チャット/i }).click();

      // Upload photo
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('tests/fixtures/meal-photo.jpg');

      // Wait for AI analysis to complete (may take up to 15 seconds)
      await expect(page.getByText(/カロリー.*更新|栄養.*追加/i)).toBeVisible({ timeout: 20000 });

      // Should show updated totals
      await expect(page.locator('[data-testid="total-calories"]')).toBeVisible();
    });

    test.skip('should update food items list after analysis', async ({ page }) => {
      await page.goto('/meals');
      await page.locator('[data-testid="meal-item"]').first().click();
      await page.getByRole('button', { name: /チャット/i }).click();

      // Get initial food item count
      const initialCount = await page.locator('[data-testid="food-item"]').count();

      // Upload photo
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('tests/fixtures/meal-photo.jpg');

      // Wait for analysis to complete
      await page.waitForTimeout(15000);

      // Should have more food items
      const newCount = await page.locator('[data-testid="food-item"]').count();
      expect(newCount).toBeGreaterThan(initialCount);
    });
  });

  test.describe('Photo Thumbnails in Chat', () => {
    test.skip('should show photo thumbnail in chat message thread', async ({ page }) => {
      await page.goto('/meals');
      await page.locator('[data-testid="meal-item"]').first().click();
      await page.getByRole('button', { name: /チャット/i }).click();

      // Upload photo
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('tests/fixtures/meal-photo.jpg');

      // Should display thumbnail in chat
      await expect(page.locator('[data-testid="chat-photo-thumbnail"]')).toBeVisible();
    });

    test.skip('should open photo in modal when thumbnail is clicked', async ({ page }) => {
      await page.goto('/meals');
      await page.locator('[data-testid="meal-item"]').first().click();
      await page.getByRole('button', { name: /チャット/i }).click();

      // Upload photo and wait for thumbnail
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('tests/fixtures/meal-photo.jpg');
      await expect(page.locator('[data-testid="chat-photo-thumbnail"]')).toBeVisible();

      // Click thumbnail
      await page.locator('[data-testid="chat-photo-thumbnail"]').click();

      // Should open full-size photo modal
      await expect(page.locator('[data-testid="photo-modal"]')).toBeVisible();
    });
  });

  test.describe('Multiple Photos via Chat', () => {
    test.skip('should allow adding multiple photos through chat', async ({ page }) => {
      await page.goto('/meals');
      await page.locator('[data-testid="meal-item"]').first().click();
      await page.getByRole('button', { name: /チャット/i }).click();

      // Upload first photo
      let fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('tests/fixtures/meal-photo.jpg');
      await page.waitForTimeout(2000);

      // Upload second photo
      await page.getByRole('button', { name: /写真を追加/i }).click();
      fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('tests/fixtures/meal-photo-2.jpg');

      // Should have multiple photo thumbnails in chat
      await expect(page.locator('[data-testid="chat-photo-thumbnail"]')).toHaveCount(2);
    });

    test.skip('should reject when meal has 10 photos', async ({ page }) => {
      // Create meal with 10 photos first
      // (This would require setup code to create a meal with max photos)

      await page.goto('/meals');
      await page.locator('[data-testid="meal-item"]').first().click();
      await page.getByRole('button', { name: /チャット/i }).click();

      // Try to upload 11th photo
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('tests/fixtures/meal-photo.jpg');

      // Should show error message about photo limit
      await expect(page.getByText(/写真.*上限|10枚.*超え/i)).toBeVisible();
    });
  });

  test.describe('Integration with Existing Chat', () => {
    test.skip('should maintain chat history when uploading photo', async ({ page }) => {
      await page.goto('/meals');
      await page.locator('[data-testid="meal-item"]').first().click();
      await page.getByRole('button', { name: /チャット/i }).click();

      // Send text message first
      await page.getByPlaceholder(/メッセージ/i).fill('カロリーを教えてください');
      await page.getByRole('button', { name: /送信/i }).click();
      await expect(page.locator('[data-testid="chat-message-user"]')).toHaveCount(1);

      // Upload photo
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('tests/fixtures/meal-photo.jpg');

      // Chat history should be preserved
      await expect(page.locator('[data-testid="chat-message-user"]')).toHaveCount.greaterThan(0);
    });

    test.skip('should allow chat interaction during photo analysis', async ({ page }) => {
      await page.goto('/meals');
      await page.locator('[data-testid="meal-item"]').first().click();
      await page.getByRole('button', { name: /チャット/i }).click();

      // Upload photo (analysis takes time)
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('tests/fixtures/meal-photo.jpg');

      // Should still be able to send messages while analysis is running
      const messageInput = page.getByPlaceholder(/メッセージ/i);
      await messageInput.fill('もう一つ質問があります');
      await page.getByRole('button', { name: /送信/i }).click();

      // Message should appear in chat
      await expect(page.getByText('もう一つ質問があります')).toBeVisible();
    });
  });
});
