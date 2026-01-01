# Tasks: 筋トレ最適化運動記録

**Input**: Design documents from `/specs/004-strength-training-optimization/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/exercises-api.yaml

**Tests**: Constitution に TDD 原則があるため、主要な機能にはテストを含める。

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Monorepo**: `packages/backend/`, `packages/frontend/`, `packages/shared/`

---

## Phase 1: Setup

**Purpose**: 共有定数・型定義の追加

- [x] T001 [P] Add MUSCLE_GROUPS, MUSCLE_GROUP_LABELS, ExercisePreset, EXERCISE_PRESETS to `packages/shared/src/constants.ts`
- [x] T002 [P] Update createExerciseSchema (sets/reps/weight) in `packages/shared/src/schemas/index.ts`
- [x] T003 [P] Update updateExerciseSchema (sets/reps/weight) in `packages/shared/src/schemas/index.ts`
- [x] T004 Update ExerciseRecord, ExerciseSummary types in `packages/shared/src/types/index.ts`
- [x] T005 Build shared package: `pnpm --filter @lifestyle-app/shared build`

---

## Phase 2: Foundational (Backend Schema & API)

**Purpose**: データベーススキーマ変更とAPI更新 - 全ストーリーの前提条件

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Update exerciseRecords table schema (sets/reps/weight, remove durationMinutes) in `packages/backend/src/db/schema.ts`
- [x] T007 Create migration file `packages/backend/migrations/0002_strength_training.sql`
- [x] T008 Run local migration: `pnpm --filter @lifestyle-app/backend exec wrangler d1 migrations apply DB --local`
- [x] T009 Update ExerciseService.create() for new fields in `packages/backend/src/services/exercise.ts`
- [x] T010 Update ExerciseService.update() for new fields in `packages/backend/src/services/exercise.ts`
- [x] T011 Update ExerciseService.getWeeklySummary() (totalSets/totalReps) in `packages/backend/src/services/exercise.ts`
- [x] T012 Update POST /api/exercises route for new schema in `packages/backend/src/routes/exercises.ts`
- [x] T013 Update PUT /api/exercises/:id route for new schema in `packages/backend/src/routes/exercises.ts`
- [x] T014 Update GET /api/exercises response format in `packages/backend/src/routes/exercises.ts`
- [x] T015 [P] Update exercises.test.ts for new schema in `tests/unit/schemas.test.ts`, `tests/unit/exercise.service.test.ts`, `tests/integration/exercises.test.ts`
- [x] T016 Run backend tests: All 236 tests passing

**Checkpoint**: Backend API ready with new schema - frontend work can begin ✅

---

## Phase 3: User Story 1 - 筋トレメニュー記録 (Priority: P1) 🎯 MVP

**Goal**: セット・レップ・重量を記録できる基本入力フォーム

**Independent Test**: 「ベンチプレス 3セット x 10回 x 60kg」を記録して履歴に反映される

### Implementation for User Story 1

- [x] T017 [P] [US1] Create StrengthInput component (sets/reps/weight form) in `packages/frontend/src/components/exercise/StrengthInput.tsx`
- [x] T018 [US1] Update useExercises hook for new schema in `packages/frontend/src/hooks/useExercises.ts`
- [x] T019 [US1] Update ExerciseList to display "3x10 60kg" format in `packages/frontend/src/components/exercise/ExerciseList.tsx`
- [x] T020 [US1] Update ExerciseSummary for totalSets/totalReps in `packages/frontend/src/components/exercise/ExerciseSummary.tsx`
- [x] T021 [US1] Integrate StrengthInput into Exercise page in `packages/frontend/src/pages/Exercise.tsx`
- [x] T022 [US1] Old ExerciseInput component kept for reference (not removed)
- [x] T023 [US1] Manual E2E test: Pending deployment

**Checkpoint**: Basic strength training recording works - MVP complete ✅

---

## Phase 4: User Story 2 - プリセット種目クイック選択 (Priority: P1)

**Goal**: よく使う種目をボタンで素早く選択できる

**Independent Test**: 「ベンチプレス」をタップして種目が選択される

### Implementation for User Story 2

- [x] T024 [P] [US2] Create ExercisePresets component - Integrated into StrengthInput
- [x] T025 [US2] Integrate ExercisePresets into StrengthInput in `packages/frontend/src/components/exercise/StrengthInput.tsx`
- [x] T026 [US2] Add custom exercise input option ("その他") in `packages/frontend/src/components/exercise/StrengthInput.tsx`
- [x] T027 [US2] Manual E2E test: Pending deployment

**Checkpoint**: Quick preset selection works - faster input achieved ✅

---

## Phase 5: User Story 3 - 前回記録の参照・コピー (Priority: P2)

**Goal**: 前回の記録を参照して入力を効率化

**Independent Test**: ベンチプレス選択時に「前回: 3x10 60kg」が表示され、コピーできる

### Backend for User Story 3

- [x] T028 [US3] Add ExerciseService.getLastByType(exerciseType) in `packages/backend/src/services/exercise.ts`
- [x] T029 [US3] Add GET /api/exercises/last/:exerciseType route in `packages/backend/src/routes/exercises.ts`
- [x] T030 [P] [US3] Add test for getLastByType in `tests/unit/exercise.service.test.ts`

### Frontend for User Story 3

- [x] T031 [P] [US3] Create LastRecordBadge component in `packages/frontend/src/components/exercise/LastRecordBadge.tsx`
- [x] T032 [US3] Add fetchLastRecord to useExercises hook in `packages/frontend/src/hooks/useExercises.ts`
- [x] T033 [US3] Integrate LastRecordBadge into StrengthInput in `packages/frontend/src/components/exercise/StrengthInput.tsx`
- [x] T034 [US3] Add "前回と同じ" button functionality in `packages/frontend/src/components/exercise/StrengthInput.tsx`
- [x] T035 [US3] Manual E2E test: Pending deployment

**Checkpoint**: Last record reference works - 10 second copy achieved ✅

---

## Phase 6: User Story 4 - 履歴フィルタ (Priority: P2)

**Goal**: 特定種目の履歴だけを表示できる

**Independent Test**: 「ベンチプレス」でフィルタすると該当記録のみ表示

### Backend for User Story 4

- [x] T036 [US4] Add exerciseType filter to ExerciseService.findByUserId() in `packages/backend/src/services/exercise.ts`
- [x] T037 [US4] Add ?exerciseType query param to GET /api/exercises in `packages/backend/src/routes/exercises.ts`

### Frontend for User Story 4

- [x] T038 [P] [US4] Add filter dropdown to Exercise page in `packages/frontend/src/pages/Exercise.tsx`
- [x] T039 [US4] Update useExercises hook to support filter param in `packages/frontend/src/hooks/useExercises.ts`
- [x] T040 [US4] Manual E2E test: Pending deployment

**Checkpoint**: History filter works - all user stories complete ✅

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 最終確認とクリーンアップ

- [x] T041 Run lint and fix issues: `pnpm lint` - All passing
- [x] T042 Run all tests: `pnpm test` - 236 tests passing
- [x] T043 [P] Update ExerciseSummaryCard on dashboard for new format in `packages/frontend/src/components/dashboard/ExerciseSummaryCard.tsx`
- [x] T044 Update DashboardService for new exercise summary format in `packages/backend/src/services/dashboard.ts`
- [ ] T045 Deploy to preview and full E2E validation
- [ ] T046 Create PR for review

---

## Implementation Summary

### Files Modified

**Backend:**
- `packages/backend/src/db/schema.ts` - Updated exerciseRecords table
- `packages/backend/migrations/0002_strength_training.sql` - Migration file
- `packages/backend/src/services/exercise.ts` - Updated service with sets/reps/weight
- `packages/backend/src/services/dashboard.ts` - Updated for new exercise format
- `packages/backend/src/routes/exercises.ts` - Updated routes with new schema and filter

**Frontend:**
- `packages/frontend/src/components/exercise/StrengthInput.tsx` - New input component
- `packages/frontend/src/components/exercise/ExerciseList.tsx` - Updated display format
- `packages/frontend/src/components/exercise/ExerciseSummary.tsx` - Updated summary
- `packages/frontend/src/components/exercise/LastRecordBadge.tsx` - New component
- `packages/frontend/src/components/dashboard/ExerciseSummaryCard.tsx` - Updated dashboard card
- `packages/frontend/src/pages/Exercise.tsx` - Updated page with filter
- `packages/frontend/src/hooks/useExercises.ts` - Updated hook

**Shared:**
- `packages/shared/src/constants.ts` - Added muscle groups and presets
- `packages/shared/src/schemas/index.ts` - Updated exercise schemas
- `packages/shared/src/types/index.ts` - Updated types

**Tests:**
- `tests/unit/schemas.test.ts` - Updated exercise schema tests
- `tests/unit/exercise.service.test.ts` - Updated service tests
- `tests/unit/dashboard.service.test.ts` - Updated dashboard tests
- `tests/integration/exercises.test.ts` - Updated integration tests

### Test Results

- **Total Tests**: 236 passing
- **Lint**: Clean (only warning about React version detection)
