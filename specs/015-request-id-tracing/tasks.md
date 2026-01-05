# Tasks: Request ID Tracing for End-to-End Log Traceability

**Input**: Design documents from `/specs/015-request-id-tracing/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included per constitution requirement (TDD with 80%+ coverage goal)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Monorepo**: `packages/shared/`, `packages/frontend/`, `packages/backend/`
- All paths are absolute from repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency verification

- [x] T001 Verify TypeScript 5.x strict mode enabled in all packages (tsconfig.json)
- [x] T002 [P] Verify Vitest configured for unit and integration tests
- [x] T003 [P] Verify Playwright configured for E2E tests

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Create Zod schema for enhanced error log in packages/shared/src/schemas/log.ts
- [x] T005 [P] Export errorLogSchema from packages/shared/src/index.ts
- [x] T006 [P] Build shared package with `pnpm build:shared`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Error Investigation with Complete Request Trace (Priority: P1) 🎯 MVP

**Goal**: Enable developers to trace the complete lifecycle of any request from frontend error to backend processing using a unique Request ID

**Independent Test**: Trigger an error in the application, verify that frontend and backend logs for that request can be retrieved using a single Request ID

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T007 [P] [US1] Unit test for Request ID generation in tests/unit/requestId.test.ts
- [ ] T008 [P] [US1] Unit test for Request ID header injection in tests/unit/client.test.ts
- [ ] T009 [P] [US1] Integration test for Request ID propagation in tests/integration/request-id-propagation.test.ts
- [ ] T010 [US1] E2E test for error scenario with Request ID in tests/e2e/request-id-tracing.spec.ts

### Implementation for User Story 1

#### Frontend

- [ ] T011 [P] [US1] Create Request ID generation utility in packages/frontend/src/lib/requestId.ts
- [ ] T012 [US1] Modify Hono RPC client to inject X-Request-ID header in packages/frontend/src/lib/client.ts
- [ ] T013 [US1] Update errorLogger interface to include requestId in packages/frontend/src/lib/errorLogger.ts
- [ ] T014 [US1] Store current requestId in errorLogger module scope for error context

#### Backend

- [ ] T015 [P] [US1] Create Request ID middleware in packages/backend/src/middleware/requestContext.ts
- [ ] T016 [P] [US1] Extend ContextVariableMap to include requestId in packages/backend/src/middleware/requestContext.ts
- [ ] T017 [US1] Integrate requestContext middleware in packages/backend/src/index.ts (after logger, before routes)
- [ ] T018 [US1] Update error log schema in packages/backend/src/routes/logs.ts to accept requestId
- [ ] T019 [US1] Enhance error log handler to include requestId in console output in packages/backend/src/routes/logs.ts
- [ ] T020 [US1] Update global error handler to include requestId in error responses in packages/backend/src/index.ts

#### Integration

- [ ] T021 [US1] Verify Request ID propagates from frontend → backend in all API calls
- [ ] T022 [US1] Verify error logs include Request ID in Cloudflare Workers Logs format
- [ ] T023 [US1] Test backward compatibility: requests without X-Request-ID header generate server-side ID

**Checkpoint**: At this point, User Story 1 should be fully functional - Request IDs appear in all logs, enabling complete request tracing

---

## Phase 4: User Story 2 - User Activity Monitoring (Priority: P2)

**Goal**: Enable support teams to investigate user-specific issues by filtering logs with User ID

**Independent Test**: Have a user perform multiple actions, verify all their requests are traceable by filtering logs with User ID

### Tests for User Story 2

- [ ] T024 [P] [US2] Unit test for User ID extraction from auth store in tests/unit/errorLogger.test.ts
- [ ] T025 [US2] Integration test for User ID in authenticated vs unauthenticated requests in tests/integration/user-id-logging.test.ts

### Implementation for User Story 2

#### Frontend

- [ ] T026 [US2] Update errorLogger to extract userId from Zustand auth store in packages/frontend/src/lib/errorLogger.ts
- [ ] T027 [US2] Include userId in all error log entries (null for unauthenticated)

#### Backend

- [ ] T028 [P] [US2] Update error log schema to accept userId in packages/backend/src/routes/logs.ts
- [ ] T029 [US2] Enhance error log handler to include userId in console output in packages/backend/src/routes/logs.ts
- [ ] T030 [US2] Update global error handler to extract userId from context in packages/backend/src/index.ts

#### Integration

- [ ] T031 [US2] Verify authenticated requests include User ID in logs
- [ ] T032 [US2] Verify unauthenticated requests have userId: null in logs
- [ ] T033 [US2] Test filtering logs by User ID returns all requests for that user

**Checkpoint**: At this point, User Stories 1 AND 2 both work independently - logs can be filtered by Request ID OR User ID

---

## Phase 5: User Story 3 - Performance Issue Root Cause Analysis (Priority: P3)

**Goal**: Enable developers to identify slow requests and trace their execution path to find bottlenecks

**Independent Test**: Simulate a slow request, verify that timing information at each stage is traceable via Request ID

### Tests for User Story 3

- [ ] T034 [P] [US3] Integration test for timing information in logs in tests/integration/performance-logging.test.ts
- [ ] T035 [US3] E2E test for slow request identification in tests/e2e/slow-request-tracing.spec.ts

### Implementation for User Story 3

#### Backend

- [ ] T036 [P] [US3] Add request start timestamp to requestContext middleware in packages/backend/src/middleware/requestContext.ts
- [ ] T037 [US3] Add timing information to route-level logs (e.g., `[${requestId}] Request completed in ${duration}ms`)
- [ ] T038 [US3] Enhance error handler to include request duration in logs in packages/backend/src/index.ts

#### Documentation

- [ ] T039 [US3] Update quickstart.md with performance debugging examples in specs/015-request-id-tracing/quickstart.md

**Checkpoint**: All user stories should now be independently functional - full observability with Request ID, User ID, and timing data

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T040 [P] Verify test coverage meets 80%+ goal with `pnpm test:coverage`
- [ ] T041 [P] Run typecheck across all packages with `pnpm typecheck`
- [ ] T042 [P] Run lint and fix issues with `pnpm lint:fix`
- [ ] T043 Update CLAUDE.md with Request ID tracing usage examples
- [ ] T044 [P] Create developer documentation for Request ID tracing patterns
- [ ] T045 Run all E2E tests to validate end-to-end functionality with `pnpm test:e2e`
- [ ] T046 Validate quickstart.md scenarios work as documented

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Extends US1 but independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Extends US1 but independently testable

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD)
- Frontend and Backend tasks within a story can run in parallel
- Integration tests depend on both frontend and backend implementation
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Frontend and Backend implementation within a story can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together (write first, ensure FAIL):
Task: "Unit test for Request ID generation in tests/unit/requestId.test.ts"
Task: "Unit test for Request ID header injection in tests/unit/client.test.ts"
Task: "Integration test for Request ID propagation in tests/integration/request-id-propagation.test.ts"

# Launch frontend and backend implementation in parallel:
# Frontend developer:
Task: "Create Request ID generation utility in packages/frontend/src/lib/requestId.ts"
Task: "Modify Hono RPC client to inject X-Request-ID header in packages/frontend/src/lib/client.ts"

# Backend developer:
Task: "Create Request ID middleware in packages/backend/src/middleware/requestContext.ts"
Task: "Extend ContextVariableMap to include requestId"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T006) - CRITICAL
3. Complete Phase 3: User Story 1 (T007-T023)
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready - basic Request ID tracing functional

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP: Request ID tracing)
3. Add User Story 2 → Test independently → Deploy/Demo (MVP + User ID filtering)
4. Add User Story 3 → Test independently → Deploy/Demo (Full observability with timing)
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T006)
2. Once Foundational is done:
   - **Developer A**: User Story 1 Frontend (T007, T008, T011-T014)
   - **Developer B**: User Story 1 Backend (T007, T009, T015-T020)
   - **Developer C**: Can start User Story 2 tests (T024-T025) in preparation
3. After US1 completes:
   - **Developer A**: User Story 2 Frontend (T026-T027)
   - **Developer B**: User Story 2 Backend (T028-T030)
   - **Developer C**: User Story 3 (T034-T039)
4. Stories complete and integrate independently

---

## Task Count Summary

- **Total Tasks**: 46
- **Phase 1 (Setup)**: 3 tasks
- **Phase 2 (Foundational)**: 3 tasks
- **Phase 3 (User Story 1)**: 17 tasks (4 tests + 13 implementation)
- **Phase 4 (User Story 2)**: 10 tasks (2 tests + 8 implementation)
- **Phase 5 (User Story 3)**: 6 tasks (2 tests + 4 implementation)
- **Phase 6 (Polish)**: 7 tasks

**Parallelizable**: 20 tasks marked [P] (43% of total)
**MVP Scope**: Phases 1-3 (23 tasks) delivers basic Request ID tracing
**Test Coverage**: 8 test tasks (TDD approach, 17% of total)

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- **TDD Required**: Verify tests FAIL before implementing (constitution requirement)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Run `pnpm typecheck && pnpm lint && pnpm test` before committing
- **Constitution Compliance**: No `any` types, strict mode enabled, 80%+ coverage goal
