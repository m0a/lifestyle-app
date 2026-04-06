import { hc } from 'hono/client';
import type { AppType } from '@lifestyle-app/backend';
import { generateRequestId } from './requestId';
import { setCurrentRequestId } from './errorLogger';
import { useAuthStore } from '../stores/authStore';

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

// Paths that should not trigger auto-logout on 401
const AUTH_PATHS = ['/api/auth/login', '/api/auth/register', '/api/auth/me'];

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

      // Auto-logout on 401 (session expired)
      if (response.status === 401) {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
        const isAuthPath = AUTH_PATHS.some(path => url.includes(path));
        if (!isAuthPath && useAuthStore.getState().isAuthenticated) {
          useAuthStore.getState().logout();
          window.location.href = '/login';
        }
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
