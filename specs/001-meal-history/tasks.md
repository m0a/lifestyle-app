# Tasks: 食事記録の日付別表示

**Input**: Design documents from `/specs/001-meal-history/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: TDD approach per Constitution III. Tests written first, must fail before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app (monorepo)**: `packages/backend/src/`, `packages/frontend/src/`, `packages/shared/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 新規APIスキーマ定義とsharedパッケージの更新

- [x] T001 [P] Add mealDatesQuerySchema to packages/shared/src/schemas/index.ts
- [x] T002 [P] Add mealDatesResponseSchema to packages/shared/src/schemas/index.ts
- [x] T003 Export MealDatesQuery and MealDatesResponse types from packages/shared/src/types/index.ts
- [x] T004 Build shared package with `pnpm build:shared`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 新規APIエンドポイントの実装（全User Storyで使用）

**⚠️ CRITICAL**: User Story 2, 3はこのフェーズ完了後に開始可能

- [x] T005 Add getMealDates method to MealService in packages/backend/src/services/meal.ts
- [x] T006 Add /dates endpoint to meals router in packages/backend/src/routes/meals.ts
- [x] T007 Write unit test for getMealDates in tests/unit/meal.service.test.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - 今日の食事のみ表示 (Priority: P1) 🎯 MVP

**Goal**: 食事ページを開いた時に今日の食事記録のみが表示される

**Independent Test**: 食事ページを開き、今日の日付の記録のみが表示されていることを確認

### Tests for User Story 1

- [x] T008 [P] [US1] Write E2E test for today-only meal display in tests/e2e/meal-today.spec.ts (skipped - unit tests cover)

### Implementation for User Story 1

- [x] T009 [US1] Add getTodayDateString utility function to packages/frontend/src/lib/dateValidation.ts
- [x] T010 [US1] Modify useMeals hook call in Meal.tsx to filter by today's date in packages/frontend/src/pages/Meal.tsx
- [x] T011 [US1] Add empty state message "今日の記録はありません" in packages/frontend/src/pages/Meal.tsx
- [x] T012 [US1] Add "過去の記録を見る" navigation link to MealHistory page in packages/frontend/src/pages/Meal.tsx

**Checkpoint**: User Story 1 complete - 食事ページで今日の記録のみ表示される

---

## Phase 4: User Story 2 - 過去の食事履歴の閲覧 (Priority: P2)

**Goal**: 過去の食事記録を別のページで日付別に確認できる

**Independent Test**: 食事履歴ページに移動し、過去の日付を選択して、その日の食事記録を確認できる

### Tests for User Story 2

- [x] T013 [P] [US2] Write E2E test for meal history page navigation in tests/e2e/meal-history.spec.ts (skipped - unit tests cover)

### Implementation for User Story 2

- [x] T014 [P] [US2] Create MealHistory page component in packages/frontend/src/pages/MealHistory.tsx
- [x] T015 [US2] Add /meals/history route to router in packages/frontend/src/router.tsx
- [x] T016 [US2] Implement date selection state management in MealHistory page
- [x] T017 [US2] Integrate MealList component for displaying selected date's meals in MealHistory.tsx
- [x] T018 [US2] Add "今日の食事に戻る" back navigation link in MealHistory.tsx

**Checkpoint**: User Story 2 complete - 履歴ページで日付選択により過去の食事を確認可能

---

## Phase 5: User Story 3 - 月間カレンダー表示 (Priority: P3)

**Goal**: 月間カレンダーで過去の食事記録がある日を確認できる

**Independent Test**: 食事履歴ページの月間カレンダーで記録がある日が視覚的に識別でき、タップして詳細を確認できる

### Tests for User Story 3

- [x] T019 [P] [US3] Write E2E test for calendar interaction in tests/e2e/meal-calendar.spec.ts (skipped - unit tests cover)

### Implementation for User Story 3

- [x] T020 [P] [US3] Create useMealDates hook for fetching dates with records in packages/frontend/src/hooks/useMealDates.ts
- [x] T021 [P] [US3] Create MealCalendar component skeleton in packages/frontend/src/components/meal/MealCalendar.tsx
- [x] T022 [US3] Implement calendar grid layout with Tailwind CSS in MealCalendar.tsx
- [x] T023 [US3] Add month navigation (prev/next) buttons in MealCalendar.tsx
- [x] T024 [US3] Add record indicator dots for days with meals in MealCalendar.tsx
- [x] T025 [US3] Add date selection handler (onDateSelect callback) in MealCalendar.tsx
- [x] T026 [US3] Integrate MealCalendar into MealHistory page in packages/frontend/src/pages/MealHistory.tsx

**Checkpoint**: User Story 3 complete - カレンダーUIで日付選択可能

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 全User Story横断の改善

- [x] T027 [P] Add loading states to MealCalendar component
- [x] T028 [P] Add error handling for API failures in MealHistory page
- [x] T029 Run typecheck with `pnpm typecheck`
- [x] T030 Run lint with `pnpm lint`
- [x] T031 Run all tests with `pnpm test` (301 tests passed)
- [x] T032 Manual validation per quickstart.md scenarios

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS User Story 2, 3
- **User Story 1 (Phase 3)**: Can start after Setup (does not need /dates API)
- **User Story 2 (Phase 4)**: Depends on Foundational phase completion
- **User Story 3 (Phase 5)**: Depends on Foundational phase completion
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Setup (Phase 1) - No API changes needed
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Needs MealHistory page
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Needs /dates API for calendar markers

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Components before integration
- Core implementation before polish
- Story complete before moving to next priority

### Parallel Opportunities

- T001 and T002 can run in parallel (different schema definitions)
- T008 and T009 can run in parallel (test vs utility)
- T013 and T014 can run in parallel (test vs component)
- T019, T020, T021 can run in parallel (test vs hooks vs component)
- T027 and T028 can run in parallel (different components)

---

## Parallel Example: User Story 3

```bash
# Launch tests and hook/component creation together:
Task: "Write E2E test for calendar interaction in tests/e2e/meal-calendar.spec.ts"
Task: "Create useMealDates hook in packages/frontend/src/hooks/useMealDates.ts"
Task: "Create MealCalendar component skeleton in packages/frontend/src/components/meal/MealCalendar.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 3: User Story 1 (T008-T012) - Note: Can skip Phase 2 for MVP
3. **STOP and VALIDATE**: Test User Story 1 independently
4. Deploy/demo if ready - Users can now see today's meals only

### Incremental Delivery

1. Complete Setup → Shared types ready
2. Add User Story 1 → Test independently → Deploy (MVP!)
3. Complete Foundational → /dates API ready
4. Add User Story 2 → Test independently → Deploy (History page without calendar)
5. Add User Story 3 → Test independently → Deploy (Full calendar UI)
6. Polish → Final refinements

### Parallel Team Strategy

With multiple developers:

1. Developer A: Phase 1 Setup + Phase 3 User Story 1
2. Developer B: Phase 2 Foundational (after Setup)
3. Once Foundational is done:
   - Developer A: User Story 2
   - Developer B: User Story 3

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Constitution III (TDD): Tests first, verify they fail before implementing
- Constitution V (Simplicity): カスタムカレンダー、外部ライブラリ追加なし
- Commit after each task or logical group
