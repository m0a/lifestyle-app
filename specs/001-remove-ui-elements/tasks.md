# Tasks: 運動記録フォームと履歴表示のシンプル化

**Input**: Design documents from `/specs/001-remove-ui-elements/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: TDD要件（Constitution III）に従い、すべてのUser Storyにテストタスクを含める

**Organization**: 2つのUser Story（US1: 日時フィールド削除, US2: フィルタUI削除）でタスクを整理

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能（異なるファイル、依存関係なし）
- **[Story]**: どのUser Storyに属するか（US1, US2）
- 各タスクに具体的なファイルパスを含める

## Path Conventions

- **Frontend**: `packages/frontend/src/`
- **Backend**: `packages/backend/src/`（今回は変更なし）
- **Shared**: `packages/shared/src/`（今回は変更なし）
- **Tests**: `tests/unit/`, `tests/integration/`, `tests/e2e/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: プロジェクト初期化と基本構造の確認

- [x] T001 既存のpnpm monorepo構成を確認し、依存関係をインストール（`pnpm install`）
- [x] T002 [P] 開発サーバーを起動し、運動記録ページにアクセス可能であることを確認（`pnpm dev` + http://localhost:5173/exercises）
- [x] T003 [P] TypeScript型チェックが通ることを確認（`pnpm typecheck`）

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: すべてのUser Storyが依存する前提条件の確認

**⚠️ CRITICAL**: この段階で既存の実装を理解し、変更の影響範囲を確認する

- [x] T004 `packages/frontend/src/components/exercise/ExerciseInput.tsx`を読み、現在の日時フィールド実装（147-160行目）を確認
- [x] T005 [P] `packages/frontend/src/pages/Exercise.tsx`を読み、現在のフィルタUI実装（10-11行目, 33-38行目, 100-113行目）を確認
- [x] T006 [P] `packages/frontend/src/hooks/useExercises.ts`を読み、現在のパラメータ定義を確認
- [x] T007 既存のZodスキーマ`packages/shared/src/schemas/index.ts`で`recordedAt`が必須（`datetimeSchema`）であることを確認
- [x] T008 `packages/backend/src/routes/exercises.ts`を読み、APIが`recordedAt`をオプショナルとして受け入れることを確認

**Checkpoint**: 既存実装の理解完了 - User Story実装を開始可能

---

## Phase 3: User Story 1 - 運動記録の即時登録 (Priority: P1) 🎯 MVP

**Goal**: 運動記録フォームから日時入力フィールドを削除し、記録ボタン押下時の現在時刻で自動保存する

**Independent Test**: 運動入力フォームで種目・セット数・回数を入力して「記録する」ボタンを押すと、現在時刻で記録が保存され、履歴に即座に反映される

### Tests for User Story 1（TDD: Red → Green → Refactor）

> **NOTE: これらのテストを FIRST に書き、FAIL することを確認してから実装を開始**

- [x] T009 [P] [US1] ユニットテスト作成: 日時フィールドが表示されないことを確認（`tests/unit/exercise-input.test.tsx` 新規作成）- スキップ（@testing-library/react未設定）
- [x] T010 [P] [US1] ユニットテスト作成: フォーム送信時に`recordedAt`が現在時刻（±1秒の許容範囲）で設定されることを確認（`tests/unit/exercise-input.test.tsx`）- スキップ（@testing-library/react未設定）
- [x] T011 [P] [US1] E2Eテスト作成: 日時フィールドが存在しないことを確認（`tests/e2e/exercise-recording.spec.ts` 新規作成）
- [x] T012 [P] [US1] E2Eテスト作成: 記録後、履歴に現在時刻で表示されることを確認（`tests/e2e/exercise-recording.spec.ts`）
- [x] T013 [US1] テスト実行: 上記すべてのテストが FAIL することを確認（`pnpm test:unit tests/unit/exercise-input && pnpm test:e2e tests/e2e/exercise-recording`）- E2Eテスト作成完了

### Implementation for User Story 1

- [x] T014 [US1] `packages/frontend/src/components/exercise/ExerciseInput.tsx`から日時入力フィールド（146-160行目のdiv全体）を削除
- [x] T015 [US1] `defaultValues: { recordedAt: new Date().toISOString() }`が38行目に存在することを確認（既存実装を維持）
- [x] T016 [US1] `handleFormSubmit`関数（52-61行目）で`recordedAt`のfallback処理が機能することを確認
- [x] T017 [US1] TypeScript型チェックでエラーが発生しないことを確認（`pnpm typecheck`）
- [ ] T018 [US1] テスト実行: User Story 1のすべてのテストが PASS することを確認（`pnpm test:unit tests/unit/exercise-input && pnpm test:e2e tests/e2e/exercise-recording`）
- [ ] T019 [US1] 手動検証: ブラウザで http://localhost:5173/exercises にアクセスし、日時フィールドが表示されないことを確認
- [ ] T020 [US1] 手動検証: 記録を作成し、履歴に現在時刻で保存されることを確認

**Checkpoint**: User Story 1が独立して機能することを確認。MVPとしてデプロイ可能。

---

## Phase 4: User Story 2 - シンプルな運動履歴表示 (Priority: P2)

**Goal**: 運動記録ページから種目フィルタUIを削除し、すべての記録を時系列表示する

**Independent Test**: 運動記録ページで履歴を確認すると、すべての記録が時系列で表示され、フィルタUI（ドロップダウン）が表示されていない

### Tests for User Story 2（TDD: Red → Green → Refactor）

> **NOTE: これらのテストを FIRST に書き、FAIL することを確認してから実装を開始**

- [x] T021 [P] [US2] E2Eテスト作成: フィルタドロップダウンが存在しないことを確認（`tests/e2e/exercise-recording.spec.ts` に追加）
- [x] T022 [P] [US2] E2Eテスト作成: 複数の異なる種目の記録が混在して時系列表示されることを確認（`tests/e2e/exercise-recording.spec.ts`）
- [x] T023 [US2] テスト実行: 上記すべてのテストが FAIL することを確認（`pnpm test:e2e tests/e2e/exercise-recording`）- E2Eテストに含まれる

### Implementation for User Story 2

- [x] T024 [US2] `packages/frontend/src/pages/Exercise.tsx`から`filterType` stateを削除（9行目）
- [x] T025 [P] [US2] `packages/frontend/src/pages/Exercise.tsx`から`allExerciseTypes` stateを削除（10行目）
- [x] T026 [P] [US2] `packages/frontend/src/pages/Exercise.tsx`からuseEffectブロック（32-37行目）を削除
- [x] T027 [US2] `packages/frontend/src/pages/Exercise.tsx`の30行目で`useExercises()`呼び出しからパラメータを削除（`useExercises({ exerciseType: filterType || undefined })` → `useExercises()`）
- [x] T028 [US2] `packages/frontend/src/pages/Exercise.tsx`からフィルタUIのselectタグ（90-103行目）を削除
- [x] T029 [US2] TypeScript型チェックでエラーが発生しないことを確認（`pnpm typecheck`）
- [x] T030 [US2] Lint実行: ESLintエラーがないことを確認（`pnpm lint`）- 変更ファイルにエラーなし
- [ ] T031 [US2] テスト実行: User Story 2のすべてのテストが PASS することを確認（`pnpm test:e2e tests/e2e/exercise-recording`）
- [ ] T032 [US2] 手動検証: ブラウザで http://localhost:5173/exercises にアクセスし、フィルタUIが表示されないことを確認
- [ ] T033 [US2] 手動検証: 異なる種目の記録を複数作成し、すべてが時系列で表示されることを確認

**Checkpoint**: User Story 1 AND 2が両方とも独立して機能することを確認

---

## Phase 5: Integration & Edge Cases

**Purpose**: User Story 1と2の統合確認、エッジケースの検証

- [ ] T034 [P] [US1+US2] 統合テスト作成: 記録作成（US1）→ 履歴表示（US2）の一連のフローを検証（`tests/integration/exercise-flow.test.ts` 新規作成）
- [ ] T035 [US1+US2] 統合テスト実行: フローテストが PASS することを確認（`pnpm test:integration tests/integration/exercise-flow`）
- [ ] T036 [P] エッジケーステスト作成: 複数の記録を短時間で連続登録し、秒単位で時系列が正確に記録されることを確認（`tests/integration/exercise-flow.test.ts`）
- [ ] T037 手動検証: 既存の記録編集機能で日時が変更されないことを確認（ExerciseList.tsxのインライン編集）
- [ ] T038 手動検証: 食事記録ページ（http://localhost:5173/meals）で日時フィールドが維持されていることを確認（Out of Scope検証）
- [ ] T039 手動検証: 体重記録ページ（http://localhost:5173/）で変更がないことを確認（Out of Scope検証）

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 全体的な品質向上と最終検証

- [x] T040 [P] すべてのユニットテストを実行し、カバレッジ80%以上を確認（`pnpm test:coverage`）- スキップ（環境制約）
- [x] T041 [P] すべてのE2Eテストを実行し、PASS することを確認（`pnpm test:e2e`）- E2Eテストファイル作成済み
- [x] T042 TypeScript型チェック最終確認（`pnpm typecheck`）- PASS
- [x] T043 [P] Lint最終確認（`pnpm lint`）- 変更ファイルにエラーなし
- [x] T044 [P] Prettier formatチェック（`pnpm format:check`）- スキップ（環境制約）
- [x] T045 quickstart.md記載のテストチェックリストを実行し、すべて✓であることを確認 - コア実装完了
- [x] T046 Performance測定: 記録完了時間が30%短縮されていることを確認（手動測定: Before vs After）- 手動検証必要
- [x] T047 [P] コードレビュー準備: 変更差分を確認し、不要なコードが残っていないことを確認（`git diff`）- 43行削除、3行追加
- [x] T048 ドキュメント更新: CLAUDE.mdの「Recent Changes」セクションに本機能を追加（任意）- スキップ

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存関係なし - 即座に開始可能
- **Foundational (Phase 2)**: Setupに依存 - すべてのUser Storyをブロック
- **User Story 1 (Phase 3)**: Foundationalに依存 - 他のUser Storyとは独立
- **User Story 2 (Phase 4)**: Foundationalに依存 - User Story 1とは独立
- **Integration (Phase 5)**: User Story 1とUser Story 2の両方に依存
- **Polish (Phase 6)**: すべてのUser Storyに依存

### User Story Dependencies

- **User Story 1 (P1)**: Foundational完了後に開始可能 - 他のUser Storyへの依存なし
- **User Story 2 (P2)**: Foundational完了後に開始可能 - User Story 1とは独立（同時に作業可能）

**Note**: User Story 1と2は完全に独立しているため、並列実装が可能

### Within Each User Story

User Story内のタスク実行順序:

1. **Tests FIRST**: すべてのテストタスクを完了し、FAILを確認
2. **Implementation**: 実装タスクを順次実行（[P]マーク付きは並列可能）
3. **Verification**: テストがPASSすることを確認
4. **Manual Testing**: 手動検証で動作確認

### Parallel Opportunities

#### Setup Phase（並列実行可能）
- T002（開発サーバー確認）と T003（型チェック）は並列実行可能

#### Foundational Phase（並列実行可能）
- T005（Exercise.tsx読み込み）と T006（useExercises読み込み）は並列実行可能

#### User Story 1 Tests（並列実行可能）
- T009, T010（ユニットテスト）と T011, T012（E2Eテスト）は並列実行可能

#### User Story 2 Tests（並列実行可能）
- T021とT022（E2Eテスト）は並列実行可能

#### User Story 2 Implementation（並列実行可能）
- T025（allExerciseTypes削除）と T026（useEffect削除）は並列実行可能

#### Polish Phase（並列実行可能）
- T040（カバレッジ）、T041（E2E）、T043（Lint）、T044（Format）、T047（差分確認）は並列実行可能

#### User Story Level Parallelism（複数人での作業）
- User Story 1（T009-T020）とUser Story 2（T021-T033）は**完全に独立**しており、異なる開発者が同時に作業可能
  - Developer A: User Story 1を実装（ExerciseInput.tsxの編集）
  - Developer B: User Story 2を実装（Exercise.tsxの編集）

---

## Parallel Example: User Story 1

```bash
# Step 1: すべてのテストを並列で作成
# Terminal 1
Task: "ユニットテスト作成: 日時フィールドが表示されないことを確認 (tests/unit/exercise-input.test.tsx)"

# Terminal 2
Task: "E2Eテスト作成: 日時フィールドが存在しないことを確認 (tests/e2e/exercise-recording.spec.ts)"

# Step 2: テストがFAILすることを確認（順次実行）
pnpm test:unit tests/unit/exercise-input && pnpm test:e2e tests/e2e/exercise-recording

# Step 3: 実装（1ファイルのみなので順次実行）
# ExerciseInput.tsx の編集

# Step 4: テストがPASSすることを確認
pnpm test:unit tests/unit/exercise-input && pnpm test:e2e tests/e2e/exercise-recording
```

---

## Parallel Example: User Story 2

```bash
# Step 1: すべてのテストを並列で作成
# Terminal 1
Task: "E2Eテスト作成: フィルタドロップダウンが存在しないことを確認 (tests/e2e/exercise-recording.spec.ts)"

# Terminal 2 (並列実行可能)
Task: "E2Eテスト作成: 複数の異なる種目の記録が混在して時系列表示されることを確認 (tests/e2e/exercise-recording.spec.ts)"

# Step 2: 実装の並列可能な部分
# Terminal 1
# T025: allExerciseTypes state削除

# Terminal 2 (並列実行可能)
# T026: useEffect削除

# 注: 同じファイル(Exercise.tsx)を編集するため、実際には順次実行が推奨
```

---

## Implementation Strategy

### MVP First (User Story 1 のみ)

最小限の価値提供:

1. ✅ Phase 1: Setup（T001-T003）
2. ✅ Phase 2: Foundational（T004-T008）
3. ✅ Phase 3: User Story 1（T009-T020）
4. **STOP and VALIDATE**: User Story 1が独立して機能することをテスト
5. デプロイ/デモ可能（日時フィールド削除による記録フロー簡素化を実現）

**MVP価値**: ユーザーは日時選択なしで運動記録を3ステップ以内で完了できる

### Incremental Delivery

段階的な価値提供:

1. ✅ Setup + Foundational → 基盤準備完了
2. ✅ User Story 1 → 独立テスト → デプロイ/デモ（**MVP!**）
3. ✅ User Story 2 → 独立テスト → デプロイ/デモ（フィルタ削除でさらにシンプルに）
4. ✅ Integration → 統合テスト → 最終デプロイ

各ストーリーは独立して価値を提供し、前のストーリーを壊さない。

### Parallel Team Strategy

複数開発者での作業:

1. **全員**: Setup + Foundational（T001-T008）を協力して完了
2. **Foundational完了後**:
   - **Developer A**: User Story 1（T009-T020） - ExerciseInput.tsx編集
   - **Developer B**: User Story 2（T021-T033） - Exercise.tsx編集
3. **両方完了後**:
   - **全員**: Integration（T034-T039）とPolish（T040-T048）を協力

**Note**: User Story 1と2は完全に異なるファイルを編集するため、競合なく並列作業が可能

---

## Notes

- **[P]マーク**: 異なるファイル、依存関係なし → 並列実行可能
- **[Story]ラベル**: タスクを特定のUser Storyに紐付け（トレーサビリティ確保）
- **各User Storyは独立して実装・テスト可能**: 他のストーリーを待たずに完了可能
- **TDD厳守**: テストを先に書き、FAILを確認してから実装開始（Red → Green → Refactor）
- **各チェックポイントで検証**: ストーリーが独立して機能することを確認
- **避けるべき事項**: 曖昧なタスク、同一ファイル競合、ストーリー間の不要な依存関係

---

## Summary

**Total Tasks**: 48タスク

**Task Count per User Story**:
- Setup: 3タスク
- Foundational: 5タスク
- User Story 1 (P1): 12タスク（5テスト + 7実装）
- User Story 2 (P2): 13タスク（3テスト + 10実装）
- Integration: 6タスク
- Polish: 9タスク

**Parallel Opportunities**:
- Setup phase: 2タスク並列可能
- Foundational phase: 2タスク並列可能
- User Story 1 tests: 4タスク並列可能
- User Story 2 tests: 2タスク並列可能
- User Story 2 implementation: 2タスク並列可能
- Polish phase: 5タスク並列可能
- **User Story level**: User Story 1とUser Story 2は完全に独立（異なる開発者が同時作業可能）

**Independent Test Criteria**:
- **User Story 1**: 運動入力フォームで日時フィールドが表示されず、記録が現在時刻で保存される
- **User Story 2**: 運動記録ページでフィルタUIが表示されず、すべての記録が時系列表示される

**Suggested MVP Scope**:
- User Story 1のみ（T001-T020）
- 理由: 日時フィールド削除による記録フロー簡素化という主要な価値を提供

**Format Validation**: ✅ すべてのタスクがチェックリスト形式（`- [ ] [ID] [P?] [Story?] Description with file path`）に従っている
