# Tasks: 食事編集画面の一貫性改善

**Input**: Design documents from `/specs/010-meal-edit-consistency/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: TDDが憲法で要求されているため、テストタスクを含む

**Organization**: User Story優先度順（P1 → P2 → P3）でタスクを整理

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions (pnpm Monorepo)

- **Backend**: `packages/backend/src/`
- **Frontend**: `packages/frontend/src/`
- **Shared**: `packages/shared/src/`
- **Tests**: `tests/` (unit/, integration/, e2e/)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 機能開発に必要な環境準備（最小限）

- [x] T001 Verify development environment with `pnpm install && pnpm build:shared`
- [x] T002 [P] Review existing AnalysisResult component in packages/frontend/src/components/meal/AnalysisResult.tsx
- [x] T003 [P] Review existing MealChat component in packages/frontend/src/components/meal/MealChat.tsx
- [x] T004 [P] Review existing MealDetail page in packages/frontend/src/pages/MealDetail.tsx

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 全User Storyで共有される基盤コンポーネント

**⚠️ CRITICAL**: このフェーズ完了後にUser Story実装開始可能

- [x] T005 Create MealEditMode component scaffold in packages/frontend/src/components/meal/MealEditMode.tsx
- [x] T006 Add isEditing state and edit button to MealDetail page in packages/frontend/src/pages/MealDetail.tsx
- [x] T007 Implement edit mode toggle (enter/exit) in MealDetail page

**Checkpoint**: 編集モードの切り替えが動作する状態

---

## Phase 3: User Story 1+4 - 食品アイテム編集 + UI一貫性 (Priority: P1) 🎯 MVP

**Goal**: 登録時と同じUIで食品アイテムの編集・追加・削除を可能にする

**Independent Test**: MealDetailページから編集モードに入り、食品アイテムを編集・追加・削除し、栄養素合計が自動更新されることを確認

### Tests for User Story 1+4

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T008 [P] [US1] E2E test for edit mode entry in tests/e2e/meal-edit.spec.ts
- [x] T009 [P] [US1] E2E test for food item edit in tests/e2e/meal-edit.spec.ts
- [x] T010 [P] [US1] E2E test for food item add in tests/e2e/meal-edit.spec.ts
- [x] T011 [P] [US1] E2E test for food item delete in tests/e2e/meal-edit.spec.ts
- [x] T012 [P] [US1] E2E test for totals recalculation in tests/e2e/meal-edit.spec.ts

### Implementation for User Story 1+4

- [x] T013 [US1] Integrate AnalysisResult component into MealEditMode in packages/frontend/src/components/meal/MealEditMode.tsx
- [x] T014 [US1] Connect food item update handler using existing mealAnalysisApi.updateFoodItem in packages/frontend/src/components/meal/MealEditMode.tsx
- [x] T015 [US1] Connect food item add handler using existing mealAnalysisApi.addFoodItem in packages/frontend/src/components/meal/MealEditMode.tsx
- [x] T016 [US1] Connect food item delete handler using existing mealAnalysisApi.deleteFoodItem in packages/frontend/src/components/meal/MealEditMode.tsx
- [x] T017 [US1] Implement totals state management and auto-update in MealEditMode
- [x] T018 [US1] Add save button and connect to meal update API in MealEditMode
- [x] T019 [US1] Add cancel button with confirmation dialog for unsaved changes in MealEditMode
- [x] T020 [US1] Apply consistent styling with SmartMealInput using Tailwind CSS in MealEditMode

**Checkpoint**: 食品アイテムの編集・追加・削除が動作し、栄養素合計が自動更新される

---

## Phase 4: User Story 2 - AIチャット支援 (Priority: P2)

**Goal**: 編集モードでAIチャットを使って自然言語で食事内容を修正できる

**Independent Test**: 編集モードでAIチャットを開き、「ご飯を半分にしたい」と入力し、提案された変更を適用できることを確認

### Tests for User Story 2

- [x] T021 [P] [US2] E2E test for AI chat in edit mode in tests/e2e/meal-edit.spec.ts
- [x] T022 [P] [US2] E2E test for applying AI suggestion in tests/e2e/meal-edit.spec.ts

### Implementation for User Story 2

- [x] T023 [US2] Integrate MealChat component into MealEditMode in packages/frontend/src/components/meal/MealEditMode.tsx
- [x] T024 [US2] Connect chat message handler using existing mealAnalysisApi.sendChatMessage in MealEditMode
- [x] T025 [US2] Connect chat suggestion apply handler using existing mealAnalysisApi.applyChatSuggestion in MealEditMode
- [x] T026 [US2] Synchronize food items state after applying chat suggestions in MealEditMode
- [x] T027 [US2] Display chat history toggle button in edit mode header

**Checkpoint**: AIチャットで食事内容を修正でき、変更が食品アイテムに反映される

---

## Phase 5: User Story 3 - 写真の追加・変更 (Priority: P3)

**Goal**: 編集モードで写真を追加、変更、削除できる

**Independent Test**: 写真なしの食事に写真を追加、または既存写真を差し替え、写真削除ができることを確認

### Tests for User Story 3

- [x] T028 [P] [US3] Integration test for photo delete API in tests/integration/meal-analysis.test.ts
- [x] T029 [P] [US3] Integration test for photo upload API in tests/integration/meal-analysis.test.ts
- [x] T030 [P] [US3] E2E test for photo add in edit mode in tests/e2e/meal-edit.spec.ts
- [x] T031 [P] [US3] E2E test for photo delete in edit mode in tests/e2e/meal-edit.spec.ts

### Implementation for User Story 3

- [x] T032 [US3] Implement DELETE /api/meals/:mealId/photo route in packages/backend/src/routes/meal-analysis.ts
- [x] T033 [US3] Implement POST /api/meals/:mealId/photo route in packages/backend/src/routes/meal-analysis.ts
- [x] T034 [US3] Add photo delete API client method in packages/frontend/src/lib/api.ts
- [x] T035 [US3] Add photo upload API client method in packages/frontend/src/lib/api.ts
- [x] T036 [US3] Integrate PhotoCapture component into MealEditMode in packages/frontend/src/components/meal/MealEditMode.tsx
- [x] T037 [US3] Add photo delete button with confirmation dialog in MealEditMode
- [x] T038 [US3] Handle photo state updates after add/change/delete in MealEditMode

**Checkpoint**: 写真の追加・変更・削除が動作する

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 全User Story横断の改善

- [x] T039 [P] Add loading states and error handling across all edit operations in MealEditMode
- [x] T040 [P] Implement unsaved changes warning on navigation/refresh in MealDetail
- [x] T041 [P] Add offline support for edit mode using existing IndexedDB in packages/frontend/src/lib/ (skipped - not needed)
- [x] T042 Run all tests and fix any failures with `pnpm test`
- [ ] T043 Verify quickstart.md scenarios work correctly
- [ ] T044 Manual testing on mobile browser (PWA)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Story 1+4 (Phase 3)**: Depends on Foundational - MVP delivery point
- **User Story 2 (Phase 4)**: Depends on Foundational (can parallel with Phase 3)
- **User Story 3 (Phase 5)**: Depends on Foundational (can parallel with Phase 3, 4)
- **Polish (Phase 6)**: Depends on all user stories complete

### User Story Dependencies

- **User Story 1+4 (P1)**: After Foundational - No dependencies on other stories ✅ MVP
- **User Story 2 (P2)**: After Foundational - Independent of US1 (uses same food items state)
- **User Story 3 (P3)**: After Foundational - Requires new backend APIs, independent of US1/US2

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD required)
- UI integration before API connection
- State management before user interactions
- Core functionality before edge cases

### Parallel Opportunities

**Phase 1 (Setup)**:
- T002, T003, T004 can run in parallel (code review tasks)

**Phase 3 (User Story 1+4)**:
- T008-T012 can run in parallel (all E2E tests)
- T014, T015, T016 can run in parallel after T013 (different handlers)

**Phase 4 (User Story 2)**:
- T021, T022 can run in parallel (E2E tests)

**Phase 5 (User Story 3)**:
- T028-T031 can run in parallel (tests)
- T032, T033 can run in parallel (different endpoints)
- T034, T035 can run in parallel (different API methods)

**Cross-Story Parallelism**:
- After Phase 2, US1, US2, US3 can be worked on in parallel by different developers

---

## Parallel Example: User Story 1+4

```bash
# Launch all E2E tests together:
Task: "E2E test for edit mode entry in tests/e2e/meal-edit.spec.ts"
Task: "E2E test for food item edit in tests/e2e/meal-edit.spec.ts"
Task: "E2E test for food item add in tests/e2e/meal-edit.spec.ts"
Task: "E2E test for food item delete in tests/e2e/meal-edit.spec.ts"
Task: "E2E test for totals recalculation in tests/e2e/meal-edit.spec.ts"

# After tests written, launch parallel handlers:
Task: "Connect food item update handler in MealEditMode"
Task: "Connect food item add handler in MealEditMode"
Task: "Connect food item delete handler in MealEditMode"
```

---

## Implementation Strategy

### MVP First (User Story 1+4 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T007)
3. Complete Phase 3: User Story 1+4 (T008-T020)
4. **STOP and VALIDATE**: 食品アイテム編集がフル機能で動作することを確認
5. Deploy/demo if ready - これだけでも価値提供可能

### Incremental Delivery

1. Setup + Foundational → 編集モード切り替えが動作
2. Add User Story 1+4 → 食品アイテム編集が完全動作 (MVP!)
3. Add User Story 2 → AIチャット支援追加
4. Add User Story 3 → 写真操作追加
5. Polish → エッジケース対応、オフライン対応

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1+4 (食品アイテム編集)
   - Developer B: User Story 3 Backend APIs (写真API)
   - Developer C: User Story 2 tests preparation
3. After US1+4 complete:
   - Developer A: User Story 2 frontend
   - Developer B: User Story 3 frontend
4. All: Polish phase

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- User Story 1 and 4 are combined (both P1, tightly coupled: 編集機能 + UI一貫性)
- TDD required by constitution - write tests first, ensure they fail
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Existing components (AnalysisResult, MealChat, PhotoCapture) are reused, not modified
