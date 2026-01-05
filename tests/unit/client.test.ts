import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Hono RPC Client - Request ID Header Injection', () => {
  beforeEach(() => {
    // Mock crypto.randomUUID if not available in test environment
    if (!global.crypto || !global.crypto.randomUUID) {
      global.crypto = {
        ...global.crypto,
        randomUUID: () => '12345678-1234-4234-8234-123456789abc',
      } as Crypto;
    }
  });

  it('should inject X-Request-ID header in all requests', async () => {
    // This test will verify the client implementation
    // For now, we're just setting up the test structure

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    global.fetch = mockFetch;

    // Import client after mocking fetch
    const { client } = await import('../../packages/frontend/src/lib/client');

    // Make a request
    await client.api.weights.$get();

    // Verify X-Request-ID header was included
    expect(mockFetch).toHaveBeenCalled();
    const callArgs = mockFetch.mock.calls[0];
    const requestInit = callArgs[1] as RequestInit;

    expect(requestInit.headers).toBeDefined();
    const headers = requestInit.headers as Record<string, string>;
    expect(headers['X-Request-ID']).toBeDefined();
    expect(headers['X-Request-ID']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it('should include X-Request-ID in POST requests', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    global.fetch = mockFetch;

    const { client } = await import('../../packages/frontend/src/lib/client');

    // Make a POST request
    await client.api.weights.$post({
      json: { weight: 70, date: '2026-01-06' },
    });

    expect(mockFetch).toHaveBeenCalled();
    const callArgs = mockFetch.mock.calls[0];
    const requestInit = callArgs[1] as RequestInit;
    const headers = requestInit.headers as Record<string, string>;

    expect(headers['X-Request-ID']).toBeDefined();
  });

  it('should preserve existing headers when adding X-Request-ID', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    global.fetch = mockFetch;

    const { client } = await import('../../packages/frontend/src/lib/client');

    await client.api.weights.$get();

    const callArgs = mockFetch.mock.calls[0];
    const requestInit = callArgs[1] as RequestInit;
    const headers = requestInit.headers as Record<string, string>;

    // Should have both X-Request-ID and existing headers
    expect(headers['X-Request-ID']).toBeDefined();
    // Credentials should still be included
    expect(requestInit.credentials).toBe('include');
  });
});
