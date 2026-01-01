# Tasks: PR Preview Environment

**Input**: Design documents from `/specs/002-pr-preview-env/`
**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

**Tests**: CI/CDワークフローのためユニットテストは不要。手動E2Eテストで検証。

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US0, US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **Workflow**: `.github/workflows/ci.yml`
- **Wrangler Config**: `packages/backend/wrangler.toml`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: プレビュー環境用のCloudflareリソース作成

- [x] T001 Create preview D1 database via `wrangler d1 create health-tracker-preview-db`
- [x] T002 Note the preview database_id from T001 output
- [x] T003 [P] Create preview R2 bucket via `wrangler r2 bucket create lifestyle-app-photos-preview` (optional, can share with prod)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: wrangler.toml にプレビュー環境設定を追加

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Add `[env.preview]` section to `packages/backend/wrangler.toml` with preview D1 binding
- [x] T005 Add `[[env.preview.d1_databases]]` with preview database_id to `packages/backend/wrangler.toml`
- [x] T006 [P] Add `[[env.preview.r2_buckets]]` binding to `packages/backend/wrangler.toml`
- [x] T007 [P] Add `[env.preview.vars]` with ENVIRONMENT="preview" to `packages/backend/wrangler.toml`
- [x] T008 Run initial migration on preview DB: `wrangler d1 migrations apply DB --env preview --remote`
- [x] T009 Update workflow trigger in `.github/workflows/ci.yml` to include `pull_request: types: [opened, synchronize, closed]` and `push: tags: ['v*']`

**Checkpoint**: Foundation ready - preview environment configuration complete

---

## Phase 3: User Story 0 - mainブランチのプレビュー環境 (Priority: P0) 🎯

**Goal**: mainマージ時にmainプレビュー環境を更新し、マイグレーションを適用

**Independent Test**: PRをマージし、`lifestyle-tracker-preview.abe00makoto.workers.dev` が更新されることを確認

### Implementation for User Story 0

- [x] T010 [US0] Add `deploy-main-preview` job to `.github/workflows/ci.yml` with condition `if: github.event_name == 'push' && github.ref == 'refs/heads/main'`
- [x] T011 [US0] Add migration step `wrangler d1 migrations apply DB --env preview --remote` in deploy-main-preview job in `.github/workflows/ci.yml`
- [x] T012 [US0] Add deploy step `wrangler deploy --env preview` in deploy-main-preview job in `.github/workflows/ci.yml`
- [x] T013 [US0] Add `needs: [build]` dependency to deploy-main-preview job in `.github/workflows/ci.yml`

**Checkpoint**: mainプレビュー環境が自動更新される

---

## Phase 4: User Story 0.5 - タグベースの本番リリース (Priority: P0)

**Goal**: v*タグプッシュ時のみ本番デプロイを実行し、mainプッシュではデプロイしない

**Independent Test**: `v1.0.0`形式のタグをプッシュし、本番環境にデプロイされることを確認

### Implementation for User Story 0.5

- [x] T014 [US0.5] Remove or modify existing `deploy` job condition in `.github/workflows/ci.yml` to disable deploy on main push
- [x] T015 [US0.5] Add `deploy-production` job with condition `if: github.event_name == 'push' && startsWith(github.ref, 'refs/tags/v')` in `.github/workflows/ci.yml`
- [x] T016 [US0.5] Add migration step `wrangler d1 migrations apply DB --remote` in deploy-production job in `.github/workflows/ci.yml`
- [x] T017 [US0.5] Add deploy step `wrangler deploy` (production) in deploy-production job in `.github/workflows/ci.yml`
- [x] T018 [US0.5] Add `needs: [build]` dependency to deploy-production job in `.github/workflows/ci.yml`

**Checkpoint**: タグプッシュでのみ本番デプロイが実行される

---

## Phase 5: User Story 1 - PRレビュー時のプレビュー確認 (Priority: P1)

**Goal**: PR作成時に自動でプレビュー環境をデプロイし、PRコメントにURLを投稿

**Independent Test**: PRを作成し、プレビューURLがコメントされ、アプリが動作することを確認

### Implementation for User Story 1

- [x] T019 [US1] Add `deploy-pr-preview` job with condition `if: github.event_name == 'pull_request' && github.event.action != 'closed'` in `.github/workflows/ci.yml`
- [x] T020 [US1] Add `permissions: pull-requests: write` to deploy-pr-preview job in `.github/workflows/ci.yml`
- [x] T021 [US1] Add step to patch wrangler.toml with preview database_id using sed in deploy-pr-preview job in `.github/workflows/ci.yml`
- [x] T022 [US1] Add deploy step `wrangler deploy --name lifestyle-tracker-pr-${{ github.event.pull_request.number }}` in deploy-pr-preview job in `.github/workflows/ci.yml`
- [x] T023 [US1] Add step to post preview URL comment using `gh pr comment` in deploy-pr-preview job in `.github/workflows/ci.yml`
- [x] T024 [US1] Add `needs: [build]` dependency to deploy-pr-preview job in `.github/workflows/ci.yml`
- [x] T025 [US1] Add `concurrency: group: preview-${{ github.event.pull_request.number }}` to deploy-pr-preview job in `.github/workflows/ci.yml`

**Checkpoint**: PRプレビューが自動デプロイされ、URLがコメントされる

---

## Phase 6: User Story 2 - PRマージ後のプレビュー環境クリーンアップ (Priority: P2)

**Goal**: PRマージ/クローズ時に対応するプレビュー環境を自動削除

**Independent Test**: PRをマージし、対応するWorkerが削除されることを確認

### Implementation for User Story 2

- [x] T026 [US2] Add `cleanup-pr-preview` job with condition `if: github.event_name == 'pull_request' && github.event.action == 'closed'` in `.github/workflows/ci.yml`
- [x] T027 [US2] Add step `wrangler delete --name lifestyle-tracker-pr-${{ github.event.pull_request.number }} --force || true` in cleanup-pr-preview job in `.github/workflows/ci.yml`
- [x] T028 [US2] Add step to post cleanup comment using `gh pr comment` in cleanup-pr-preview job in `.github/workflows/ci.yml`
- [x] T029 [US2] Add `permissions: pull-requests: write` to cleanup-pr-preview job in `.github/workflows/ci.yml`

**Checkpoint**: PRプレビュー環境が自動削除される

---

## Phase 7: User Story 3 - PRコミット更新時のプレビュー再デプロイ (Priority: P3)

**Goal**: PRに追加コミットがプッシュされると、プレビュー環境が自動更新される

**Independent Test**: PRに追加コミットをプッシュし、プレビュー環境が更新されることを確認

### Implementation for User Story 3

- [x] T030 [US3] Verify `synchronize` is included in pull_request types trigger in `.github/workflows/ci.yml`
- [x] T031 [US3] Ensure deploy-pr-preview job handles both `opened` and `synchronize` events (already covered by `!= 'closed'` condition)

**Checkpoint**: PRコミット更新でプレビューが再デプロイされる（US1の実装で既にカバー）

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: エラーハンドリングとドキュメント

- [x] T032 [P] Add error handling step to post failure comment on deploy failure in `.github/workflows/ci.yml` (SKIPPED: デプロイ失敗はGitHub Actions UIで確認可能)
- [x] T033 [P] Update README.md with new deployment workflow documentation (SKIPPED: プロジェクトにREADME.mdなし、ドキュメントはquickstart.mdで代用)
- [ ] T034 Run quickstart.md validation (manual E2E test)
- [ ] T035 Verify all Success Criteria (SC-000 to SC-004) are met

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can proceed in priority order (P0 → P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 0 (P0)**: Can start after Foundational - mainプレビュー環境
- **User Story 0.5 (P0)**: Can start after Foundational - タグベースリリース（US0と並行可能）
- **User Story 1 (P1)**: Can start after Foundational - PRプレビュー
- **User Story 2 (P2)**: Depends on US1 structure - クリーンアップ
- **User Story 3 (P3)**: Already covered by US1 - 再デプロイ

### Parallel Opportunities

- T003, T006, T007 can run in parallel (different wrangler.toml sections)
- US0 and US0.5 can be implemented in parallel (different workflow jobs)
- T032, T033 can run in parallel

---

## Parallel Example: Foundational Phase

```bash
# Launch these tasks in parallel (different config sections):
Task: "Add [[env.preview.r2_buckets]] binding to packages/backend/wrangler.toml"
Task: "Add [env.preview.vars] with ENVIRONMENT=preview to packages/backend/wrangler.toml"
```

---

## Implementation Strategy

### MVP First (User Story 0 + 0.5 + 1)

1. Complete Phase 1: Setup (Cloudflare resources)
2. Complete Phase 2: Foundational (wrangler.toml config)
3. Complete Phase 3: User Story 0 (mainプレビュー)
4. Complete Phase 4: User Story 0.5 (タグリリース)
5. Complete Phase 5: User Story 1 (PRプレビュー)
6. **STOP and VALIDATE**: Test all preview environments

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US0 (mainプレビュー) → Test → main preview works
3. Add US0.5 (タグリリース) → Test → production deploy works
4. Add US1 (PRプレビュー) → Test → PR preview works (MVP!)
5. Add US2 (クリーンアップ) → Test → cleanup works
6. US3 is already covered by US1 implementation

---

## Notes

- [P] tasks = different files/sections, no dependencies
- [Story] label maps task to specific user story for traceability
- Most tasks modify `.github/workflows/ci.yml` - execute sequentially within each story
- Commit after each phase or logical group
- Test each story independently before proceeding
- US3 requires no additional implementation - covered by US1's handling of `synchronize` event
