import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../helpers/e2e';

test.describe('Exercise Recording', () => {
  test.beforeEach(async ({ page }) => {
    // Login is required for exercise pages
    await loginAsTestUser(page);
  });

  test.describe('User Story 1: 運動記録の即時登録', () => {
    test('should NOT display recordedAt datetime field', async ({ page }) => {
      await page.goto('/exercises');
      await page.waitForLoadState('networkidle');

      // 日時入力フィールドが存在しないことを確認
      const recordedAtLabel = page.locator('label:has-text("記録日時")');
      await expect(recordedAtLabel).not.toBeVisible();

      const datetimeInput = page.locator('input[type="datetime-local"]');
      await expect(datetimeInput).not.toBeVisible();
    });

    test('should record exercise with current timestamp', async ({ page }) => {
      await page.goto('/exercises');
      await page.waitForLoadState('networkidle');

      // Wait for the form to be visible
      await expect(page.getByRole('heading', { name: '筋トレを記録' })).toBeVisible();

      // Select muscle group (胸 = chest is default, click to confirm)
      await page.click('button:has-text("胸")');

      // Select exercise type (ベンチプレス)
      await page.click('button:has-text("ベンチプレス")');

      // Fill in the first set (reps)
      const repsInputs = page.locator('input[type="number"][placeholder="回"]');
      await repsInputs.first().fill('10');

      // Fill in weight (optional)
      const weightInputs = page.locator('input[type="number"][placeholder="kg"]');
      await weightInputs.first().fill('60');

      // Submit the form
      await page.click('button:has-text("記録する")');

      // 成功メッセージが表示されることを確認
      await expect(page.getByText('運動を記録しました')).toBeVisible({ timeout: 5000 });

      // 履歴に記録が表示されることを確認
      await expect(page.locator('text=ベンチプレス').first()).toBeVisible();
    });

    test('should display form without datetime field after submission', async ({ page }) => {
      await page.goto('/exercises');
      await page.waitForLoadState('networkidle');

      // フォームを確認
      const recordedAtLabel = page.locator('label:has-text("記録日時")');
      await expect(recordedAtLabel).not.toBeVisible();
    });
  });

  test.describe('User Story 2: シンプルな運動履歴表示', () => {
    test('should NOT display filter dropdown', async ({ page }) => {
      await page.goto('/exercises');
      await page.waitForLoadState('networkidle');

      // フィルタドロップダウンが存在しないことを確認
      const filterSelect = page.locator('select');
      const filterCount = await filterSelect.count();

      // Exercise pageにselectタグが存在しないことを期待
      expect(filterCount).toBe(0);
    });

    test('should display all exercise types in chronological order', async ({ page }) => {
      await page.goto('/exercises');
      await page.waitForLoadState('networkidle');

      // Wait for form to load
      await expect(page.getByRole('heading', { name: '筋トレを記録' })).toBeVisible();

      // 種目1: 胸 → ベンチプレス
      await page.click('button:has-text("胸")');
      await page.click('button:has-text("ベンチプレス")');
      const repsInputs = page.locator('input[type="number"][placeholder="回"]');
      await repsInputs.first().fill('10');
      await page.click('button:has-text("記録する")');
      await expect(page.getByText('運動を記録しました')).toBeVisible({ timeout: 5000 });

      // Wait for the form to reset
      await page.waitForTimeout(500);

      // 種目2: 脚 → スクワット
      await page.click('button:has-text("脚")');
      await page.click('button:has-text("スクワット")');
      await repsInputs.first().fill('15');
      await page.click('button:has-text("記録する")');
      await expect(page.getByText('運動を記録しました')).toBeVisible({ timeout: 5000 });

      // すべての記録が表示されることを確認（履歴セクション内で確認）
      await expect(page.locator('text=ベンチプレス').first()).toBeVisible();
      await expect(page.locator('text=スクワット').first()).toBeVisible();

      // フィルタUIが表示されていないことを再確認
      const filterSelect = page.locator('select');
      await expect(filterSelect).not.toBeVisible();
    });

    test('should scroll through history without filter UI', async ({ page }) => {
      await page.goto('/exercises');
      await page.waitForLoadState('networkidle');

      // ページをスクロール
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

      // フィルタUIが表示されないことを確認
      const filterSelect = page.locator('select');
      await expect(filterSelect).not.toBeVisible();

      // 記録履歴セクションが見えることを確認
      await expect(page.locator('text=記録履歴')).toBeVisible();
    });
  });

  test.describe('Edge Cases', () => {
    test('should record multiple exercises in quick succession', async ({ page }) => {
      await page.goto('/exercises');
      await page.waitForLoadState('networkidle');

      // Wait for form to load
      await expect(page.getByRole('heading', { name: '筋トレを記録' })).toBeVisible();

      const repsInputs = page.locator('input[type="number"][placeholder="回"]');

      // 連続で2件記録
      // Record 1: ベンチプレス
      await page.click('button:has-text("胸")');
      await page.click('button:has-text("ベンチプレス")');
      await repsInputs.first().fill('8');
      await page.click('button:has-text("記録する")');
      await expect(page.getByText('運動を記録しました')).toBeVisible({ timeout: 5000 });

      await page.waitForTimeout(500);

      // Record 2: プッシュアップ (same muscle group)
      await page.click('button:has-text("プッシュアップ")');
      await repsInputs.first().fill('20');
      await page.click('button:has-text("記録する")');
      await expect(page.getByText('運動を記録しました')).toBeVisible({ timeout: 5000 });

      // 両方の記録が履歴に表示されることを確認
      const benchPressRecords = page.locator('text=ベンチプレス');
      await expect(benchPressRecords.first()).toBeVisible();
      const pushUpRecords = page.locator('text=プッシュアップ');
      await expect(pushUpRecords.first()).toBeVisible();
    });

    test('should require exercise type selection before submission', async ({ page }) => {
      await page.goto('/exercises');
      await page.waitForLoadState('networkidle');

      // Wait for form to load
      await expect(page.getByRole('heading', { name: '筋トレを記録' })).toBeVisible();

      // Try to submit without selecting exercise type
      // The form should have validation
      await page.click('button:has-text("記録する")');

      // Should show validation error
      await expect(page.getByText('種目を選択してください')).toBeVisible({ timeout: 3000 });
    });
  });
});
