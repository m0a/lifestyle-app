import { hc } from 'hono/client';
import type { AppType } from '@lifestyle-app/backend';

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
    console.log('[RPC] Request:', input, init?.method || 'GET');
    try {
      const response = await fetch(input, {
        ...init,
        credentials: 'include',
      });
      console.log('[RPC] Response:', response.status, response.statusText);
      return response;
    } catch (error) {
      console.error('[RPC] Fetch error:', error);
      throw error;
    }
  },
});

// Type-safe API client
export const api = client.api;

// Re-export types for convenience
export type { AppType };
