# Tasks: Build Pipeline

**Input**: Design documents from `/specs/001-build-pipeline/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

**Tests**: Not explicitly requested in feature specification - test tasks omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and branch setup

- [x] T001 Create `dev` branch in myfork remote for active development
- [x] T002 Verify `stage` branch exists in sentinel-upstream remote
- [x] T003 Verify `Main` branch exists in sentinel-upstream remote
- [ ] T004 [P] Configure Netlify site and connect to repository
- [ ] T005 [P] Add GitHub Secrets: NETLIFY_AUTH_TOKEN, NETLIFY_SITE_ID

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core configuration that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Create netlify.toml with production branch `Main` in repo root
- [x] T007 Configure netlify.toml deploy branches: `stage`, `dev`
- [x] T008 [P] Create `.github/workflows/` directory structure

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - PR Validation Pipeline (Priority: P1) 🎯 MVP

**Goal**: When a PR is opened, automatic quality checks (lint, build, tests, coverage, E2E) run and block merge if any fail

**Independent Test**: Open a PR with broken code and verify pipeline blocks the merge

### Implementation for User Story 1

- [x] T009 [US1] Create `.github/workflows/ci.yml` with PR trigger (all branches) in .github/workflows/ci.yml
- [x] T010 [US1] Add lint job using ESLint in .github/workflows/ci.yml
- [x] T011 [US1] Add build job using `npm run build` in .github/workflows/ci.yml
- [x] T012 [US1] Add test job using Vitest in .github/workflows/ci.yml
- [x] T013 [US1] Add typecheck job using TypeScript in .github/workflows/ci.yml
- [x] T014 [US1] Add coverage job using Vitest v8 provider in .github/workflows/ci.yml
- [x] T015 [US1] Configure coverage threshold: 70% of changed lines in .github/workflows/ci.yml
- [x] T016 [US1] Add E2E job with condition: target is Main/stage/dev in .github/workflows/ci.yml
- [x] T017 [US1] Configure job dependencies (lint → build → test → typecheck → coverage → e2e) in .github/workflows/ci.yml
- [x] T018 [US1] Add job timeouts (PR pipeline < 15 min total) in .github/workflows/ci.yml

**Checkpoint**: PR validation pipeline is functional - PRs trigger checks and block merge on failure

---

## Phase 4: User Story 2 - Main Branch Deployment (Priority: P1)

**Goal**: When code is merged to Main/stage/dev, Netlify automatically deploys to the appropriate environment

**Independent Test**: Merge a valid PR and verify Netlify deploys automatically

### Implementation for User Story 2

- [x] T019 [US2] Verify netlify.toml production branch is set to `Main` in netlify.toml
- [x] T020 [US2] Verify netlify.toml deploy-preview branch is set to `stage` in netlify.toml
- [x] T021 [US2] Verify netlify.toml branch-deploy branch is set to `dev` in netlify.toml
- [ ] T022 [US2] Test auto-deploy: merge PR to `stage` and verify Netlify deployment
- [ ] T023 [US2] Test auto-deploy: merge PR to `dev` and verify Netlify deployment
- [ ] T024 [US2] Test auto-deploy: merge PR to `Main` and verify Netlify production deployment

**Checkpoint**: Auto-deployment works for all three branches

---

## Phase 5: User Story 3 - Secret Management (Priority: P2)

**Goal**: Netlify credentials are stored securely in GitHub Secrets and injected without exposure

**Independent Test**: Verify secrets are referenced correctly and never appear in logs

### Implementation for User Story 3

- [x] T025 [US3] Document required GitHub Secrets in README or docs
- [x] T026 [US3] Verify workflow references secrets correctly (not hardcoded) in .github/workflows/ci.yml
- [x] T027 [US3] Add secret validation: fail with clear error if secrets missing in .github/workflows/ci.yml
- [x] T028 [US3] Verify no secrets appear in workflow output/logs

**Checkpoint**: Secrets are managed securely and validated

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T029 [P] Create quickstart.md validation scenarios in specs/001-build-pipeline/quickstart.md
- [x] T030 [P] Document pipeline architecture in project README
- [ ] T031 Run quickstart.md validation scenarios end-to-end (requires manual PR testing)
- [ ] T032 Verify PR pipeline completes within 15 minutes (requires manual PR testing)
- [ ] T033 Verify Netlify auto-deploys within 5 minutes of branch push (requires manual deployment testing)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - US1 (PR Validation) - Can start first
  - US2 (Auto Deploy) - Can start after US1 (needs workflow to exist)
  - US3 (Secrets) - Can start after US1 (needs workflow to exist)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Depends on US1 (workflow must exist for Netlify to connect)
- **User Story 3 (P2)**: Depends on US1 (workflow must exist to reference secrets)

### Within Each User Story

- Implementation tasks should be completed in order (dependencies between jobs)
- Each task builds on previous tasks in the workflow

### Parallel Opportunities

- Phase 1 tasks marked [P] can run in parallel
- Phase 2 tasks marked [P] can run in parallel
- US2 and US3 can run in parallel after US1 is complete
- Polish tasks marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch lint, build, test jobs together (after workflow structure exists):
Task: "Add lint job using ESLint in .github/workflows/ci.yml"
Task: "Add build job using `npm run build` in .github/workflows/ci.yml"
Task: "Add test job using Vitest in .github/workflows/ci.yml"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (branch creation, secrets)
2. Complete Phase 2: Foundational (netlify.toml, workflow directory)
3. Complete Phase 3: User Story 1 (PR validation pipeline)
4. **STOP and VALIDATE**: Open a PR and verify checks run
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → PR validation works (MVP!)
3. Add User Story 2 → Test independently → Auto-deployment works
4. Add User Story 3 → Test independently → Secrets managed securely
5. Polish → Run validation scenarios

### Key Files

| File | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | PR validation pipeline |
| `netlify.toml` | Netlify deployment configuration |
| `README.md` | Documentation of pipeline setup |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- E2E tests only run when PR targets Main, stage, or dev
- Coverage is per-PR-diff (changed lines must have 70% coverage)
