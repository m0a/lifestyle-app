# Data Model: Request ID Tracing

## Overview

This document defines the data structures for request tracing and enhanced logging. The primary entities are Log Entry and Request Context.

## Entities

### Log Entry

Represents a single log record with request tracing information.

**Location**: `packages/shared/src/schemas/log.ts` (Zod schema)

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | Yes | Human-readable error or log message |
| `stack` | string | No | JavaScript stack trace (for errors) |
| `url` | string | Yes | Full URL where the log originated |
| `userAgent` | string | No | Browser user agent string |
| `timestamp` | string | Yes | ISO 8601 timestamp (e.g., "2026-01-06T10:30:00Z") |
| `requestId` | string | No | UUID v4 identifying this specific request |
| `userId` | string | No | User ID (null for unauthenticated requests) |
| `extra` | Record<string, unknown> | No | Additional context (e.g., componentStack, formData) |

**Validation Rules**:
- `message`: Non-empty string
- `url`: Valid URL format
- `timestamp`: ISO 8601 format
- `requestId`: UUID v4 format (xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx) when present
- `userId`: Non-empty string when present
- `extra`: Arbitrary JSON object

**State Transitions**: N/A (immutable once created)

**Example**:
```json
{
  "message": "Failed to save meal record",
  "stack": "Error: Network request failed\\n    at saveMeal (meal.service.ts:45)\\n    ...",
  "url": "https://lifestyle-app.example.com/meals/new",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "timestamp": "2026-01-06T10:30:45.123Z",
  "requestId": "3ec1b68d-ce88-478e-9f4e-03837aeb2098",
  "userId": "user_abc123",
  "extra": {
    "type": "api_error",
    "endpoint": "/api/meals",
    "statusCode": 500
  }
}
```

---

### Request Context

Represents the execution context of a single request, spanning frontend and backend.

**Location**: Hono context variables (runtime, not persisted)

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `requestId` | string | Yes | UUID v4 generated at request initiation |
| `userId` | string | No | User ID from authentication (null for anonymous) |
| `timestamp` | Date | Yes | Request start time |
| `url` | string | Yes | Original request URL |
| `method` | string | Yes | HTTP method (GET, POST, etc.) |

**Lifecycle**:
1. **Frontend**: Generated when API call is initiated
2. **Backend**: Extracted from `X-Request-ID` header or generated if missing
3. **Storage**: Stored in Hono context (`c.set('requestId', ...)`)
4. **Propagation**: Passed to all log statements, error handlers, and downstream services
5. **Cleanup**: Automatically garbage collected at request end

**Relationships**:
- One Request Context has many Log Entries (via `requestId`)
- One User may have many Request Contexts (via `userId`)

**Example (TypeScript)**:
```typescript
// Backend context
interface RequestContext {
  requestId: string;        // "3ec1b68d-ce88-478e-9f4e-03837aeb2098"
  userId?: string;          // "user_abc123" or undefined
  timestamp: Date;          // 2026-01-06T10:30:45.000Z
  url: string;              // "/api/meals"
  method: string;           // "POST"
}
```

---

## Data Flow

```
┌──────────────┐
│   Frontend   │
│              │
│  1. Generate │
│    Request   │
│    ID (UUID) │
└──────┬───────┘
       │
       │ X-Request-ID header
       ▼
┌──────────────┐
│   Backend    │
│              │
│  2. Extract  │
│    or        │
│    Generate  │
└──────┬───────┘
       │
       │ Store in context
       ▼
┌──────────────┐
│   Logging    │
│              │
│  3. Include  │
│    requestId │
│    + userId  │
└──────────────┘
       │
       │
       ▼
┌──────────────┐
│  Cloudflare  │
│  Workers     │
│  Logs        │
└──────────────┘
```

---

## Storage Considerations

**Logs**: Not persisted to database. Sent to Cloudflare Workers Logs (console.error) with 30-day retention.

**Request Context**: Ephemeral, stored only in Hono context for the duration of the request.

**Performance Impact**:
- Request ID generation: < 1ms (crypto.randomUUID())
- Header transmission: ~50 bytes additional payload
- Log formatting: Negligible (JSON.stringify)

**Scalability**:
- UUID v4 namespace: 2^122 unique IDs (collision probability < 1 in 1 billion)
- No database queries required
- No additional network roundtrips

---

## Integration Points

**Frontend**:
- `packages/frontend/src/lib/client.ts`: Generate and inject Request ID
- `packages/frontend/src/lib/errorLogger.ts`: Include Request ID and User ID in logs

**Backend**:
- `packages/backend/src/middleware/request-id.ts`: Extract/generate Request ID
- `packages/backend/src/routes/logs.ts`: Accept and log Request ID + User ID
- `packages/backend/src/index.ts`: Enhanced error handler with Request ID

**Shared**:
- `packages/shared/src/schemas/log.ts`: Zod schema for log validation
