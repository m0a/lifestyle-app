# Implementation Tasks: Multi-Exercise Import Selection

**Feature**: 017-multi-exercise-import
**Branch**: `017-multi-exercise-import`
**Total Tasks**: 48
**Generated**: 2026-01-08

## Implementation Strategy

**MVP Scope**: User Story 1 (P1) - Select from Multiple Past Exercises
- Delivers core value: Fixes the reported issue where only one exercise can be imported
- Independently testable and deployable
- Foundation for P2 and P3 enhancements

**Incremental Delivery**:
1. **Phase 1-2**: Setup + Foundational (blocking prerequisites)
2. **Phase 3**: User Story 1 (P1) - MVP delivery
3. **Phase 4**: User Story 2 (P2) - Visual enhancement
4. **Phase 5**: User Story 3 (P3) - Convenience feature
5. **Phase 6**: Polish & Cross-cutting

---

## Phase 1: Setup & Dependencies

**Goal**: Install dependencies and configure environment

### Tasks

- [x] T001 Install react-window for list virtualization in packages/frontend/package.json
- [x] T002 [P] Install @types/react-window dev dependency in packages/frontend/package.json
- [x] T003 Build shared package after adding new types using `pnpm build:shared`

**Phase Completion Criteria**: Dependencies installed, shared package builds successfully

---

## Phase 2: Foundational - Shared Types & Schemas

**Goal**: Define type-safe contracts shared between frontend and backend

### Tasks

- [x] T004 [P] Add ExerciseSummary interface in packages/shared/src/types/exercise.ts
- [x] T005 [P] Add RecentExerciseItem interface in packages/shared/src/types/exercise.ts
- [x] T006 [P] Add ExerciseImportItem interface in packages/shared/src/types/exercise.ts
- [x] T007 [P] Add exerciseImportQuerySchema Zod schema in packages/shared/src/schemas/exercise.ts
- [x] T008 [P] Add recentExercisesQuerySchema Zod schema in packages/shared/src/schemas/exercise.ts
- [x] T009 [P] Add exerciseImportSelectionSchema Zod schema in packages/shared/src/schemas/exercise.ts
- [x] T010 Rebuild shared package after type additions using `pnpm build:shared`

**Phase Completion Criteria**: All shared types and schemas defined, type-safe across packages

---

## Phase 3: User Story 1 (P1) - Select from Multiple Past Exercises

**Story Goal**: Enable users to select from multiple exercises when importing from a specific date

**Independent Test**: Create multiple exercise records on a past date → navigate to import screen → select date → verify all exercises displayed → select one → verify data imported

### Backend Implementation

#### Integration Tests (RED phase)

- [ ] T011 [US1] Write integration test for GET /api/exercises/by-date in tests/integration/exercise-import-api.test.ts
- [ ] T012 [US1] Write integration test for empty date response in tests/integration/exercise-import-api.test.ts
- [ ] T013 [US1] Write integration test for auto-import single exercise in tests/integration/exercise-import-api.test.ts

#### Backend Services & Routes (GREEN phase)

- [ ] T014 [US1] Implement aggregateExerciseSets helper in packages/backend/src/services/exercise.service.ts
- [ ] T015 [US1] Implement GET /api/exercises/by-date endpoint in packages/backend/src/routes/exercises.ts
- [ ] T016 [US1] Add date validation logic for by-date endpoint in packages/backend/src/routes/exercises.ts
- [ ] T017 [US1] Verify integration tests pass after backend implementation

### Frontend Implementation

#### Component Tests (RED phase)

- [ ] T018 [US1] Write test for ExerciseImportDialog renders when open in packages/frontend/src/components/exercise/__tests__/ExerciseImportDialog.test.tsx
- [ ] T019 [US1] Write test for ExerciseImportDialog calls onSelect in packages/frontend/src/components/exercise/__tests__/ExerciseImportDialog.test.tsx
- [ ] T020 [US1] Write test for ExerciseImportList renders exercise items in packages/frontend/src/components/exercise/__tests__/ExerciseImportList.test.tsx

#### Frontend Components (GREEN phase)

- [ ] T021 [P] [US1] Create ExerciseImportDialog component with native dialog element in packages/frontend/src/components/exercise/ExerciseImportDialog.tsx
- [ ] T022 [P] [US1] Create ExerciseImportList component in packages/frontend/src/components/exercise/ExerciseImportList.tsx
- [ ] T023 [P] [US1] Create ExerciseImportListItem component in packages/frontend/src/components/exercise/ExerciseImportListItem.tsx
- [ ] T024 [US1] Add byDate query hook to useExercises in packages/frontend/src/hooks/useExercises.ts
- [ ] T025 [US1] Add import dialog state management to Exercise page in packages/frontend/src/pages/Exercise.tsx
- [ ] T026 [US1] Add "過去から取り込み" button trigger in packages/frontend/src/pages/Exercise.tsx
- [ ] T027 [US1] Implement date selection UI in ExerciseImportDialog in packages/frontend/src/components/exercise/ExerciseImportDialog.tsx
- [ ] T028 [US1] Implement exercise data population on selection in packages/frontend/src/pages/Exercise.tsx
- [ ] T029 [US1] Verify component tests pass after frontend implementation

### E2E Tests

- [ ] T030 [US1] Write E2E test for importing from date selection in tests/e2e/exercise-import.spec.ts
- [ ] T031 [US1] Write E2E test for auto-import single exercise in tests/e2e/exercise-import.spec.ts
- [ ] T032 [US1] Write E2E test for cancel dialog flow in tests/e2e/exercise-import.spec.ts

**Phase Completion Criteria**:
- ✅ User can select date and see all exercises from that date
- ✅ User can select an exercise and see data populated in form
- ✅ Single exercise auto-imports without dialog
- ✅ All tests passing (integration + component + E2E)

---

## Phase 4: User Story 2 (P2) - Visual Clarity in Exercise Selection

**Story Goal**: Enhance list items with distinguishing details (name, sets, reps, weight, timestamp)

**Independent Test**: Create exercises with similar names but different details → verify list shows distinguishing information clearly → verify scrollable for many items

**Dependencies**: Requires US1 complete (dialog and list infrastructure)

### Backend Implementation

- [ ] T033 [US2] Add timestamp formatting to ExerciseSummary in aggregateExerciseSets in packages/backend/src/services/exercise.service.ts
- [ ] T034 [US2] Add muscleGroup to ExerciseSummary response in packages/backend/src/routes/exercises.ts

### Frontend Implementation

#### Component Tests

- [ ] T035 [US2] Write test for ExerciseListSkeleton renders skeleton items in packages/frontend/src/components/exercise/__tests__/ExerciseListSkeleton.test.tsx
- [ ] T036 [US2] Write test for ExerciseImportListItem shows all details in packages/frontend/src/components/exercise/__tests__/ExerciseImportListItem.test.tsx

#### Components

- [ ] T037 [P] [US2] Create ExerciseListSkeleton component with Tailwind pulse in packages/frontend/src/components/exercise/ExerciseListSkeleton.tsx
- [ ] T038 [US2] Enhance ExerciseImportListItem to display timestamp in packages/frontend/src/components/exercise/ExerciseImportListItem.tsx
- [ ] T039 [US2] Enhance ExerciseImportListItem to display sets/reps/weight summary in packages/frontend/src/components/exercise/ExerciseImportListItem.tsx
- [ ] T040 [US2] Add skeleton loading state to ExerciseImportDialog in packages/frontend/src/components/exercise/ExerciseImportDialog.tsx
- [ ] T041 [US2] Add visual separation between list items with Tailwind in packages/frontend/src/components/exercise/ExerciseImportList.tsx

### E2E Tests

- [ ] T042 [US2] Write E2E test for distinguishing similar exercises in tests/e2e/exercise-import.spec.ts
- [ ] T043 [US2] Write E2E test for scrollable list with many items in tests/e2e/exercise-import.spec.ts

**Phase Completion Criteria**:
- ✅ Each exercise shows name, sets, reps, weight, timestamp
- ✅ List is scrollable for many exercises
- ✅ Skeleton loading state during fetch
- ✅ Visual separation clear between items

---

## Phase 5: User Story 3 (P3) - Quick Import from Recent Workouts

**Story Goal**: Provide quick access to 10 most recent unique exercises without calendar navigation

**Independent Test**: Record exercises over multiple dates → open import UI → verify Recent Workouts section shows 10 unique exercises → tap recent exercise → verify immediate import

**Dependencies**: Requires US1 complete (import infrastructure)

### Backend Implementation

#### Integration Tests

- [ ] T044 [US3] Write integration test for GET /api/exercises/recent in tests/integration/exercise-import-api.test.ts
- [ ] T045 [US3] Write integration test for recent exercises uniqueness in tests/integration/exercise-import-api.test.ts

#### Backend Services & Routes

- [ ] T046 [US3] Implement getRecentUniqueExercises helper in packages/backend/src/services/exercise.service.ts
- [ ] T047 [US3] Implement GET /api/exercises/recent endpoint in packages/backend/src/routes/exercises.ts
- [ ] T048 [US3] Add limit parameter validation for recent endpoint in packages/backend/src/routes/exercises.ts

### Frontend Implementation

#### Component Tests

- [ ] T049 [US3] Write test for RecentExercises renders recent items in packages/frontend/src/components/exercise/__tests__/RecentExercises.test.tsx
- [ ] T050 [US3] Write test for RecentExercises calls onSelect in packages/frontend/src/components/exercise/__tests__/RecentExercises.test.tsx

#### Components

- [ ] T051 [P] [US3] Create RecentExercises component in packages/frontend/src/components/exercise/RecentExercises.tsx
- [ ] T052 [US3] Add recent exercises query hook to useExercises in packages/frontend/src/hooks/useExercises.ts
- [ ] T053 [US3] Add RecentExercises section to ExerciseImportDialog in packages/frontend/src/components/exercise/ExerciseImportDialog.tsx
- [ ] T054 [US3] Implement immediate import for recent exercise selection in packages/frontend/src/pages/Exercise.tsx

### E2E Tests

- [ ] T055 [US3] Write E2E test for recent exercises quick access in tests/e2e/exercise-import.spec.ts
- [ ] T056 [US3] Write E2E test for recent exercise immediate import in tests/e2e/exercise-import.spec.ts

**Phase Completion Criteria**:
- ✅ Recent Workouts section displays 10 unique exercises
- ✅ Tapping recent exercise imports immediately
- ✅ Recent exercises sorted by most recent first
- ✅ All tests passing

---

## Phase 6: Polish & Cross-Cutting Concerns

**Goal**: Edge cases, error states, and performance optimization

### Edge Case Handling

- [ ] T057 Add empty state message "この日はエクササイズが記録されていません" to ExerciseImportDialog in packages/frontend/src/components/exercise/ExerciseImportDialog.tsx
- [ ] T058 Add cancel button to ExerciseImportDialog footer in packages/frontend/src/components/exercise/ExerciseImportDialog.tsx
- [ ] T059 Implement workout-in-progress detection in packages/frontend/src/pages/Exercise.tsx
- [ ] T060 Create workout action dialog (Add/Replace) component in packages/frontend/src/components/exercise/WorkoutActionDialog.tsx
- [ ] T061 Add workout action dialog trigger before import in packages/frontend/src/pages/Exercise.tsx

### Performance Optimization

- [ ] T062 Add react-window virtualization for 50+ items in ExerciseImportList in packages/frontend/src/components/exercise/ExerciseImportList.tsx
- [ ] T063 Add React.memo to ExerciseImportListItem in packages/frontend/src/components/exercise/ExerciseImportListItem.tsx
- [ ] T064 Add useMemo for list data transformations in ExerciseImportList in packages/frontend/src/components/exercise/ExerciseImportList.tsx
- [ ] T065 Configure TanStack Query staleTime (5min) for byDate query in packages/frontend/src/hooks/useExercises.ts
- [ ] T066 Configure TanStack Query staleTime (5min) for recent query in packages/frontend/src/hooks/useExercises.ts

### Accessibility & UX

- [ ] T067 Add aria-labels to dialog and buttons in ExerciseImportDialog in packages/frontend/src/components/exercise/ExerciseImportDialog.tsx
- [ ] T068 Add keyboard navigation (Escape to close) to ExerciseImportDialog in packages/frontend/src/components/exercise/ExerciseImportDialog.tsx
- [ ] T069 Add focus trap to dialog when open in packages/frontend/src/components/exercise/ExerciseImportDialog.tsx
- [ ] T070 Prevent body scroll when dialog open in packages/frontend/src/components/exercise/ExerciseImportDialog.tsx

### Error Handling

- [ ] T071 Add error boundary for dialog component in packages/frontend/src/components/exercise/ExerciseImportDialog.tsx
- [ ] T072 Add error state UI for failed API requests in ExerciseImportDialog in packages/frontend/src/components/exercise/ExerciseImportDialog.tsx
- [ ] T073 Add retry button for failed queries in ExerciseImportDialog in packages/frontend/src/components/exercise/ExerciseImportDialog.tsx

### Performance Testing

- [ ] T074 Write performance test for 50 items <200ms render in tests/unit/exercise-import-performance.test.ts
- [ ] T075 Write performance test for 100 items <1s render in tests/unit/exercise-import-performance.test.ts

**Phase Completion Criteria**:
- ✅ All edge cases handled gracefully
- ✅ Performance targets met (<200ms for 50 items)
- ✅ Accessibility standards met
- ✅ Error states provide clear feedback

---

## Dependencies & Execution Order

### Story Completion Order

```
Setup (Phase 1) → Foundational (Phase 2) → US1 (Phase 3) → US2 (Phase 4) → US3 (Phase 5) → Polish (Phase 6)
                                                          ↘ US3 (Phase 5) can start after US1 ↗
```

**Parallel Opportunities**:
- Phase 2: All type/schema tasks (T004-T009) can run in parallel
- Phase 3: Frontend components (T021-T023) can be built in parallel
- Phase 4: Backend T033 and T034 can run in parallel
- Phase 4: Frontend components (T037-T041) can run in parallel where noted with [P]
- Phase 5: T051 (RecentExercises component) can be built in parallel with backend work

### Critical Path

```
T001-T003 (Setup)
  → T004-T010 (Types)
    → T011-T017 (US1 Backend)
      → T018-T032 (US1 Frontend + E2E)
        → [MVP DELIVERABLE]
          → T033-T043 (US2) + T044-T056 (US3) [can overlap]
            → T057-T075 (Polish)
```

---

## Parallel Execution Examples

### Phase 2 (Foundational) - Maximum Parallelism
```bash
# All type definitions can be written simultaneously
T004, T005, T006, T007, T008, T009 → T010 (rebuild)
```

### Phase 3 (US1) - Frontend Components
```bash
# After backend complete, build components in parallel
T021 (Dialog), T022 (List), T023 (ListItem) → T024-T029 (integration)
```

### Phase 4 (US2) - Visual Enhancements
```bash
# Backend and skeleton can be done in parallel
T033, T034 (backend) || T037 (skeleton) → T038-T041 (enhancements)
```

---

## Task Summary

| Phase | Task Count | Parallelizable | Story | Status |
|-------|------------|----------------|-------|--------|
| Phase 1: Setup | 3 | 1 | - | Pending |
| Phase 2: Foundational | 7 | 6 | - | Pending |
| Phase 3: US1 (P1) | 22 | 3 | Select Multiple | Pending |
| Phase 4: US2 (P2) | 11 | 2 | Visual Clarity | Pending |
| Phase 5: US3 (P3) | 13 | 2 | Recent Workouts | Pending |
| Phase 6: Polish | 19 | 0 | - | Pending |
| **Total** | **75** | **14** | **3** | **0% Complete** |

---

## Format Validation

✅ All tasks follow checklist format: `- [ ] [ID] [P?] [Story?] Description with file path`
✅ Task IDs sequential (T001-T075)
✅ [P] markers on parallelizable tasks (14 tasks)
✅ [US1], [US2], [US3] labels on user story tasks
✅ File paths specified for all implementation tasks
✅ TDD workflow enforced (test tasks before implementation tasks)

---

## Next Steps

1. Start with Phase 1 (Setup) - install dependencies
2. Complete Phase 2 (Foundational) - shared types
3. Implement Phase 3 (US1) following TDD: RED → GREEN → REFACTOR
4. Deliver MVP after Phase 3 completion
5. Continue with Phase 4-6 for full feature delivery

**Recommended first task**: `T001` - Install react-window dependency
