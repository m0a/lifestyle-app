/**
 * Request Context Middleware for Hono
 *
 * Provides request-scoped data including:
 * - Request ID: Unique identifier for end-to-end request tracing
 * - User ID: Extracted from authenticated session (set by auth middleware)
 *
 * @module requestContext
 */

import { createMiddleware } from 'hono/factory';
import type { Context } from 'hono';

/**
 * Request context variables available throughout the request lifecycle
 */
export interface RequestContext {
  requestId: string;
  userId?: string;
}

/**
 * Extend Hono's ContextVariableMap to include requestContext
 */
declare module 'hono' {
  interface ContextVariableMap {
    requestContext: RequestContext;
  }
}

/**
 * Request Context Middleware
 *
 * Extracts or generates Request ID from X-Request-ID header and stores it
 * in context for use by route handlers and error handlers.
 *
 * **Request ID Source Priority:**
 * 1. X-Request-ID header from client (if valid UUID v4)
 * 2. Auto-generate new UUID v4 if header missing or invalid
 *
 * **Usage:**
 * ```typescript
 * app.use('*', requestContext());
 *
 * app.get('/example', (c) => {
 *   const { requestId, userId } = c.get('requestContext');
 *   console.log(`[${requestId}] Processing request for user ${userId}`);
 * });
 * ```
 */
export const requestContext = () =>
  createMiddleware(async (c: Context, next) => {
    // Extract Request ID from header or generate new one
    const headerRequestId = c.req.header('X-Request-ID');
    const requestId = isValidUUID(headerRequestId) ? headerRequestId : crypto.randomUUID();

    // Initialize request context (userId will be set by auth middleware if authenticated)
    c.set('requestContext', {
      requestId,
      userId: undefined,
    });

    // Echo Request ID in response header for client-side correlation
    c.header('X-Request-ID', requestId);

    await next();
  });

/**
 * Validate UUID v4 format
 *
 * @param value - String to validate
 * @returns true if valid UUID v4, false otherwise
 */
function isValidUUID(value: string | undefined): value is string {
  if (!value) return false;

  const uuidV4Regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  return uuidV4Regex.test(value);
}
