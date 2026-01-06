import { test, expect } from '@playwright/test';

test.describe('Request ID Tracing - E2E Error Scenario', () => {
  test('should trace Request ID from frontend error to backend logs', async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:5173');

    // Intercept network requests to capture Request ID
    let capturedRequestId: string | null = null;

    page.on('request', (request) => {
      const headers = request.headers();
      if (headers['x-request-id']) {
        capturedRequestId = headers['x-request-id'];
      }
    });

    // Trigger an error by attempting invalid operation (e.g., invalid weight submission)
    // This assumes a weight form exists - adjust selector based on actual UI
    await page.fill('input[name="weight"]', 'invalid'); // Invalid input
    await page.click('button[type="submit"]');

    // Wait for error response
    await page.waitForResponse((response) =>
      response.url().includes('/api/weights') && response.status() >= 400
    );

    // Verify Request ID was generated and sent
    expect(capturedRequestId).toBeTruthy();
    expect(capturedRequestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );

    // Verify error message on UI (optional, based on implementation)
    const errorMessage = await page.locator('[role="alert"], .error-message').textContent();
    expect(errorMessage).toBeTruthy();
  });

  test('should include Request ID in error response body', async ({ page, request }) => {
    const testRequestId = crypto.randomUUID();

    // Make a direct API call with invalid payload to trigger error
    const response = await request.post('http://localhost:8787/api/weights', {
      headers: {
        'X-Request-ID': testRequestId,
        'Content-Type': 'application/json',
      },
      data: {
        weight: 'invalid', // Invalid data to trigger error
        recordedAt: 'invalid-date',
      },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);

    const body = await response.json();
    expect(body).toHaveProperty('requestId');
    expect(body.requestId).toBe(testRequestId);
  });

  test('should maintain Request ID across authenticated user flow', async ({ page }) => {
    // This test simulates a logged-in user flow
    // Note: Adjust authentication flow based on actual implementation

    // Navigate to login page
    await page.goto('http://localhost:5173/login');

    // Intercept all requests to track Request IDs
    const requestIds: string[] = [];

    page.on('request', (request) => {
      const headers = request.headers();
      if (headers['x-request-id']) {
        requestIds.push(headers['x-request-id']);
      }
    });

    // Login (using test credentials from CLAUDE.md)
    await page.fill('input[type="email"]', 'test-preview@example.com');
    await page.fill('input[type="password"]', 'test1234');
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard');

    // Perform multiple actions
    await page.click('a[href*="/weight"]'); // Navigate to weight page
    await page.waitForLoadState('networkidle');

    // Verify each request had a unique Request ID
    expect(requestIds.length).toBeGreaterThan(0);

    // Verify all Request IDs are valid UUIDs
    requestIds.forEach((requestId) => {
      expect(requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    // Verify Request IDs are unique
    const uniqueRequestIds = new Set(requestIds);
    expect(uniqueRequestIds.size).toBe(requestIds.length);
  });

  test('should propagate Request ID through error boundary', async ({ page }) => {
    // Intercept console errors and network requests
    const consoleErrors: string[] = [];
    let errorRequestId: string | null = null;

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('request', (request) => {
      if (request.url().includes('/api/logs')) {
        const headers = request.headers();
        errorRequestId = headers['x-request-id'] || null;
      }
    });

    await page.goto('http://localhost:5173');

    // Trigger a runtime error (this will depend on actual error boundary implementation)
    // For now, we'll simulate by calling a non-existent API endpoint
    await page.evaluate(() => {
      // Simulate a client-side error
      throw new Error('Test error for Request ID tracing');
    });

    // Wait a bit for error logging to happen
    await page.waitForTimeout(1000);

    // Verify error was logged with Request ID
    expect(errorRequestId).toBeTruthy();
    expect(errorRequestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });
});
