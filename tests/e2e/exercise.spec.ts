import { test, expect } from '@playwright/test';

test.describe('Exercise Recording Flow', () => {
  test.describe('Unauthenticated User', () => {
    test('should redirect to login when accessing exercises page', async ({ page }) => {
      await page.goto('/exercises');
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Authenticated User', () => {
    test.skip('should display exercise recording page', async ({ page }) => {
      await page.goto('/exercises');
      await expect(page.getByRole('heading', { name: '運動記録' })).toBeVisible();
      await expect(page.getByLabel('運動種目')).toBeVisible();
      await expect(page.getByLabel('時間')).toBeVisible();
      await expect(page.getByRole('button', { name: '記録する' })).toBeVisible();
    });

    test.skip('should record new exercise', async ({ page }) => {
      await page.goto('/exercises');

      await page.getByLabel('運動種目').fill('ランニング');
      await page.getByLabel('時間').fill('30');

      await page.getByRole('button', { name: '記録する' }).click();

      await expect(page.getByText('ランニング')).toBeVisible();
      await expect(page.getByText('30分')).toBeVisible();
    });

    test.skip('should display weekly summary', async ({ page }) => {
      await page.goto('/exercises');

      await expect(page.getByText('今週の運動')).toBeVisible();
      await expect(page.getByText('合計時間')).toBeVisible();
    });

    test.skip('should display exercise history list', async ({ page }) => {
      await page.goto('/exercises');

      await expect(page.getByRole('list')).toBeVisible();
    });

    test.skip('should validate exerciseType is not empty', async ({ page }) => {
      await page.goto('/exercises');

      await page.getByLabel('時間').fill('30');
      await page.getByRole('button', { name: '記録する' }).click();

      await expect(page.getByText('運動種目を入力')).toBeVisible();
    });

    test.skip('should validate durationMinutes is positive', async ({ page }) => {
      await page.goto('/exercises');

      await page.getByLabel('運動種目').fill('ランニング');
      await page.getByLabel('時間').fill('0');
      await page.getByRole('button', { name: '記録する' }).click();

      await expect(page.getByText('1分以上')).toBeVisible();
    });

    test.skip('should allow editing exercise record', async ({ page }) => {
      await page.goto('/exercises');

      await page.getByRole('button', { name: '編集' }).first().click();

      await expect(page.getByRole('dialog')).toBeVisible();
    });

    test.skip('should allow deleting exercise record', async ({ page }) => {
      await page.goto('/exercises');

      const initialItems = await page.getByRole('listitem').count();

      await page.getByRole('button', { name: '削除' }).first().click();
      await page.getByRole('button', { name: '確認' }).click();

      const finalItems = await page.getByRole('listitem').count();
      expect(finalItems).toBe(initialItems - 1);
    });

    test.skip('should show exercise breakdown by type', async ({ page }) => {
      await page.goto('/exercises');

      // Summary should show breakdown by exercise type
      await expect(page.getByText('種目別')).toBeVisible();
    });
  });
});
