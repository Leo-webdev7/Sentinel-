# Implementation Plan: Build Pipeline

**Branch**: `001-build-pipeline` | **Date**: 2026-06-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-build-pipeline/spec.md`

**Updated**: 2026-06-24 - Clarified: all PRs trigger checks, E2E for Main/stage/dev, per-diff coverage

## Summary

Implement CI/CD pipeline using GitHub Actions for PR validation only.
Netlify's preview server handles automatic deployment when branches
receive new commits. No explicit deploy jobs needed.

## Technical Context

**Language/Version**: YAML (GitHub Actions), Node.js 24

**Primary Dependencies**: GitHub Actions, Netlify, Vitest, Playwright

**Storage**: N/A (stateless pipeline)

**Testing**: Vitest (unit/integration), Playwright (E2E)

**Target Platform**: Ubuntu Linux (CI runner), Netlify (deployment)

**Project Type**: Web application (React + Vite)

**Performance Goals**: PR pipeline < 15 min

**Constraints**: Must stay within Netlify Free Tier

**Scale/Scope**: Single project, ~10 contributors

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Privacy & Data Isolation | ✅ PASS | No private data in workflows |
| II. Clean Sharing Protocol | ✅ PASS | Workflows are clean |
| III. Squashed Commits | ✅ PASS | Single commit per PR |
| IV. Branch Hygiene | ✅ PASS | PR-based workflow |
| V. Commit Integrity | ✅ PASS | CI enforces validity |
| VI. Release Branch Protocol | ✅ PASS | dev → stage → Main flow |
| VII. CI/CD Pipelines | ✅ PASS | Checks only on PRs, auto-deploy |
| VIII. Testing Discipline | ✅ PASS | Coverage check on PRs only |
| IX. Technical Constraints | ✅ PASS | Netlify Free Tier respected |

**Gate Result**: PASS

## Clarifications Applied

| Question | Answer |
|----------|--------|
| Branch structure | Create `dev` in myfork, use `dev → stage → Main` |
| When do checks run? | Only on PRs, no checks on branch pushes |
| Which PRs trigger checks? | All PRs, regardless of target branch |
| When are E2E tests required? | Required when PR targets Main, stage, or dev |
| Coverage threshold scope? | Per-PR-diff: changed lines must have 70% coverage |

## Project Structure

### Documentation (this feature)

```text
specs/001-build-pipeline/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
.github/workflows/
├── ci.yml               # PR validation pipeline (only workflow needed)
└── opensky-sync.yml     # Existing sync (keep as-is)

netlify.toml             # Netlify configuration (branch deploys)
```

### Branch Hierarchy

```
myfork (private)
    │
    ├── dev (active development) ← CREATE THIS
    │     │
    │     ├── feature branches (merge into dev)
    │     │
    │     └── PR → stage
    │
    ├── stage (staging environment)
    │     │
    │     └── PR → Main
    │
    └── Main (production environment)
```

### Workflow Trigger Rules

| Event | What Runs | Branches |
|-------|-----------|----------|
| PR opened (any target) | Lint, build, tests, typecheck, coverage | All PRs |
| PR targets Main/stage/dev | + E2E tests | Main, stage, dev |
| PR merged to stage | Netlify auto-deploy | stage |
| PR merged to dev | Netlify auto-deploy | dev |
| PR merged to Main | Netlify auto-deploy | Main |

### Coverage Strategy

- Coverage checked per-PR-diff (changed lines only)
- Threshold: 70% of changed lines must be covered
- Tool: Vitest built-in coverage (v8 provider)

### Environment Configuration

| Environment | Branch | Netlify Site ID Secret | Purpose |
|-------------|--------|------------------------|---------|
| Stage | `stage` | `NETLIFY_SITE_ID_STAGE` | Pre-production |
| Production | `Main` | `NETLIFY_SITE_ID_MAIN` | Live application |

**Structure Decision**: Single CI workflow for PR validation only.
Netlify handles branch deployments automatically - no explicit
deploy jobs needed.

## Complexity Tracking

No constitution violations requiring justification.
