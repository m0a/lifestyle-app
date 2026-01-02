# Tasks: トレーニング内容の画像共有機能

**Input**: Design documents from `/specs/009-share-training-image/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included as per project constitution (TDD approach) and spec.md test scenarios.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Monorepo structure**: `packages/shared/src/`, `packages/backend/src/`, `packages/frontend/src/`
- **Tests**: `tests/unit/`, `tests/e2e/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency installation

- [ ] T001 Install html-to-image dependency in packages/frontend/package.json
- [ ] T002 [P] Create TypeScript type definitions in packages/shared/src/types/training-image.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core utilities and API that ALL user stories depend on

**WARNING**: No user story work can begin until this phase is complete

- [ ] T003 [P] Implement 1RM calculation utility (Epley formula) in packages/shared/src/utils/rm-calculator.ts
- [ ] T004 [P] Create unit tests for 1RM calculator in tests/unit/rm-calculator.test.ts
- [ ] T005 [P] Create Zod schemas for MaxRM API in packages/shared/src/schemas/exercise.ts
- [ ] T006 Implement GET /api/exercises/max-rm endpoint in packages/backend/src/routes/exercises.ts
- [ ] T007 Create service method for MAX RM query in packages/backend/src/services/exercise.ts

**Checkpoint**: Foundation ready - 1RM calculation working, MAX RM API available

---

## Phase 3: User Story 1 - トレーニング内容を画像として生成する (Priority: P1)

**Goal**: ユーザーがその日の筋トレ内容をカード形式の画像としてプレビュー表示できる

**Independent Test**: トレーニング記録詳細画面から「画像を作成」ボタンをタップし、記録内容がカード形式の画像としてプレビュー表示されることを確認

### Tests for User Story 1

- [ ] T008 [P] [US1] Unit test for transformToImageData in tests/unit/training-image-transform.test.ts
- [ ] T009 [P] [US1] E2E test for image generation flow in tests/e2e/share-training.spec.ts

### Implementation for User Story 1

- [ ] T010 [P] [US1] Create data transformation utility transformToImageData in packages/frontend/src/lib/training-image-transform.ts
- [ ] T011 [P] [US1] Create TrainingImageCard component (single exercise card) in packages/frontend/src/components/exercise/TrainingImageCard.tsx
- [ ] T012 [US1] Create TrainingImagePreview component (full image layout) in packages/frontend/src/components/exercise/TrainingImagePreview.tsx
- [ ] T013 [US1] Create image generator utility with html-to-image in packages/frontend/src/lib/image-generator.ts
- [ ] T014 [US1] Add useTrainingImage hook for data fetching and transformation in packages/frontend/src/hooks/useTrainingImage.ts
- [ ] T015 [US1] Create image preview page/modal accessible from exercise detail in packages/frontend/src/pages/exercise/TrainingImagePage.tsx
- [ ] T016 [US1] Add navigation to image preview from existing exercise page

**Checkpoint**: User Story 1 complete - image preview displays correctly with all exercise data, 1RM values, and MAX RM highlights

---

## Phase 4: User Story 2 - 生成した画像をSNSやメッセージアプリに共有する (Priority: P1)

**Goal**: ユーザーが生成したトレーニング画像をWeb Share APIでX/LINEなどに共有できる

**Independent Test**: プレビュー画面から「共有」ボタンをタップし、スマホの共有シートが表示され、任意のアプリで共有できることを確認

### Implementation for User Story 2

- [ ] T017 [P] [US2] Create useShareImage hook with Web Share API in packages/frontend/src/hooks/useShareImage.ts
- [ ] T018 [US2] Create ShareButton component in packages/frontend/src/components/exercise/ShareButton.tsx
- [ ] T019 [US2] Integrate share button into TrainingImagePage in packages/frontend/src/pages/exercise/TrainingImagePage.tsx
- [ ] T020 [US2] Add error handling for share failures with user feedback

**Checkpoint**: User Story 2 complete - native share sheet appears and images can be shared to X/LINE

---

## Phase 5: User Story 3 - トレーニング画像をダウンロード保存する (Priority: P2)

**Goal**: ユーザーが生成した画像をスマホのフォトライブラリに保存できる

**Independent Test**: プレビュー画面から「保存」ボタンをタップし、スマホの写真アプリに画像が保存されていることを確認

### Implementation for User Story 3

- [ ] T021 [US3] Add download/save functionality to useShareImage hook in packages/frontend/src/hooks/useShareImage.ts
- [ ] T022 [US3] Create SaveButton component in packages/frontend/src/components/exercise/SaveButton.tsx
- [ ] T023 [US3] Integrate save button into TrainingImagePage in packages/frontend/src/pages/exercise/TrainingImagePage.tsx

**Checkpoint**: User Story 3 complete - images can be saved to device photo library

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, performance optimization, and final validation

- [ ] T024 [P] Handle edge case: no training records (show "記録がありません" message) in packages/frontend/src/pages/exercise/TrainingImagePage.tsx
- [ ] T025 [P] Handle edge case: many exercises (10+) with auto font/layout adjustment in packages/frontend/src/components/exercise/TrainingImagePreview.tsx
- [ ] T026 [P] Add iOS Safari retry logic (3 attempts) to image-generator.ts
- [ ] T027 [P] Add fallback to download when Web Share API not supported
- [ ] T028 Performance validation: ensure image generation completes within 2 seconds
- [ ] T029 Run quickstart.md validation and verify all acceptance scenarios

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on User Story 1 (needs generated image to share)
- **User Story 3 (Phase 5)**: Depends on User Story 1 (needs generated image to save)
- **Polish (Phase 6)**: Depends on User Stories 1-3 completion

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No other story dependencies
- **User Story 2 (P1)**: Depends on User Story 1 (needs image generation)
- **User Story 3 (P2)**: Depends on User Story 1 (needs image generation), can run parallel with US2

### Within Each User Story

- Tests written first (TDD approach)
- Utilities/transforms before components
- Inner components before container components
- Core implementation before integration
- Story complete before Polish phase

### Parallel Opportunities

**Phase 1 (Setup)**:
```
T001 and T002 can run in parallel
```

**Phase 2 (Foundational)**:
```
T003, T004, T005 can run in parallel (different files)
Then: T006, T007 sequentially (depends on T005 schemas)
```

**Phase 3 (User Story 1)**:
```
T008, T009 in parallel (tests)
T010, T011 in parallel (utility + component)
Then: T012 (depends on T011)
Then: T013, T014 in parallel
Then: T015, T016 sequentially (page then navigation)
```

**Phase 4-5 (User Stories 2 & 3)**:
```
Can be worked on in parallel by different developers after US1
```

**Phase 6 (Polish)**:
```
T024, T025, T026, T027 can run in parallel (different files/concerns)
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (image generation)
4. Complete Phase 4: User Story 2 (sharing)
5. **STOP and VALIDATE**: Test image generation and sharing flow
6. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Can view training images (value!)
3. Add User Story 2 → Test independently → Can share to X/LINE (MVP complete!)
4. Add User Story 3 → Test independently → Can save locally
5. Polish phase → Edge cases handled, performance validated

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- User Stories 1 & 2 are both P1 priority but US2 depends on US1
- Verify E2E tests cover all acceptance scenarios from spec.md
- iOS Safari retry logic is critical for html-to-image reliability
- Web Share API fallback ensures functionality on unsupported browsers
