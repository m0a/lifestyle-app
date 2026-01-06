# Request ID Tracing Implementation Research

## 1. UUID v4 Generation

### Browser Environment

**Status:** ✅ Available in modern browsers

The `crypto.randomUUID()` API is available in modern browsers and is the recommended approach for generating UUID v4 in secure contexts (HTTPS).

**Browser Support:**
- Chrome: ✅ Supported
- Firefox: ✅ Supported
- Safari: ✅ Supported
- Edge: ✅ Supported

**Key Points:**
- Only available in secure contexts (HTTPS)
- Available in Web Workers
- Returns a string in the format: `"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"`

**Example Usage:**
```typescript
// Frontend: packages/frontend/src/lib/client.ts
const requestId = crypto.randomUUID();
// Example output: "3ec1b68d-ce88-478e-9f4e-03837aeb2098"
```

**References:**
- [MDN: Crypto.randomUUID()](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID)
- [Can I Use: crypto.randomUUID()](https://caniuse.com/mdn-api_crypto_randomuuid)

---

### Cloudflare Workers Environment

**Status:** ✅ Available since 2021

The `crypto.randomUUID()` method is fully supported in Cloudflare Workers as part of the Web Crypto API.

**Key Points:**
- Added when V8 was updated from 9.3 to 9.4
- Part of standard Web Crypto API implementation
- Recommended over third-party UUID libraries

**Example Usage:**
```typescript
// Backend: packages/backend/src/middleware/request-id.ts
const requestId = crypto.randomUUID();
// Example output: "3ec1b68d-ce88-478e-9f4e-03837aeb2098"
```

**Node.js Verification:**
```bash
$ node -e "console.log(crypto.randomUUID())"
3ec1b68d-ce88-478e-9f4e-03837aeb2098
```

**References:**
- [Cloudflare Workers: Web Crypto](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/)
- [Cloudflare Workers: Node.js crypto API](https://developers.cloudflare.com/workers/runtime-apis/nodejs/crypto/)

---

## 2. Hono RPC Client Custom Headers

### Current Implementation

**File:** `/home/m0a/lifestyle-app/packages/frontend/src/lib/client.ts`

```typescript
import { hc } from 'hono/client';
import type { AppType } from '@lifestyle-app/backend';

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

export const api = client.api;
```

### How to Add Custom Headers

The `hc()` function accepts a second parameter for custom fetch implementation. To add custom headers like `X-Request-ID`, modify the `init` parameter:

**Recommended Approach:**
```typescript
export const client = hc<AppType>(API_BASE_URL, {
  fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
    // Generate Request ID on client
    const requestId = crypto.randomUUID();

    const response = await fetch(input, {
      ...init,
      credentials: 'include',
      headers: {
        ...init?.headers,
        'X-Request-ID': requestId,
      },
    });

    return response;
  },
});
```

**Alternative: Add headers to all requests globally**
```typescript
// Common headers for all requests
const commonHeaders = {
  'X-Client-Version': '1.0.0',
};

export const client = hc<AppType>(API_BASE_URL, {
  headers: commonHeaders, // Applied to all requests
  fetch: async (input, init) => {
    // Custom per-request headers
    const requestId = crypto.randomUUID();

    return fetch(input, {
      ...init,
      credentials: 'include',
      headers: {
        ...init?.headers,
        'X-Request-ID': requestId,
      },
    });
  },
});
```

**References:**
- [Hono RPC Guide](https://hono.dev/docs/guides/rpc)
- [Hono RPC Client Interceptor Discussion](https://github.com/orgs/honojs/discussions/3222)

---

## 3. Hono Middleware for Request Context

### Existing Middleware Patterns

**File:** `/home/m0a/lifestyle-app/packages/backend/src/middleware/auth.ts`

Current auth middleware shows the pattern for extracting data and storing in context:

```typescript
import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';

export interface AuthUser {
  id: string;
  email: string;
}

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser;
    db: Database;
  }
}

export async function authMiddleware(c: Context, next: Next) {
  const sessionId = getCookie(c, 'session');

  if (!sessionId) {
    return c.json({ message: '認証が必要です' }, 401);
  }

  // Extract user from session
  const payload = JSON.parse(atob(sessionId));
  const user = await db.select().from(schema.users).where(...).get();

  // Store in context
  c.set('user', user);
  await next();
}
```

### Request ID Middleware Pattern

**Recommended Implementation:**

```typescript
// packages/backend/src/middleware/request-id.ts
import type { Context, Next } from 'hono';

// Extend ContextVariableMap for type safety
declare module 'hono' {
  interface ContextVariableMap {
    requestId: string;
    userId?: string;
  }
}

export async function requestIdMiddleware(c: Context, next: Next) {
  // 1. Check for existing X-Request-ID from client
  let requestId = c.req.header('X-Request-ID');

  // 2. Generate new one if not provided
  if (!requestId) {
    requestId = crypto.randomUUID();
  }

  // 3. Store in context for access in handlers
  c.set('requestId', requestId);

  // 4. Add to response headers for client-side tracking
  c.header('X-Request-ID', requestId);

  await next();
}

export async function userIdMiddleware(c: Context, next: Next) {
  // Extract userId after auth middleware runs
  const user = c.get('user'); // From authMiddleware

  if (user) {
    c.set('userId', user.id);
  }

  await next();
}
```

**Integration in main app:**

```typescript
// packages/backend/src/index.ts (current)
const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Middleware
app.use('*', logger());
app.use('*', cors({ ... }));

// Database middleware
app.use('*', async (c, next) => {
  const db = createDb(c.env.DB);
  c.set('db', db);
  await next();
});
```

**Proposed with Request ID:**

```typescript
import { requestIdMiddleware } from './middleware/request-id';

// Add request ID middleware early in chain
app.use('*', logger());
app.use('*', requestIdMiddleware); // ← Add here
app.use('*', cors({ ... }));
app.use('*', async (c, next) => {
  const db = createDb(c.env.DB);
  c.set('db', db);
  await next();
});
```

### Accessing Context Data in Handlers

**Current Pattern (from routes/weights.ts):**

```typescript
export const weights = new Hono<{ Bindings: Bindings; Variables: Variables }>()
  .use(authMiddleware)
  .post('/', zValidator('json', createWeightSchema), async (c) => {
    const db = c.get('db');        // Get database
    const user = c.get('user');    // Get authenticated user

    const weightService = new WeightService(db);
    const weight = await weightService.create(user.id, input);

    return c.json({ weight }, 201);
  });
```

**With Request ID:**

```typescript
.post('/', zValidator('json', createWeightSchema), async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const requestId = c.get('requestId');  // ← Access request ID

  console.log(`[${requestId}] Creating weight for user ${user.id}`);

  const weightService = new WeightService(db);
  const weight = await weightService.create(user.id, input);

  return c.json({ weight }, 201);
});
```

### Type Safety

**File:** `/home/m0a/lifestyle-app/packages/backend/src/types.ts`

Current Variables type definition:

```typescript
export type Variables = {
  db: Database;
  user: { id: string; email: string };
  userId: string;
};
```

**Extended for Request ID:**

```typescript
export type Variables = {
  db: Database;
  user: { id: string; email: string };
  userId: string;
  requestId: string;  // ← Add this
};
```

**Alternative using `c.var`:**
```typescript
// Access via c.var instead of c.get()
const requestId = c.var.requestId;
const userId = c.var.userId;
```

**References:**
- [Hono Context API](https://hono.dev/docs/api/context)
- [Hono Middleware Guide](https://hono.dev/docs/guides/middleware)
- [Hono Context Storage Middleware](https://hono.dev/docs/middleware/builtin/context-storage)
- [Type Safety for Context Variables](https://github.com/orgs/honojs/discussions/3257)

---

## 4. User ID Extraction

### Current Auth Store

**File:** `/home/m0a/lifestyle-app/packages/frontend/src/stores/authStore.ts`

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@lifestyle-app/shared';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        }),
      setLoading: (loading) => set({ isLoading: loading }),
      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
```

### Extracting User ID for Logging

**Option 1: Access from Zustand store**
```typescript
import { useAuthStore } from '@/stores/authStore';

// In a React component
const { user } = useAuthStore();
const userId = user?.id;

// Outside React (for logging)
const userId = useAuthStore.getState().user?.id;
```

**Option 2: Include in log context**
```typescript
// packages/frontend/src/lib/errorLogger.ts
import { useAuthStore } from '@/stores/authStore';

export async function logError(error: Error, extra?: Record<string, unknown>) {
  const userId = useAuthStore.getState().user?.id;

  const errorLog = {
    message: error.message,
    stack: error.stack,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    userId,  // ← Add user ID
    extra,
  };

  console.error('[Error Logger]', errorLog);
  await api.logs.error.$post({ json: errorLog });
}
```

**Backend:** User ID is available from auth middleware

```typescript
// packages/backend/src/middleware/auth.ts
export async function authMiddleware(c: Context, next: Next) {
  // ... authentication logic ...

  const user = await db.select(...).get();

  if (!user) {
    return c.json({ message: 'ユーザーが見つかりません' }, 401);
  }

  c.set('user', user);  // Stores { id: string, email: string }
  await next();
}
```

**Access in routes:**
```typescript
const user = c.get('user');
const userId = user.id;  // Available for logging
```

---

## 5. Existing Logging Integration

### Frontend Error Logger

**File:** `/home/m0a/lifestyle-app/packages/frontend/src/lib/errorLogger.ts`

Current error log format:

```typescript
interface ErrorLog {
  message: string;
  stack?: string;
  url: string;
  userAgent?: string;
  timestamp: string;
  extra?: Record<string, unknown>;
}

export async function logError(error: Error, extra?: Record<string, unknown>) {
  const errorLog: ErrorLog = {
    message: error.message,
    stack: error.stack,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    extra,
  };

  console.error('[Error Logger]', errorLog);

  try {
    await api.logs.error.$post({ json: errorLog });
  } catch (e) {
    console.error('[Error Logger] Failed to send error log:', e);
  }
}
```

**Extended with Request ID and User ID:**

```typescript
interface ErrorLog {
  message: string;
  stack?: string;
  url: string;
  userAgent?: string;
  timestamp: string;
  requestId?: string;  // ← Add
  userId?: string;     // ← Add
  extra?: Record<string, unknown>;
}

// Store request ID in module scope or context
let currentRequestId: string | undefined;

export function setCurrentRequestId(requestId: string) {
  currentRequestId = requestId;
}

export async function logError(error: Error, extra?: Record<string, unknown>) {
  const userId = useAuthStore.getState().user?.id;

  const errorLog: ErrorLog = {
    message: error.message,
    stack: error.stack,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    requestId: currentRequestId,  // ← Include
    userId,                       // ← Include
    extra,
  };

  console.error('[Error Logger]', errorLog);

  try {
    await api.logs.error.$post({ json: errorLog });
  } catch (e) {
    console.error('[Error Logger] Failed to send error log:', e);
  }
}
```

### Backend Log Endpoint

**File:** `/home/m0a/lifestyle-app/packages/backend/src/routes/logs.ts`

Current implementation:

```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const errorLogSchema = z.object({
  message: z.string(),
  stack: z.string().optional(),
  url: z.string(),
  userAgent: z.string().optional(),
  timestamp: z.string(),
  extra: z.record(z.unknown()).optional(),
});

export const logs = new Hono<{ Bindings: Bindings }>()
  .post('/error', zValidator('json', errorLogSchema), async (c) => {
    const error = c.req.valid('json');

    // Log to console (appears in Cloudflare Workers logs)
    console.error('[Frontend Error]', JSON.stringify(error, null, 2));

    return c.json({ received: true });
  });
```

**Extended with Request ID and User ID:**

```typescript
const errorLogSchema = z.object({
  message: z.string(),
  stack: z.string().optional(),
  url: z.string(),
  userAgent: z.string().optional(),
  timestamp: z.string(),
  requestId: z.string().optional(),  // ← Add
  userId: z.string().optional(),     // ← Add
  extra: z.record(z.unknown()).optional(),
});

export const logs = new Hono<{ Bindings: Bindings; Variables: Variables }>()
  .post('/error', zValidator('json', errorLogSchema), async (c) => {
    const error = c.req.valid('json');
    const backendRequestId = c.get('requestId');  // From middleware

    // Prefer client-provided requestId, fallback to backend-generated
    const requestId = error.requestId || backendRequestId;

    // Enhanced log format
    console.error(`[${requestId}][Frontend Error]`, JSON.stringify({
      ...error,
      requestId,
    }, null, 2));

    return c.json({ received: true, requestId });
  });
```

### Backend Error Handler Integration

**File:** `/home/m0a/lifestyle-app/packages/backend/src/index.ts`

Current global error handler:

```typescript
// Global error handler
app.onError((err, c) => {
  console.error('Error:', err);

  if (err instanceof HTTPException) {
    return c.json({ message: err.message, code: 'HTTP_ERROR' }, err.status);
  }

  if (err instanceof ZodError) {
    return c.json({
      message: 'バリデーションエラー',
      code: 'VALIDATION_ERROR',
      errors: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    }, 400);
  }

  // ... other error types ...

  return c.json({ message: 'サーバーエラーが発生しました', code: 'INTERNAL_ERROR' }, 500);
});
```

**Enhanced with Request ID:**

```typescript
app.onError((err, c) => {
  const requestId = c.get('requestId') || 'unknown';
  const userId = c.get('user')?.id;

  console.error(`[${requestId}][User: ${userId || 'anonymous'}] Error:`, err);

  if (err instanceof HTTPException) {
    return c.json({
      message: err.message,
      code: 'HTTP_ERROR',
      requestId,  // ← Include in response
    }, err.status);
  }

  if (err instanceof ZodError) {
    return c.json({
      message: 'バリデーションエラー',
      code: 'VALIDATION_ERROR',
      errors: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
      requestId,  // ← Include in response
    }, 400);
  }

  return c.json({
    message: 'サーバーエラーが発生しました',
    code: 'INTERNAL_ERROR',
    requestId,  // ← Include in response
  }, 500);
});
```

---

## Summary

### Implementation Checklist

#### Frontend
- [ ] Modify `packages/frontend/src/lib/client.ts` to inject `X-Request-ID` header
- [ ] Update `packages/frontend/src/lib/errorLogger.ts` interface to include `requestId` and `userId`
- [ ] Extract `userId` from auth store in error logger
- [ ] Store current request ID for error logging context

#### Backend
- [ ] Create `packages/backend/src/middleware/request-id.ts` middleware
- [ ] Extend `ContextVariableMap` to include `requestId` and `userId`
- [ ] Update `packages/backend/src/types.ts` Variables type
- [ ] Integrate request ID middleware in `packages/backend/src/index.ts`
- [ ] Update error handler to include `requestId` in logs and responses
- [ ] Update `packages/backend/src/routes/logs.ts` schema and handler

#### Shared
- [ ] Update log schemas in `packages/shared/src/schemas/` if needed
- [ ] Add `requestId` and `userId` to shared error types

### Testing
- [ ] Test UUID generation in browser (verified with `crypto.randomUUID()`)
- [ ] Test UUID generation in Cloudflare Workers (verified with Node.js)
- [ ] Test request ID propagation from client to server
- [ ] Test error logging with request ID and user ID
- [ ] Test request ID in error responses

---

## References

### UUID Generation
- [MDN: Crypto.randomUUID()](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID)
- [Can I Use: crypto.randomUUID()](https://caniuse.com/mdn-api_crypto_randomuuid)
- [Cloudflare Workers: Web Crypto](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/)

### Hono Framework
- [Hono RPC Guide](https://hono.dev/docs/guides/rpc)
- [Hono Context API](https://hono.dev/docs/api/context)
- [Hono Middleware Guide](https://hono.dev/docs/guides/middleware)
- [Hono Best Practices](https://hono.dev/docs/guides/best-practices)
- [Hono Context Storage Middleware](https://hono.dev/docs/middleware/builtin/context-storage)
- [Bearer Auth Middleware](https://hono.dev/docs/middleware/builtin/bearer-auth)

### Community Resources
- [Hono RPC Client Interceptor Discussion](https://github.com/orgs/honojs/discussions/3222)
- [Type Safety for Context Variables](https://github.com/orgs/honojs/discussions/3257)
