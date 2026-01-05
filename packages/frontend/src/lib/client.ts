import { hc } from 'hono/client';
import type { AppType } from '@lifestyle-app/backend';
import { generateRequestId } from './requestId';
import { setCurrentRequestId } from './errorLogger';

// In production (empty VITE_API_URL), use same origin
// In development, use localhost:8787
function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl === '' || envUrl === undefined) {
    // Production: same origin
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return 'http://localhost:8787';
  }
  return envUrl;
}

const API_BASE_URL = getApiBaseUrl();

// Hono RPC client with full type safety
export const client = hc<AppType>(API_BASE_URL, {
  fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
    // Generate unique Request ID for this request
    const requestId = generateRequestId();

    // Store requestId for error correlation
    setCurrentRequestId(requestId);

    console.log('[RPC] Request:', input, init?.method || 'GET', 'RequestID:', requestId);
    try {
      const response = await fetch(input, {
        ...init,
        credentials: 'include',
        headers: {
          ...init?.headers,
          'X-Request-ID': requestId,
        },
      });
      console.log('[RPC] Response:', response.status, response.statusText);
      return response;
    } catch (error) {
      console.error('[RPC] Fetch error:', error);
      throw error;
    } finally {
      // Clear requestId after request completes
      setCurrentRequestId(undefined);
    }
  },
});

// Type-safe API client
export const api = client.api;

// Re-export types for convenience
export type { AppType };
