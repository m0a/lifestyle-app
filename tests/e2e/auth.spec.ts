/**
 * Passkey-only authentication E2E.
 *
 * Covers the ceremonies that have no unit/integration equivalent: they need a
 * real authenticator, which the CDP virtual authenticator provides.
 */

import { test, expect } from '@playwright/test';
import { addVirtualAuthenticator, signUpAndWait } from '../helpers/e2e';

test.describe('Authentication (passkey only)', () => {
  test('shows login and register links when not authenticated', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('navigation').getByRole('link', { name: 'ログイン' })).toBeVisible();
    await expect(page.getByRole('navigation').getByRole('link', { name: '登録' })).toBeVisible();
  });

  test('login page offers a passkey button and asks for no credentials', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible();
    await expect(page.getByRole('button', { name: /パスキーでログイン/ })).toBeVisible();
    // The whole point of the change: nothing to type.
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
    await expect(page.locator('input[type="email"]')).toHaveCount(0);
  });

  test('signup requires a display name', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: /パスキーで登録/ })).toBeDisabled();

    await page.getByLabel('表示名').fill('  ');
    await expect(page.getByRole('button', { name: /パスキーで登録/ })).toBeDisabled();

    await page.getByLabel('表示名').fill('テスト太郎');
    await expect(page.getByRole('button', { name: /パスキーで登録/ })).toBeEnabled();
  });

  test('signs up with a passkey, then logs back in without typing anything', async ({ page }) => {
    await addVirtualAuthenticator(page);

    // --- sign up ---
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    await page.getByLabel('表示名').fill('パスキー太郎');
    await signUpAndWait(page);

    const me = await page.evaluate(() => fetch('/api/auth/me').then((r) => r.json()));
    expect(me.user?.displayName).toBe('パスキー太郎');
    const userId = me.user?.id;

    // --- log out ---
    await page.evaluate(() => fetch('/api/auth/logout', { method: 'POST' }));
    const status = await page.evaluate(() => fetch('/api/auth/me').then((r) => r.status));
    expect(status).toBe(401);

    // --- log back in: no identifier is supplied, the credential is discoverable ---
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await Promise.all([
      page.waitForURL('/', { timeout: 15000 }),
      page.getByRole('button', { name: /パスキーでログイン/ }).click(),
    ]);

    const me2 = await page.evaluate(() => fetch('/api/auth/me').then((r) => r.json()));
    expect(me2.user?.id).toBe(userId);
  });

  test('refuses to delete the only passkey', async ({ page }) => {
    await addVirtualAuthenticator(page);

    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    await page.getByLabel('表示名').fill('唯一のパスキー');
    await signUpAndWait(page);

    const list = await page.evaluate(() =>
      fetch('/api/auth/webauthn/credentials').then((r) => r.json())
    );
    expect(list.credentials).toHaveLength(1);

    // Server-side guard: deleting the last credential would lock the account out.
    const result = await page.evaluate(async (credentialId: string) => {
      const res = await fetch(`/api/auth/webauthn/credentials/${credentialId}`, {
        method: 'DELETE',
      });
      return { status: res.status, body: await res.json() };
    }, list.credentials[0].credentialId);

    expect(result.status).toBe(400);
    expect(result.body.code).toBe('LAST_CREDENTIAL');
  });
});
