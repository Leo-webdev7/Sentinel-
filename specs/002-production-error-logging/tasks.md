# Tasks: Production Error Logging

**Input**: Design documents from `/specs/002-production-error-logging/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests not explicitly requested in spec - not included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Type definitions and project structure

- [ ] T001 [P] Create type definitions in src/types/error-logging.ts (ErrorLogEntry, ErrorType enum, ErrorContext)
- [ ] T002 [P] Create service directory structure: src/services/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core services that MUST be complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 [P] Implement ErrorFilter service in src/services/error-filter.ts with regex patterns for API keys, tokens, and credentials
- [ ] T004 [P] Implement ErrorFormatter service in src/services/error-formatter.ts for structured JSON output
- [ ] T005 Implement ErrorLogger service in src/services/error-logger.ts with init(), logError(), logRejection(), getErrors(), clear() methods

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Capture Runtime Errors (Priority: P1) 🎯 MVP

**Goal**: Automatically capture all unhandled JavaScript errors, promise rejections, and network failures

**Independent Test**: Trigger errors in the application and verify they appear in console with full context

### Implementation for User Story 1

- [ ] T006 [US1] Implement global error handlers in src/services/error-logger.ts (window.onerror, window.onunhandledrejection)
- [ ] T007 [US1] Add console.error interception in src/services/error-logger.ts to capture logged errors
- [ ] T008 [US1] Add network failure capture in src/services/error-logger.ts (fetch failures, XMLHttpRequest errors)

**Checkpoint**: At this point, User Story 1 should be fully functional - all errors are automatically captured

---

## Phase 4: User Story 2 - Structured Log Format (Priority: P2)

**Goal**: Output errors in structured JSON with full context for developer diagnosis

**Independent Test**: Capture an error and verify the log entry contains all required fields

### Implementation for User Story 2

- [ ] T009 [US2] Implement context collection in src/services/error-logger.ts (URL, user agent, viewport, page title)
- [ ] T010 [US2] Implement React component hierarchy capture in src/services/error-logger.ts using stack trace parsing
- [ ] T011 [US2] Create useErrorLogger hook in src/hooks/useErrorLogger.ts for component-level error logging

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - errors are captured with full structured context

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Validation and code quality

- [ ] T012 Run quickstart.md validation scenarios to verify all success criteria are met
- [ ] T013 Run lint and typecheck to ensure code quality (npm run lint && npm run typecheck)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (types must exist) - BLOCKS all user stories
- **User Stories (Phase 3-4)**: All depend on Phase 2 completion
  - US1 can start immediately after Phase 2
  - US2 depends on US1 (needs error capture to exist)
- **Polish (Phase 5)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2 - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Phase 2 - Builds on US1 error capture

### Within Each User Story

- Types before services
- Services before hooks
- Core implementation before integration

### Parallel Opportunities

- Phase 1: T001 and T002 can run in parallel
- Phase 2: T003 and T004 can run in parallel (different services)
- Phase 5: T012 and T013 can run in parallel

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Launch foundational services together:
Task: "Implement ErrorFilter service in src/services/error-filter.ts"
Task: "Implement ErrorFormatter service in src/services/error-formatter.ts"
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
4. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
