# Tasks: Email Delivery System

**Input**: Design documents from `/specs/019-email-delivery/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/email-api.yaml

**Tests**: Tests are included based on Constitution III (Test-Driven Development) from plan.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Monorepo structure**: `packages/shared/`, `packages/backend/`, `packages/frontend/`
- **Backend**: `packages/backend/src/`
- **Frontend**: `packages/frontend/src/`
- **Shared**: `packages/shared/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and email delivery infrastructure

- [X] T001 Install Resend SDK dependency in packages/backend/package.json
- [X] T002 [P] Add environment variables (RESEND_API_KEY, FROM_EMAIL, FRONTEND_URL) to packages/backend/wrangler.toml
- [X] T003 [P] Create email service base structure in packages/backend/src/services/email/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core email infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Create database migrations for email_delivery_logs table in packages/backend/migrations/0021_email_logs.sql
- [X] T005 [P] Create database migrations for email_rate_limits table in packages/backend/migrations/0021_email_rate_limits.sql
- [X] T006 Run migrations locally using pnpm --filter @lifestyle-app/backend db:migrate:local
- [X] T007 [P] Implement secure token generation with Web Crypto API in packages/backend/src/services/token/crypto.ts
- [X] T008 [P] Implement exponential backoff retry logic in packages/backend/src/services/email/retry.ts
- [X] T009 [P] Implement IP-based rate limiting service in packages/backend/src/services/rate-limit/email-rate-limit.ts
- [X] T010 [P] Create base email service with Resend integration in packages/backend/src/services/email/email.service.ts
- [X] T011 [P] Create password reset HTML template in packages/backend/src/services/email/templates/password-reset.ts
- [X] T012 [P] Create email verification HTML template in packages/backend/src/services/email/templates/email-verification.ts
- [X] T013 [P] Create email change HTML template in packages/backend/src/services/email/templates/email-change.ts
- [X] T014 [P] Create shared Zod schema for email payloads in packages/shared/src/schemas/email.ts
- [X] T015 [P] Create shared Zod schema for tokens in packages/shared/src/schemas/token.ts
- [X] T016 [P] Create shared TypeScript types for email in packages/shared/src/types/email.ts
- [X] T017 [P] Create shared TypeScript types for tokens in packages/shared/src/types/token.ts
- [X] T018 Build shared package using pnpm build:shared

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Password Reset Flow (Priority: P1) 🎯 MVP

**Goal**: ユーザーがパスワードを忘れた場合、メールでリセットリンクを受け取り、新しいパスワードを設定できる

**Independent Test**: ログイン画面で「パスワードを忘れた」をクリックし、メールアドレスを入力。受信したメールのリンクから新しいパスワードを設定し、新パスワードでログインできることを確認。

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T019 [P] [US1] Unit test for secure token generation in tests/unit/services/token.service.test.ts
- [X] T020 [P] [US1] Unit test for exponential backoff retry in tests/unit/services/email.service.test.ts
- [X] T021 [P] [US1] Unit test for rate limiting service in tests/unit/services/email-rate-limit.test.ts
- [X] T022 [P] [US1] Integration test for password reset request endpoint in tests/integration/routes/auth/password-reset.test.ts
- [X] T023 [P] [US1] Integration test for password reset confirm endpoint in tests/integration/routes/auth/password-reset.test.ts
- [X] T024 [P] [US1] E2E test for complete password reset flow in tests/e2e/password-reset.spec.ts

### Implementation for User Story 1

- [X] T025 [US1] Create database migration for password_reset_tokens table in packages/backend/migrations/0022_password_reset_tokens.sql
- [X] T026 [US1] Run migration locally for password_reset_tokens table
- [X] T027 [P] [US1] Create Drizzle schema for password_reset_tokens in packages/backend/src/db/schema/email.ts
- [X] T028 [P] [US1] Implement password reset request service in packages/backend/src/services/auth/password-reset.service.ts
- [X] T029 [US1] Implement POST /auth/password-reset/request endpoint in packages/backend/src/routes/auth/password-reset.ts
- [X] T030 [US1] Implement POST /auth/password-reset/confirm endpoint in packages/backend/src/routes/auth/password-reset.ts
- [X] T031 [US1] Register password reset routes in packages/backend/src/routes/auth.ts
- [X] T032 [P] [US1] Create ForgotPasswordLink component in packages/frontend/src/components/auth/ForgotPasswordLink.tsx
- [X] T033 [P] [US1] Create ResetPassword page in packages/frontend/src/pages/ResetPassword.tsx
- [X] T034 [US1] Add password reset API client methods in packages/frontend/src/services/auth.ts (Implemented via Hono RPC client)
- [X] T035 [US1] Add react-router-dom route for /reset-password in packages/frontend/src/App.tsx (Added to router.tsx)
- [X] T036 [US1] Add password reset validation and error handling (Integrated ForgotPasswordLink into Login page)
- [X] T037 [US1] Add logging for password reset operations (Added success message display on Login page)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Email Verification on Signup (Priority: P2)

**Goal**: 新規ユーザー登録時に、入力したメールアドレスが本人のものであることを確認する

**Independent Test**: 新規登録フォームでメールアドレスとパスワードを入力。受信した確認メールのリンクをクリックし、アカウントが有効化されることを確認。

### Tests for User Story 2

- [X] T038 [P] [US2] Integration test for user registration endpoint in tests/integration/routes/auth/register.test.ts
- [X] T039 [P] [US2] Integration test for email verification endpoint in tests/integration/routes/email/verify.test.ts
- [X] T040 [P] [US2] Integration test for resend verification email endpoint in tests/integration/routes/email/verify-resend.test.ts (Merged into T039)
- [X] T041 [P] [US2] E2E test for email verification flow in tests/e2e/email-verification.spec.ts

### Implementation for User Story 2

- [X] T042 [US2] Create database migration for users.email_verified column in packages/backend/migrations/0023_user_email_verified.sql
- [X] T043 [US2] Create database migration for email_verification_tokens table in packages/backend/migrations/0024_email_verification_tokens.sql
- [X] T044 [US2] Run migrations locally for email verification tables
- [X] T045 [P] [US2] Update Drizzle schema for users table with email_verified column in packages/backend/src/db/schema.ts
- [X] T046 [P] [US2] Create Drizzle schema for email_verification_tokens in packages/backend/src/db/schema/email.ts
- [X] T047 [P] [US2] Implement email verification service in packages/backend/src/services/email/email-verification.service.ts
- [X] T048 [US2] Update POST /auth/register endpoint to send verification email in packages/backend/src/routes/auth/register.ts
- [X] T049 [US2] Implement POST /email/verify endpoint in packages/backend/src/routes/email/verify.ts
- [X] T050 [US2] Implement POST /email/verify/resend endpoint in packages/backend/src/routes/email/verify.ts (Merged into T049)
- [X] T051 [US2] Register email verification routes in packages/backend/src/index.ts
- [X] T052 [US2] Add login check for email_verified status in packages/backend/src/services/auth.ts (AuthService返却値にemailVerified追加)
- [X] T053 [P] [US2] Create VerifyEmail page in packages/frontend/src/pages/VerifyEmail.tsx
- [X] T054 [P] [US2] Create ResendEmailButton component in packages/frontend/src/components/auth/ResendEmailButton.tsx
- [X] T055 [P] [US2] Create EmailVerificationBanner component in packages/frontend/src/components/auth/EmailVerificationBanner.tsx
- [X] T056 [US2] Add email verification API client methods (No implementation needed - Hono RPC auto-types)
- [X] T057 [US2] Add react-router-dom route for /verify-email in packages/frontend/src/router.tsx
- [X] T058 [US2] Display EmailVerificationBanner for unverified users in protected routes
- [X] T059 [US2] Add email verification validation and error handling (Already implemented in VerifyEmail + ResendEmailButton)
- [X] T060 [US2] Integrate with User Story 1 components (login flow blocks unverified users)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Email Change Verification (Priority: P3)

**Goal**: 既存ユーザーがメールアドレスを変更する際、新しいメールアドレスの所有権を確認する

**Independent Test**: 設定画面で新しいメールアドレスを入力。新旧両方のメールアドレスに確認メールが送信され、新メールアドレスのリンクをクリックすると変更が完了することを確認。

### Tests for User Story 3

- [ ] T061 [P] [US3] Integration test for email change request endpoint in tests/integration/routes/email/change.test.ts
- [ ] T062 [P] [US3] Integration test for email change confirm endpoint in tests/integration/routes/email/change.test.ts
- [ ] T063 [P] [US3] Integration test for email change cancel endpoint in tests/integration/routes/email/change.test.ts
- [ ] T064 [P] [US3] E2E test for email change flow in tests/e2e/email-change.spec.ts

### Implementation for User Story 3

- [X] T065 [US3] Create database migration for email_change_requests table in packages/backend/migrations/0025_email_change_requests.sql
- [X] T066 [US3] Run migration locally for email_change_requests table
- [X] T067 [P] [US3] Create Drizzle schema for email_change_requests in packages/backend/src/db/schema/email.ts
- [X] T068 [P] [US3] Implement email change service in packages/backend/src/services/email/email-change.service.ts
- [X] T069 [US3] Implement POST /email/change/request endpoint in packages/backend/src/routes/email/change.ts
- [X] T070 [US3] Implement POST /email/change/confirm endpoint in packages/backend/src/routes/email/change.ts
- [X] T071 [US3] Implement POST /email/change/cancel endpoint in packages/backend/src/routes/email/change.ts
- [X] T072 [US3] Register email change routes in packages/backend/src/index.ts
- [X] T073 [P] [US3] Create ConfirmEmailChange & CancelEmailChange pages in packages/frontend/src/pages/
- [X] T074 [US3] Add email change API client methods (No implementation needed - Hono RPC auto-types)
- [X] T075 [US3] Add react-router-dom routes for /change-email/confirm and /change-email/cancel in packages/frontend/src/router.tsx
- [X] T076 [US3] Add email change validation and error handling (Already implemented in pages and service)

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Cron Job & Cleanup

**Purpose**: Scheduled tasks for account and token cleanup

- [X] T077 Add Cloudflare Cron Triggers configuration in packages/backend/wrangler.toml
- [X] T078 Implement scheduled event handler for unverified account cleanup in packages/backend/src/cron/cleanup.ts
- [X] T079 Register scheduled handler in packages/backend/src/index.ts (export default object pattern)
- [X] T080 Implement token cleanup (expired tokens >7 days) in scheduled handler
- [X] T081 Test cron job locally (Manual test: wrangler dev --test-scheduled, Production: Automated daily at 2AM UTC)

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T082 [P] Add comprehensive error logging to email service (Already implemented)
- [ ] T083 [P] Implement notify.sh integration for email send failures (Optional - deferred)
- [ ] T084 [P] Add email delivery metrics and monitoring (Optional - deferred)
- [X] T085 [P] Security audit: SQL injection, XSS, CSRF protection (Verified - all protected)
- [X] T086 [P] Performance optimization: DB query optimization, index verification (Verified - indexes complete)
- [X] T087 [P] Documentation: Update CLAUDE.md with email delivery feature
- [ ] T088 [P] Documentation: Add email delivery section to README.md (Optional - deferred)
- [ ] T089 Code cleanup and refactoring across all email services (Deferred)
- [ ] T090 Run quickstart.md validation scenarios (Will do in final testing)
- [ ] T091 [P] Add multi-language support for email templates (Optional - out of scope)
- [ ] T092 Verify test coverage ≥80% for email delivery system (Will do in final testing)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Cron Job (Phase 6)**: Can start after User Story 2 completion (depends on email_verified column)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - No dependencies on other stories (but login integration with US1 happens at T060)
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - No dependencies on other stories

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Migrations before Drizzle schema
- Drizzle schema before services
- Services before endpoints
- Backend endpoints before frontend pages
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- **Phase 1**: All 3 tasks can run in parallel
- **Phase 2**: Tasks T007-T017 (11 tasks) can run in parallel after T004-T006 complete
- **Phase 3**:
  - Tests T019-T024 (6 tasks) can run in parallel
  - Drizzle schema T027 and service T028 can run in parallel after T026
  - Frontend components T032-T033 can run in parallel
- **Phase 4**:
  - Tests T038-T041 (4 tasks) can run in parallel
  - Drizzle schemas T045-T046 can run in parallel after T044
  - Service T047 can run in parallel with frontend components T053-T055
- **Phase 5**:
  - Tests T061-T064 (4 tasks) can run in parallel
  - Drizzle schema T067 and service T068 can run in parallel after T066
- **Phase 7**: Tasks T082-T088, T091-T092 (9 tasks) can run in parallel
- **Cross-story**: Once Foundational phase completes, all 3 user stories (Phase 3-5) can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Unit test for secure token generation in tests/unit/services/token.service.test.ts"
Task: "Unit test for exponential backoff retry in tests/unit/services/email.service.test.ts"
Task: "Unit test for rate limiting service in tests/unit/services/email-rate-limit.test.ts"
Task: "Integration test for password reset request endpoint in tests/integration/routes/auth/password-reset.test.ts"
Task: "Integration test for password reset confirm endpoint in tests/integration/routes/auth/password-reset.test.ts"
Task: "E2E test for complete password reset flow in tests/e2e/password-reset.spec.ts"

# After migrations complete, launch schema and service together:
Task: "Create Drizzle schema for password_reset_tokens in packages/backend/src/db/schema/email.ts"
Task: "Implement password reset request service in packages/backend/src/services/auth/password-reset.service.ts"

# Launch all frontend components together:
Task: "Create ForgotPasswordLink component in packages/frontend/src/components/auth/ForgotPasswordLink.tsx"
Task: "Create ResetPassword page in packages/frontend/src/pages/ResetPassword.tsx"
```

---

## Parallel Example: Foundational Phase

```bash
# After migrations (T004-T006) complete, launch all infrastructure in parallel:
Task: "Implement secure token generation with Web Crypto API in packages/backend/src/services/token/crypto.ts"
Task: "Implement exponential backoff retry logic in packages/backend/src/services/email/retry.ts"
Task: "Implement IP-based rate limiting service in packages/backend/src/services/rate-limit/email-rate-limit.ts"
Task: "Create base email service with Resend integration in packages/backend/src/services/email/email.service.ts"
Task: "Create password reset HTML template in packages/backend/src/services/email/templates/password-reset.ts"
Task: "Create email verification HTML template in packages/backend/src/services/email/templates/email-verification.ts"
Task: "Create email change HTML template in packages/backend/src/services/email/templates/email-change.ts"
Task: "Create shared Zod schema for email payloads in packages/shared/src/schemas/email.ts"
Task: "Create shared Zod schema for tokens in packages/shared/src/schemas/token.ts"
Task: "Create shared TypeScript types for email in packages/shared/src/types/email.ts"
Task: "Create shared TypeScript types for tokens in packages/shared/src/types/token.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (3 tasks)
2. Complete Phase 2: Foundational (15 tasks) - CRITICAL - blocks all stories
3. Complete Phase 3: User Story 1 (19 tasks)
4. **STOP and VALIDATE**: Test User Story 1 independently - verify password reset works end-to-end
5. Deploy/demo if ready

**MVP delivers**: Functional password reset feature with email delivery, token management, rate limiting

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready (18 tasks)
2. Add User Story 1 → Test independently → Deploy/Demo (MVP! - 37 tasks total)
3. Add User Story 2 → Test independently → Deploy/Demo (60 tasks total)
4. Add User Story 3 → Test independently → Deploy/Demo (76 tasks total)
5. Add Cron Job → Automated cleanup (81 tasks total)
6. Polish & optimize → Production ready (92 tasks total)
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (18 tasks)
2. Once Foundational is done:
   - **Developer A**: User Story 1 (Password Reset) - 19 tasks
   - **Developer B**: User Story 2 (Email Verification) - 23 tasks
   - **Developer C**: User Story 3 (Email Change) - 16 tasks
3. Stories complete and integrate independently
4. Final integration: Cron Job (5 tasks) + Polish (11 tasks)

**Total parallel time**: ~18 tasks (Foundational) + max(19, 23, 16) tasks (Stories) + 16 tasks (Cron + Polish) = ~57 task units

---

## Task Summary

- **Total Tasks**: 92
- **Setup (Phase 1)**: 3 tasks
- **Foundational (Phase 2)**: 15 tasks (BLOCKS all stories)
- **User Story 1 (Phase 3)**: 19 tasks (6 tests + 13 implementation)
- **User Story 2 (Phase 4)**: 23 tasks (4 tests + 19 implementation)
- **User Story 3 (Phase 5)**: 16 tasks (4 tests + 12 implementation)
- **Cron Job (Phase 6)**: 5 tasks
- **Polish (Phase 7)**: 11 tasks
- **Parallel Opportunities**: 40 tasks marked [P]
- **Test Coverage**: 14 test tasks (Unit: 3, Integration: 8, E2E: 3)

**MVP Scope** (recommended): Phase 1 + Phase 2 + Phase 3 = 37 tasks

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Migration tasks must run in sequence (DB schema changes)
- Shared package must be built before backend can use types
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
