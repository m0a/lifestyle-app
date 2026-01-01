# Tasks: 食事入力フローの改善

**Input**: Design documents from `/specs/003-meal-input-flow/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend**: `packages/frontend/src/`
- **Backend**: `packages/backend/src/`
- **Shared**: `packages/shared/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 共通型定義とAPIスキーマの追加

- [x] T001 [P] Add TextAnalysisRequest type to packages/shared/src/types.ts
- [x] T002 [P] Add TextAnalysisResponse type to packages/shared/src/types.ts
- [x] T003 [P] Add textAnalysisRequestSchema to packages/shared/src/schemas.ts
- [x] T004 Export new types from packages/shared/src/index.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: バックエンドAPIエンドポイントの追加（全ユーザーストーリーの基盤）

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Add analyzeMealText method to packages/backend/src/services/ai-analysis.ts (AI prompt for text analysis with nutrition estimation)
- [x] T006 Add inferMealType helper function to packages/backend/src/services/ai-analysis.ts (time-based meal type inference: 6-10→breakfast, 11-14→lunch, 17-21→dinner, else→snack)
- [x] T007 Add POST /api/meals/analyze-text endpoint to packages/backend/src/routes/meal-analysis.ts
- [x] T008 Add analyzeText function to packages/frontend/src/lib/api.ts (fetch wrapper with 10s timeout)

**Checkpoint**: API foundation ready - frontend implementation can begin

---

## Phase 3: User Story 1 - シンプルなテキスト入力でAI自動計算 (Priority: P1) 🎯 MVP

**Goal**: テキスト入力だけでAIがカロリー・栄養素を自動計算し、食事記録として保存できる

**Independent Test**: 食事ページのテキスト入力欄に「カレーライス」と入力し、AIがカロリーを自動計算して記録できることを確認する

### Implementation for User Story 1

- [x] T009 [US1] Create SmartMealInput component skeleton in packages/frontend/src/components/meal/SmartMealInput.tsx
- [x] T010 [US1] Add text input field with submit button to SmartMealInput.tsx
- [x] T011 [US1] Add loading state with spinner to SmartMealInput.tsx (FR-002: ローディング表示)
- [x] T012 [US1] Integrate analyzeText API call on submit in SmartMealInput.tsx (FR-001: 送信ボタンクリック時にAI計算)
- [x] T013 [US1] Add 10-second timeout handling with AbortController in SmartMealInput.tsx (FR-002: 10秒タイムアウト)
- [x] T014 [US1] Display AnalysisResult component after successful analysis in SmartMealInput.tsx
- [x] T015 [US1] Enable manual calorie editing in analysis result display (FR-004: 手動修正可能)
- [x] T016 [US1] Add save button with meal type selector to SmartMealInput.tsx (FR-003: ワンクリック保存)
- [x] T017 [US1] Add error handling with fallback to manual input mode (FR-009: エラーメッセージ表示)
- [x] T018 [US1] Integrate SmartMealInput into packages/frontend/src/pages/Meal.tsx (replace AI分析リンク)

**Checkpoint**: User Story 1 完了 - テキスト入力でAI計算・保存が可能

---

## Phase 4: User Story 2 - 自然言語での食事タイプ自動判定 (Priority: P2)

**Goal**: 「昼にラーメン食べた」のような自然言語から食事タイプを自動判定する

**Independent Test**: 「朝ごはんにトースト」と入力し、食事タイプが「朝食」として自動設定されることを確認する

### Implementation for User Story 2

- [x] T019 [US2] Extend AI prompt in analyzeMealText to extract meal type keywords in packages/backend/src/services/ai-analysis.ts
- [x] T020 [US2] Add mealTypeSource field to API response (text vs time inference) in packages/backend/src/routes/meal-analysis.ts
- [x] T021 [US2] Update SmartMealInput to auto-select inferred meal type in packages/frontend/src/components/meal/SmartMealInput.tsx
- [x] T022 [US2] Display meal type source indicator (テキストから判定/時刻から推測) in SmartMealInput.tsx
- [x] T023 [US2] Ensure meal type selector remains editable after auto-selection (FR-007: 手動変更可能)

**Checkpoint**: User Story 2 完了 - 食事タイプが自動判定される

---

## Phase 5: User Story 3 - 統合された入力体験 (Priority: P3)

**Goal**: テキスト入力と写真アップロードを同一UIで提供する

**Independent Test**: 同一の入力エリアから、テキスト入力とカメラアイコンでの写真入力の両方ができることを確認する

### Implementation for User Story 3

- [x] T024 [US3] Add photo attachment button (camera icon) to SmartMealInput in packages/frontend/src/components/meal/SmartMealInput.tsx
- [x] T025 [US3] Integrate PhotoCapture component as modal in SmartMealInput.tsx
- [x] T026 [US3] Handle photo analysis flow within SmartMealInput (reuse existing photo analyze API)
- [x] T027 [US3] Add chat toggle button to SmartMealInput for AI adjustment (reuse MealChat component)
- [x] T028 [US3] Integrate MealChat component for post-analysis adjustments in SmartMealInput.tsx
- [x] T029 [US3] Remove AI食事分析リンク from packages/frontend/src/pages/Meal.tsx
- [x] T030 [US3] Delete packages/frontend/src/pages/MealAnalysis.tsx (FR-010: ページ削除)
- [x] T031 [US3] Remove /meals/analyze route from packages/frontend/src/router.tsx

**Checkpoint**: User Story 3 完了 - 統合入力体験が完成

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 全体的な品質向上とクリーンアップ

- [x] T032 Remove unused imports and dead code from modified files
- [x] T033 Run pnpm lint and fix any linting errors
- [x] T034 Run pnpm test and ensure all tests pass
- [x] T035 Manual E2E test following quickstart.md scenarios

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Depends on US1 completion (extends SmartMealInput with meal type logic)
- **User Story 3 (P3)**: Depends on US1 completion (extends SmartMealInput with photo/chat features)

### Within Each Phase

- Tasks without [P] must be executed sequentially
- Tasks with [P] can run in parallel (different files)

### Parallel Opportunities

**Phase 1 (all parallel)**:
```
T001, T002, T003 can run simultaneously (different type definitions)
```

**Phase 3 (partial parallel)**:
```
T009 must be first (creates component)
T010, T011 can run in parallel after T009 (different sections of component)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T008)
3. Complete Phase 3: User Story 1 (T009-T018)
4. **STOP and VALIDATE**: テキスト入力→AI計算→保存の流れをテスト
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → API ready
2. Add User Story 1 → MVP! テキスト入力で食事記録可能
3. Add User Story 2 → 食事タイプ自動判定追加
4. Add User Story 3 → 写真・チャット統合、旧ページ削除
5. Polish → 品質向上

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- Constitution TDD principle: テスト先行が推奨されるが、本タスクではUI中心のため省略
- 既存コンポーネント（AnalysisResult, MealChat, PhotoCapture）は再利用
- 10秒タイムアウトはAbortControllerで実装
