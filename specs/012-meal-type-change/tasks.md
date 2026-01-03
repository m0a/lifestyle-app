# Tasks: 食事タイプの変更機能

**Input**: Design documents from `/specs/012-meal-type-change/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: TDD approach specified in Constitution - test tasks included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app (monorepo)**: `packages/shared/`, `packages/backend/`, `packages/frontend/`
- **Tests**: `tests/unit/`, `tests/integration/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Zodスキーマの拡張（全ストーリーの基盤）

- [x] T001 Add `set_meal_type` action to `chatChangeSchema` discriminated union in packages/shared/src/schemas/meal-analysis.ts
- [x] T002 Build shared package to verify schema changes with `pnpm build:shared`

**Checkpoint**: ChatChange 型に set_meal_type アクションが追加され、型エラーなし

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: AIプロンプトとパーサーの更新（全ストーリーで使用）

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Update CHAT_SYSTEM_PROMPT to include set_meal_type action instructions in packages/backend/src/services/ai-chat.ts
- [x] T004 Update parseChanges method to handle set_meal_type action in packages/backend/src/services/ai-chat.ts
- [x] T005 Add unit test for parseChanges with set_meal_type in tests/unit/ai-chat.service.test.ts
- [x] T006 Run unit tests to verify parser works: `pnpm test tests/unit/ai-chat.service.test.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - AIチャットで食事タイプを変更する (Priority: P1) 🎯 MVP

**Goal**: ユーザーがAIチャットで「朝食に変更して」と入力すると、食事タイプが変更される

**Independent Test**: AIチャットで「朝食に変更して」と入力し、食事タイプが実際に「朝食」に変更されることを確認

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T007 [P] [US1] Add integration test for set_meal_type apply endpoint in tests/integration/meal-chat.test.ts

### Implementation for User Story 1

- [x] T008 [US1] Add set_meal_type case to /apply endpoint switch statement in packages/backend/src/routes/meal-chat.ts
- [x] T009 [US1] Update mealRecords with new mealType when set_meal_type is applied in packages/backend/src/routes/meal-chat.ts
- [x] T010 [US1] Add mealType to applyChatSuggestion response in packages/backend/src/routes/meal-chat.ts
- [x] T011 [US1] Add getMealTypeLabel helper function for Japanese display in packages/frontend/src/components/meal/MealChat.tsx
- [x] T012 [US1] Add set_meal_type display case in pendingChanges list in packages/frontend/src/components/meal/MealChat.tsx
- [x] T013 [US1] Update onUpdate callback to include mealType change in packages/frontend/src/components/meal/MealChat.tsx
- [x] T014 [US1] Run integration tests: `pnpm test tests/integration/meal-chat.test.ts`

**Checkpoint**: User Story 1 fully functional - AIチャットで食事タイプを変更可能

---

## Phase 4: User Story 2 - 日時と食事タイプを同時に変更する (Priority: P2)

**Goal**: ユーザーが「昨日の朝食として記録して」と入力すると、日時と食事タイプが同時に変更される

**Independent Test**: AIチャットで「昨日の夕食として記録して」と入力し、日時と食事タイプの両方が変更されることを確認

### Tests for User Story 2

- [x] T015 [P] [US2] Add integration test for combined set_datetime + set_meal_type in tests/integration/meal-chat.test.ts

### Implementation for User Story 2

- [x] T016 [US2] Verify AIプロンプトが日時+食事タイプの組み合わせ指示を含む in packages/backend/src/services/ai-chat.ts
- [x] T017 [US2] Verify backend handles multiple changes (set_datetime + set_meal_type) in single apply request in packages/backend/src/routes/meal-chat.ts
- [x] T018 [US2] Verify frontend displays both datetime and meal_type changes in pending list in packages/frontend/src/components/meal/MealChat.tsx
- [x] T019 [US2] Run combined integration test: `pnpm test tests/integration/meal-chat.test.ts`

**Checkpoint**: User Story 2 fully functional - 日時と食事タイプの同時変更が可能

---

## Phase 5: User Story 3 - 変更提案の確認とキャンセル (Priority: P3)

**Goal**: ユーザーがAIからの食事タイプ変更提案を確認し、キャンセルできる

**Independent Test**: 変更提案を「キャンセル」して元の状態を維持できることを確認

### Implementation for User Story 3

- [x] T020 [US3] Verify cancel button clears pendingChanges including set_meal_type in packages/frontend/src/components/meal/MealChat.tsx
- [x] T021 [US3] Verify meal_type change displays user-friendly format (昼食 → 朝食) in packages/frontend/src/components/meal/MealChat.tsx
- [x] T022 [US3] Manual test: Cancel meal type change and verify original type remains

**Checkpoint**: User Story 3 fully functional - キャンセル機能が正常に動作

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 型チェック、リント、全体テスト

- [x] T023 Run TypeScript type check: `pnpm typecheck`
- [x] T024 Run lint: `pnpm lint`
- [x] T025 Run all tests: `pnpm test`
- [x] T026 Manual E2E validation per quickstart.md test scenarios

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational phase completion
- **User Story 2 (Phase 4)**: Depends on Foundational phase (can run in parallel with US1 but integrates US1 behavior)
- **User Story 3 (Phase 5)**: Depends on Foundational phase (can run in parallel with US1/US2)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational - Builds on existing set_datetime functionality
- **User Story 3 (P3)**: Can start after Foundational - Uses existing cancel button functionality

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Backend changes before frontend changes
- Core implementation before UI display

### Parallel Opportunities

- T007 can run in parallel with T008-T010 (different files)
- T015 can run in parallel with T016-T018 (test file vs implementation files)
- T011-T013 are in same file - must be sequential

---

## Parallel Example: User Story 1

```bash
# Launch test task first (can be parallel with backend implementation):
Task: "T007 Add integration test for set_meal_type apply endpoint"

# Backend changes (sequential within file):
Task: "T008 Add set_meal_type case to /apply endpoint"
Task: "T009 Update mealRecords with new mealType"
Task: "T010 Add mealType to response"

# Frontend changes (sequential within file):
Task: "T011 Add getMealTypeLabel helper"
Task: "T012 Add set_meal_type display case"
Task: "T013 Update onUpdate callback"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (スキーマ追加)
2. Complete Phase 2: Foundational (AIプロンプト + パーサー)
3. Complete Phase 3: User Story 1 (バックエンド + フロントエンド)
4. **STOP and VALIDATE**: AIチャットで「朝食に変更して」が動作することを確認
5. Deploy/demo if ready

### Incremental Delivery

1. Phase 1 + 2 → 基盤準備完了
2. Add User Story 1 → **MVP: 食事タイプ変更が動作**
3. Add User Story 2 → 日時+食事タイプの同時変更が動作
4. Add User Story 3 → キャンセル機能の確認完了
5. Phase 6 → 品質確認

### File Summary

| File | Changes |
|------|---------|
| packages/shared/src/schemas/meal-analysis.ts | set_meal_type アクション追加 |
| packages/backend/src/services/ai-chat.ts | プロンプト更新、parseChanges拡張 |
| packages/backend/src/routes/meal-chat.ts | set_meal_type処理、レスポンス更新 |
| packages/frontend/src/components/meal/MealChat.tsx | 表示ロジック、ヘルパー関数追加 |
| tests/unit/ai-chat.service.test.ts | parseChangesテスト追加 |
| tests/integration/meal-chat.test.ts | 統合テスト追加 |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
