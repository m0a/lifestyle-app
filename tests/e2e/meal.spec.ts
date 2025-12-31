import { test, expect } from '@playwright/test';

test.describe('Meal Recording Flow', () => {
  test.describe('Unauthenticated User', () => {
    test('should redirect to login when accessing meals page', async ({ page }) => {
      await page.goto('/meals');
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Authenticated User', () => {
    test.skip('should display meal recording page', async ({ page }) => {
      await page.goto('/meals');
      await expect(page.getByRole('heading', { name: '食事記録' })).toBeVisible();
      await expect(page.getByLabel('食事内容')).toBeVisible();
      await expect(page.getByRole('button', { name: '記録する' })).toBeVisible();
    });

    test.skip('should record new meal with calories', async ({ page }) => {
      await page.goto('/meals');

      // Select meal type
      await page.getByLabel('食事タイプ').selectOption('breakfast');

      // Fill in the content
      await page.getByLabel('食事内容').fill('卵かけご飯と味噌汁');

      // Fill in calories
      await page.getByLabel('カロリー').fill('450');

      // Submit the form
      await page.getByRole('button', { name: '記録する' }).click();

      // Should show success or update list
      await expect(page.getByText('卵かけご飯')).toBeVisible();
    });

    test.skip('should record meal without calories', async ({ page }) => {
      await page.goto('/meals');

      await page.getByLabel('食事タイプ').selectOption('lunch');
      await page.getByLabel('食事内容').fill('サラダ');

      await page.getByRole('button', { name: '記録する' }).click();

      await expect(page.getByText('サラダ')).toBeVisible();
    });

    test.skip('should display meal type labels in Japanese', async ({ page }) => {
      await page.goto('/meals');

      // Meal type dropdown should have Japanese labels
      await expect(page.getByRole('option', { name: '朝食' })).toBeVisible();
      await expect(page.getByRole('option', { name: '昼食' })).toBeVisible();
      await expect(page.getByRole('option', { name: '夕食' })).toBeVisible();
      await expect(page.getByRole('option', { name: '間食' })).toBeVisible();
    });

    test.skip('should display calorie summary', async ({ page }) => {
      await page.goto('/meals');

      // Calorie summary section should be visible
      await expect(page.getByText('今日のカロリー')).toBeVisible();
    });

    test.skip('should display meal history list', async ({ page }) => {
      await page.goto('/meals');

      await expect(page.getByRole('list')).toBeVisible();
    });

    test.skip('should validate content is not empty', async ({ page }) => {
      await page.goto('/meals');

      await page.getByLabel('食事タイプ').selectOption('breakfast');
      // Leave content empty
      await page.getByRole('button', { name: '記録する' }).click();

      await expect(page.getByText('食事内容を入力')).toBeVisible();
    });

    test.skip('should allow editing meal record', async ({ page }) => {
      await page.goto('/meals');

      await page.getByRole('button', { name: '編集' }).first().click();

      await expect(page.getByRole('dialog')).toBeVisible();
    });

    test.skip('should allow deleting meal record', async ({ page }) => {
      await page.goto('/meals');

      const initialItems = await page.getByRole('listitem').count();

      await page.getByRole('button', { name: '削除' }).first().click();
      await page.getByRole('button', { name: '確認' }).click();

      const finalItems = await page.getByRole('listitem').count();
      expect(finalItems).toBe(initialItems - 1);
    });

    test.skip('should filter meals by type', async ({ page }) => {
      await page.goto('/meals');

      // Select filter
      await page.getByLabel('フィルター').selectOption('breakfast');

      // Should only show breakfast meals
      const meals = await page.getByRole('listitem').all();
      for (const meal of meals) {
        await expect(meal.getByText('朝食')).toBeVisible();
      }
    });
  });
});
