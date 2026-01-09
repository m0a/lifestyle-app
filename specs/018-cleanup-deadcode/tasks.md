# Tasks: デッドコード削除とツール導入

**Input**: Design documents from `/specs/018-cleanup-deadcode/`
**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

**Tests**: No new test tasks required. Validation will use existing test suites (Vitest, Playwright).

**Organization**: Tasks are grouped by implementation phase following the gradual approach outlined in research.md.

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions

- **Monorepo**: `packages/frontend/`, `packages/backend/`, `packages/shared/`
- **Root**: `package.json`, `.github/workflows/ci.yml`, `CLAUDE.md`
- **Scripts**: `scripts/check-deadcode-threshold.js`

---

## Phase 1: Dead Code Removal

**Purpose**: Remove unused ExerciseInput.tsx component and verify no breaking changes

**Independent Test**: Run existing E2E tests to verify exercise recording functionality still works

- [x] T001 Verify ExerciseInput.tsx is truly unused by searching for imports in `packages/frontend/src/`
- [x] T002 Delete file `packages/frontend/src/components/exercise/ExerciseInput.tsx`
- [x] T003 Run type check with `pnpm typecheck` to verify no breaking changes
- [x] T004 Run build with `pnpm build` to verify compilation succeeds
- [x] T005 Run E2E tests with `pnpm test:e2e` to verify exercise recording functionality

**Checkpoint**: ExerciseInput.tsx deleted, all tests pass, no regressions

---

## Phase 2: Knip Installation & Configuration

**Purpose**: Install Knip and configure for pnpm monorepo structure

**Independent Test**: Run `pnpm find-deadcode` and verify it executes without errors

- [x] T006 Install Knip as dev dependency with `pnpm add -D knip` in repository root
- [x] T007 Create Knip configuration file `knip.json` in repository root with monorepo workspace settings (per research.md)
- [x] T008 Run baseline check with `pnpm dlx knip` to verify configuration and document current unused export count
- [x] T009 Adjust `knip.json` ignore patterns if excessive false positives detected (test files, config files, type definitions)

**Checkpoint**: Knip installed, configured, and executing successfully

---

## Phase 3: Package Scripts & Threshold Script

**Purpose**: Add convenience scripts for developers and CI threshold enforcement

**Independent Test**: Run `pnpm find-deadcode` and verify output is readable

- [x] T010 [P] Add script `"find-deadcode": "knip"` to root `package.json`
- [x] T011 [P] Add script `"find-deadcode:fix": "knip --fix"` to root `package.json`
- [x] T012 [P] Add script `"find-deadcode:ci": "knip --reporter json > knip-report.json && node scripts/check-deadcode-threshold.js"` to root `package.json`
- [x] T013 Create threshold checking script `scripts/check-deadcode-threshold.js` with MAX_UNUSED_EXPORTS=40 (adjusted from baseline: 36 + buffer 4)
- [x] T014 Test threshold script locally by running `pnpm find-deadcode:ci` and verifying exit codes

**Checkpoint**: Scripts added, threshold script working locally

---

## Phase 4: CI Integration

**Purpose**: Add GitHub Actions job for automated dead code checking with threshold enforcement

**Independent Test**: Create a test PR and verify CI job runs and posts PR comment

- [x] T015 Read existing CI configuration `.github/workflows/ci.yml` to understand current job structure
- [x] T016 Add new job `deadcode-check` to `.github/workflows/ci.yml` with steps (per research.md lines 154-205):
  - Checkout code
  - Setup pnpm (version 8)
  - Setup Node.js (version 20)
  - Install dependencies with frozen lockfile
  - Build shared package (required for cross-package type checking)
  - Run Knip with threshold check
  - Post PR comment with results (only on pull_request events)
  - Upload Knip report as artifact
- [x] T017 Configure PR comment step to show unused export count and threshold comparison (per research.md line 195)
- [x] T018 Test CI job by committing changes and creating a draft PR
- [x] T019 Verify CI job executes, produces report, and posts PR comment with dead code analysis results

**Checkpoint**: CI job running on PRs, threshold enforcement active, PR comments working

---

## Phase 5: Documentation

**Purpose**: Document Knip usage for developers in CLAUDE.md

**Independent Test**: Another developer reads CLAUDE.md and successfully runs `pnpm find-deadcode`

- [x] T020 Read existing `CLAUDE.md` structure to find appropriate section for new commands
- [x] T021 Add "Dead Code Detection" section to `CLAUDE.md` Commands area with:
  - `pnpm find-deadcode` - Local dead code check
  - `pnpm find-deadcode:fix` - Experimental auto-fix
  - `pnpm find-deadcode:ci` - CI execution with threshold check
  - Link to `specs/018-cleanup-deadcode/quickstart.md` for detailed usage guide
  - Current threshold value (40) and roadmap to 0
  - Brief explanation of CI integration and merge blocking behavior
- [x] T022 Verify documentation accuracy by following the instructions as a new developer would

**Checkpoint**: Documentation complete and accurate

---

## Phase 6: Validation & Cleanup

**Purpose**: Final validation that all functional requirements are met

**Independent Test**: Complete FR checklist from spec.md

- [x] T023 Verify FR-001: ExerciseInput.tsx is deleted (git status shows deletion)
- [x] T024 Verify FR-002: Application works correctly (run all tests, manual smoke test)
- [x] T025 Verify FR-003: Knip installed (check package.json devDependencies)
- [x] T026 Verify FR-004: Scripts added (check package.json scripts section)
- [x] T027 Verify FR-005: Documentation updated (CLAUDE.md contains dead code section)
- [x] T028 Verify FR-006: CI integration complete (ci.yml contains deadcode-check job, test on actual PR)
- [x] T029 Document baseline unused export count in commit message or PR description (Baseline: 36 unused exports, 4 unused files, 2 unused dependencies)
- [x] T030 Create follow-up issue for gradual threshold reduction (from 40 → 30 → 20 → 10 → 0 over 8 weeks)

**Checkpoint**: All functional requirements verified, ready for PR

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Dead Code Removal)**: No dependencies - can start immediately
- **Phase 2 (Knip Installation)**: Must complete Phase 1 first (clean baseline)
- **Phase 3 (Package Scripts)**: Depends on Phase 2 completion (Knip must be installed)
- **Phase 4 (CI Integration)**: Depends on Phase 3 completion (scripts must exist)
- **Phase 5 (Documentation)**: Can run in parallel with Phase 4 (different files)
- **Phase 6 (Validation)**: Depends on all previous phases

### Task Dependencies Within Phases

**Phase 1**: Sequential (T001 → T002 → T003 → T004 → T005)
- Must verify unused status before deletion
- Must verify no errors before running tests

**Phase 2**: Sequential (T006 → T007 → T008 → T009)
- Must install before configuring
- Must configure before running baseline

**Phase 3**: Partial parallel
- T010, T011, T012 can run in parallel (different script keys)
- T013 must complete before T014

**Phase 4**: Sequential (T015 → T016 → T017 → T018 → T019)
- Must understand existing structure before modifying
- Must implement before testing

**Phase 5**: Parallel with Phase 4
- T020 can start while Phase 4 is ongoing
- T021 depends on T020
- T022 depends on T021

**Phase 6**: Sequential (T023-T030)
- All validation tasks must run in order

### Parallel Opportunities

```bash
# Within Phase 3:
Task T010: Add find-deadcode script
Task T011: Add find-deadcode:fix script
Task T012: Add find-deadcode:ci script

# Cross-phase parallel:
Phase 4 T015-T019: CI Integration
Phase 5 T020-T022: Documentation
# These can overlap since they modify different files
```

---

## Implementation Strategy

### Incremental Delivery Approach

1. **Milestone 1**: Dead Code Removal (Phase 1)
   - Deliverable: Clean codebase, ExerciseInput.tsx removed
   - Validation: All existing tests pass
   - Can stop here if tool introduction needs to be deferred

2. **Milestone 2**: Tool Introduction (Phase 2-3)
   - Deliverable: Knip installed, scripts available for developers
   - Validation: `pnpm find-deadcode` works locally
   - Developers can start using tool manually

3. **Milestone 3**: CI Enforcement (Phase 4-5)
   - Deliverable: Automated checking with merge blocking
   - Validation: PRs automatically checked, comments posted
   - Quality gate active

4. **Milestone 4**: Full Validation (Phase 6)
   - Deliverable: All FRs verified, documentation complete
   - Validation: Complete FR checklist, baseline documented
   - Ready for threshold reduction plan

### Risk Mitigation

- **Phase 1 Risk**: Accidentally delete used code
  - Mitigation: T001 explicitly searches for imports before deletion

- **Phase 2-3 Risk**: False positives from Knip
  - Mitigation: T009 allows configuration adjustment after baseline check

- **Phase 4 Risk**: CI job failures block legitimate PRs
  - Mitigation: Initial threshold set to 10 (permissive), can be adjusted in scripts/check-deadcode-threshold.js

---

## Notes

- Tool switch: spec.md mentions "ts-prune" but research.md recommends "Knip" - tasks use Knip per research decision
- No new test files needed: validation uses existing Vitest and Playwright test suites
- Threshold strategy: Start at 10, reduce gradually per research.md roadmap (Phase 3 in research.md lines 242-246)
- Configuration reference: research.md lines 49-88 contain full knip.json structure
- CI job reference: research.md lines 153-205 contain complete GitHub Actions YAML
- Threshold script reference: research.md lines 100-131 contain complete JavaScript code
- [P] markers indicate tasks that modify different files and have no data dependencies
- Each phase has a clear checkpoint to validate independent functionality
- Phases 4 and 5 can overlap (different files: .github/workflows/ci.yml vs CLAUDE.md)
