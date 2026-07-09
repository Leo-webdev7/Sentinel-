# Research: Fix NWS Alerts

**Feature**: 004-fix-nws-alerts
**Date**: 2026-07-09

## R1: Unified Pipeline Architecture

**Decision**: Consolidate into a single `useWeatherAlerts` hook that internally delegates to `noaaWeather.js` as the sole API client.

**Rationale**: The current dual-implementation architecture is the root cause of data inconsistency between views. Two independent callers (`useWeatherAlerts.js` inline fetch + `noaaWeather.js` exported function) use different URL parameters, different caching, different normalization, and different error handling — producing different alert arrays for the same underlying data. By making `noaaWeather.js` the single source of truth for NWS API communication and having `useWeatherAlerts` consume it exclusively, all views (map, sidebar, location search) get identical data.

**Alternatives considered**:
- **Fix bugs in both implementations independently**: More conservative but fails to address the root cause. Bugs would recur as each implementation diverges. Rejected per user's explicit selection (Q2 Option A).
- **Delete `noaaWeather.js` and move everything into the hook**: Would lose the `enrichAlertsWithGeometry()` zone-enrichment pipeline and the module-level caching. `noaaWeather.js` has valuable functionality (NWS `/zones` endpoint enrichment, GeometryCollection flattening) that the hook lacks.
- **Delete the hook's inline code and make `noaaWeather.js` handle everything**: The hook has valuable orchestration logic (zone/county/CWA map loading, FEMA+MapServer merge) that belongs in the hook layer, not the API client layer.

**Implementation approach**:
1. `noaaWeather.js` becomes the sole NWS API client — exports `fetchNWSAlerts()`, retains `enrichAlertsWithGeometry()`, `alertsToGeoJSON()`, `flattenGeometry()`
2. `useWeatherAlerts` removes its inline `fetchAllNWSAlerts()` function and calls `noaaWeather.fetchNWSAlerts()` instead
3. `useWeatherAlerts` normalizes the API client's alert shape into its internal format, then continues existing merge/geometry/GeoJSON pipeline
4. `AddressAlertSearch` refreshes its call to use `noaaWeather.fetchAlertsByPoint()` (already exists), sharing cache

## R2: Alert Normalization & Data Shape

**Decision**: Adopt `noaaWeather.js`'s richer normalization as the canonical shape. The hook's normalization was a simplified subset.

**Rationale**: `noaaWeather.js` preserves `geocode` (full object with `UGC` and `SAME` arrays) and `parameters` (VTEC, WMOidentifier, population). The hook extracts only `geocodes: p.geocode?.UGC || []`, discarding SAME codes that may be needed for geometry resolution. Using the full object from the API client gives the hook more data for geometry lookup and metadata display.

**Key differences resolved**:
| Field | Old Hook | Old API Client | Unified |
|-------|----------|---------------|---------|
| `geocode` | Flattened to `geocodes: UGC[]` | Full `{UGC, SAME}` object | Full `{UGC, SAME}` object |
| `parameters` | Passed through raw | Passed through raw | Passed through (from API client) |
| `id` | From `p.id` | From `p.id` | From `p.id` (NWS CAP identifier) |
| `geometry` | `normalizeGeometry()` (first Polygon only) | `flattenGeometry()` (all Polygons merged) | `flattenGeometry()` (more complete) |

## R3: Error Visibility Pattern

**Decision**: Add an `error` state field to the `useWeatherAlerts` return value, with three severity levels: `null` (no error), `'partial'` (some data loaded but incomplete), `'full'` (no data, showing stale/cached).

**Rationale**: Currently, all fetch errors are `console.warn` with no user-facing indication. The hook's return destructuring includes `error: alertsError` on `LiveTrackerPage` but the hook never sets it. Adding structured error state enables the sidebar to show a non-blocking banner and the map to display a subtle indicator.

**Error state transitions**:
```
null → (NWS API fails) → 'full' (no alerts, show stale data + banner)
null → (pagination partially fails) → 'partial' (some alerts, show count + banner)
null → (FEMA fails) → 'partial' (NWS ok, show small indicator)
null → (MapServer fails) → null (MapServer is supplementary, no user impact)
```

**Implementation**: The hook sets `error` based on fetch outcomes. The sidebar receives `weatherAlertsError` prop and renders `AlertErrorBanner` component when non-null. The banner is dismissible but re-shows on next error state change.

## R4: Geometry Resolution Fallback Chain

**Decision**: Keep the existing fallback chain (direct polygon → zone polygon → county boundary → CWA boundary) but fix the bug where `first match wins` instead of attempting all sources. For each UGC code, try all three maps; prefer zone (most precise) over county over CWA.

**Rationale**: The current code returns on the first matching UGC code and first matching source. If an alert covers 5 zones but only 3 have cached geometry, the current code returns geometry for only 1 zone. The fix accumulates geometry from ALL matched UGC codes and uses the most precise source available per code.

**Additional fix**: Normalize UGC code format before lookup. Some alerts have UGCs like `"CAZ006"` while zone maps key as `"CAZ6"` (no zero-padding). Add zero-padding normalization to the lookup.

**Out of scope**: Adding the NWS `/zones` live endpoint enrichment from `noaaWeather.js`'s `enrichAlertsWithGeometry()`. The static shapefile approach is sufficient and avoids additional API calls. This could be added later if coverage gaps remain.

## R5: Malformed Geometry Handling

**Decision**: Add a `try/catch` wrapper around individual alert-to-GeoJSON-feature conversion. Invalid geometries are skipped with a `console.warn` (not breaking the entire GeoJSON), and the alert remains in the sidebar with a "no geometry" indicator.

**Rationale**: Currently, if geometry normalization produces invalid GeoJSON (e.g., self-intersecting polygon that Mapbox GL rejects), the behavior is undefined — it could break the entire layer or silently omit the feature. Wrapping each feature conversion individually ensures one bad alert doesn't break all others.

**Implementation**:
```js
const feature = toGeoJSONFeature(alert);
if (feature && isValidGeoJSON(feature)) {
  features.push(feature);
} else {
  console.warn(`[NWS] Geometry skipped for alert ${alert.id}`);
}
```

## R6: NWS API Client Caching Strategy

**Decision**: Keep `noaaWeather.js`'s existing 5-minute `dataCache` (module-level in-memory cache). The hook's 60-second interval becomes the refresh driver; the API client returns cached data for intermediate calls within the 5-minute window.

**Rationale**: The hook refreshes every 60 seconds. If the NWS API is called every 60 seconds without caching, this generates ~1,440 requests/day. With the 5-minute cache, only ~288 requests/day hit the API. The NWS API has no documented rate limit but being a good netizen is appropriate. The 60-second refresh still ensures the hook polls for new cache data; the API is only hit when the cache expires.

## R7: FEMA Alert Merging

**Decision**: Keep the separate `src/api/fema.js` module (already clean, has JSON parsing, CAP polygon handling, caching). Have `useWeatherAlerts` import `fetchFemaAlerts` from the API module instead of using its inline XML-based FEMA fetcher. Remove the inline FEMA fetcher from the hook.

**Rationale**: The hook's inline FEMA fetcher uses `DOMParser` to parse XML, extracts only `id`, and sets all descriptive fields to null — producing broken alerts. The `api/fema.js` module uses JSON, parses full CAP entries, and produces complete alert objects with source attribution. Using the API module fixes FEMA alert display (they currently show as blank entries).

## R8: Deduplication Strategy

**Decision**: Continue using `id` (CAP identifier) as the dedup key. Enhance merge to prefer the most complete alert (more fields populated) rather than just first-wins.

**Rationale**: The current merge drops any supplementary alert whose ID already exists unless it adds geometry or text the primary lacks. But the hook's FEMA fetcher produces alerts with null type/severity, so even when the API module produces complete FEMA alerts, some fields may be lost if NWS has the same alert with partial data. The enhanced merge compares field-by-field and takes the non-null/non-empty value from whichever source has it.

## R9: Category Count Accuracy

**Decision**: Derive category counts from the full unfiltered alerts array each render, rather than computing them once and passing as props.

**Rationale**: The category counts in the sidebar header should always match the actual data. Currently, counts could desync if filtering/state updates occur between render cycles. Computing counts inline from the context `alerts` array in `WeatherAlertsFeed` ensures always-accurate counts.

## R10: Empty State vs Loading State

**Decision**: Three distinct UI states: Loading (spinner, first load only), Empty ("No active NWS alerts" with checkmark icon), Error (banner with retry button, preserved stale alerts below).

**Rationale**: Currently, loading and empty are visually identical (just a loading spinner that disappears). Users can't distinguish "no alerts exist" from "data hasn't loaded yet." Clear state differentiation improves user confidence and reduces support questions.
