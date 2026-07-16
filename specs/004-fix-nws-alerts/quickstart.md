# Quickstart: Fix NWS Alerts Validation

**Feature**: 004-fix-nws-alerts
**Date**: 2026-07-09

## Prerequisites

- Node.js >= 18.0.0
- `npm install` (all dependencies installed)
- Environment: `.env` file with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Optional: `VITE_MAPBOX_TOKEN` for satellite basemap tiles

## Quick Validation

### 1. Run Existing Tests (Baseline)

```bash
# Unit tests for the alert pipeline
npx vitest run src/api/noaaWeather.test.js
npx vitest run src/utils/nwsColors.test.js

# All unit tests
npx vitest run
```

**Expected**: All existing tests pass. `noaaWeather.test.js` validates `alertsToGeoJSON()` shape. `nwsColors.test.js` validates color/category mappings.

### 2. Build Check

```bash
npm run build
```

**Expected**: Production build succeeds with no errors. Verify `dist/` contains index.html and chunked JS bundles.

### 3. Lint Check

```bash
npm run lint
```

**Expected**: No new lint errors introduced. Existing warnings acceptable.

### 4. Dev Server Smoke Test

```bash
npm run dev
```

Open `http://localhost:3000/sentinel` in a browser.

**Manual verification checklist**:

| Check | Expected Behavior |
|-------|------------------|
| Sidebar shows alert feed | Alerts grouped by category with accurate counts |
| Category counts match content | Warning count = number of alerts classified as warnings |
| Map shows alert polygons | NWS-colored polygons visible when Weather Alerts layer toggled on |
| Click alert polygon on map | Detail panel opens with same data as sidebar entry for that alert |
| Click alert in sidebar | Map flies to alert location; detail panel opens |
| Empty state (if no alerts) | "No active NWS alerts" message, not a spinner |
| Error state (simulate) | See Simulated Error Testing below |
| Alert without geometry | Shows in sidebar with "unmapped" indicator; no crash |
| FEMA alerts (if any) | Source indicator shows "FEMA" vs "NWS" |

### 5. Simulated Error Testing

To test error visibility (FR-002, SC-002):

**Method 1 — Browser DevTools**:
1. Open DevTools Network tab
2. Right-click the NWS API request (`api.weather.gov/alerts/active`)
3. Select "Block request URL"
4. Wait for next auto-refresh (or click manual refresh if implemented)
5. **Expected**: Yellow or red error banner appears within 5 seconds. Previously loaded alerts remain visible.

**Method 2 — Mock in code**:
1. In `src/api/noaaWeather.js`, temporarily add `throw new Error('Simulated failure')` at top of `fetchNWSAlerts()`
2. Reload page
3. **Expected**: Error banner appears. If cache has prior data, stale alerts visible with error indicator.

### 6. Geometry Coverage Verification

```bash
# Open browser console on live tracker page
# Run this snippet to check geometry coverage:
const ctx = window.__REACT_DEVTOOLS_GLOBAL_HOOK__; // if React DevTools installed
// Or add a temporary console.log in useWeatherAlerts.js:
console.log('Alerts total:', alerts.length, 'With geometry:', alerts.filter(a => a.geometry).length);
```

**Expected**: The count of alerts with geometry is <= total alerts. All alerts with geometry render as visible polygons on the map.

### 7. E2E Tests

```bash
npm run test:e2e
```

**Expected**: `live-alerts.spec.ts` passes (Red Flag Warning banner rendering, navigation, dismiss, click-to-detail).

### 8. Test Coverage

```bash
npm run test:coverage
```

**Expected**: Coverage report shows >= 70% on the refactored alert pipeline files (`src/api/noaaWeather.js`, `src/hooks/useWeatherAlerts.js`).

## Key Files to Test

| File | What to Verify |
|------|---------------|
| `src/api/noaaWeather.js` | `fetchNWSAlerts()` pagination, cache TTL, mock fallback removed (now returns empty + error signal), `alertsToGeoJSON()` filters correctly, `flattenGeometry()` handles all geometry types |
| `src/hooks/useWeatherAlerts.js` | Single NWS API call path (no inline fetch), FEMA merge uses `api/fema.js`, error state transitions, geometry resolution fallback chain, stale guard |
| `src/components/Sidebar/WeatherAlertsFeed.jsx` | Empty/loading/error states, geometry status indicators, accurate category counts |
| `src/components/Map/layers/WeatherAlertsLayer.jsx` | Malformed geometry skips without breaking layer, all resolvable polygons render |
| `src/context/AppContext.jsx` | New `alertsStatus` field in state, reducer handles `SET_ALERTS_STATUS` action |
