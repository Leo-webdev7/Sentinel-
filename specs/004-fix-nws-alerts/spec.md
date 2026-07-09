# Feature Specification: Fix NWS Alerts

**Feature Branch**: `004-fix-nws-alerts`

**Created**: 2026-07-09

**Status**: Draft

**Input**: User description: "I need to fix all NWS alerts and I want to be able to see all of them"

## Clarifications

### Session 2026-07-09

- Q: How aggressively should the system pursue polygon geometry for alerts that lack a direct polygon? → A: Best-effort local resolution using existing sources (zone/county/CWA); alerts without resolvable geometry are sidebar-only. All alerts that DO have resolvable polygons must render on the map.
- Q: Should the fix consolidate the two parallel alert-fetching implementations into one unified pipeline? → A: Yes, in scope — a single unified data pipeline that all views draw from.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - All NWS Alerts Visible in Feed (Priority: P1)

As a user monitoring weather conditions, I want every fetched NWS alert to appear in the sidebar alert feed regardless of whether it has map geometry, so that I never miss a critical alert.

**Why this priority**: The core purpose of the platform is situational awareness. If alerts are silently dropped or hidden, users lose critical safety information. This is the foundation that the rest of the feature builds upon.

**Independent Test**: Can be fully tested by loading the live tracker with active NWS alerts and verifying that the sidebar alert count matches the total number of alerts returned by the NWS API, including alerts that lack polygon geometry.

**Acceptance Scenarios**:

1. **Given** the NWS API returns 50 active alerts, some with geometry and some without, **When** the user views the sidebar alert feed, **Then** all 50 alerts are listed in the feed (none are dropped or hidden).
2. **Given** an NWS alert has only UGC zone codes (no direct polygon geometry) and no matching zone geometry could be resolved, **When** the alert feed renders, **Then** the alert appears in the feed with a visible indicator that it lacks map geometry.
3. **Given** the NWS alert feed is displayed, **When** the user looks at the category group headers (Warnings, Watches, etc.), **Then** each header shows an accurate count that matches the actual number of alerts in that category.

---

### User Story 2 - All NWS Alert Polygons Visible on Map (Priority: P1)

As a user viewing the map, I want every NWS alert that has resolvable polygon geometry (via direct geometry, zone polygons, county, or CWA boundaries) to render as a visible polygon on the map, so that I can see the full spatial extent of active weather hazards.

**Why this priority**: The user explicitly requested that all NWS alert polygons be visible on the map. Currently, some alerts with resolvable geometry may not render correctly due to bugs in the geometry resolution pipeline.

**Independent Test**: Can be tested by comparing the set of alerts with non-null geometry in the alert array against the set of polygons rendered on the map layer, and verifying 100% match.

**Acceptance Scenarios**:

1. **Given** active NWS alerts are loaded and 30 of them have resolvable polygon geometry, **When** the map renders, **Then** all 30 alert polygons are visible on the map (none are silently dropped from the GeoJSON layer).
2. **Given** an alert's geometry was resolved from zone/county/CWA fallback sources (not direct polygon), **When** the map renders, **Then** the fallback polygon is displayed using the correct NWS color and style for that alert type.
3. **Given** an alert has malformed or invalid geometry, **When** the map layer processes it, **Then** the alert is excluded from the map layer gracefully without breaking other alert polygons, and still appears in the sidebar feed.

---

### User Story 3 - Alert Fetch Errors Are Visible to Users (Priority: P1)

As a user, I want to know when NWS alert data cannot be fetched or is incomplete, so that I understand the reliability of the information I'm seeing.

**Why this priority**: Silent failures erode trust. If the NWS API is down or returning partial data, users need to know. This pairs with P1 Story 1 to ensure comprehensive visibility.

**Independent Test**: Can be fully tested by simulating API failure (e.g., network error or HTTP 500) and verifying that a visible error indicator appears in the UI, and that any previously cached alerts remain visible.

**Acceptance Scenarios**:

1. **Given** the NWS API returns an error during an auto-refresh cycle, **When** the refresh completes, **Then** a visible error banner or indicator appears showing that alert data may be incomplete, and previously loaded alerts remain visible.
2. **Given** the NWS API pagination partially fails (some pages succeed, some fail), **When** alerts are loaded, **Then** the user sees a notification indicating partial data and the number of alerts that were successfully loaded.
3. **Given** the IPAWS/FEMA data source is unavailable, **When** alerts are loaded, **Then** NWS-sourced alerts still display normally and the user sees a non-blocking indicator that the supplemental FEMA data is unavailable.

---

### User Story 4 - Unified Alert Data Pipeline (Priority: P2)

As a user, I expect consistent alert data whether I'm viewing the map, the sidebar feed, or a location search, so that I can trust that all views reflect the same underlying alert data.

**Why this priority**: The current system has parallel, independent alert-fetching implementations that can display different results across views. This causes confusion and makes debugging difficult. Fixing this is foundational to correctness but secondary to basic visibility (P1).

**Independent Test**: Can be tested by comparing the alerts displayed on the map, in the sidebar, and in address search results for geographical consistency, and confirming they derive from a single data source.

**Acceptance Scenarios**:

1. **Given** active NWS alerts are loaded, **When** the user views the map, sidebar feed, and performs a location search, **Then** all three views show consistent alert data for overlapping geographic areas.
2. **Given** the alert data is refreshed, **When** the refresh completes, **Then** all views (map, sidebar, search) update simultaneously from the same data snapshot.
3. **Given** a user clicks an alert polygon on the map, **When** the detail panel opens, **Then** the alert details match exactly what is shown in the sidebar feed for that same alert.

---

### User Story 5 - Alert Status Transparency (Priority: P3)

As a user, I want to see clear indicators for each alert's status (has map geometry, is about to expire, was sourced from NWS vs. FEMA), so that I can quickly assess the information available for each alert.

**Why this priority**: This is a usability enhancement on top of the core visibility fixes. It helps users navigate large numbers of alerts more efficiently.

**Independent Test**: Can be tested by loading the sidebar feed and verifying that each alert card shows relevant status badges or indicators for geometry availability, expiration status, and data source.

**Acceptance Scenarios**:

1. **Given** an alert has resolved map geometry, **When** displayed in the sidebar feed, **Then** it shows a "mapped" indicator distinguishing it from alerts that are text-only.
2. **Given** an alert expires within the next 30 minutes, **When** displayed in the sidebar feed, **Then** it shows an "expiring soon" indicator.
3. **Given** an alert was sourced from FEMA IPAWS (not directly from NWS), **When** displayed, **Then** its source is clearly indicated.

---

### Edge Cases

- What happens when the NWS API returns zero alerts? The sidebar should show an empty state message (e.g., "No active NWS alerts at this time") rather than a broken state.
- What happens when an alert's geometry is malformed or invalid GeoJSON? The alert should still appear in the feed with a note that its map polygon could not be rendered, rather than crashing or being dropped entirely.
- What happens during rapid auto-refresh cycles when the API is slow? Previous alert data should remain visible until new data is fully loaded; the UI must not flicker to an empty state.
- What happens when the FEMA source returns duplicate alerts also found in the NWS source? Duplicate alerts should be deduplicated and merged, with the most complete version shown.
- What happens when an alert's category/type is not recognized in the color mapping? The alert should still display with a default/fallback style rather than being hidden.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display every successfully-fetched NWS alert in the sidebar feed, including alerts that lack polygon geometry.
- **FR-002**: System MUST provide a visible, non-blocking error indicator when NWS alert data fetching fails or is partial.
- **FR-003**: System MUST preserve and continue displaying previously loaded alerts when a refresh cycle fails.
- **FR-004**: System MUST use a single, unified data pipeline for NWS alerts that feeds all views (map, sidebar, location search) consistently.
- **FR-005**: System MUST visually distinguish alerts that have map geometry from those that are text-only in the sidebar feed.
- **FR-006**: System MUST show accurate, live-updating counts of alerts per category (Warnings, Watches, Advisories, Statements).
- **FR-007**: System MUST gracefully handle malformed or invalid alert geometry without dropping the alert from the feed or breaking other map layer polygons.
- **FR-008**: System MUST deduplicate alerts that appear in both NWS and FEMA data sources.
- **FR-009**: System MUST indicate the data source (NWS, FEMA IPAWS) for each alert in its detail view.
- **FR-010**: System MUST display an empty state message when zero active alerts exist rather than a broken or loading-indefinitely state.
- **FR-011**: System MUST render every alert with resolvable polygon geometry (direct, zone, county, or CWA) as a visible polygon on the map layer, with zero silent drops.

### Key Entities

- **Weather Alert**: Represents a single NWS watch, warning, advisory, or statement. Key attributes include event type, headline, severity, geometry (optional), affected area, expiration time, source (NWS/FEMA), and UGC zone codes.
- **Alert Category Group**: A logical grouping of alerts by classification (Warning, Watch, Advisory, Statement, EAS). Used for sidebar organization and filtering.
- **Alert Source**: The origin of alert data (NWS API, FEMA IPAWS). Used for deduplication and source transparency.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of alerts returned by the NWS API appear in the sidebar alert feed (zero silent drops).
- **SC-002**: Users see a visible notification within 5 seconds of an NWS API fetch failure during a refresh cycle.
- **SC-003**: Alert counts displayed in category group headers match the actual number of alerts in that category with 100% accuracy.
- **SC-004**: Clicking an alert on the map, in the sidebar, or from a location search opens a detail panel with identical information for the same alert.
- **SC-005**: The sidebar feed shows a meaningful empty state (not a loading spinner or blank area) when zero active alerts exist.
- **SC-006**: Previously loaded alerts remain visible and interactive during and after a failed refresh attempt.
- **SC-007**: 100% of alerts with resolvable polygon geometry render as visible polygons on the map layer — no resolved polygons are silently excluded.

## Assumptions

- The NWS API (`api.weather.gov/alerts/active`) remains the primary data source and its response format is stable.
- Alerts without resolvable polygon geometry are shown in the sidebar feed only; only alerts with successfully resolved polygons render on the map. This is by design — the sidebar is the comprehensive view, the map is the spatial view.
- Geometry resolution uses the existing fallback chain: direct polygon → zone polygon → county boundary → CWA boundary. No new external data sources are required.
- FEMA IPAWS integration continues as a supplemental source and its availability is best-effort (not required for core functionality).
- The 60-second auto-refresh interval remains appropriate for production use.
- Alert deduplication will use the NWS alert ID or CAP event identifier to match duplicates across sources.
- Users primarily interact with the sidebar feed for comprehensive alert browsing; the map provides spatial context for all alerts that have resolvable geometry.
