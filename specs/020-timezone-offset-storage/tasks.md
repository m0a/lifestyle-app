# Tasks: Timezone Offset Storage

**Input**: Design documents from `/specs/020-timezone-offset-storage/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Unit tests and integration tests included as specified in quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Monorepo**: `packages/shared/`, `packages/backend/`, `packages/frontend/`
- Tests: `tests/unit/`, `tests/integration/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and prepare project structure

- [x] T001 Install date-fns-tz in frontend: `pnpm --filter @lifestyle-app/frontend add date-fns-tz`
- [x] T002 Build shared package to ensure dependencies are ready: `pnpm build:shared`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core schema and utility changes that MUST be complete before user story implementation

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Update datetimeSchema in packages/shared/src/schemas/index.ts to require offset
- [x] T004 Create toLocalISOString utility in packages/frontend/src/lib/datetime.ts
- [x] T005 [P] Create extractLocalDate utility in packages/backend/src/services/dashboard.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - 記録時のタイムゾーン保持 (Priority: P1) 🎯 MVP

**Goal**: 記録データに記録時のタイムゾーンオフセット（例: `+09:00`）を含めて保存する

**Independent Test**: 新規記録が `2026-01-17T08:00:00+09:00` 形式で保存されることを確認

### Tests for User Story 1

- [x] T006 [P] [US1] Create unit test for toLocalISOString in tests/unit/datetime.test.ts
- [x] T007 [P] [US1] Create unit test for datetimeSchema validation in tests/unit/datetime.test.ts

### Implementation for User Story 1

- [x] T008 [US1] Update weight record form to use toLocalISOString in packages/frontend/src/pages/weights/
- [x] T009 [P] [US1] Update meal record form to use toLocalISOString in packages/frontend/src/pages/meals/
- [x] T010 [P] [US1] Update exercise record form to use toLocalISOString in packages/frontend/src/pages/exercises/
- [x] T011 [US1] Verify API rejects records without timezone offset (manual test)

**Checkpoint**: User Story 1 complete - new records saved with timezone offset

---

## Phase 4: User Story 2 - 既存データのマイグレーション (Priority: P1)

**Goal**: 既存のUTC形式データをJST（+09:00）オフセット付き形式に変換する

**Independent Test**: マイグレーション実行後、全データが `+09:00` 形式になっていることを確認

### Implementation for User Story 2

- [x] T012 [US2] Create migration SQL file in packages/backend/migrations/0026_timezone_offset.sql
- [x] T013 [US2] Test migration locally with preview DB: `pnpm --filter @lifestyle-app/backend db:migrate:local`
- [x] T014 [US2] Verify migrated data format in preview DB (manual verification)

**Checkpoint**: User Story 2 complete - existing data migrated to offset format

---

## Phase 5: User Story 3 - ダッシュボードでの正確な日付表示 (Priority: P2)

**Goal**: ダッシュボードのドットグリッドで記録が正しい日付に表示される

**Independent Test**: 朝7時（JST）に記録した体重が当日のドットとして表示されることを確認

### Tests for User Story 3

- [x] T015 [P] [US3] Create integration test for timezone handling in tests/unit/datetime.test.ts

### Implementation for User Story 3

- [ ] T016 [US3] Update getDailyActivity to use extractLocalDate (slice) in packages/backend/src/services/dashboard.ts
- [ ] T017 [US3] Remove toZonedTime import and usage from packages/backend/src/services/dashboard.ts
- [ ] T018 [US3] Remove timezone query parameter from packages/backend/src/routes/dashboard.ts
- [ ] T019 [P] [US3] Remove timezone parameter from useActivityDots in packages/frontend/src/hooks/useActivityDots.ts
- [ ] T020 [P] [US3] Remove getUserTimezone function from packages/frontend/src/hooks/useMeals.ts
- [ ] T021 [P] [US3] Remove timezone parameter from useMeals queries in packages/frontend/src/hooks/useMeals.ts

**Checkpoint**: User Story 3 complete - dashboard displays correct dates, PR #65 timezone logic removed

---

## Phase 6: User Story 4 - 表示タイムゾーン切り替え (Priority: P3) ⏳ Future

**Goal**: ユーザーが「現在地の時刻で表示」オプションを選択できる

**Independent Test**: 設定切り替えで同じデータが異なるタイムゾーンで表示されることを確認

**Note**: This story is marked as future enhancement (将来拡張). Implementation deferred.

### Implementation for User Story 4 (Deferred)

- [ ] T022 [US4] Design settings schema for display timezone preference
- [ ] T023 [US4] Add timezone display setting to user settings page
- [ ] T024 [US4] Implement timezone conversion utility for display mode
- [ ] T025 [US4] Update dashboard display logic to respect setting

**Checkpoint**: User Story 4 complete - users can toggle display timezone

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final verification and cleanup

- [ ] T026 Run all tests: `pnpm test`
- [ ] T027 Run typecheck: `pnpm typecheck`
- [ ] T028 Run lint: `pnpm lint`
- [ ] T029 Run quickstart.md verification checklist
- [ ] T030 [P] Update CLAUDE.md with feature completion status

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational phase
- **User Story 2 (Phase 4)**: Depends on Foundational phase, can run parallel to US1
- **User Story 3 (Phase 5)**: Depends on US1 and US2 completion (needs offset data to display correctly)
- **User Story 4 (Phase 6)**: Deferred - future implementation
- **Polish (Phase 7)**: Depends on US1, US2, US3 completion

### User Story Dependencies

```
Phase 1 (Setup)
    │
    ▼
Phase 2 (Foundational)
    │
    ├──────────────────┐
    ▼                  ▼
Phase 3 (US1)      Phase 4 (US2)
    │                  │
    └────────┬─────────┘
             ▼
      Phase 5 (US3)
             │
             ▼
      Phase 7 (Polish)
             │
             ▼ (Future)
      Phase 6 (US4)
```

### Parallel Opportunities

**Within Phase 2:**
- T005 can run parallel (different file from T003, T004)

**Within Phase 3 (US1):**
- T006, T007 can run parallel (same test file, different test cases)
- T008, T009, T010 can run parallel (different page files)

**Within Phase 5 (US3):**
- T019, T020, T021 can run parallel (different frontend files)

**Cross-Phase:**
- Phase 3 (US1) and Phase 4 (US2) can run in parallel after Foundational

---

## Parallel Example: User Story 1

```bash
# After T007 (tests written), launch all form updates together:
Task: "Update weight record form in packages/frontend/src/pages/weights/"
Task: "Update meal record form in packages/frontend/src/pages/meals/"
Task: "Update exercise record form in packages/frontend/src/pages/exercises/"
```

---

## Implementation Strategy

### MVP First (User Stories 1, 2, 3)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (record with offset)
4. Complete Phase 4: User Story 2 (migrate existing data)
5. Complete Phase 5: User Story 3 (display correctly)
6. **STOP and VALIDATE**: Test all stories independently
7. Complete Phase 7: Polish
8. Deploy to production

### User Story 4 (Future)

- Deferred as "将来拡張" per spec
- Implement when user timezone switching becomes a requirement
- Can be added independently without affecting MVP functionality

### Incremental Delivery

1. US1 Complete → New records have correct format
2. US2 Complete → Existing data migrated
3. US3 Complete → Dashboard shows correct dates, API simplified
4. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- User Story 4 is deferred - tasks T022-T025 are for future reference
- Migration (US2) is safe - uniform transformation per research.md
- PR #65 cleanup is part of US3 - removes temporary timezone sending
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
