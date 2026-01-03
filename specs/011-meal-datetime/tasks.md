# Tasks: 食事日時コントロール

**Input**: Design documents from `/specs/011-meal-datetime/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app (monorepo)**: `packages/backend/src/`, `packages/frontend/src/`, `packages/shared/src/`
- **Tests**: `tests/unit/`, `tests/integration/`, `tests/e2e/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: この機能はフロントエンドUIの改善が中心。バックエンドは変更不要。

- [x] T001 既存のMealInput.tsx, MealEditMode.tsx, MealDetail.tsxを確認し、現在の実装状態を把握する

**Checkpoint**: 既存実装の確認完了

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 未来日時バリデーションユーティリティを共通化

- [x] T002 未来日時バリデーションユーティリティを作成 in packages/frontend/src/lib/dateValidation.ts

**Checkpoint**: バリデーションユーティリティ準備完了 - ユーザーストーリー実装開始可能

---

## Phase 3: User Story 1 - 過去の食事を登録する (Priority: P1) 🎯 MVP

**Goal**: 食事登録画面で任意の過去日時を指定して登録できる

**Independent Test**: 食事登録画面で昨日の日付を選択して登録し、昨日の食事一覧に表示されることを確認

### Tests for User Story 1

- [x] T003 [P] [US1] 未来日時バリデーションの単体テスト in tests/unit/dateValidation.test.ts
- [ ] T004 [P] [US1] MealInputコンポーネントのテスト in tests/unit/MealInput.test.tsx

### Implementation for User Story 1

- [x] T005 [US1] MealInputコンポーネントにmax属性で未来日時制限を追加 in packages/frontend/src/components/meal/MealInput.tsx
- [x] T006 [US1] MealInputにフォーム送信前の未来日時バリデーションを追加 in packages/frontend/src/components/meal/MealInput.tsx
- [x] T007 [US1] バリデーションエラー時のエラーメッセージ表示を追加 in packages/frontend/src/components/meal/MealInput.tsx

**Checkpoint**: User Story 1 完了 - 過去の日時で食事を登録できる

---

## Phase 4: User Story 2 - 既存の食事記録の日時を修正する (Priority: P2)

**Goal**: 食事編集画面で記録日時を変更して保存できる

**Independent Test**: 既存の食事記録を開き、日時を変更して保存、変更後の日時で表示されることを確認

### Tests for User Story 2

- [ ] T008 [P] [US2] MealEditModeの日時編集機能テスト in tests/unit/MealEditMode.test.tsx

### Implementation for User Story 2

- [x] T009 [US2] MealEditModeに日時編集セクションのstateを追加 in packages/frontend/src/components/meal/MealEditMode.tsx
- [x] T010 [US2] 日時編集UIコンポーネント（datetime-local入力）を追加 in packages/frontend/src/components/meal/MealEditMode.tsx
- [x] T011 [US2] 日時変更時のAPI呼び出し（updateMeal mutation）を実装 in packages/frontend/src/components/meal/MealEditMode.tsx
- [x] T012 [US2] 日時変更後のキャッシュ無効化とリロード処理を実装 in packages/frontend/src/components/meal/MealEditMode.tsx
- [x] T013 [US2] 編集モードに未来日時バリデーションを追加 in packages/frontend/src/components/meal/MealEditMode.tsx

**Checkpoint**: User Story 2 完了 - 既存の食事記録の日時を編集できる

---

## Phase 5: User Story 3 - 日付をまたいで食事を管理する (Priority: P3)

**Goal**: 深夜の食事を前日の日付として記録できる

**Independent Test**: 深夜0:30に前日の日付で食事を登録し、前日の食事一覧に表示されることを確認

### Tests for User Story 3

- [ ] T014 [P] [US3] 日付またぎシナリオのE2Eテスト in tests/e2e/meal-datetime.spec.ts (US1,US2の実装で対応済み)

### Implementation for User Story 3

> User Story 1, 2の実装で対応済み。追加実装なし。

**Checkpoint**: User Story 3 完了 - 日付またぎの食事を正しく記録できる

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 全体のUX改善とテスト強化

- [ ] T015 [P] 統合テスト（登録→編集→確認フロー） in tests/integration/meal-datetime.test.ts
- [ ] T016 [P] E2Eテスト（完全なユーザーフロー） in tests/e2e/meal-datetime.spec.ts
- [ ] T017 quickstart.mdの検証シナリオを実行して動作確認

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし - 即開始可能
- **Foundational (Phase 2)**: Setup完了後 - 全ユーザーストーリーをブロック
- **User Stories (Phase 3-5)**: Foundational完了後
  - US1 → US2 → US3 の順序で実装（ただしUS3はUS1,2で対応済み）
- **Polish (Phase 6)**: 全ユーザーストーリー完了後

### User Story Dependencies

- **User Story 1 (P1)**: Foundational完了後 - 他ストーリーへの依存なし
- **User Story 2 (P2)**: Foundational完了後 - US1と独立してテスト可能
- **User Story 3 (P3)**: US1, US2の実装で対応済み（追加実装なし）

### Within Each User Story

- Tests → Implementation → Integration の順序
- バリデーション実装 → UI実装 → API連携の順序

### Parallel Opportunities

- T003, T004: US1のテストは並列実行可能
- T008: US2のテストはUS1と並列実行可能
- T014, T015, T016: Polishフェーズのテストは並列実行可能

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "T003 [P] [US1] 未来日時バリデーションの単体テスト in tests/unit/dateValidation.test.ts"
Task: "T004 [P] [US1] MealInputコンポーネントのテスト in tests/unit/MealInput.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup（既存コード確認）
2. Complete Phase 2: Foundational（バリデーションユーティリティ）
3. Complete Phase 3: User Story 1（過去日時での登録）
4. **STOP and VALIDATE**: MealInputで過去日時を選択して登録できることを確認
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → 基盤準備完了
2. User Story 1 → 過去の食事を登録できる（MVP!）
3. User Story 2 → 既存記録の日時を編集できる
4. User Story 3 → US1,2で対応済み（追加作業なし）
5. Polish → テスト強化、最終確認

---

## Notes

- [P] tasks = 異なるファイル、依存なし
- [Story] label = トレーサビリティのため特定のユーザーストーリーにマッピング
- バックエンドは変更不要（既存APIで対応済み）
- 主な作業はフロントエンドUIの改善
- 各チェックポイントで独立して検証可能
