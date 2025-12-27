import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login and register links when not authenticated', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'ログイン' })).toBeVisible();
    await expect(page.getByRole('link', { name: '登録' })).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    await page.getByRole('link', { name: 'ログイン' }).click();
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible();
  });

  test('should navigate to register page', async ({ page }) => {
    await page.getByRole('link', { name: '登録' }).click();
    await expect(page).toHaveURL('/register');
    await expect(page.getByRole('heading', { name: 'アカウント登録' })).toBeVisible();
  });

  test('should show validation errors on login with empty fields', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'ログイン' }).click();
    // Form validation should prevent submission
    await expect(page).toHaveURL('/login');
  });

  test('should show validation errors on register with invalid email', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('メールアドレス').fill('invalid-email');
    await page.getByLabel('パスワード').fill('password123');
    await page.getByRole('button', { name: '登録する' }).click();
    await expect(page.getByText('有効なメールアドレス')).toBeVisible();
  });

  test('should show validation errors on register with short password', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('メールアドレス').fill('test@example.com');
    await page.getByLabel('パスワード').fill('short');
    await page.getByRole('button', { name: '登録する' }).click();
    await expect(page.getByText('8文字以上')).toBeVisible();
  });

  test('should have link to register from login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('link', { name: '登録する' })).toBeVisible();
  });

  test('should have link to login from register page', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('link', { name: 'ログイン' })).toBeVisible();
  });

  test('should redirect to login when accessing protected route', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
  });

  test('should redirect to login when accessing weight page without auth', async ({ page }) => {
    await page.goto('/weight');
    await expect(page).toHaveURL('/login');
  });
});
