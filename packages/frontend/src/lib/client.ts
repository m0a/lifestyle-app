import { hc } from 'hono/client';
import type { AppType } from '@lifestyle-app/backend';
import { generateRequestId } from './requestId';
import { setCurrentRequestId } from './errorLogger';
import { useAuthStore } from '../stores/authStore';

let isLoggingOut = false;

function handleUnauthorized(requestUrl: string) {
  const authPaths = ['/api/auth/login', '/api/auth/register', '/api/auth/me', '/api/auth/password-reset'];
  if (authPaths.some((path) => requestUrl.includes(path))) {
    return;
  }
  if (isLoggingOut) return;
  isLoggingOut = true;

  useAuthStore.getState().logout();
  window.location.href = '/login';
}

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

    // Create new Headers object to properly merge headers
    const headers = new Headers(init?.headers);
    headers.set('X-Request-ID', requestId);

    console.log('[RPC] Request:', input, init?.method || 'GET', 'RequestID:', requestId);
    try {
      const response = await fetch(input, {
        ...init,
        credentials: 'include',
        headers,
      });
      console.log('[RPC] Response:', response.status, response.statusText);
      if (response.status === 401) {
        handleUnauthorized(typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url);
      }
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
