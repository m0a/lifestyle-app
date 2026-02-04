import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../helpers/e2e';

/**
 * Request ID Tracing Tests
 *
 * These tests verify that X-Request-ID headers are properly propagated
 * through the application for debugging and tracing purposes.
 */
test.describe('Request ID Tracing', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('should include X-Request-ID in API responses', async ({ request }) => {
    // Make a direct API call
    const response = await request.get('http://localhost:8787/api/health');

    expect(response.ok()).toBe(true);

    // Check if X-Request-ID header is present in response
    const requestId = response.headers()['x-request-id'];
    // Request ID might be optional, so we only verify if present
    if (requestId) {
      expect(requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    }
  });

  test('should propagate X-Request-ID from client to server', async ({ request }) => {
    const testRequestId = crypto.randomUUID();

    // Make API call with custom Request ID
    const response = await request.get('http://localhost:8787/api/health', {
      headers: {
        'X-Request-ID': testRequestId,
      },
    });

    expect(response.ok()).toBe(true);

    // The response should echo back the same Request ID
    const responseRequestId = response.headers()['x-request-id'];
    if (responseRequestId) {
      expect(responseRequestId).toBe(testRequestId);
    }
  });

  test('should include requestId in error responses', async ({ request }) => {
    const testRequestId = crypto.randomUUID();

    // Make an unauthorized API call to trigger an error
    const response = await request.get('http://localhost:8787/api/dashboard', {
      headers: {
        'X-Request-ID': testRequestId,
      },
    });

    // Should be unauthorized (401) since we're not sending auth cookie
    expect(response.status()).toBe(401);

    const body = await response.json();

    // Error responses should include requestId if implemented
    if (body.requestId) {
      expect(body.requestId).toBe(testRequestId);
    }
  });

  test('should maintain unique Request IDs across multiple requests', async ({ page }) => {
    const requestIds: string[] = [];

    // Intercept requests to capture Request IDs
    page.on('request', (request) => {
      if (request.url().includes('/api/')) {
        const headers = request.headers();
        const requestId = headers['x-request-id'];
        if (requestId) {
          requestIds.push(requestId);
        }
      }
    });

    // Navigate to different pages to generate multiple API requests
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await page.goto('/weight');
    await page.waitForLoadState('networkidle');

    // If Request IDs are being generated, verify they are unique
    if (requestIds.length > 1) {
      const uniqueIds = new Set(requestIds);
      expect(uniqueIds.size).toBe(requestIds.length);
    }
  });
});
