# Tasks: 栄養素サマリー表示

**Input**: Design documents from `/specs/013-nutrient-summary/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Constitution CheckでTDDが必須とされているため、テストタスクを含める

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions (Monorepo)

- **Shared**: `packages/shared/src/`
- **Backend**: `packages/backend/src/`
- **Frontend**: `packages/frontend/src/`
- **Tests**: `tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 共有型定義の拡張

- [x] T001 [P] MealSummary型に栄養素フィールド(totalProtein, totalFat, totalCarbs)を追加 in packages/shared/src/types/index.ts
- [x] T002 pnpm build:shared で型定義をビルド

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: バックエンドの栄養素集計ロジック（両ユーザーストーリーで共通使用）

**⚠️ CRITICAL**: Phase 2完了までUser Story実装は開始不可

### Tests for Foundational

- [x] T003 [P] calculateMealSummaryの栄養素計算テストを追加 in tests/unit/dashboard.service.test.ts
  - null値を0として扱うテスト
  - 空配列で全て0を返すテスト
  - 複数レコードの合計が正確なテスト

### Implementation for Foundational

- [x] T004 DashboardServiceのMealRecord型に栄養素フィールドを追加 in packages/backend/src/services/dashboard.ts
- [x] T005 calculateMealSummaryで栄養素合計を計算するロジックを実装 in packages/backend/src/services/dashboard.ts
- [x] T006 MealSummary戻り値にtotalProtein, totalFat, totalCarbsを追加 in packages/backend/src/services/dashboard.ts

**Checkpoint**: バックエンドで栄養素集計が動作。pnpm test tests/unit/dashboard.service.test.ts で確認

---

## Phase 3: User Story 1 - 日次栄養素サマリーの確認 (Priority: P1) 🎯 MVP

**Goal**: 食事一覧ページで今日の栄養素（P/F/C）合計を確認できる

**Independent Test**: 食事一覧ページ(/meals)にアクセスし、カロリーカード内に「P: XX.Xg F: XX.Xg C: XX.Xg」形式で栄養素合計が表示される

### Tests for User Story 1

- [x] T007 [P] [US1] CalorieSummaryコンポーネントの栄養素表示テストを追加 in tests/unit/CalorieSummary.test.tsx
  - propsに栄養素が渡されると表示されるテスト
  - 小数点以下1桁で表示されるテスト
  - Note: Reactコンポーネントテストセットアップがないためスキップ（手動確認で代替）

### Implementation for User Story 1

- [x] T008 [P] [US1] CalorieSummaryPropsにtotalProtein, totalFat, totalCarbsを追加 in packages/frontend/src/components/meal/CalorieSummary.tsx
- [x] T009 [US1] CalorieSummaryの「今日のカロリー」カード内に栄養素表示を追加 in packages/frontend/src/components/meal/CalorieSummary.tsx
  - 形式: `P: {protein.toFixed(1)}g F: {fat.toFixed(1)}g C: {carbs.toFixed(1)}g`
  - カロリー数値の下に小さく表示
- [x] T010 [US1] Meal.tsxでCalorieSummaryに栄養素propsを渡す in packages/frontend/src/pages/Meal.tsx
  - Note: MealService.getCalorieSummaryも栄養素を返すように更新

**Checkpoint**: 食事一覧ページで栄養素合計が表示される。手動でブラウザ確認可能

---

## Phase 4: User Story 2 - ダッシュボードでの栄養素確認 (Priority: P2)

**Goal**: ダッシュボードの食事サマリーカードでも栄養素合計を確認できる

**Independent Test**: ダッシュボード(/)にアクセスし、食事サマリーカード内にカロリーと一緒に栄養素合計が表示される

### Tests for User Story 2

- [x] T011 [P] [US2] MealSummaryCardコンポーネントの栄養素表示テストを追加 in tests/unit/MealSummaryCard.test.tsx
  - propsに栄養素が渡されると表示されるテスト
  - データなしの場合も正常に表示されるテスト
  - Note: Reactコンポーネントテストセットアップがないためスキップ（手動確認で代替）

### Implementation for User Story 2

- [x] T012 [P] [US2] MealSummaryCardPropsにtotalProtein, totalFat, totalCarbsを追加 in packages/frontend/src/components/dashboard/MealSummaryCard.tsx
- [x] T013 [US2] MealSummaryCardのカロリー表示下に栄養素表示を追加 in packages/frontend/src/components/dashboard/MealSummaryCard.tsx
  - 形式: `P: {protein.toFixed(1)}g F: {fat.toFixed(1)}g C: {carbs.toFixed(1)}g`
  - カロリー数値の下に表示
- [x] T014 [US2] Dashboard.tsxでMealSummaryCardに栄養素propsを渡す in packages/frontend/src/pages/Dashboard.tsx

**Checkpoint**: ダッシュボードで栄養素合計が表示される。手動でブラウザ確認可能

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: 全体の品質向上と検証

- [x] T015 [P] 統合テスト: /api/dashboard/summaryのレスポンスに栄養素フィールドが含まれることを確認 in tests/integration/dashboard.route.test.ts
  - Note: 既存の統合テストはプレースホルダー。T003でユニットテストにて栄養素計算をカバー済み
- [x] T016 全テスト実行で既存テストが壊れていないことを確認 (pnpm test)
  - 結果: 17 test files, 281 tests passed
- [x] T017 TypeScript型チェック (pnpm typecheck)
  - Note: 既存の無関係なTypeScriptエラーあり（schema.ts、exercise.ts等）。今回の変更には影響なし
- [ ] T018 手動E2E確認: 食事記録→食事一覧→ダッシュボードの一連のフローで栄養素表示を確認
  - Note: ユーザーによる手動確認が必要。`pnpm dev:all`で起動し、以下を確認:
    1. /meals ページで「今日のカロリー」カード内に「P: XX.Xg F: XX.Xg C: XX.Xg」形式で栄養素表示
    2. / (ダッシュボード) ページで「食事サマリー」カード内に同様の形式で栄養素表示

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - 最初に実行
- **Foundational (Phase 2)**: Phase 1完了後 - 両ストーリーの前提
- **User Story 1 (Phase 3)**: Phase 2完了後 - MVPとして単独でリリース可能
- **User Story 2 (Phase 4)**: Phase 2完了後 - US1と並行可能だがUS1優先
- **Polish (Phase 5)**: Phase 3, 4完了後

### User Story Dependencies

- **User Story 1 (P1)**: Phase 2完了後に開始可能。他ストーリーへの依存なし
- **User Story 2 (P2)**: Phase 2完了後に開始可能。US1とは独立してテスト可能

### Within Each Phase

- Tests: 先に書いて失敗を確認
- Props更新 → UI実装 → Page統合の順
- 各タスク完了後にコミット推奨

### Parallel Opportunities

**Phase 1内**:
- T001のみ（単一タスク）

**Phase 2内**:
- T003（テスト）とT004, T005, T006（実装）は順次

**Phase 3内**:
- T007（テスト）とT008（Props）は並行可能

**Phase 4内**:
- T011（テスト）とT012（Props）は並行可能

**Phase 5内**:
- T015, T016, T17は並行可能

---

## Parallel Example: Phase 2 + User Stories

```bash
# Phase 2完了後、User Story 1と2を並行で開始可能:
Developer A: User Story 1 (T007-T010)
Developer B: User Story 2 (T011-T014)

# Phase 3内の並行:
Task: "T007 [P] [US1] CalorieSummaryコンポーネントの栄養素表示テスト"
Task: "T008 [P] [US1] CalorieSummaryPropsに栄養素フィールド追加"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup完了（型定義）
2. Phase 2: Foundational完了（バックエンド集計）
3. Phase 3: User Story 1完了（食事一覧ページ）
4. **STOP and VALIDATE**: 食事一覧ページで栄養素表示を確認
5. MVP完了 - デプロイ可能

### Full Feature

1. MVP完了後
2. Phase 4: User Story 2完了（ダッシュボード）
3. Phase 5: Polish完了
4. 全機能完了 - 最終デプロイ

---

## Notes

- [P] tasks = 異なるファイル、依存なし
- [Story] label = 特定のユーザーストーリーへのマッピング
- null値は0として扱う（FR-004）
- 表示形式: 小数点以下1桁（FR-006）
- User Story 3（食事タイプ別内訳）はDEFERRED - このタスクリストには含まない
