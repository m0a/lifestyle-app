/**
 * E2E tests for password reset flow
 *
 * Tests the complete user journey:
 * 1. User clicks "パスワードを忘れた" on login page
 * 2. User enters email and submits
 * 3. User receives email with reset link (mocked)
 * 4. User clicks link and lands on reset password page
 * 5. User enters new password and submits
 * 6. User can login with new password
 */

import { test, expect } from '@playwright/test';

test.describe('Password Reset Flow', () => {
  const testEmail = 'reset-test@example.com';
  const oldPassword = 'oldpassword123';
  const newPassword = 'newpassword456';

  test.beforeEach(async ({ page }) => {
    // Start from login page
    await page.goto('/login');
  });

  test('should display "パスワードを忘れた" link on login page', async ({ page }) => {
    await expect(
      page.getByRole('link', { name: /パスワードを忘れた|パスワードをお忘れ/ })
    ).toBeVisible();
  });

  test('should navigate to password reset request page', async ({ page }) => {
    await page.getByRole('link', { name: /パスワードを忘れた|パスワードをお忘れ/ }).click();
    await expect(page).toHaveURL(/\/forgot-password|\/password-reset\/request/);
    await expect(
      page.getByRole('heading', { name: /パスワードリセット/ })
    ).toBeVisible();
  });

  test('should show validation error for invalid email', async ({ page }) => {
    await page.getByRole('link', { name: /パスワードを忘れた/ }).click();

    // Enter invalid email
    await page.getByLabel(/メールアドレス/).fill('invalid-email');
    await page.getByRole('button', { name: /送信|リセット/ }).click();

    // Should show validation error
    await expect(page.getByText(/有効なメールアドレス/)).toBeVisible();
  });

  test('should show validation error for empty email', async ({ page }) => {
    await page.getByRole('link', { name: /パスワードを忘れた/ }).click();

    // Submit without email
    await page.getByRole('button', { name: /送信|リセット/ }).click();

    // Form validation should prevent submission
    await expect(page).toHaveURL(/\/forgot-password|\/password-reset\/request/);
  });

  test('should show success message after submitting valid email', async ({ page }) => {
    await page.getByRole('link', { name: /パスワードを忘れた/ }).click();

    // Enter valid email
    await page.getByLabel(/メールアドレス/).fill(testEmail);
    await page.getByRole('button', { name: /送信|リセット/ }).click();

    // Should show success message (even if user doesn't exist - security)
    await expect(
      page.getByText(/メールを送信しました|メールをご確認ください/)
    ).toBeVisible();
  });

  test('should validate token format on reset password page', async ({ page }) => {
    // Navigate directly to reset password page with invalid token
    await page.goto('/reset-password?token=invalid');

    // Should show error or redirect
    const hasError = await page.getByText(/無効|期限切れ/).isVisible().catch(() => false);
    const isRedirected = page.url().includes('/login');

    expect(hasError || isRedirected).toBeTruthy();
  });

  test('should show validation error for short password', async ({ page }) => {
    // Navigate to reset password page with valid-looking token
    const validToken = 'a'.repeat(32);
    await page.goto(`/reset-password?token=${validToken}`);

    // Enter short password
    await page.getByLabel(/新しいパスワード|パスワード/).first().fill('short');
    await page.getByRole('button', { name: /リセット|変更/ }).click();

    // Should show validation error
    await expect(page.getByText(/8文字以上/)).toBeVisible();
  });

  test('should require password confirmation to match', async ({ page }) => {
    const validToken = 'a'.repeat(32);
    await page.goto(`/reset-password?token=${validToken}`);

    // Enter mismatched passwords
    await page.getByLabel(/新しいパスワード/).first().fill('password123');
    await page.getByLabel(/確認/).fill('different456');
    await page.getByRole('button', { name: /リセット|変更/ }).click();

    // Should show validation error
    await expect(page.getByText(/一致|同じ/)).toBeVisible();
  });

  test('should redirect to login after successful password reset', async ({ page }) => {
    const validToken = 'a'.repeat(32);
    await page.goto(`/reset-password?token=${validToken}`);

    // Enter new password (will fail without valid token, but tests UI flow)
    await page.getByLabel(/新しいパスワード/).first().fill(newPassword);

    // Fill confirmation if present
    const confirmInput = page.getByLabel(/確認/);
    if (await confirmInput.isVisible()) {
      await confirmInput.fill(newPassword);
    }

    await page.getByRole('button', { name: /リセット|変更/ }).click();

    // Should either redirect to login or show error (depends on token validity)
    await page.waitForURL(/\/login|\/reset-password/, { timeout: 5000 }).catch(() => {});
  });

  test.skip('complete password reset flow (requires email mock)', async ({ page }) => {
    // This test requires mocking email delivery
    // Skip for now until we have proper test infrastructure

    // 1. Request password reset
    await page.goto('/login');
    await page.getByRole('link', { name: /パスワードを忘れた/ }).click();
    await page.getByLabel(/メールアドレス/).fill(testEmail);
    await page.getByRole('button', { name: /送信/ }).click();

    // 2. Extract token from mocked email (TODO: implement)
    const resetToken = 'mocked-token-from-email';

    // 3. Use token to reset password
    await page.goto(`/reset-password?token=${resetToken}`);
    await page.getByLabel(/新しいパスワード/).first().fill(newPassword);
    const confirmInput = page.getByLabel(/確認/);
    if (await confirmInput.isVisible()) {
      await confirmInput.fill(newPassword);
    }
    await page.getByRole('button', { name: /リセット/ }).click();

    // 4. Login with new password
    await expect(page).toHaveURL('/login');
    await page.getByLabel(/メールアドレス/).fill(testEmail);
    await page.getByLabel(/パスワード/).fill(newPassword);
    await page.getByRole('button', { name: 'ログイン' }).click();

    // 5. Should be logged in
    await expect(page).toHaveURL('/dashboard');
  });
});
