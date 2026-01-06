# Implementation Plan: Multiple Photos Per Meal

**Branch**: `016-multiple-meal-photos` | **Date**: 2026-01-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/016-multiple-meal-photos/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Enable users to add multiple photos (up to 10) to a single meal record with aggregated AI nutritional analysis. Key features include: (1) adding photos to existing meals post-creation, (2) adding photos via AI chat interface during consultation, (3) horizontally scrollable carousel display in meal history list, (4) multiple photo capture during initial meal recording, and (5) full-screen gallery management. This addresses the common user scenario where food items are forgotten or consumed in multiple stages.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: React 18+, Hono, Drizzle ORM, Zod, TanStack Query, Tailwind CSS, Vercel AI SDK (@ai-sdk/google)
**Storage**: Cloudflare D1 (SQLite) for metadata, R2 for photo files
**Testing**: Vitest (unit/integration), Playwright (E2E)
**Target Platform**: Web (PWA) - Cloudflare Workers + Pages
**Project Type**: Web (monorepo: packages/backend + packages/frontend)
**Performance Goals**:
  - Photo upload: <30s per photo
  - AI analysis: 90% complete within 2 minutes
  - Carousel swipe: <100ms indicator update
  - First photo load: <1s on standard network
**Constraints**:
  - 10 photos max per meal (storage/cost management)
  - Horizontal/vertical scroll must not conflict (95% accuracy)
  - Offline-capable photo queue (IndexedDB)
  - Background upload during chat
**Scale/Scope**: Personal use (~1-10 users initially), 3-5 new DB tables, 5-8 new API endpoints, 4-6 new React components

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. User Privacy First ✅ PASS

- **Photo Storage**: Photos stored in R2 with user-scoped access control
- **Deletion**: Cascade delete ensures photo cleanup when meal deleted
- **Consent**: No third-party sharing; photos only used for user's own AI analysis
- **Minimal Collection**: Only collecting photos user explicitly uploads for meal tracking

### II. Simple UX ✅ PASS

- **3-tap rule**: "Add Photo" → Capture → Confirm (3 taps maximum)
- **Focused screens**: Each user story addresses single purpose (add, view, manage)
- **Error handling**: Upload failures don't affect existing photos; clear retry mechanism
- **Visual feedback**: Carousel indicators, upload progress, loading placeholders

### III. Test-Driven Development (TDD) ✅ PASS

- **Test-first approach**: Will write tests for photo upload, carousel, AI aggregation before implementation
- **Coverage target**: Maintain 80%+ coverage (unit + integration + E2E)
- **E2E scenarios**: User journeys from spec directly map to Playwright tests

### IV. Type Safety ✅ PASS

- **No `any` types**: Strict TypeScript mode enforced
- **Zod validation**: Photo upload payloads, photo metadata, AI responses validated
- **Shared types**: Photo entity types shared between packages/shared, frontend, backend

### V. Simplicity Over Cleverness ✅ PASS

- **YAGNI compliance**: Building only specified features (no speculative carousel animations, etc.)
- **No premature abstraction**: Photo handling specific to meals; not building generic gallery system
- **Bundle impact**: Using existing Tailwind for carousel; no new UI library needed

### Gate Status: ✅ ALL CLEAR

No constitution violations detected. Proceeding to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
packages/
├── shared/                    # Shared schemas and types
│   └── src/
│       └── schemas/
│           └── photo.ts       # Photo-related Zod schemas (NEW)
│
├── backend/                   # Hono API on Cloudflare Workers
│   ├── src/
│   │   ├── db/
│   │   │   └── schema.ts      # Add meal_photos table (MODIFIED)
│   │   ├── routes/
│   │   │   ├── meals.ts       # Add multi-photo endpoints (MODIFIED)
│   │   │   ├── meal-analysis.ts # Aggregate analysis (MODIFIED)
│   │   │   └── meal-chat.ts   # Add photo via chat (MODIFIED)
│   │   └── services/
│   │       ├── photo-storage.ts # R2 operations (MODIFIED)
│   │       └── meal-photo.service.ts # Photo CRUD logic (NEW)
│   ├── migrations/
│   │   └── 0006_add_meal_photos.sql # Migration (NEW)
│   └── tests/
│       ├── unit/
│       │   └── meal-photo.service.test.ts (NEW)
│       └── integration/
│           └── meal-photos.test.ts (NEW)
│
└── frontend/                  # React + Vite PWA
    ├── src/
    │   ├── components/
    │   │   └── meal/
    │   │       ├── PhotoCarousel.tsx (NEW)
    │   │       ├── PhotoGallery.tsx (NEW)
    │   │       ├── PhotoUploadButton.tsx (NEW)
    │   │       ├── MealList.tsx (MODIFIED - add carousel)
    │   │       ├── MealChat.tsx (MODIFIED - add photo button)
    │   │       └── SmartMealInput.tsx (MODIFIED - multi-photo)
    │   ├── hooks/
    │   │   └── useMealPhotos.ts (NEW)
    │   └── services/
    │       └── photo-queue.ts # IndexedDB offline queue (NEW)
    └── tests/
        └── e2e/
            └── meal-photos.spec.ts (NEW)

tests/                         # Root-level integration tests
└── integration/
    └── meal-photo-flow.test.ts (NEW)
```

**Structure Decision**: Web application (monorepo) with packages/shared, packages/backend, packages/frontend. Following existing structure with minimal new files. Photo-related code co-located with meal domain.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

N/A - No constitution violations detected.
