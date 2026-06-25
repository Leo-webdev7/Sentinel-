# Tasks: Console Error Check & Fix

**Input**: Design documents from `/specs/001-console-error-check/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are included as part of the implementation strategy.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Type definitions and project structure

- [ ] T001 [P] Create type definitions in src/types/console-errors.ts (ConsoleError, ErrorType enum, FixSuggestion, ErrorSummary, AIContext, ErrorLog, AIErrorEntry)
- [ ] T002 [P] Create service directory structure: src/services/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core monitoring infrastructure that MUST be complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 Implement ConsoleMonitor service in src/services/console-monitor.ts with Playwright page.on('console'), page.on('pageerror'), and page.on('requestfailed') event listeners
- [ ] T004 Implement ErrorClassifier service in src/services/error-classifier.ts for classifying errors by type (runtime, network, resource, deprecation)
- [ ] T005 Implement sensitive data filtering in src/services/sensitive-filter.ts with regex patterns for API keys, tokens, and credentials
- [ ] T006 [P] Implement AIContextCollector service in src/services/ai-context-collector.ts to capture surrounding code, component hierarchy, and state snapshots
- [ ] T007 [P] Implement ErrorLogExporter service in src/services/error-log-exporter.ts for structured JSON export optimized for AI agent consumption

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Identify Console Errors (Priority: P1) 🎯 MVP

**Goal**: Capture and display all browser console errors in real-time

**Independent Test**: Run the monitor against the application and verify all console errors are captured with correct metadata

### Implementation for User Story 1

- [ ] T008 [P] [US1] Create ErrorSummary builder logic in src/services/error-summary.ts to aggregate captured errors
- [ ] T009 [US1] Wire ConsoleMonitor to ErrorClassifier in src/services/console-monitor.ts to auto-classify captured errors
- [ ] T010 [US1] Create ConsoleErrorPanel component in src/components/ConsoleErrorPanel.tsx to display captured errors
- [ ] T011 [US1] Add error count and type breakdown display to ConsoleErrorPanel
- [ ] T012 [US1] Implement clear() method to reset captured errors and counters

**Checkpoint**: At this point, User Story 1 should be fully functional - errors are captured, classified, and displayed

---

## Phase 4: User Story 2 - Diagnose Root Causes (Priority: P2)

**Goal**: Analyze errors and identify their root causes with source locations

**Independent Test**: Inject known error patterns and verify source file, line number, and cause are extracted

### Implementation for User Story 2

- [ ] T013 [P] [US2] Implement stack trace parser in src/services/stack-trace-parser.ts to extract file, line, column from error stack traces
- [ ] T014 [P] [US2] Implement network error analyzer in src/services/network-analyzer.ts to extract endpoint, status code, and request context
- [ ] T015 [US2] Enhance ConsoleError with parsed location data by updating src/types/console-errors.ts with LocationInfo type
- [ ] T016 [US2] Integrate stack trace parser into ConsoleMonitor in src/services/console-monitor.ts
- [ ] T017 [US2] Add diagnostic details display to ConsoleErrorPanel in src/components/ConsoleErrorPanel.tsx

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - errors are captured with full diagnostic context

---

## Phase 5: User Story 3 - Apply Fixes (Priority: P3)

**Goal**: Generate fix suggestions for identified errors

**Independent Test**: Capture a known error pattern and verify appropriate fix suggestion is generated

### Implementation for User Story 3

- [ ] T018 [P] [US3] Implement FixAnalyzer service in src/services/fix-analyzer.ts with pattern matching for common error signatures
- [ ] T019 [P] [US3] Create error pattern database in src/services/error-patterns.ts with known error patterns and suggested fixes
- [ ] T020 [US3] Integrate FixAnalyzer into ConsoleMonitor in src/services/console-monitor.ts to auto-generate suggestions
- [ ] T021 [US3] Add fix suggestion display to ConsoleErrorPanel in src/components/ConsoleErrorPanel.tsx
- [ ] T022 [US3] Add confidence indicator and auto-fixable flag to fix suggestions

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Testing and validation

- [ ] T023 [P] Create E2E test in e2e/application-errors.spec.ts that runs the application in dev mode and uses the console monitor to capture real errors
- [ ] T024 [P] Create unit tests in tests/unit/console-monitor.test.ts for ConsoleMonitor, ErrorClassifier, FixAnalyzer, AIContextCollector, and ErrorLogExporter
- [ ] T025 [P] Create AI agent validation test in e2e/ai-agent-workflow.spec.ts that runs the application, captures errors, exports JSON, and verifies AI comprehension
- [ ] T026 Run quickstart.md validation scenarios to verify all success criteria are met
- [ ] T027 Run lint and typecheck to ensure code quality (npm run lint && npm run typecheck)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (types must exist) - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Phase 2 completion
  - US1 can start immediately after Phase 2
  - US2 depends on US1 (needs error capture to exist)
  - US3 depends on US1 and US2 (needs errors and diagnostics to exist)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2 - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Phase 2 - Builds on US1 error capture
- **User Story 3 (P3)**: Can start after Phase 2 - Builds on US1 and US2

### Within Each User Story

- Models/types before services
- Services before UI components
- Core implementation before integration

### Parallel Opportunities

- Phase 1: T001 and T002 can run in parallel
- Phase 2: T003, T004, T005, T006, T007 can run in parallel (different services)
- Phase 3: T008 can run in parallel with T009
- Phase 4: T013 and T014 can run in parallel
- Phase 5: T018 and T019 can run in parallel
- Phase 6: T023 and T024 can run in parallel

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Launch all foundational services together:
Task: "Implement ConsoleMonitor service in src/services/console-monitor.ts"
Task: "Implement ErrorClassifier service in src/services/error-classifier.ts"
Task: "Implement sensitive data filtering in src/services/sensitive-filter.ts"
Task: "Implement AIContextCollector service in src/services/ai-context-collector.ts"
Task: "Implement ErrorLogExporter service in src/services/error-log-exporter.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
