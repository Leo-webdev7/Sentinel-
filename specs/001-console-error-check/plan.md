# Implementation Plan: Console Error Check & Fix

**Branch**: `001-console-error-check` | **Date**: 2026-06-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-console-error-check/spec.md`

## Summary

Add a real-time console error monitoring feature that uses Playwright event listeners to capture, categorize, and analyze browser errors as they occur. The system outputs structured JSON logs optimized for AI agent consumption, with sufficient context for agents to understand and fix errors without additional investigation.

## Technical Context

**Language/Version**: TypeScript (Vite 8.x, React 18.x)

**Primary Dependencies**: Playwright (already in project at ^1.61.0)

**Storage**: N/A (ephemeral error capture)

**Testing**: Vitest + Playwright (already in project)

**Target Platform**: Chromium-based browsers (Chrome, Edge, Brave)

**Project Type**: Web application (wildfire tracking intelligence platform)

**Performance Goals**: Capture and display all errors within 5 seconds

**Constraints**: Must use Playwright's `page.on('console')` and `page.on('pageerror')` event listeners

**Scale/Scope**: Single developer tool (no multi-user concerns)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Privacy & Data Isolation | ✅ PASS | No private data involved; local dev tool only |
| II. Clean Sharing Protocol | ✅ PASS | No private artifacts to sanitize |
| III. Squashed Commits | ✅ PASS | Will be single squashed commit |
| IV. Branch Hygiene | ✅ PASS | Feature branch `001-console-error-check` |
| V. Commit Integrity | ✅ PASS | Will compile and pass all tests |
| VI. Release Branch Protocol | ✅ PASS | Will merge to `dev` first |
| VII. CI/CD Pipeline | ✅ PASS | Standard PR validation pipeline |
| VIII. Testing Discipline | ✅ PASS | Will include tests with 70%+ coverage |
| IX. Technical Constraints | ✅ PASS | Uses Playwright already in project; no new dependencies |

**Gate Result**: PASS — No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/001-console-error-check/
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
│   └── console-monitor.ts      # Core error capture service
├── components/
│   └── ConsoleErrorPanel.tsx    # UI for displaying captured errors
└── types/
    └── console-errors.ts        # Type definitions

e2e/
└── console-monitor.spec.ts     # E2E tests for the feature

tests/
└── unit/
    └── console-monitor.test.ts  # Unit tests
```

**Structure Decision**: Single project structure. Feature code lives in `src/services/` and `src/components/`. Tests follow existing project conventions (Vitest for unit, Playwright for E2E).

## Complexity Tracking

No constitution violations — no complexity tracking required.
