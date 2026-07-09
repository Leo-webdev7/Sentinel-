# Tasks: Fix NWS Alerts

**Input**: Design documents from `/specs/004-fix-nws-alerts/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/unified-alert-pipeline.md

**Tests**: The constitution (VIII. Testing Discipline) and `quickstart.md` both require tests. Test tasks are included per impacted module.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `Tests/`, `e2e/` at repository root
- Source files: `src/api/`, `src/hooks/`, `src/components/`, `src/context/`, `src/utils/`, `src/pages/`
- Tests: `src/api/*.test.js`, `Tests/Vitest/`

---

## Phase 1: Setup

**Purpose**: Verify development environment is ready; no structural changes needed

- [x] T001 Verify `npm install` succeeds and dev server starts (`npm run dev`)
- [x] T002 [P] Run baseline test suite (`npx vitest run` and `npm run lint`) to confirm existing tests pass before refactoring

---

## Phase 2: Foundational — Unified Alert Pipeline (US4)

**Purpose**: Refactor the dual-pipeline architecture into a single unified data source. This is the blocking prerequisite for all user-facing stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete. All views (sidebar, map, location search) will consume the same data from the unified hook.

**Goal**: Single unified pipeline (`noaaWeather.js` + `useWeatherAlerts.js`) that all views consume consistently

**Independent Test**: Load the live tracker and verify that `alerts` array in AppContext, the GeoJSON fed to the map layer, and the alerts returned by `fetchAlertsByPoint()` all derive from the same `noaaWeather.js` API client with identical data.

### Implementation for US4

- [x] T003 Refactor `src/api/noaaWeather.js` to be the sole NWS API client: remove mock data fallback on failure (return empty `[]` + let caller handle error), ensure `fetchNWSAlerts()` uses correct URL with `status=actual&message_type=alert,update` params, keep the 5-minute `dataCache` module-level in-memory cache
- [x] T004 [P] Update `src/api/noaaWeather.test.js` to test: (a) successful paginated fetch returns correct alert shape, (b) API failure returns empty array (no mock fallback), (c) cache returns stored data within TTL, (d) `alertsToGeoJSON()` excludes alerts with null geometry, (e) `flattenGeometry()` handles Polygon, MultiPolygon, GeometryCollection, and null
- [x] T005 Refactor `src/hooks/useWeatherAlerts.js`: remove inline `fetchAllNWSAlerts()` function, delegate to `noaaWeather.fetchNWSAlerts()` instead, remove inline FEMA XML fetcher, import `fetchFemaAlerts` from `src/api/fema.js`, adopt `noaaWeather.js` canonical alert shape (`geocode` as `{UGC, SAME}` object instead of `geocodes: UGC[]`), use `flattenGeometry()` from `noaaWeather.js` instead of local `normalizeGeometry()`
- [x] T006 In `src/hooks/useWeatherAlerts.js`, fix geometry resolution fallback chain (R4): accumulate geometry from ALL matched UGC codes instead of returning on first match, normalize zero-padded UGC codes for zone/county/CWA map key lookup, prefer zone over county over CWA per UGC code
- [x] T007 In `src/hooks/useWeatherAlerts.js`, add per-alert `try/catch` in `toGeoJSON()` conversion (R5): skip malformed geometries with `console.warn` instead of breaking entire GeoJSON; alert stays in sidebar feed
- [x] T008 In `src/hooks/useWeatherAlerts.js`, enhance merge/dedup logic (R8): field-by-field non-null preference when merging NWS + MapServer + FEMA alerts with same `id`, instead of first-wins
- [x] T009 In `src/hooks/useWeatherAlerts.js`, add structured error state (R3): return `{ error: null | 'partial' | 'full', errorDetail: string | null }` based on fetch outcomes — NWS full failure → `'full'`, pagination partial → `'partial'`, FEMA failure → preserves existing error level
- [x] T010 In `src/hooks/useWeatherAlerts.js`, preserve stale alerts on refresh failure (FR-003): keep previous `alerts` array when NWS fetch fails rather than resetting to empty
- [x] T011 Update `src/context/AppContext.jsx`: add `SET_ALERTS_STATUS` action type, add `alertsStatus: { loading, error, errorDetail, lastRefresh }` field to initial state, wire reducer to handle new action
- [x] T012 Update `src/pages/LiveTrackerPage.jsx`: consume new error/status fields from `useWeatherAlerts()` return, pass `alertsStatus` to `AppContext` on each load cycle, remove page-level `weatherAlertFilter` state (moved to context), compute `filteredAlertsGeoJSON` from context alerts + filter

**Checkpoint**: All views draw from a single unified pipeline. Alerts array consistent across context, GeoJSON, and address search. Stale data preserved on failure. Error state available.

---

## Phase 3: User Story 1 — All NWS Alerts Visible in Feed (Priority: P1) 🎯 MVP

**Goal**: Every successfully-fetched NWS alert appears in the sidebar feed, including alerts without polygon geometry. Accurate category counts. Meaningful empty state.

**Independent Test**: Load the live tracker with active NWS alerts and verify the sidebar alert count matches the total number of alerts returned by the NWS API, including alerts that lack polygon geometry. Verify category header counts match grouped content.

### Tests for US1

- [x] T013 [P] [US1] Add sidebar feed rendering tests in `Tests/Vitest/WeatherAlertsFeed.test.jsx`: (a) renders all alerts from context including those with `geometry: null`, (b) category headers show accurate counts, (c) empty state renders "No active NWS alerts" when alerts array is empty, (d) loading spinner shows when `alertsStatus.loading` is true on first load

### Implementation for US1

- [x] T014 [P] [US1] In `src/components/Sidebar/WeatherAlertsFeed.jsx`, ensure alerts without geometry render as cards (not skipped): filter to show all alerts from context regardless of `geometry` value, remove any geometry-gating conditionals
- [x] [ ] T015 [P] [US1] In `src/components/Sidebar/WeatherAlertsFeed.jsx`, implement accurate category counts (R9): derive counts inline each render from the context `alerts` array by calling `nwsAlertCategory(type)` on each alert and counting per category
- [x] [ ] T016 [US1] In `src/components/Sidebar/WeatherAlertsFeed.jsx`, implement three-state UI (R10): Loading state (spinner, first load only when `alertsStatus.loading && alerts.length === 0`), Empty state ("No active NWS alerts" message with icon when `!loading && alerts.length === 0`), Normal state (existing grouped feed), Error state — delegated to US3
- [x] [ ] T017 [US1] In `src/components/Sidebar/Sidebar.jsx`, pass `alertsStatus` from context to `WeatherAlertsFeed` as props, remove any gating that would hide the feed when no geometry exists

**Checkpoint**: Sidebar shows 100% of alerts with accurate category counts and clear empty/loading states. Independent of map and error work.

---

## Phase 4: User Story 2 — All NWS Alert Polygons on Map (Priority: P1)

**Goal**: Every alert with resolvable polygon geometry renders on the map. Malformed geometries gracefully skipped without breaking other polygons.

**Independent Test**: Compare the set of alerts with non-null geometry in the context `alerts` array against rendered polygons on the map layer and verify 100% match (zero silently dropped polygons).

### Tests for US2

- [ ] T018 [P] [US2] Add map rendering tests in `Tests/Vitest/WeatherAlertsLayer.test.jsx`: (a) renders all features from GeoJSON with geometry, (b) skips feature with invalid geometry without breaking layer, (c) renders fallback geometry (zone/county/CWA) with correct NWS color for event type, (d) handles empty GeoJSON gracefully with no console errors

### Implementation for US2

- [ ] T019 [P] [US2] In `src/components/Map/layers/WeatherAlertsLayer.jsx`, add per-feature validation before rendering: wrap individual feature conversion in try/catch, skip malformed geometry features with `console.warn`, produce combined GeoJSON with only valid features
- [ ] T020 [US2] In `src/components/Map/layers/WeatherAlertsLayer.jsx`, verify that all alerts from the unified GeoJSON with non-null geometry are rendered — remove any filter that would silently exclude features with non-null but unusual geometry
- [ ] T021 [US2] In `src/pages/LiveTrackerPage.jsx`, ensure `filteredAlertsGeoJSON` computed from context `alerts` passes all resolvable polygon alerts to `WeatherAlertsLayer`, no secondary filtering that would drop features with valid geometry

**Checkpoint**: All resolvable polygons render on map. Malformed geometries skip gracefully. Zero silent drops from valid geometry.

---

## Phase 5: User Story 3 — Alert Fetch Errors Visible to Users (Priority: P1)

**Goal**: Visible error banner appears within 5 seconds of fetch failure. Previously loaded alerts remain visible. Banner is dismissible with retry action.

**Independent Test**: Simulate NWS API failure (block URL in DevTools or mock in code) and verify a visible error banner appears within 5 seconds, stale alerts remain visible, and clicking retry triggers a re-fetch.

### Tests for US3

- [x] [ ] T022 [P] [US3] Add error banner tests in `Tests/Vitest/AlertErrorBanner.test.jsx`: (a) renders 'full' error with red banner, retry button, and stale alert count, (b) renders 'partial' error with yellow banner and loaded/expected count, (c) dismiss hides banner, (d) banner re-shows when error severity changes, (e) retry button calls `onRetry` callback

### Implementation for US3

- [x] [ ] T023 [P] [US3] Create `src/components/Sidebar/AlertErrorBanner.jsx` component per visual contract (`contracts/unified-alert-pipeline.md`): accepts `error`, `detail`, `onDismiss`, `onRetry`, `staleCount` props; renders red banner for `'full'` error ("Alert data unavailable — showing last known alerts from [time]. Retry"), yellow banner for `'partial'` error ("Alert data may be incomplete — loaded [N] alerts. Retry"), dismissible with `onDismiss`, retry button with `onRetry`
- [x] [ ] T024 [US3] In `src/components/Sidebar/WeatherAlertsFeed.jsx`, integrate `AlertErrorBanner` at top of feed: read `alertsStatus.error` from context, pass to banner, wire `onRetry` to `useWeatherAlerts().refresh()`, wire `onDismiss` to local dismiss state that resets on error severity change
- [x] [ ] T025 [US3] In `src/hooks/useWeatherAlerts.js`, ensure error state transitions within 5 seconds of fetch failure: set `error` and `errorDetail` in the same synchronous flow as fetch completion (no deferred timers), trigger `setAlertsStatus()` on AppContext with updated error fields

**Checkpoint**: Users see visible error notification on fetch failure. Stale alerts preserved. Retry functional.

---

## Phase 6: User Story 5 — Alert Status Transparency (Priority: P3)

**Goal**: Alerts in sidebar show indicators for geometry availability, imminent expiration, and data source.

**Independent Test**: Load the sidebar feed with a mix of alert types and verify: alerts with geometry show "mapped" indicator, alerts expiring within 30 minutes show "expiring soon" indicator, FEMA alerts show "FEMA" source badge.

### Implementation for US5

- [x] [ ] T026 [P] [US5] In `src/components/Sidebar/WeatherAlertsFeed.jsx`, add geometry status indicator to each alert card: show a map-pin icon or "On map" label when `alert.geometry !== null`, show a text-only icon or "Text only" label when `alert.geometry === null`
- [x] [ ] T027 [P] [US5] In `src/components/Sidebar/WeatherAlertsFeed.jsx`, add expiration indicator: compute `expiringSoon` boolean (expires within 30 minutes), show a clock icon or "Expiring soon" badge on alert card when true
- [x] [ ] T028 [P] [US5] In `src/components/Sidebar/WeatherAlertsFeed.jsx`, add source indicator badge on each alert card: "NWS" badge (default) or "FEMA" badge when `alert.source === 'fema'`, use distinct colors
- [x] [ ] T029 [US5] In `src/components/FireDetailPanel/FireDetailPanel.jsx` (`AlertDetail` section), add source indicator: display `alert.source` ("National Weather Service" for NWS, "FEMA IPAWS" for FEMA) in the metadata chips area

**Checkpoint**: Users can quickly assess geometry coverage, urgency, and data provenance for each alert.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Integration cleanup, regression fixes, and final validation.

- [x] [ ] T030 [P] Update `src/components/Sidebar/AddressAlertSearch.jsx` to use `noaaWeather.fetchAlertsByPoint()` from the unified API client (already uses it, verify no regression); remove any standalone NWS API calls
- [x] [ ] T031 [P] Update `src/components/AlertBanner/AlertBanner.jsx` to consume alerts from unified context pipeline; verify Red Flag Warning data consistency with sidebar
- [x] [ ] T032 [P] Update `src/components/Legend/Legend.jsx` to ensure all NWS alert types render with correct color fallback when type not in `NWS_ALERT_COLORS` map (default to `#3b82f6`)
- [x] [ ] T033 [P] In `src/api/noaaWeather.js`, update `alertsToGeoJSON()` to add `source` property to GeoJSON feature properties (for hover tooltip source display on map)
- [x] [ ] T034 Run `npm run test:coverage` and verify >= 70% coverage on `src/api/noaaWeather.js` and `src/hooks/useWeatherAlerts.js`. Add supplementary tests if below threshold.
- [x] [ ] T035 Run `npm run lint` and fix any new lint errors introduced by refactoring
- [x] [ ] T036 Run `npm run test:e2e` and update `Tests/e2e/live-alerts.spec.ts` if needed to reflect changed alert data flow
- [x] [ ] T037 Run `npm run build` and verify production build succeeds with no errors
- [x] [ ] T038 Validate against `quickstart.md` manual verification checklist: go through each check item with dev server running, confirm all expected behaviors

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational / US4 (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 completion — can run in parallel with US2, US3
- **US2 (Phase 4)**: Depends on Phase 2 completion — can run in parallel with US1, US3
- **US3 (Phase 5)**: Depends on Phase 2 completion — can run in parallel with US1, US2
- **US5 (Phase 6)**: Depends on US1 (sidebar must show all alerts before adding indicators) and US2 (geometry status needs resolved geometry)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

```
Phase 2 (US4: Unified Pipeline)
    │
    ├── Phase 3 (US1: Sidebar Feed) ──┐
    ├── Phase 4 (US2: Map Polygons) ──┤
    └── Phase 5 (US3: Error Visibility)┘
                                          │
                                     Phase 6 (US5: Status Transparency)
                                          │
                                     Phase 7 (Polish)
```

### Within Each Phase

- Tests before implementation (write, verify they fail, then implement)
- Core module refactoring before component updates
- Component updates before integration wiring
- Phase complete before moving to next

### Parallel Opportunities

- **Phase 1**: T001 and T002 can run in parallel
- **Phase 2**: T003 and T004 can run in parallel (different files); T009 and T010 can run in parallel (same file but orthogonal logic)
- **Phase 3-5**: US1, US2, US3 can all run in parallel after Phase 2 completes (different components/files)
- **Phase 6**: T026, T027, T028 can run in parallel (same component but independent UI additions)
- **Phase 7**: T030, T031, T032, T033 can all run in parallel (different files)

---

## Parallel Examples

### Phase 2 (Foundational Pipeline)

```bash
# Start API client refactor and tests in parallel:
Task T003: "Refactor src/api/noaaWeather.js to be the sole NWS API client"
Task T004: "Update src/api/noaaWeather.test.js"

# After T003+T004 complete, run hook refactor:
Task T005: "Refactor src/hooks/useWeatherAlerts.js to delegate to noaaWeather.js"
# Then parallel sub-tasks within hook:
Task T006: "Fix geometry resolution fallback chain"
Task T007: "Add per-alert try/catch in toGeoJSON()"
Task T008: "Enhance merge/dedup logic"
```

### Phase 3-5 (P1 Stories — After Phase 2)

```bash
# All three P1 stories can start in parallel:
# Developer A — US1:
Task T013: "Sidebar feed rendering tests"
Task T014: "Ensure alerts without geometry render as cards"
Task T015: "Implement accurate category counts"

# Developer B — US2:
Task T018: "Map rendering tests"
Task T019: "Add per-feature validation in WeatherAlertsLayer"

# Developer C — US3:
Task T022: "Error banner tests"
Task T023: "Create AlertErrorBanner component"
```

---

## Implementation Strategy

### MVP First (Phase 2 + Phase 3)

1. Complete Phase 1: Setup
2. Complete Phase 2: Unified Pipeline (US4) — **CRITICAL**
3. Complete Phase 3: Sidebar Feed (US1)
4. **STOP and VALIDATE**: Test independently — all alerts visible in sidebar with accurate counts, empty/loading states correct
5. Deploy to stage for validation

### Incremental Delivery

1. Setup + Unified Pipeline → Foundation ready
2. Add US1 (Sidebar Feed) → Test independently → Deploy (MVP: user sees all alerts)
3. Add US2 (Map Polygons) → Test independently → Deploy (full spatial visibility)
4. Add US3 (Error Visibility) → Test independently → Deploy (trust + transparency)
5. Add US5 (Status Transparency) → Test independently → Deploy (usability polish)
6. Final Polish → Full validation → Production

### MVP Scope

**Minimum viable**: Phase 1 + Phase 2 + Phase 3 (US1). This delivers the core value: all alerts visible in the sidebar feed with accurate counts. The unified pipeline ensures consistency. Map polygons and error visibility build on this foundation.

---

## Notes

- [P] tasks = different files or orthogonal logic in same file, no dependencies between them
- [Story] label maps task to specific user story for traceability (US1-US5)
- Each user story can be independently tested at its checkpoint
- Constitution requires >= 70% coverage on affected area (T034 verifies)
- Commit after each logical task group (API client + tests, hook refactor, UI updates per story)
- Stop at any checkpoint to validate story independently
- Focus refactoring on the alert pipeline files — legacy code policy allows this per user's explicit authorization (Q2 clarification)
