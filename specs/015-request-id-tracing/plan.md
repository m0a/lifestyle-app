# Implementation Plan: Request ID Tracing for End-to-End Log Traceability

**Branch**: `015-request-id-tracing` | **Date**: 2026-01-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/015-request-id-tracing/spec.md`

## Summary

Implement end-to-end request tracing by adding unique Request IDs to all API calls and log entries. Each frontend-initiated request will generate a UUID v4 Request ID, transmit it via HTTP header to the backend, and include it in all log entries along with User ID (when authenticated). This enables developers to trace the complete lifecycle of any request from frontend error to backend processing for efficient debugging and user support.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**:
- Frontend: React 18+, Hono RPC client, Zustand (auth state)
- Backend: Hono, Zod validation, Cloudflare Workers Runtime
- Shared: Zod schemas

**Storage**: Cloudflare D1 (SQLite) via Drizzle ORM - logs are ephemeral (not persisted to DB), sent to Cloudflare Workers Logs
**Testing**: Vitest (unit + integration), Playwright (E2E)
**Target Platform**:
- Frontend: Modern browsers (ES2020+)
- Backend: Cloudflare Workers (V8 isolates)

**Project Type**: Web monorepo (pnpm workspaces: packages/frontend, packages/backend, packages/shared)
**Performance Goals**:
- Request ID generation: < 1ms overhead
- Header transmission: negligible overhead (< 50 bytes)
- Log output: existing console.error performance maintained

**Constraints**:
- No additional network roundtrips
- No database schema changes required
- Backward compatible with existing error logging
- Request ID must propagate through all async operations

**Scale/Scope**:
- ~15 existing API endpoints
- 2 logging entry points (frontend errorLogger, backend middleware)
- Affects all user-initiated requests (estimated 1000+ req/day in production)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ User Privacy First
- **Status**: PASS
- **Analysis**: Request IDs are random UUIDs with no personal information. User IDs are already logged in existing system; this feature enhances traceability without collecting new data.

### ✅ Simple UX
- **Status**: PASS (N/A)
- **Analysis**: Feature is transparent to end users. Developers benefit from simpler debugging workflow.

### ✅ Test-Driven Development (TDD)
- **Status**: PASS (pending implementation)
- **Required Tests**:
  - Unit: Request ID generation, header injection, log formatting
  - Integration: End-to-end request ID propagation from frontend → backend
  - E2E: Error scenario with Request ID traceability

### ✅ Type Safety
- **Status**: PASS
- **Analysis**:
  - Zod schema update for error log payload (add requestId, userId fields)
  - TypeScript interfaces for Request Context
  - No `any` types permitted

### ✅ Simplicity Over Cleverness
- **Status**: PASS
- **Analysis**:
  - Extends existing errorLogger.ts and logs.ts (no new abstractions)
  - Uses standard UUID v4 (well-established, no custom ID scheme)
  - Minimal code addition: ~50 LOC frontend, ~30 LOC backend

**GATE RESULT**: ✅ PASS - Proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/015-request-id-tracing/
├── plan.md              # This file
├── research.md          # Phase 0 output (UUID implementation, Hono patterns)
├── data-model.md        # Phase 1 output (Log Entry schema)
├── quickstart.md        # Phase 1 output (Developer guide)
├── contracts/           # Phase 1 output (Updated error log API schema)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
packages/
├── shared/
│   └── src/
│       └── schemas/
│           └── log.ts           # [NEW] Zod schema for log entries with requestId/userId
│
├── frontend/
│   └── src/
│       └── lib/
│           ├── client.ts        # [MODIFY] Add X-Request-ID header to Hono RPC client
│           ├── errorLogger.ts   # [MODIFY] Include requestId + userId in all logs
│           └── requestId.ts     # [NEW] Request ID generation utility
│
└── backend/
    └── src/
        ├── routes/
        │   └── logs.ts          # [MODIFY] Update error log schema with requestId/userId
        ├── middleware/
        │   └── requestContext.ts # [NEW] Middleware to extract/generate requestId
        └── index.ts             # [MODIFY] Add requestContext middleware
```

**Structure Decision**: Monorepo web application structure (Option 2 from template). Modifications are localized to existing logging infrastructure with minimal new files.

## Complexity Tracking

*No constitution violations - this section is empty.*

---

## Phase 1 Completion: Post-Design Constitution Re-Check

*Required after Phase 1 Design & Contracts*

### ✅ User Privacy First
- **Status**: PASS
- **Re-evaluation**: Design confirms Request IDs contain no personal data. User IDs are handled per existing privacy policy. No new privacy concerns introduced.

### ✅ Simple UX
- **Status**: PASS (N/A)
- **Re-evaluation**: Feature remains transparent to users. No UX changes required.

### ✅ Test-Driven Development (TDD)
- **Status**: PASS
- **Test Coverage Plan**:
  - Unit tests: `crypto.randomUUID()` generation, header injection, log formatting
  - Integration tests: Request ID propagation from frontend through backend
  - E2E tests: Complete error scenario with Request ID traceability
  - Estimated coverage: 85% (within 80%+ requirement)

### ✅ Type Safety
- **Status**: PASS
- **Implementation**:
  - Zod schemas defined in `contracts/error-log-api.yaml`
  - TypeScript interfaces for Request Context in `ContextVariableMap`
  - No `any` types used in design
  - All error responses include typed `requestId` field

### ✅ Simplicity Over Cleverness
- **Status**: PASS
- **Validation**:
  - Extends existing `errorLogger.ts` and `logs.ts` (no new abstractions)
  - Uses standard Web Crypto API (`crypto.randomUUID()`)
  - Minimal code changes: ~50 LOC frontend, ~30 LOC backend, ~20 LOC shared
  - No third-party libraries required
  - YAGNI principle maintained: implements only specified requirements

**FINAL GATE RESULT**: ✅ PASS - Ready for implementation (`/speckit.tasks`)

---

## Artifacts Generated

- ✅ `plan.md` - This file
- ✅ `research.md` - UUID generation, Hono patterns, integration approaches
- ✅ `data-model.md` - Log Entry and Request Context schemas
- ✅ `contracts/error-log-api.yaml` - OpenAPI specification for error logging endpoint
- ✅ `quickstart.md` - Developer guide for using Request ID tracing
- ✅ Agent context updated in `CLAUDE.md`

**Next Step**: `/speckit.tasks` to generate actionable implementation tasks
