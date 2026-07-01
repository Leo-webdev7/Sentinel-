# Implementation Plan: Production Error Logging

**Branch**: `002-production-error-logging` | **Date**: 2026-06-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-production-error-logging/spec.md`

## Summary

Add production error logging that automatically captures unhandled JavaScript errors, promise rejections, and network failures, then outputs them to browser console and server stdout in structured JSON format with full context for developer diagnosis.

## Technical Context

**Language/Version**: TypeScript (Vite 8.x, React 18.x)

**Primary Dependencies**: None new (uses browser native APIs: window.onerror, window.onunhandledrejection, console.error)

**Storage**: N/A (output to console/stdout only)

**Testing**: Vitest (already in project)

**Target Platform**: Chromium-based browsers (Chrome, Edge, Brave)

**Project Type**: Web application (wildfire tracking intelligence platform)

**Performance Goals**: <1% application overhead from error capture

**Constraints**: Must output to browser console (console.error) and server stdout; no external services or storage

**Scale/Scope**: Single application error monitoring

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Privacy & Data Isolation | ✅ PASS | No private data involved; local dev tool only |
| II. Clean Sharing Protocol | ✅ PASS | No private artifacts to sanitize |
| III. Squashed Commits | ✅ PASS | Will be single squashed commit |
| IV. Branch Hygiene | ✅ PASS | Feature branch `002-production-error-logging` |
| V. Commit Integrity | ✅ PASS | Will compile and pass all tests |
| VI. Release Branch Protocol | ✅ PASS | Will merge to `dev` first |
| VII. CI/CD Pipeline | ✅ PASS | Standard PR validation pipeline |
| VIII. Testing Discipline | ✅ PASS | Will include tests with 70%+ coverage |
| IX. Technical Constraints | ✅ PASS | No new dependencies; uses browser native APIs |

**Gate Result**: PASS — No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/002-production-error-logging/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── services/
│   └── error-logger.ts          # Core error capture and logging service
├── hooks/
│   └── useErrorLogger.ts        # React hook for component-level errors
└── types/
    └── error-logging.ts         # Type definitions

tests/
└── unit/
    └── error-logger.test.ts     # Unit tests

e2e/
└── error-logging.spec.ts        # E2E tests running the application
```

**Structure Decision**: Single project structure. Feature code lives in `src/services/` and `src/hooks/`. Tests follow existing project conventions (Vitest for unit, Playwright for E2E).

## Complexity Tracking

No constitution violations — no complexity tracking required.
