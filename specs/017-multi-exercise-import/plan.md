# Implementation Plan: Multi-Exercise Import Selection

**Branch**: `017-multi-exercise-import` | **Date**: 2026-01-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/017-multi-exercise-import/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Enable users to select from multiple past exercises when importing from a specific date, improving the existing exercise import workflow. Currently, only one exercise can be imported per date. This feature adds:
- Selection dialog showing all exercises from a selected date
- Visual distinction with exercise details (name, sets, reps, weight, timestamp)
- Recent workouts quick access (10 most recent exercises)
- Auto-import optimization for single-exercise dates
- Skeleton loading states and empty state handling

## Technical Context

**Language/Version**: TypeScript 5.3 (strict mode)
**Primary Dependencies**: React 18+, Hono, Drizzle ORM, TanStack Query, Zod, Tailwind CSS
**Storage**: Cloudflare D1 (SQLite) - existing `exercise_records` table
**Testing**: Vitest (unit/integration), Playwright (E2E)
**Target Platform**: Web (PWA) - Cloudflare Workers backend + Vite frontend
**Project Type**: Web (monorepo: packages/backend, packages/frontend, packages/shared)
**Performance Goals**:
  - <200ms list render for ≤50 exercises
  - <1s list render for ≤100 exercises
  - <3 taps to complete import
**Constraints**:
  - Read-only import (no modification of historical data)
  - Offline-capable with IndexedDB fallback
  - Must integrate with existing exercise flow
**Scale/Scope**:
  - Single-user feature enhancement
  - ~5-10 new components
  - 2-3 new API endpoints
  - No schema changes (existing table supports all requirements)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Initial Check (Pre-Phase 0)

✅ **I. User Privacy First** - No new privacy concerns. Uses existing exercise data with read-only access.

✅ **II. Simple UX** - Meets 3-tap requirement (SC-001: "within 3 taps")
- Tap 1: Select date
- Tap 2: Select exercise from list
- Tap 3: Confirm import

✅ **III. Test-Driven Development (TDD)** - Will implement with TDD workflow:
- Unit tests for selection logic
- Integration tests for API endpoints
- E2E tests for user journeys (US1, US2, US3)

✅ **IV. Type Safety** - Full type coverage planned:
- Zod schemas in `@lifestyle-app/shared`
- No `any` types
- Type-safe Hono RPC client

✅ **V. Simplicity Over Cleverness** - Straightforward implementation:
- Reuses existing `exerciseRecords` table (no schema changes)
- Standard React patterns (hooks, components)
- No new abstractions needed

### Post-Phase 1 Re-evaluation

✅ **I. User Privacy First** - Confirmed: No PII leakage, read-only access maintained in API contracts

✅ **II. Simple UX** - Confirmed: Native `<dialog>` element simplifies implementation, maintains 3-tap flow

✅ **III. Test-Driven Development (TDD)** - Confirmed: quickstart.md defines clear RED-GREEN-REFACTOR workflow

✅ **IV. Type Safety** - Confirmed: All types defined in data-model.md, Zod validation schemas specified

✅ **V. Simplicity Over Cleverness** - Confirmed:
- Research selected minimal dependencies (only react-window for 50+ items)
- Native browser features preferred (dialog, pulse animation)
- No unnecessary abstractions introduced

**Constitution Check Result**: ✅ All gates pass (initial and post-design). No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/017-multi-exercise-import/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # Feature specification
├── research.md          # Phase 0 output (research findings)
├── data-model.md        # Phase 1 output (data structures)
├── quickstart.md        # Phase 1 output (dev guide)
└── contracts/           # Phase 1 output (API contracts)
    ├── get-exercises-by-date.yaml
    ├── get-recent-exercises.yaml
    └── types.yaml
```

### Source Code (repository root)

```text
packages/
├── shared/              # Shared types, schemas, constants
│   └── src/
│       ├── types/
│       │   └── exercise.ts  # Add ExerciseImport types
│       └── schemas/
│           └── exercise.ts  # Add import validation schemas
│
├── backend/             # Hono API on Cloudflare Workers
│   └── src/
│       ├── routes/
│       │   └── exercises.ts  # Add date/recent query endpoints
│       └── services/
│           └── exercise.service.ts  # Add import logic
│
└── frontend/            # React + Vite PWA
    └── src/
        ├── components/
        │   └── exercise/
        │       ├── ExerciseImportDialog.tsx      # NEW: Selection dialog
        │       ├── ExerciseImportList.tsx        # NEW: Scrollable list
        │       ├── ExerciseImportListItem.tsx    # NEW: Single item
        │       ├── RecentExercises.tsx           # NEW: Quick access
        │       └── ExerciseImportSkeleton.tsx    # NEW: Loading state
        ├── hooks/
        │   └── useExercises.ts  # Extend with import methods
        └── pages/
            └── Exercise.tsx  # Add import UI trigger

tests/
├── unit/
│   └── exercise-import.test.ts  # NEW: Import logic tests
├── integration/
│   └── exercise-import-api.test.ts  # NEW: API tests
└── e2e/
    └── exercise-import.spec.ts  # NEW: User journey tests
```

**Structure Decision**: Web application (Option 2) - existing monorepo structure with packages/backend, packages/frontend, packages/shared. No structural changes needed, only additions within existing directories.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

*No violations - this section is not applicable.*
