# Quick Start: Request ID Tracing

## Overview

This guide explains how to use Request ID tracing for debugging and monitoring. Request IDs enable you to trace a user's request from frontend error to backend processing.

## For Developers

### Finding Logs by Request ID

When a user reports an error, ask them for the Request ID from the error message or their browser console.

**Search Cloudflare Workers Logs**:
1. Go to Cloudflare Dashboard → Workers & Pages → `lifestyle-app-backend` → Logs
2. Search for the Request ID: `3ec1b68d-ce88-478e-9f4e-03837aeb2098`
3. All log entries for that request will appear in chronological order

**Example log output**:
```
[3ec1b68d-ce88-478e-9f4e-03837aeb2098][User: user_abc123] POST /api/meals
[3ec1b68d-ce88-478e-9f4e-03837aeb2098][Frontend Error] {
  "message": "Failed to save meal record",
  "requestId": "3ec1b68d-ce88-478e-9f4e-03837aeb2098",
  "userId": "user_abc123",
  ...
}
[3ec1b68d-ce88-478e-9f4e-03837aeb2098] Error: Validation failed for mealType
```

### Finding Logs by User ID

To investigate all activity from a specific user:

1. Search Cloudflare Workers Logs for: `[User: user_abc123]`
2. All requests from that user will appear with their respective Request IDs
3. Click on a specific Request ID to see the full trace

### Adding Logging to New Code

#### Frontend

```typescript
import { logError } from '@/lib/errorLogger';

try {
  await saveMeal(mealData);
} catch (error) {
  // Request ID and User ID are automatically included
  await logError(error as Error, {
    operation: 'saveMeal',
    mealType: mealData.type,
  });
  throw error;
}
```

#### Backend

```typescript
export const meals = new Hono<{ Bindings: Bindings; Variables: Variables }>()
  .post('/', zValidator('json', createMealSchema), async (c) => {
    const requestId = c.get('requestId');  // Automatically available
    const userId = c.get('user').id;

    console.log(`[${requestId}][User: ${userId}] Creating meal`);

    try {
      const meal = await mealService.create(userId, input);
      return c.json({ meal }, 201);
    } catch (error) {
      console.error(`[${requestId}] Failed to create meal:`, error);
      throw error;
    }
  });
```

### Understanding Request Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User Action (Frontend)                                    │
│    - Click "Save Meal" button                                │
│    - requestId generated: 3ec1b68d-ce88-478e-9f4e...         │
│    - userId: user_abc123                                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTP POST /api/meals
                         │ X-Request-ID: 3ec1b68d-ce88-478e...
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Backend Receives Request                                  │
│    - Middleware extracts Request ID from header              │
│    - Stores in Hono context: c.set('requestId', ...)        │
│    - All subsequent logs include [requestId][User: userId]   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ If validation fails
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Error Logged (Both Sides)                                │
│    - Backend: console.error with requestId                  │
│    - Response includes requestId in error payload            │
│    - Frontend: logError() sends to /api/logs/error          │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Cloudflare Workers Logs                                  │
│    - All logs searchable by requestId or userId              │
│    - 30-day retention                                        │
└─────────────────────────────────────────────────────────────┘
```

### Common Debugging Scenarios

#### Scenario 1: User reports "Save failed"

1. User provides Request ID: `3ec1b68d-ce88-478e-9f4e-03837aeb2098`
2. Search Cloudflare Logs: `[3ec1b68d-ce88-478e-9f4e-03837aeb2098]`
3. See complete trace:
   ```
   [3ec1b68d...][User: user_abc123] POST /api/meals
   [3ec1b68d...] Validation failed: mealType is required
   [3ec1b68d...][Frontend Error] "Failed to save meal record"
   ```
4. Root cause: Frontend sent invalid data (missing `mealType`)

#### Scenario 2: Performance issue investigation

1. User reports "App is slow"
2. Get User ID: `user_abc123`
3. Search logs: `[User: user_abc123]`
4. Identify slow requests:
   ```
   [req1][User: user_abc123] GET /api/meals - 45ms
   [req2][User: user_abc123] POST /api/meals - 3500ms  ← Slow!
   [req3][User: user_abc123] GET /api/dashboard - 120ms
   ```
5. Deep dive into `req2`:
   ```
   [req2] Saving meal to database - 3200ms  ← Bottleneck
   ```
6. Root cause: Database query is slow

#### Scenario 3: Intermittent error

1. Error occurs occasionally, no clear pattern
2. Collect multiple Request IDs from different occurrences
3. Search logs for all Request IDs
4. Compare differences:
   - All failures have `mealType: "breakfast"`
   - All failures occur between 7-9 AM (timezone issue?)
5. Root cause identified through pattern analysis

## For Users (Error Reporting)

When reporting an error, please provide:
1. **Request ID**: Found in error message or browser console
2. **Timestamp**: When the error occurred
3. **What you were trying to do**: e.g., "Save meal with photo"

Example error message:
```
Error saving meal
Request ID: 3ec1b68d-ce88-478e-9f4e-03837aeb2098
Timestamp: 2026-01-06 10:30:45 AM
```

## Testing Request Tracing

### Local Development

1. Start backend: `pnpm dev:backend`
2. Start frontend: `pnpm dev`
3. Open browser console
4. Perform an action (e.g., save meal)
5. Check backend logs:
   ```
   [3ec1b68d...][User: user_abc123] POST /api/meals
   ```
6. Check frontend console:
   ```
   [RPC] Request: http://localhost:8787/api/meals POST
   [RPC] X-Request-ID: 3ec1b68d-ce88-478e-9f4e-03837aeb2098
   ```

### Integration Test

```typescript
import { describe, it, expect } from 'vitest';
import { api } from '@/lib/client';

describe('Request ID Tracing', () => {
  it('should include request ID in error logs', async () => {
    // Trigger an error
    const response = await api.meals.$post({
      json: { /* invalid data */ },
    });

    // Response should include requestId
    const body = await response.json();
    expect(body.requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
```

## Limitations

- **Log Retention**: 30 days in Cloudflare Workers Logs
- **Search**: Limited to text-based search (no advanced filtering)
- **Volume**: High-traffic scenarios may require log aggregation service
- **Privacy**: User ID is logged; ensure compliance with privacy policy

## Best Practices

1. **Always include context**: When logging errors, include relevant data in `extra` field
2. **Structured logging**: Use consistent format: `[${requestId}][User: ${userId}] message`
3. **Request ID in responses**: Always include `requestId` in error responses
4. **User reports**: Train support team to ask for Request ID
5. **Performance monitoring**: Track Request IDs for slow requests

## Troubleshooting

### Request ID not in logs

**Problem**: Logs don't include Request ID
**Cause**: Middleware not applied or old client version
**Solution**: Ensure `requestIdMiddleware` is in middleware chain

### Request ID different on client/server

**Problem**: Frontend and backend show different Request IDs
**Cause**: Header not transmitted correctly
**Solution**: Check `X-Request-ID` header in network tab

### Cannot find logs

**Problem**: No logs found for Request ID
**Cause**: Logs expired (>30 days) or wrong environment
**Solution**: Check timestamp and verify environment (prod vs preview)

## References

- [Error Log API Contract](./contracts/error-log-api.yaml)
- [Data Model](./data-model.md)
- [Research Findings](./research.md)
- [Cloudflare Workers Logs](https://developers.cloudflare.com/workers/observability/logs/)
