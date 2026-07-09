# Contract: Unified Alert Pipeline

**Feature**: 004-fix-nws-alerts
**Version**: 1.0

## Public Interface: `useWeatherAlerts()`

The unified data pipeline hook. This is the single entry point for NWS alert data. All consumers (map, sidebar, location search, alert banner) MUST use this hook. No other module may call the NWS API directly.

### Signature

```js
function useWeatherAlerts(options?: UseWeatherAlertsOptions): UseWeatherAlertsResult
```

### Input: `UseWeatherAlertsOptions`

```js
{
  enabled?: boolean,     // default: true — if false, no fetching occurs
  refreshMs?: number,    // default: 60000 — auto-refresh interval in ms
}
```

### Output: `UseWeatherAlertsResult`

```js
{
  // Alert data
  alerts:       WeatherAlert[],        // Full alert array (all sources merged, deduped)
  geoJSON:      GeoJSON.FeatureCollection | null,  // Map-ready GeoJSON (alerts with geometry only)

  // Pipeline status (R3: replaces ad-hoc loading/error)
  loading:      boolean,               // true during any active fetch operation
  error:        null | 'partial' | 'full',  // null = healthy, see PipelineStatus entity
  errorDetail:  string | null,         // Human-readable error description
  lastRefresh:  number | null,         // Unix timestamp of last successful full load

  // Counts
  alertCount:   number,               // Total alerts
  geoCount:     number,               // Alerts with resolved geometry

  // Control
  refresh:      () => void,            // Force immediate refresh (respects debounce)
}
```

### Behavior Contract

1. **Initial load**: On mount (or when `enabled` becomes true), fetches NWS alerts, then MapServer + FEMA supplements concurrently. Zone/county/CWA maps load in background.

2. **Auto-refresh**: Every `refreshMs` (default 60000), fetches NWS alerts only. Supplements are NOT re-fetched on auto-refresh (they are supplementary, loaded once).

3. **Stale guard**: If a new refresh starts before previous completes, the previous result is discarded. Only the latest refresh's data is emitted.

4. **Error handling**:
   - NWS API full failure → `error: 'full'`, keeps previous `alerts` array (stale data), `errorDetail` set
   - NWS API partial failure (pagination break) → `error: 'partial'`, keeps loaded pages, `errorDetail` set
   - FEMA failure → `error` unchanged (supplementary only), FEMA alerts absent from array
   - MapServer failure → `error` unchanged (supplementary only)
   - Zone/county/CWA load failure → `error` unchanged, alerts without geometry get `geometry: null`

5. **Side effect**: Calls `setAlerts(alerts)` on AppContext after each successful load, for sidebar consumption.

6. **Cache**: Delegates to `noaaWeather.js`'s 5-minute in-memory cache for NWS API calls (R6).

## Internal Contract: `noaaWeather.js` API

The sole NWS API client module. Refactored to be the single source of truth.

### Exports

```js
// Fetch all active NWS alerts (paginated, cached)
export async function fetchNWSAlerts(): Promise<RawAlert[]>

// Fetch alerts for a specific point (used by AddressAlertSearch)
export async function fetchAlertsByPoint(lat: number, lng: number): Promise<RawAlert[]>

// Enrich alerts with geometry from NWS /zones endpoint (batch, cached)
export async function enrichAlertsWithGeometry(alerts: RawAlert[]): Promise<RawAlert[]>

// Convert alert array to GeoJSON FeatureCollection
export function alertsToGeoJSON(alerts: RawAlert[]): GeoJSON.FeatureCollection

// Flatten GeometryCollection into Polygon/MultiPolygon
export function flattenGeometry(geom: GeoJSON.Geometry): GeoJSON.Polygon | GeoJSON.MultiPolygon | null
```

### RawAlert Shape (internal, before hook normalization)

```js
{
  id:           string,
  type:         string,
  headline:     string,
  description:  string,
  instruction:  string | null,
  severity:     string,
  urgency:      string,
  certainty:    string,
  sent:         string,
  effective:    string | null,
  onset:        string | null,
  expires:      string | null,
  senderName:   string | null,
  affectedArea: string,
  response:     string | null,
  parameters:   object | null,
  geocode:      { UGC: string[], SAME: string[] } | null,
  geometry:     GeoJSON | null,
}
```

## Internal Contract: `api/fema.js`

FEMA IPAWS client. Used by `useWeatherAlerts` for supplementary alert data.

### Exports

```js
export async function fetchFemaAlerts(): Promise<FemaAlert[]>
```

### FemaAlert Shape

Same shape as `WeatherAlert` with `source: 'fema'`. Returns empty `[]` on fetch failure (no throw).

## Visual Contract: Error Banner

The `AlertErrorBanner` component consumed by the sidebar.

### Props

```js
{
  error:      'partial' | 'full',
  detail:     string | null,
  onDismiss:  () => void,          // Hides banner (re-shows on next error change)
  onRetry:    () => void,          // Triggers manual refresh
  staleCount: number,              // Number of stale alerts still visible
}
```

### States

| Error | Banner Appearance |
|-------|------------------|
| `'full'` | Red banner: "Alert data unavailable — showing last known alerts from [time]. [Retry]" |
| `'partial'` | Yellow banner: "Alert data may be incomplete — loaded [N] of [expected] alerts. [Retry]" |
| Dismissed | No banner. Re-shows if error changes or on next page load. |
