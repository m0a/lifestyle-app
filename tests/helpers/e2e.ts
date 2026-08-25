/**
 * E2E Test Helpers for Playwright
 *
 * Authentication here is passkey-only, so there is no password to type and no
 * shared seeded account to log into. Instead each test installs a CDP virtual
 * authenticator into its own browser context and signs up a fresh account:
 * credentials live inside that authenticator, so they cannot be shared between
 * contexts anyway. A side effect is that tests no longer contend over one
 * account's data.
 *
 * Requires Chromium (WebAuthn.* CDP domain); the CI project is chromium-only.
 */

import type { Page } from '@playwright/test';

// CI runners share two cores between wrangler, the preview server and two
// browser workers, so the ceremony has far less headroom than locally.
const SIGNUP_TIMEOUT_MS = process.env['CI'] ? 30000 : 15000;

/**
 * Install a virtual authenticator so navigator.credentials resolves without any
 * OS/biometric prompt.
 *
 * hasResidentKey + isUserVerified are what make discoverable credentials work,
 * which is what lets the app log in without any identifier being typed.
 */
export async function addVirtualAuthenticator(page: Page): Promise<void> {
  const client = await page.context().newCDPSession(page);
  await client.send('WebAuthn.enable');
  await client.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
}

/**
 * Sign up a fresh passkey account and land authenticated on the home page.
 *
 * Named for the role it plays in tests (get me a logged-in page); the account is
 * created rather than reused, for the reasons in the module comment.
 */
export async function loginAsTestUser(
  page: Page,
  displayName = 'E2Eテストユーザー'
): Promise<void> {
  await addVirtualAuthenticator(page);

  await page.goto('/register');
  await page.waitForLoadState('networkidle');

  await page.getByLabel('表示名').fill(displayName);

  await signUpAndWait(page);
  await page.waitForLoadState('networkidle');
}

/**
 * Click 「パスキーで登録」 and wait for the app to land on the home page.
 *
 * On failure this reports what the page actually says rather than just
 * "waitForURL timed out": the signup surfaces WebAuthn errors as inline text,
 * and losing that message makes a CI-only failure impossible to diagnose.
 */
export async function signUpAndWait(page: Page, timeout = SIGNUP_TIMEOUT_MS): Promise<void> {
  try {
    await Promise.all([
      page.waitForURL('/', { timeout }),
      page.getByRole('button', { name: /パスキーで登録/ }).click(),
    ]);
  } catch (error) {
    const messages = await page
      .locator('p.text-red-500, div.bg-red-50, div.bg-amber-50')
      .allTextContents()
      .catch(() => [] as string[]);
    const shown = messages.map((m) => m.trim()).filter(Boolean);
    throw new Error(
      `パスキー登録が完了しませんでした (url=${page.url()}): ` +
        (shown.length ? shown.join(' / ') : '画面にエラー表示なし') +
        `\n原因: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Kept as a no-op so existing specs read unchanged: with passkey signup there is
 * no account to provision ahead of time — loginAsTestUser creates one.
 */
export async function ensureTestUserExists(): Promise<void> {
  // intentionally empty
}
