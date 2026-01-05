import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { unstable_dev } from 'wrangler';
import type { UnstableDevWorker } from 'wrangler';

describe('Request ID Propagation (Frontend → Backend)', () => {
  let worker: UnstableDevWorker;

  beforeAll(async () => {
    // Start Cloudflare Workers dev server for backend
    worker = await unstable_dev('packages/backend/src/index.ts', {
      experimental: { disableExperimentalWarning: true },
    });
  }, 30000);

  afterAll(async () => {
    await worker.stop();
  });

  it('should propagate Request ID from frontend to backend', async () => {
    const testRequestId = crypto.randomUUID();

    // Simulate frontend request with X-Request-ID header
    const response = await worker.fetch('http://localhost/api/weights', {
      method: 'GET',
      headers: {
        'X-Request-ID': testRequestId,
        Cookie: 'session=test-session', // Mock session for auth
      },
    });

    // Backend should echo Request ID in response header
    const responseRequestId = response.headers.get('X-Request-ID');
    expect(responseRequestId).toBe(testRequestId);
  });

  it('should generate Request ID if not provided by client', async () => {
    // Request without X-Request-ID header
    const response = await worker.fetch('http://localhost/api/weights', {
      method: 'GET',
      headers: {
        Cookie: 'session=test-session',
      },
    });

    // Backend should generate and return a Request ID
    const responseRequestId = response.headers.get('X-Request-ID');
    expect(responseRequestId).toBeDefined();
    expect(responseRequestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it('should include Request ID in error responses', async () => {
    const testRequestId = crypto.randomUUID();

    // Trigger an error with invalid payload
    const response = await worker.fetch('http://localhost/api/weights', {
      method: 'POST',
      headers: {
        'X-Request-ID': testRequestId,
        'Content-Type': 'application/json',
        Cookie: 'session=test-session',
      },
      body: JSON.stringify({ invalid: 'data' }),
    });

    // Response should include requestId in JSON body
    const body = await response.json();
    expect(body).toHaveProperty('requestId');
    expect(body.requestId).toBe(testRequestId);
  });

  it('should maintain Request ID across multiple backend operations', async () => {
    const testRequestId = crypto.randomUUID();

    // Make a complex request that involves multiple backend operations
    const response = await worker.fetch('http://localhost/api/meals', {
      method: 'POST',
      headers: {
        'X-Request-ID': testRequestId,
        'Content-Type': 'application/json',
        Cookie: 'session=test-session',
      },
      body: JSON.stringify({
        mealType: 'breakfast',
        foods: [{ name: 'Toast', calories: 100 }],
        date: '2026-01-06T08:00:00Z',
      }),
    });

    // Verify Request ID is consistent throughout
    const responseRequestId = response.headers.get('X-Request-ID');
    expect(responseRequestId).toBe(testRequestId);
  });
});
