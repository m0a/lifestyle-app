# Tasks: Multiple Photos Per Meal

**Input**: Design documents from `/specs/016-multiple-meal-photos/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-spec.md

**Tests**: Tests are REQUIRED per constitution (TDD principle). All tests must be written FIRST and FAIL before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Web app monorepo structure:
- Backend: `packages/backend/src/`, `packages/backend/tests/`
- Frontend: `packages/frontend/src/`, `packages/frontend/tests/`
- Shared: `packages/shared/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database migration and shared type definitions

- [X] T001 Create database migration file at packages/backend/migrations/0006_add_meal_photos.sql
- [X] T002 [P] Create shared photo schemas in packages/shared/src/schemas/photo.ts
- [X] T003 Apply migration locally via pnpm --filter @lifestyle-app/backend db:migrate:local

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Add meal_photos table definition to packages/backend/src/db/schema.ts
- [X] T005 Add meal_photos relations to mealRecords in packages/backend/src/db/schema.ts
- [X] T006 Export MealPhoto and NewMealPhoto types from packages/backend/src/db/schema.ts
- [X] T007 [P] Create MealPhotoService class in packages/backend/src/services/meal-photo.service.ts
- [X] T008 [P] Add photo upload/delete methods to PhotoStorageService in packages/backend/src/services/photo-storage.ts
- [X] T009 Create photo upload queue service using IndexedDB in packages/frontend/src/services/photo-queue.ts

**Checkpoint**: ✅ Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Add Photos to Existing Meal (Priority: P1) 🎯 MVP

**Goal**: Users can add additional photos to existing meal records with AI analysis and total recalculation

**Independent Test**: Create a meal with one photo, add 2-3 additional photos via "Add Photo" button, verify all photos displayed in chronological order and totals updated

### Tests for User Story 1 (TDD - Write FIRST, ensure FAIL)

- [X] T010 [P] [US1] Unit test for MealPhotoService.addPhoto() in packages/backend/tests/unit/meal-photo.service.test.ts
- [X] T011 [P] [US1] Unit test for MealPhotoService.getMealPhotos() in packages/backend/tests/unit/meal-photo.service.test.ts
- [X] T012 [P] [US1] Unit test for MealPhotoService.calculateTotals() in packages/backend/tests/unit/meal-photo.service.test.ts
- [X] T013 [P] [US1] Integration test for POST /api/meals/:mealId/photos in packages/backend/tests/integration/meal-photos.test.ts
- [X] T014 [P] [US1] Integration test for GET /api/meals/:mealId/photos in packages/backend/tests/integration/meal-photos.test.ts
- [X] T015 [P] [US1] Integration test for DELETE /api/meals/:mealId/photos/:photoId in packages/backend/tests/integration/meal-photos.test.ts

### Implementation for User Story 1

- [X] T016 [US1] Implement getMealPhotos() method in packages/backend/src/services/meal-photo.service.ts
- [X] T017 [US1] Implement addPhoto() method with 10-photo limit check in packages/backend/src/services/meal-photo.service.ts
- [X] T018 [US1] Implement deletePhoto() method with last-photo check in packages/backend/src/services/meal-photo.service.ts
- [X] T019 [US1] Implement calculateTotals() aggregation method in packages/backend/src/services/meal-photo.service.ts
- [X] T020 [US1] Add GET /api/meals/:mealId/photos endpoint in packages/backend/src/routes/meals.ts
- [X] T021 [US1] Add POST /api/meals/:mealId/photos endpoint with file upload in packages/backend/src/routes/meals.ts
- [X] T022 [US1] Add DELETE /api/meals/:mealId/photos/:photoId endpoint in packages/backend/src/routes/meals.ts
- [X] T023 [US1] Add presigned URL generation for photos in GET endpoint in packages/backend/src/routes/meals.ts
- [X] T024 [P] [US1] Create useMealPhotos hook in packages/frontend/src/hooks/useMealPhotos.ts
- [X] T025 [P] [US1] Create PhotoUploadButton component in packages/frontend/src/components/meal/PhotoUploadButton.tsx
- [X] T026 [US1] Modify MealList component to show photo count in packages/frontend/src/components/meal/MealList.tsx
- [X] T027 [US1] Add photo grid display to meal detail view in packages/frontend/src/components/meal/MealEditMode.tsx
- [X] T028 [US1] Add "Add Photo" button with upload flow to meal detail in packages/frontend/src/components/meal/MealEditMode.tsx
- [X] T029 [US1] Add delete photo button with confirmation to each photo in packages/frontend/src/components/meal/MealEditMode.tsx
- [X] T030 [US1] Implement totals recalculation on photo add/delete in packages/frontend/src/components/meal/MealEditMode.tsx

**Checkpoint**: At this point, User Story 1 should be fully functional - users can add/delete photos and see updated totals

---

## Phase 4: User Story 2 - Add Photos via AI Chat (Priority: P2)

**Goal**: Users can upload photos directly in AI chat interface during meal consultation, with seamless analysis integration

**Independent Test**: Open AI chat for a meal, click "Add Photo" button, upload photo, verify photo added to meal and AI responds with updated nutritional analysis

### Tests for User Story 2 (TDD - Write FIRST, ensure FAIL)

- [X] T031 [P] [US2] Integration test for POST /api/meal-chat/:mealId/add-photo in packages/backend/tests/integration/meal-chat-photos.test.ts
- [X] T032 [P] [US2] E2E test for chat photo upload flow in packages/frontend/tests/e2e/meal-chat-photo.spec.ts

### Implementation for User Story 2

- [X] T033 [US2] Add POST /api/meal-chat/:mealId/add-photo endpoint in packages/backend/src/routes/meal-chat.ts
- [X] T034 [US2] Add photo upload handling with chat message creation in packages/backend/src/routes/meal-chat.ts
- [X] T035 [US2] Trigger AI analysis in background when photo added via chat in packages/backend/src/routes/meal-chat.ts
- [X] T036 [US2] Send AI acknowledgment message ("Analyzing photo...") in packages/backend/src/routes/meal-chat.ts
- [X] T037 [P] [US2] Add "Add Photo" button to MealChat component in packages/frontend/src/components/meal/MealChat.tsx
- [X] T038 [US2] Implement photo upload with progress indicator in chat UI in packages/frontend/src/components/meal/MealChat.tsx
- [X] T039 [US2] Display AI response with updated nutrition after analysis in packages/frontend/src/components/meal/MealChat.tsx
- [X] T040 [US2] Handle background upload (allow typing while uploading) in packages/frontend/src/components/meal/MealChat.tsx
- [X] T041 [US2] Show photo thumbnails in chat message thread in packages/frontend/src/components/meal/MealChat.tsx

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - chat photo upload flows seamlessly

---

## Phase 5: User Story 3 - View Multiple Photos in History List (Priority: P3)

**Goal**: Meal history displays photos in horizontally scrollable carousel without taking excessive vertical space

**Independent Test**: Create 3 meals with 2-5 photos each, view history list, verify each meal shows carousel with indicators and horizontal/vertical scroll don't conflict

### Tests for User Story 3 (TDD - Write FIRST, ensure FAIL)

- [X] T042 [P] [US3] Unit test for PhotoCarousel component in packages/frontend/src/components/meal/PhotoCarousel.test.tsx
- [X] T043 [P] [US3] E2E test for carousel swipe interaction in packages/frontend/tests/e2e/meal-history-carousel.spec.ts
- [X] T044 [P] [US3] E2E test for vertical scroll not triggering carousel in packages/frontend/tests/e2e/meal-history-carousel.spec.ts

### Implementation for User Story 3

- [X] T045 [P] [US3] Create PhotoCarousel component with scroll-snap CSS in packages/frontend/src/components/meal/PhotoCarousel.tsx
- [X] T046 [US3] Add scroll position tracking and indicator dots to PhotoCarousel in packages/frontend/src/components/meal/PhotoCarousel.tsx
- [X] T047 [US3] Add touch-action: pan-x to carousel container in packages/frontend/src/components/meal/PhotoCarousel.tsx
- [X] T048 [US3] Handle single-photo case (no carousel) in PhotoCarousel in packages/frontend/src/components/meal/PhotoCarousel.tsx
- [X] T049 [US3] Integrate PhotoCarousel into MealList component in packages/frontend/src/components/meal/MealList.tsx
- [X] T050 [US3] Ensure parent scroll container has touch-action: pan-y in packages/frontend/src/components/meal/MealList.tsx
- [X] T051 [US3] Add lazy loading for carousel images in packages/frontend/src/components/meal/PhotoCarousel.tsx
- [X] T052 [US3] Add loading placeholders for photos in packages/frontend/src/components/meal/PhotoCarousel.tsx

**Checkpoint**: All three user stories should now be independently functional - history list has smooth carousels

---

## Phase 6: User Story 4 - Take Multiple Photos During Initial Recording (Priority: P4)

**Goal**: Users can capture multiple photos during meal creation before saving

**Independent Test**: Create new meal, add 3 photos before saving, verify all photos saved and analyzed together

### Tests for User Story 4 (TDD - Write FIRST, ensure FAIL)

- [X] T053 [P] [US4] Modify POST /api/meals test to support multiple photos in packages/backend/tests/integration/meals.test.ts
- [X] T054 [P] [US4] E2E test for multi-photo meal creation in packages/frontend/tests/e2e/meal-creation-multi-photo.spec.ts

### Implementation for User Story 4

- [X] T055 [US4] Modify POST /api/meals endpoint to accept photos array in packages/backend/src/routes/meals.ts
- [X] T056 [US4] Create meal_photos records for all uploaded photos in packages/backend/src/routes/meals.ts
- [X] T057 [US4] Trigger AI analysis for all photos in batch in packages/backend/src/routes/meals.ts
- [X] T058 [P] [US4] Add "Add Another Photo" button to SmartMealInput in packages/frontend/src/components/meal/SmartMealInput.tsx
- [X] T059 [US4] Display photo preview list before saving in packages/frontend/src/components/meal/SmartMealInput.tsx
- [X] T060 [US4] Allow removing photos from preview list in packages/frontend/src/components/meal/SmartMealInput.tsx
- [X] T061 [US4] Handle multiple file uploads in single request in packages/frontend/src/components/meal/SmartMealInput.tsx

**Checkpoint**: User Story 4 complete - users can add multiple photos at meal creation time

---

## Phase 7: User Story 5 - View and Manage Photo Gallery (Priority: P5)

**Status**: ✅ COMPLETED (Feature deemed unnecessary - removed in PR #36)

**Goal**: Users can view photos in full-screen gallery and delete individual photos

**Decision**: PhotoGallery機能は既存のMealEditModeで写真削除が可能なため、機能重複と判断。詳細ページへの遷移の方が自然なUXフローとして、フルスクリーンギャラリーは不要と結論。

**Independent Test**: Create meal with 3 photos, tap photo to open gallery, swipe between photos, delete one photo, verify remaining photos and updated totals

### Tests for User Story 5 (TDD - Write FIRST, ensure FAIL)

- [X] T062 [P] [US5] Unit test for PhotoGallery component in packages/frontend/src/components/meal/PhotoGallery.test.tsx
- [X] T063 [P] [US5] E2E test for full-screen gallery navigation in packages/frontend/tests/e2e/photo-gallery.spec.ts
- [X] T064 [P] [US5] E2E test for photo deletion from gallery in packages/frontend/tests/e2e/photo-gallery.spec.ts

### Implementation for User Story 5

- [X] T065 [P] [US5] Create PhotoGallery modal component in packages/frontend/src/components/meal/PhotoGallery.tsx
- [X] T066 [US5] Add full-screen photo display with swipe navigation in packages/frontend/src/components/meal/PhotoGallery.tsx
- [X] T067 [US5] Add delete button with confirmation dialog in packages/frontend/src/components/meal/PhotoGallery.tsx
- [X] T068 [US5] Prevent deletion of last photo with warning in packages/frontend/src/components/meal/PhotoGallery.tsx
- [X] T069 [US5] Integrate PhotoGallery with PhotoCarousel (open on photo tap) in packages/frontend/src/components/meal/PhotoCarousel.tsx
- [X] T070 [US5] Integrate PhotoGallery with MealEditMode (open from photo grid) in packages/frontend/src/components/meal/MealEditMode.tsx

**Checkpoint**: All five user stories complete - full multi-photo functionality delivered

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T071 [P] Add photo reorder endpoint PATCH /api/meals/:mealId/photos/reorder in packages/backend/src/routes/meals.ts
- [ ] T072 [P] Add retry photo analysis endpoint POST /api/meals/:mealId/photos/:photoId/analyze in packages/backend/src/routes/meals.ts
- [ ] T073 [P] Add photo analysis status polling endpoint GET /api/meals/:mealId/photos/:photoId/status in packages/backend/src/routes/meals.ts
- [ ] T074 [P] Implement lazy migration for legacy photo_key meals in packages/backend/src/services/meal-photo.service.ts
- [ ] T075 [P] Add photo size limit validation (10MB) client-side in packages/frontend/src/components/meal/PhotoUploadButton.tsx
- [ ] T076 [P] Add photo format validation (JPEG/PNG only) client-side in packages/frontend/src/components/meal/PhotoUploadButton.tsx
- [ ] T077 [P] Implement offline photo queue sync logic in packages/frontend/src/services/photo-queue.ts
- [ ] T078 [P] Add error boundary for photo upload failures in packages/frontend/src/components/meal/
- [ ] T079 [P] Optimize image loading with responsive sizes in packages/frontend/src/components/meal/PhotoCarousel.tsx
- [ ] T080 [P] Add loading skeletons for photo carousels in packages/frontend/src/components/meal/MealList.tsx
- [ ] T081 Update quickstart.md with actual implementation details in specs/016-multiple-meal-photos/quickstart.md
- [ ] T082 Run E2E test suite for all user stories to validate independence
- [ ] T083 Update CLAUDE.md with feature completion notes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (US1 → US2 → US3 → US4 → US5)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Independent (uses US1 endpoints but doesn't modify them)
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Independent (displays photos from US1 but doesn't modify logic)
- **User Story 4 (P4)**: Can start after Foundational (Phase 2) - Independent (creates meals, doesn't modify existing meal flows)
- **User Story 5 (P5)**: Can start after Foundational (Phase 2) - Independent (UI-only enhancement)

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD)
- Models/schemas before services
- Services before endpoints
- Backend endpoints before frontend integration
- Core implementation before UI polish
- Story complete before moving to next priority

### Parallel Opportunities

- **Phase 1**: T002 can run in parallel with T001
- **Phase 2**: T007, T008, T009 can run in parallel after T004-T006 complete
- **User Story Tests**: All test tasks marked [P] within a story can run in parallel
- **User Story Implementation**: Multiple [P] tasks within same story (different files) can run in parallel
- **Across Stories**: Once Foundational completes, all user stories can be worked on in parallel by different developers

---

## Parallel Example: User Story 1

```bash
# Step 1: Write all tests in parallel (ensure they FAIL)
Task: "Unit test for MealPhotoService.addPhoto() in packages/backend/tests/unit/meal-photo.service.test.ts"
Task: "Unit test for MealPhotoService.getMealPhotos() in packages/backend/tests/unit/meal-photo.service.test.ts"
Task: "Unit test for MealPhotoService.calculateTotals() in packages/backend/tests/unit/meal-photo.service.test.ts"
Task: "Integration test for POST /api/meals/:mealId/photos in packages/backend/tests/integration/meal-photos.test.ts"
Task: "Integration test for GET /api/meals/:mealId/photos in packages/backend/tests/integration/meal-photos.test.ts"
Task: "Integration test for DELETE /api/meals/:mealId/photos/:photoId in packages/backend/tests/integration/meal-photos.test.ts"

# Step 2: After tests fail, implement service and endpoints sequentially (T016-T023)

# Step 3: Build frontend components in parallel (different files)
Task: "Create useMealPhotos hook in packages/frontend/src/hooks/useMealPhotos.ts"
Task: "Create PhotoUploadButton component in packages/frontend/src/components/meal/PhotoUploadButton.tsx"

# Step 4: Integrate into existing components sequentially (T026-T030)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T009) - CRITICAL
3. Complete Phase 3: User Story 1 (T010-T030)
4. **STOP and VALIDATE**: Test User Story 1 independently with acceptance scenarios
5. Deploy/demo if ready

**Result**: Users can add multiple photos to existing meals - core value delivered

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (Chat integration)
4. Add User Story 3 → Test independently → Deploy/Demo (History carousel)
5. Add User Story 4 → Test independently → Deploy/Demo (Multi-photo creation)
6. Add User Story 5 → Test independently → Deploy/Demo (Full gallery)
7. Add Polish phase → Final optimizations

Each story adds incremental value without breaking previous stories.

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T009)
2. Once Foundational is done:
   - Developer A: User Story 1 (T010-T030)
   - Developer B: User Story 2 (T031-T041)
   - Developer C: User Story 3 (T042-T052)
3. Stories complete and integrate independently
4. Team reconvenes for User Story 4, 5, and Polish

---

## Task Summary

**Total Tasks**: 83
- Setup: 3 tasks
- Foundational: 6 tasks (BLOCKS all stories)
- User Story 1 (P1): 21 tasks (6 tests + 15 implementation)
- User Story 2 (P2): 11 tasks (2 tests + 9 implementation)
- User Story 3 (P3): 11 tasks (3 tests + 8 implementation)
- User Story 4 (P4): 9 tasks (2 tests + 7 implementation)
- User Story 5 (P5): 9 tasks (3 tests + 6 implementation)
- Polish: 13 tasks

**Parallelization**:
- 28 tasks marked [P] (can run in parallel within constraints)
- 5 user stories can run in parallel after Foundational phase

**Independent Test Criteria**:
- US1: Add photos to existing meal, verify all displayed + totals updated
- US2: Add photo via chat, verify seamless upload + AI response
- US3: View history with carousels, verify smooth scrolling without conflicts
- US4: Create meal with multiple photos, verify all saved + analyzed
- US5: Open gallery, delete photo, verify updated state

**Suggested MVP Scope**: Phase 1 + Phase 2 + Phase 3 (User Story 1) = 30 tasks

**Format Validation**: ✅ All 83 tasks follow checklist format with ID, [P] marker where applicable, [Story] label for user story tasks, and exact file paths

---

## Notes

- [P] tasks = different files, no dependencies - can run in parallel
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- **TDD REQUIRED**: Write tests FIRST, ensure they FAIL, then implement
- Verify tests pass after implementation
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Constitution compliance: All principles (Privacy, Simple UX, TDD, Type Safety, Simplicity) enforced
