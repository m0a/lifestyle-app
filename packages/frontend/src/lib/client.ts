import { hc } from 'hono/client';
import type { AppType } from '@lifestyle-app/backend';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8787';

// Hono RPC client with full type safety
export const client = hc<AppType>(API_BASE_URL, {
  fetch: (input, init) =>
    fetch(input, {
      ...init,
      credentials: 'include',
    }),
});

// Type-safe API client
export const api = client.api;

// Re-export types for convenience
export type { AppType };
