import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../helpers/e2e';

// SessionListModal は useEffect + 自前の useState ページングから useInfiniteQuery
// に移した（react-hooks/set-state-in-effect）。クエリが解決してセッション行が出る
// ことと、閉じて開き直したキャッシュ経路でも出ることを押さえておく。
test.describe('Session Import Modal', () => {
  test('lists a recorded session and keeps listing it after reopening', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/exercises');
    await page.waitForLoadState('networkidle');

    // 取り込み元になるセッションを1件作る
    await expect(page.getByRole('heading', { name: '筋トレを記録' })).toBeVisible();
    await page.click('button:has-text("胸")');
    await page.click('button:has-text("ベンチプレス")');
    await page.locator('input[type="number"][placeholder="回"]').first().fill('10');
    await page.locator('input[type="number"][placeholder="kg"]').first().fill('60');
    await page.click('button:has-text("記録する")');
    await expect(page.getByText('運動を記録しました')).toBeVisible({ timeout: 5000 });

    const openButton = page.getByRole('button', { name: '過去のトレーニングから取り込む' });
    const heading = page.getByRole('heading', { name: '過去のトレーニングから取り込む' });

    await openButton.click();
    await expect(heading).toBeVisible();
    await expect(page.getByText('最近のワークアウト')).toBeVisible();
    await expect(page.getByText('ベンチプレス (1セット)')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('alert')).toHaveCount(0);

    await page.getByRole('button', { name: '閉じる' }).click();
    await expect(heading).toHaveCount(0);

    await openButton.click();
    await expect(page.getByText('ベンチプレス (1セット)')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
});
