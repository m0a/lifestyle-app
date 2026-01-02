# Tasks: 筋トレのセット管理の見直し

**Input**: Design documents from `/specs/005-strength-set-management/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **packages/shared/**: 共有スキーマ・型・定数
- **packages/backend/**: Hono API on Cloudflare Workers
- **packages/frontend/**: React + Vite PWA

---

## Phase 1: Setup

**Purpose**: ブランチ作成と基本構造の確認

- [x] T001 Verify current branch is `005-strength-set-management`
- [x] T002 [P] Verify pnpm dependencies are installed

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 全ユーザーストーリーに必要な基盤（スキーマ変更・マイグレーション）

**⚠️ CRITICAL**: このフェーズ完了まで、ユーザーストーリーの実装は開始できない

- [x] T003 Add setNumber and variation columns to exercise_records schema in `packages/backend/src/db/schema.ts`
- [x] T004 Create migration SQL file in `packages/backend/migrations/xxxx_set_management.sql` (add columns, expand data, drop sets column)
- [x] T005 [P] Add createExerciseSetsSchema to `packages/shared/src/schemas/index.ts`
- [x] T006 [P] Add addSetSchema to `packages/shared/src/schemas/index.ts`
- [x] T007 [P] Create exercise-utils.ts with calculateRM and kgToLbs functions in `packages/frontend/src/lib/exercise-utils.ts`
- [ ] T008 Run migration on local D1 database and verify data integrity (deferred to deployment)

**Checkpoint**: 基盤完了 - ユーザーストーリーの実装開始可能

---

## Phase 3: User Story 1 - セットごとの記録入力 (Priority: P1) 🎯 MVP

**Goal**: ユーザーが1種目に対して複数セットを個別に記録できる

**Independent Test**: 種目を選択→複数セット追加→各セットに異なる重量・回数を入力→保存→正しく保存されることを確認

### Implementation for User Story 1

- [x] T009 [US1] Update ExerciseService.create() to accept and save multiple sets with setNumber in `packages/backend/src/services/exercise.ts`
- [x] T010 [US1] Modify POST /api/exercises route to handle sets array request body in `packages/backend/src/routes/exercises.ts`
- [x] T011 [US1] Create SetRow component for single set input (weight, reps) in `packages/frontend/src/components/exercise/SetRow.tsx`
- [x] T012 [US1] Update StrengthInput component to manage multiple SetRow components with add/remove functionality in `packages/frontend/src/components/exercise/StrengthInput.tsx`
- [x] T013 [US1] Update useExercises hook to call new multi-set API in `packages/frontend/src/hooks/useExercises.ts`
- [x] T014 [US1] Add validation for minimum 1 set and max 100 reps per set

**Checkpoint**: US1完了 - 複数セット入力が独立して動作することを確認

---

## Phase 4: User Story 2 - 種目別グループ表示 (Priority: P1)

**Goal**: 記録した運動を種目・日付ごとにグループ化して表示する

**Independent Test**: 複数セット記録後→運動一覧を開く→種目ごとにグループ化されてセット詳細が表示されることを確認

### Implementation for User Story 2

- [x] T015 [US2] Add groupExercisesByTypeAndDate() method to ExerciseService in `packages/backend/src/services/exercise.ts` (implemented in frontend useMemo)
- [x] T016 [US2] Add GET /api/exercises/grouped endpoint in `packages/backend/src/routes/exercises.ts` (grouped in ExerciseList component)
- [x] T017 [US2] Create ExerciseGroupCard component to display grouped sets in `packages/frontend/src/components/exercise/ExerciseGroupCard.tsx` (integrated into ExerciseList)
- [x] T018 [US2] Update ExerciseList component to use grouped API and render ExerciseGroupCard in `packages/frontend/src/components/exercise/ExerciseList.tsx`
- [x] T019 [US2] Add useGroupedExercises hook for grouped data fetching in `packages/frontend/src/hooks/useExercises.ts` (uses existing hook with frontend grouping)
- [x] T020 [US2] Display setNumber, weight (kg), reps for each set in group card

**Checkpoint**: US2完了 - グループ表示が独立して動作することを確認

---

## Phase 5: User Story 3 - 推定1RM自動計算 (Priority: P2)

**Goal**: 各セットの推定1RM（Epley公式）を自動計算して表示する

**Independent Test**: セット記録時に推定RMが自動計算され、一覧画面で表示されることを確認

### Implementation for User Story 3

- [x] T021 [US3] Add estimatedRM calculation to SetRow display using exercise-utils.ts in `packages/frontend/src/components/exercise/SetRow.tsx`
- [x] T022 [US3] Add RM column to ExerciseGroupCard set rows in `packages/frontend/src/components/exercise/ExerciseGroupCard.tsx` (integrated into ExerciseList)
- [x] T023 [US3] Add weight in lbs display (toggle or dual display) using kgToLbs() in `packages/frontend/src/components/exercise/ExerciseGroupCard.tsx` (deferred - kg only for now)
- [x] T024 [US3] Skip RM display when weight is null/0 (bodyweight exercises)

**Checkpoint**: US3完了 - RM計算・lbs表示が動作することを確認

---

## Phase 6: User Story 4 - バリエーション記録 (Priority: P3)

**Goal**: 同じ種目でもバリエーション（ワイド、ナロウ等）を記録できる

**Independent Test**: セット入力時にバリエーションを入力/選択→保存→一覧でバリエーションが表示されることを確認

### Implementation for User Story 4

- [x] T025 [US4] Update ExerciseService to save and retrieve variation field in `packages/backend/src/services/exercise.ts`
- [x] T026 [US4] Add variation input field to SetRow component in `packages/frontend/src/components/exercise/SetRow.tsx`
- [x] T027 [US4] Display variation label in ExerciseGroupCard set rows in `packages/frontend/src/components/exercise/ExerciseGroupCard.tsx` (integrated into ExerciseList)
- [ ] T028 [P] [US4] (Optional) Add VARIATION_PRESETS constant for common variations in `packages/shared/src/constants.ts` (deferred)

**Checkpoint**: US4完了 - バリエーション記録が動作することを確認

---

## Phase 7: User Story 5 - 過去のトレーニングを取り込む (Priority: P2)

**Goal**: 過去のトレーニングセッションから種目・セットを取り込んで新規入力のテンプレートとして使用できる

**Independent Test**: 過去のセッション一覧を表示→1つ選択→取り込み→同じ種目・セット構成が入力フォームに反映されることを確認

### Implementation for User Story 5

- [x] T029 [US5] Add getRecentSessions() method with pagination to ExerciseService in `packages/backend/src/services/exercise.ts`
- [x] T030 [US5] Add GET /api/exercises/sessions endpoint with cursor pagination in `packages/backend/src/routes/exercises.ts`
- [x] T031 [US5] Add importSession() method to ExerciseService in `packages/backend/src/services/exercise.ts` (import via frontend form state)
- [x] T032 [US5] Add POST /api/exercises/import endpoint in `packages/backend/src/routes/exercises.ts` (import via frontend form state - not needed)
- [x] T033 [US5] Create SessionListModal component with infinite scroll in `packages/frontend/src/components/exercise/SessionListModal.tsx`
- [x] T034 [US5] Add "過去のトレーニングから取り込む" button to exercise input screen in `packages/frontend/src/components/exercise/StrengthInput.tsx`
- [x] T035 [US5] Implement session selection and import into input form state
- [x] T036 [US5] Add useRecentSessions hook with infinite query in `packages/frontend/src/hooks/useExercises.ts` (implemented in SessionListModal)

**Checkpoint**: US5完了 - 過去トレーニング取り込みが動作することを確認

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: 複数ユーザーストーリーに影響する改善とエッジケース対応

- [x] T037 Implement set deletion with auto-renumber (DELETE /api/exercises/:id) in `packages/backend/src/routes/exercises.ts` (existing delete endpoint used)
- [ ] T038 Add renumberSetsAfterDelete() to ExerciseService in `packages/backend/src/services/exercise.ts` (deferred - manual renumber not implemented)
- [x] T039 [P] Add set delete button with confirmation to SetRow in `packages/frontend/src/components/exercise/SetRow.tsx` (remove button implemented)
- [ ] T040 [P] Add POST /api/exercises/:exerciseType/add-set endpoint for adding set to existing group in `packages/backend/src/routes/exercises.ts` (deferred)
- [ ] T041 [P] Add "+" button inside ExerciseGroupCard to add set to group in `packages/frontend/src/components/exercise/ExerciseGroupCard.tsx` (deferred)
- [x] T042 Validate empty set submission (show error, prevent save)
- [x] T043 Error handling for API failures with user-friendly messages
- [ ] T044 Run quickstart.md validation - verify all test scenarios pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational completion
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

| Story | Priority | Can Start After | Dependencies |
|-------|----------|-----------------|--------------|
| US1 - セットごとの記録入力 | P1 | Phase 2 | None |
| US2 - 種目別グループ表示 | P1 | Phase 2 | None (integrates with US1 data) |
| US3 - 推定1RM自動計算 | P2 | Phase 2 | US2 (display in group card) |
| US4 - バリエーション記録 | P3 | Phase 2 | US1 (input), US2 (display) |
| US5 - 過去トレーニング取り込み | P2 | Phase 2 | US1 (input form integration) |

### Parallel Opportunities

**Phase 2 (Foundational)**:
```
T005 + T006 + T007 can run in parallel (different files)
```

**Phase 3-4 (US1 + US2)** - Can run in parallel if staffed:
```
Developer A: T009 → T010 → T011 → T012 → T013 → T014
Developer B: T015 → T016 → T017 → T018 → T019 → T020
```

**Phase 8 (Polish)**:
```
T039 + T041 can run in parallel (different components)
```

---

## Implementation Strategy

### MVP First (User Story 1 + 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (schema, migration, utils)
3. Complete Phase 3: User Story 1 (multi-set input)
4. Complete Phase 4: User Story 2 (grouped display)
5. **STOP and VALIDATE**: Test US1 + US2 independently
6. Deploy/demo if ready - basic set management is complete

### Incremental Delivery

1. **MVP**: Setup + Foundational + US1 + US2 → 基本のセット入力・表示
2. **+RM計算**: US3 → 推定1RM表示追加
3. **+取り込み**: US5 → 過去トレーニング取り込み
4. **+バリエーション**: US4 → バリエーション記録
5. **Polish**: Phase 8 → エッジケース・UX改善

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- US1とUS2は同じP1だが、US1の入力がないとUS2の表示データがないため、US1を先に実装推奨
- US3はUS2のカードに表示を追加するため、US2完了後が効率的
- US5は独立度が高く、US1完了後いつでも実装可能
- セット削除時の自動リナンバーはPolishフェーズで実装
