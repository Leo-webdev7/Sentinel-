# Data Model: Fix NWS Alerts

**Feature**: 004-fix-nws-alerts
**Date**: 2026-07-09

## Core Entity: WeatherAlert

The canonical alert object produced by the unified pipeline and consumed by all views (sidebar, map, location search, detail panel).

```js
WeatherAlert {
  // Identity
  id:           string,        // NWS CAP identifier (e.g., "urn:oid:2.49.0.1.840.0...")
  source:       'nws' | 'fema', // Data origin for dedup & source transparency

  // Classification
  type:         string,        // NOAA event type (e.g., "Tornado Warning", "Red Flag Warning")
  category:     'warning' | 'watch' | 'advisory' | 'statement' | 'eas' | 'other', // Derived
  severity:     string,        // "Extreme" | "Severe" | "Moderate" | "Minor" | "Unknown"
  urgency:      string,        // "Immediate" | "Expected" | "Future" | "Unknown"
  certainty:    string,        // "Observed" | "Likely" | "Possible" | "Unknown"

  // Display Text
  headline:     string,        // Short summary (e.g., "Tornado Warning issued May 5 at 2:15PM CDT")
  description:  string,        // Full alert narrative text
  instruction:  string | null, // Safety instructions (may be null)

  // Temporal
  sent:         string | null, // ISO 8601 timestamp (when alert was issued)
  effective:    string | null, // ISO 8601 timestamp
  onset:        string | null, // ISO 8601 timestamp
  expires:      string | null, // ISO 8601 timestamp

  // Spatial
  geometry:     GeoJSON | null, // Polygon or MultiPolygon, or null if unresolvable
  areaSqMi:     number | null,  // Computed area in square miles (null if no geometry)
  affectedArea: string,          // Human-readable area description (e.g., "Northwestern Shelby County")
  geocode:      {               // Full geocode object (R2: preserved from API)
    UGC:        string[],       // Universal Geographic Codes (e.g., ["CAZ006", "CAC037"])
    SAME:       string[],       // Specific Area Message Encoding codes
  } | null,

  // Metadata
  senderName:   string | null, // Issuing office name (e.g., "NWS Memphis TN")
  parameters:   {              // Raw CAP parameters (population, VTEC, WMOidentifier, etc.)
    [key: string]: any
  } | null,
  response:     string | null, // Recommended action ("Shelter", "Evacuate", etc.)
}
```

## Derived Fields (computed, not stored)

| Field | Derivation | Purpose |
|-------|-----------|---------|
| `category` | `nwsAlertCategory(type)` from `src/utils/nwsColors.js` | Sidebar grouping; map styling |
| `color` | `nwsAlertColor(type)` from `src/utils/nwsColors.js` | Polygon fill/stroke color; sidebar badge |
| `areaSqMi` | `geometryAreaSqMi(geometry)` from `src/utils/geoArea.js` | Sorting; detail panel display |
| `expiringSoon` | `expires` within 30 minutes of now | P3 status indicator |
| `hasGeometry` | `geometry !== null` | P3 mapped/text-only indicator |

## State Entity: PipelineStatus

Error/loading state exposed by the unified hook.

```js
PipelineStatus {
  loading:    boolean,   // true during any active fetch
  error:      null | 'partial' | 'full',  // null = healthy, 'partial' = incomplete, 'full' = all failed
  errorDetail: string | null,  // Human-readable error description (e.g., "NWS API returned HTTP 500")
  lastRefresh: number | null,  // Unix timestamp of last successful full load
  alertCount:  number,         // Total alerts in the current data set
  geoCount:    number,         // Alerts with resolved geometry
}
```

## State Entity: AlertViewFilter

Controls what subset of alerts the user sees highlighted.

```js
AlertViewFilter {
  categoryFilter: 'all' | 'warning' | 'watch' | 'advisory' | 'statement',
  sourceFilter:   'all' | 'nws' | 'fema',    // P3: source filter
}
```

## Context Integration: AppContext Additions

Existing `AppContext` state adds two fields:

```diff
  AppContextState {
    // ... existing fields ...
    alerts:           WeatherAlert[],    // EXISTING: full alert array
+   alertsStatus:     PipelineStatus,    // NEW: loading/error/refresh state
+   alertsFilter:     AlertViewFilter,   // NEW: filter state (moved from page-level useState)
  }
```

The `alertsStatus` field replaces the separate `isLoading` and implicitly-passed error states that were previously ad-hoc. All consumers read a single source of truth for pipeline health.

## Entity Relationships

```
PipelineStatus ──monitors──► WeatherAlert[] ──grouped by──► AlertCategoryGroup
                                                               │
                                                               ├── WarningGroup
                                                               ├── WatchGroup
                                                               ├── AdvisoryGroup
                                                               ├── StatementGroup
                                                               └── EASGroup

AlertViewFilter ──filters──► WeatherAlert[] ──transformed──► GeoJSON FeatureCollection (map layer)
```

## Validation Rules (from FRs)

- **FR-001**: Every alert with non-null `id` MUST be present in the `alerts` array (no silent drops)
- **FR-007**: Alerts with malformed `geometry` MUST NOT cause other alerts to fail rendering
- **FR-008**: Duplicate `id` across NWS and FEMA sources → merge into single alert, preferring non-null fields
- **FR-011**: Every alert with non-null `geometry` MUST produce a valid GeoJSON feature in the map layer
