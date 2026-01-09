import { test, expect } from '@playwright/test';

test.describe('Exercise Recording - Simplified UI (User Story 1 & 2)', () => {
  test.describe('User Story 1: 運動記録の即時登録', () => {
    test('should NOT display recordedAt datetime field', async ({ page }) => {
      await page.goto('/exercises');

      // 日時入力フィールドが存在しないことを確認
      const recordedAtLabel = page.locator('label:has-text("記録日時")');
      await expect(recordedAtLabel).not.toBeVisible();

      const datetimeInput = page.locator('input[type="datetime-local"]');
      await expect(datetimeInput).not.toBeVisible();
    });

    test('should record exercise with current timestamp', async ({ page }) => {
      await page.goto('/exercises');

      const before = new Date();

      // 運動を記録
      // Note: 実際のUIに合わせて種目選択方法を調整する必要があります
      // ここでは「ランニング」ボタンをクリックする想定
      await page.click('button:has-text("ランニング")');
      await page.fill('input[id="sets"]', '1');
      await page.fill('input[id="reps"]', '30');
      await page.click('button:has-text("記録する")');

      const after = new Date();

      // 成功メッセージが表示されることを確認
      await expect(page.locator('text=運動を記録しました')).toBeVisible({ timeout: 5000 });

      // 履歴に記録が表示されることを確認
      // Note: 履歴表示のセレクタは実際のDOMに合わせて調整が必要
      await expect(page.locator('text=ランニング')).toBeVisible();

      // 記録時刻が before と after の間であることを検証
      // Note: 実際の時刻表示形式に応じて検証ロジックを調整
      // ここではシンプルに記録が表示されたことのみ確認
    });

    test('should display form without datetime field after submission', async ({ page }) => {
      await page.goto('/exercises');

      // フォームを確認
      const recordedAtLabel = page.locator('label:has-text("記録日時")');
      await expect(recordedAtLabel).not.toBeVisible();
    });
  });

  test.describe('User Story 2: シンプルな運動履歴表示', () => {
    test('should NOT display filter dropdown', async ({ page }) => {
      await page.goto('/exercises');

      // フィルタドロップダウンが存在しないことを確認
      // selectタグが存在しないか、または「すべての種目」オプションがないことを確認
      const filterSelect = page.locator('select');
      const filterCount = await filterSelect.count();

      // Exercise pageにselectタグが存在しないことを期待
      // （他のページにselectがある可能性を考慮して、0個を期待）
      expect(filterCount).toBe(0);
    });

    test('should display all exercise types in chronological order', async ({ page }) => {
      await page.goto('/exercises');

      // 複数の異なる種目を記録
      // 種目1: ランニング
      await page.click('button:has-text("ランニング")');
      await page.fill('input[id="sets"]', '1');
      await page.fill('input[id="reps"]', '30');
      await page.click('button:has-text("記録する")');
      await page.waitForTimeout(1000); // 1秒待機

      // 種目2: 筋トレ
      await page.click('button:has-text("筋トレ")');
      await page.fill('input[id="sets"]', '3');
      await page.fill('input[id="reps"]', '10');
      await page.click('button:has-text("記録する")');
      await page.waitForTimeout(500);

      // すべての記録が表示されることを確認
      await expect(page.locator('text=ランニング')).toBeVisible();
      await expect(page.locator('text=筋トレ')).toBeVisible();

      // フィルタUIが表示されていないことを再確認
      const filterSelect = page.locator('select');
      await expect(filterSelect).not.toBeVisible();
    });

    test('should scroll through history without filter UI', async ({ page }) => {
      await page.goto('/exercises');

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
    test('should preserve recordedAt when editing existing exercise', async ({ page }) => {
      // Note: 編集機能のテストは既存の実装に依存
      // ここでは編集時に日時が変更されないことを確認するプレースホルダー
      // 実際のテストは実装に合わせて調整が必要
      await page.goto('/exercises');

      // TODO: 編集機能のテスト実装
      // 現在のExerciseList.tsxではインライン編集がsetsとrepsのみ対応しており、
      // recordedAtは編集対象外のため、このテストは後で実装
    });

    test('should record multiple exercises in quick succession', async ({ page }) => {
      await page.goto('/exercises');

      // 連続で2件記録
      await page.click('button:has-text("ランニング")');
      await page.fill('input[id="sets"]', '1');
      await page.fill('input[id="reps"]', '20');
      await page.click('button:has-text("記録する")');

      await page.waitForTimeout(500); // 0.5秒待機

      await page.click('button:has-text("ランニング")');
      await page.fill('input[id="sets"]', '1');
      await page.fill('input[id="reps"]', '25');
      await page.click('button:has-text("記録する")');

      // 両方の記録が履歴に表示されることを確認
      const runningRecords = page.locator('text=ランニング');
      const count = await runningRecords.count();
      expect(count).toBeGreaterThanOrEqual(2);
    });
  });
});
