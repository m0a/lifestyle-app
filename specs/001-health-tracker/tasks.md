# Tasks: Health Tracker

**Input**: Design documents from `/specs/001-health-tracker/`
**Prerequisites**: plan.md (required), spec.md (required), data-model.md, contracts/api.yaml

**Tests**: TDD approach per Constitution Principle III. Tests are written first, verified to fail, then implementation proceeds.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Monorepo structure and tooling configuration

- [x] T001 Create pnpm workspace configuration in pnpm-workspace.yaml
- [x] T002 Create root package.json with workspace scripts
- [x] T003 Create root tsconfig.json with strict mode settings
- [x] T004 [P] Initialize packages/shared with package.json and tsconfig.json
- [x] T005 [P] Initialize packages/backend with package.json and tsconfig.json
- [x] T006 [P] Initialize packages/frontend with Vite React template
- [x] T007 [P] Configure ESLint and Prettier in root
- [x] T008 [P] Configure Vitest in root vitest.config.ts
- [x] T009 [P] Configure Playwright in playwright.config.ts

**Checkpoint**: All packages initialized, dev tooling ready

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Shared Package

- [x] T010 Create Zod schemas for all entities in packages/shared/src/schemas/index.ts
- [x] T011 [P] Create TypeScript types from Zod schemas in packages/shared/src/types/index.ts
- [x] T012 [P] Create shared constants (mealTypes, validation limits) in packages/shared/src/constants.ts
- [x] T013 Export all from packages/shared/src/index.ts

### Backend Infrastructure

- [x] T014 Create Drizzle schema for all tables in packages/backend/src/db/schema.ts
- [x] T015 Create Drizzle config in packages/backend/drizzle.config.ts
- [x] T016 Create Cloudflare D1 database and update wrangler.toml
- [x] T017 Generate and apply initial migration with drizzle-kit
- [x] T018 Create database connection utility in packages/backend/src/db/index.ts
- [x] T019 Create Hono app entry point in packages/backend/src/index.ts
- [x] T020 [P] Create auth middleware in packages/backend/src/middleware/auth.ts
- [x] T021 [P] Create error handling middleware in packages/backend/src/middleware/error.ts
- [x] T022 Implement auth routes (register/login/logout) in packages/backend/src/routes/auth.ts
- [x] T023 Create AuthService in packages/backend/src/services/auth.ts

### Frontend Infrastructure

- [x] T024 Configure Tailwind CSS in packages/frontend/tailwind.config.js
- [x] T025 [P] Configure React Query provider in packages/frontend/src/providers/QueryProvider.tsx
- [x] T026 [P] Create Zustand auth store in packages/frontend/src/stores/authStore.ts
- [x] T027 [P] Create API client with fetch wrapper in packages/frontend/src/lib/api.ts
- [x] T028 Create React Router setup in packages/frontend/src/router.tsx
- [x] T029 [P] Create Layout component in packages/frontend/src/components/Layout.tsx
- [x] T030 [P] Create ProtectedRoute component in packages/frontend/src/components/ProtectedRoute.tsx
- [x] T031 Create Login page in packages/frontend/src/pages/Login.tsx
- [x] T032 Create Register page in packages/frontend/src/pages/Register.tsx

### E2E Test Setup

- [x] T033 Create auth E2E test in tests/e2e/auth.spec.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - 体重記録 (Priority: P1) 🎯 MVP

**Goal**: ユーザーは体重を記録し、推移をグラフで確認できる

**Independent Test**: 体重入力 → 保存 → グラフ表示が動作すればMVP完了

### Tests for User Story 1 (TDD - Write First, Verify Fail)

- [x] T034 [P] [US1] Write unit tests for WeightService in tests/unit/weight.service.test.ts
- [x] T035 [P] [US1] Write API integration tests for /weights in tests/integration/weights.test.ts
- [x] T036 [P] [US1] Write E2E test for weight recording flow in tests/e2e/weight.spec.ts

### Backend Implementation for User Story 1

- [x] T037 [US1] Create WeightService in packages/backend/src/services/weight.ts
- [x] T038 [US1] Create weight routes (CRUD) in packages/backend/src/routes/weights.ts
- [x] T039 [US1] Register weight routes in packages/backend/src/index.ts

### Frontend Implementation for User Story 1

- [x] T040 [P] [US1] Create useWeights hook in packages/frontend/src/hooks/useWeights.ts
- [x] T041 [P] [US1] Create WeightInput component in packages/frontend/src/components/weight/WeightInput.tsx
- [x] T042 [P] [US1] Create WeightChart component in packages/frontend/src/components/weight/WeightChart.tsx
- [x] T043 [P] [US1] Create WeightList component in packages/frontend/src/components/weight/WeightList.tsx
- [x] T044 [US1] Create Weight page in packages/frontend/src/pages/Weight.tsx
- [x] T045 [US1] Add Weight route to router in packages/frontend/src/router.tsx

### Verify Tests Pass

- [x] T046 [US1] Run unit tests and verify all pass
- [x] T047 [US1] Run integration tests and verify all pass
- [x] T048 [US1] Run E2E tests and verify weight flow works

**Checkpoint**: User Story 1 complete - MVP functional and testable

---

## Phase 4: User Story 2 - 食事記録 (Priority: P2)

**Goal**: ユーザーは食事内容とカロリー（任意）を記録し、一覧確認できる

**Independent Test**: 食事入力 → 保存 → 一覧表示 → カロリー集計が動作すれば完了

### Tests for User Story 2 (TDD - Write First, Verify Fail)

- [x] T049 [P] [US2] Write unit tests for MealService in tests/unit/meal.service.test.ts
- [x] T050 [P] [US2] Write API integration tests for /meals in tests/integration/meals.test.ts
- [x] T051 [P] [US2] Write E2E test for meal recording flow in tests/e2e/meal.spec.ts

### Backend Implementation for User Story 2

- [x] T052 [US2] Create MealService in packages/backend/src/services/meal.ts
- [x] T053 [US2] Create meal routes (CRUD) in packages/backend/src/routes/meals.ts
- [x] T054 [US2] Register meal routes in packages/backend/src/index.ts

### Frontend Implementation for User Story 2

- [x] T055 [P] [US2] Create useMeals hook in packages/frontend/src/hooks/useMeals.ts
- [x] T056 [P] [US2] Create MealInput component in packages/frontend/src/components/meal/MealInput.tsx
- [x] T057 [P] [US2] Create MealList component in packages/frontend/src/components/meal/MealList.tsx
- [x] T058 [P] [US2] Create CalorieSummary component in packages/frontend/src/components/meal/CalorieSummary.tsx
- [x] T059 [US2] Create Meal page in packages/frontend/src/pages/Meal.tsx
- [x] T060 [US2] Add Meal route to router in packages/frontend/src/router.tsx

### Verify Tests Pass

- [x] T061 [US2] Run all meal-related tests and verify pass

**Checkpoint**: User Story 2 complete - meal recording functional

---

## Phase 5: User Story 3 - 運動記録 (Priority: P3)

**Goal**: ユーザーは運動種目と時間を記録し、週間サマリーを確認できる

**Independent Test**: 運動入力 → 保存 → 週間集計表示が動作すれば完了

### Tests for User Story 3 (TDD - Write First, Verify Fail)

- [x] T062 [P] [US3] Write unit tests for ExerciseService in tests/unit/exercise.service.test.ts
- [x] T063 [P] [US3] Write API integration tests for /exercises in tests/integration/exercises.test.ts
- [x] T064 [P] [US3] Write E2E test for exercise recording flow in tests/e2e/exercise.spec.ts

### Backend Implementation for User Story 3

- [x] T065 [US3] Create ExerciseService in packages/backend/src/services/exercise.ts
- [x] T066 [US3] Create exercise routes (CRUD) in packages/backend/src/routes/exercises.ts
- [x] T067 [US3] Register exercise routes in packages/backend/src/index.ts

### Frontend Implementation for User Story 3

- [x] T068 [P] [US3] Create useExercises hook in packages/frontend/src/hooks/useExercises.ts
- [x] T069 [P] [US3] Create ExerciseInput component in packages/frontend/src/components/exercise/ExerciseInput.tsx
- [x] T070 [P] [US3] Create ExerciseList component in packages/frontend/src/components/exercise/ExerciseList.tsx
- [x] T071 [P] [US3] Create ExerciseSummary component in packages/frontend/src/components/exercise/ExerciseSummary.tsx
- [x] T072 [US3] Create Exercise page in packages/frontend/src/pages/Exercise.tsx
- [x] T073 [US3] Add Exercise route to router in packages/frontend/src/router.tsx

### Verify Tests Pass

- [x] T074 [US3] Run all exercise-related tests and verify pass

**Checkpoint**: User Story 3 complete - exercise recording functional

---

## Phase 6: User Story 4 - 振り返りダッシュボード (Priority: P4)

**Goal**: 体重・食事・運動の統合ダッシュボードで進捗を確認できる

**Independent Test**: ダッシュボード表示 → 3種類のデータ一覧 → 期間切替が動作すれば完了

### Tests for User Story 4 (TDD - Write First, Verify Fail)

- [x] T075 [P] [US4] Write unit tests for DashboardService in tests/unit/dashboard.service.test.ts
- [x] T076 [P] [US4] Write API integration tests for /dashboard in tests/integration/dashboard.test.ts
- [x] T077 [P] [US4] Write E2E test for dashboard flow in tests/e2e/dashboard.spec.ts

### Backend Implementation for User Story 4

- [x] T078 [US4] Create DashboardService in packages/backend/src/services/dashboard.ts
- [x] T079 [US4] Create dashboard routes in packages/backend/src/routes/dashboard.ts
- [x] T080 [US4] Register dashboard routes in packages/backend/src/index.ts

### Frontend Implementation for User Story 4

- [x] T081 [P] [US4] Create useDashboard hook in packages/frontend/src/hooks/useDashboard.ts
- [x] T082 [P] [US4] Create PeriodSelector component in packages/frontend/src/components/dashboard/PeriodSelector.tsx
- [x] T083 [P] [US4] Create WeightSummaryCard component in packages/frontend/src/components/dashboard/WeightSummaryCard.tsx
- [x] T084 [P] [US4] Create MealSummaryCard component in packages/frontend/src/components/dashboard/MealSummaryCard.tsx
- [x] T085 [P] [US4] Create ExerciseSummaryCard component in packages/frontend/src/components/dashboard/ExerciseSummaryCard.tsx
- [x] T086 [US4] Create Dashboard page in packages/frontend/src/pages/Dashboard.tsx
- [x] T087 [US4] Add Dashboard route to router in packages/frontend/src/router.tsx

### Verify Tests Pass

- [x] T088 [US4] Run all dashboard-related tests and verify pass

**Checkpoint**: User Story 4 complete - all user stories functional

---

## Phase 7: User Features (Export/Delete)

**Purpose**: Privacy features per Constitution Principle I

- [x] T089 Implement data export endpoint in packages/backend/src/routes/user.ts
- [x] T090 Implement account deletion endpoint in packages/backend/src/routes/user.ts
- [x] T091 [P] Create Settings page with export/delete in packages/frontend/src/pages/Settings.tsx
- [x] T092 Write E2E test for export/delete in tests/e2e/user.spec.ts

**Checkpoint**: Privacy features complete

---

## Phase 8: Offline Support (FR-010)

**Purpose**: PWA and offline capability

- [x] T093 Configure PWA plugin in packages/frontend/vite.config.ts
- [x] T094 Create Service Worker for offline caching
- [x] T095 Create IndexedDB wrapper in packages/frontend/src/lib/offlineDb.ts
- [x] T096 Create sync service in packages/frontend/src/services/sync.ts
- [x] T097 Update hooks to use offline-first pattern
- [x] T098 Write E2E test for offline behavior in tests/e2e/offline.spec.ts

**Checkpoint**: Offline support complete

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Quality, performance, deployment

- [x] T099 [P] Add loading states to all pages
- [x] T100 [P] Add error boundaries and user-friendly error messages
- [x] T101 [P] Add toast notifications for actions
- [x] T102 Run full test suite and ensure 80%+ coverage
- [x] T103 [P] Configure CI/CD with GitHub Actions in .github/workflows/ci.yml
- [x] T104 Deploy to Cloudflare Workers (backend + frontend assets)
- [x] T106 Run quickstart.md validation

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) ──────────────────────────────────────┐
                                                       ▼
Phase 2 (Foundational) ◄── BLOCKS ALL USER STORIES ───┤
                                                       │
     ┌─────────────────────────────────────────────────┘
     ▼
Phase 3 (US1: Weight) ─── MVP ───────────────────────┐
     │                                                │
     ▼                                                │
Phase 4 (US2: Meal) ─────────────────────────────────┤
     │                                                │
     ▼                                                │
Phase 5 (US3: Exercise) ─────────────────────────────┤
     │                                                │
     ▼                                                ▼
Phase 6 (US4: Dashboard) ◄── Requires US1-3 data ────┤
     │                                                │
     ▼                                                │
Phase 7-8 (Features) ────────────────────────────────┤
     │                                                │
     ▼                                                ▼
Phase 9 (Polish) ◄── All stories complete ───────────┘
```

### User Story Dependencies

- **US1 (Weight)**: Independent - can complete alone as MVP
- **US2 (Meal)**: Independent - shares auth with US1 but no data dependency
- **US3 (Exercise)**: Independent - shares auth with US1/2 but no data dependency
- **US4 (Dashboard)**: Depends on US1-3 for data display (read-only aggregation)

### Parallel Opportunities by Phase

**Phase 1**: T004, T005, T006, T007, T008, T009 can run in parallel
**Phase 2**: T010-T012 parallel, T020-T021 parallel, T024-T027 parallel
**Phase 3**: T034-T036 parallel (tests), T040-T043 parallel (frontend)
**Phase 4-6**: Same pattern as Phase 3

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: User Story 1 (Weight Recording)
4. **STOP and VALIDATE**: Test independently
5. Deploy MVP - users can track weight

### Incremental Delivery

| Milestone | Stories | User Value |
|-----------|---------|------------|
| MVP | US1 | 体重記録・推移確認 |
| v0.2 | US1 + US2 | + 食事記録・カロリー管理 |
| v0.3 | US1-3 | + 運動記録 |
| v1.0 | US1-4 | + 統合ダッシュボード |
| v1.1 | + Features | + エクスポート・削除 |
| v1.2 | + Offline | + オフライン対応 |

---

## Notes

- [P] tasks = different files, no dependencies - can run in parallel
- [Story] label maps task to specific user story
- TDD: Write tests first, verify they fail, then implement
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Constitution compliance: TDD (III), Type Safety (IV), Simplicity (V)
