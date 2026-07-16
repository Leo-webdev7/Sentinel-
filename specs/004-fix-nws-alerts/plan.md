# Implementation Plan: Fix NWS Alerts

**Branch**: `004-fix-nws-alerts` | **Date**: 2026-07-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-fix-nws-alerts/spec.md`

## Summary

Fix NWS alert visibility by consolidating two parallel alert-fetching implementations into a single unified pipeline, ensuring 100% of fetched alerts appear in the sidebar feed, 100% of alerts with resolvable geometry render on the map, and all fetch errors become visible to users instead of being silently logged to console.

## Technical Context

**Language/Version**: JavaScript ES2022 (JSX), no TypeScript

**Primary Dependencies**: React 18.3, Vite 8, Mapbox GL 3.21, react-map-gl 7.1, TailwindCSS 3, fast-xml-parser 5.7

**Storage**: In-memory React state (no persistent alert storage). Supabase for auth/backend services (not directly involved in alert pipeline)

**Testing**: Vitest 4.1 (unit/integration, jsdom), Playwright 1.61 (e2e, Chromium), @testing-library/react 16

**Target Platform**: Web browser (SPA), deployed on Netlify free tier

**Project Type**: Single-page web application (Vite + React)

**Performance Goals**: Map renders up to 200 alert polygons at interactive frame rates (>30fps). Alert data refreshes every 60 seconds. Sidebar renders all alerts without input delay.

**Constraints**: Netlify free tier limits (125K serverless invocations/month, 3M edge function invocations/month). Legacy code policy: code created before June 22, 2026 must not be refactored unless explicitly requested by user. The user explicitly requested pipeline consolidation (Q2 clarification), authorizing refactoring of legacy alert code.

**Scale/Scope**: Up to ~200 active NWS alerts nationwide at peak. ~3,000 county boundaries, ~1,200 zone polygons pre-loaded. ~50 unique NWS event types with color mappings.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Privacy & Data Isolation | PASS | NWS alerts are public data. No private user data involved. |
| II. Clean Sharing Protocol | PASS | All work artifacts remain in spec directory. Clean commits. |
| III. Squashed Commits | PASS | Feature will ship as single squashed commit when complete. |
| IV. Branch Hygiene | PASS | Feature development on `004-fix-nws-alerts` branch (private workspace). |
| V. Commit Integrity | PASS | Commits will be atomic and self-contained. |
| VI. Release Branch Protocol | PASS | Standard dev → stage → Main flow. |
| VII. CI/CD Pipeline | PASS | PR to stage will trigger lint, build, test, coverage checks. |
| VIII. Testing Discipline | PASS | Tests required for new/refactored pipeline code. Coverage target: 70% on affected area. Existing test files (`noaaWeather.test.js`, `nwsColors.test.js`) serve as baseline. |
| IX. Technical Constraints — Legacy Code | PASS | User explicitly authorized pipeline consolidation (Q2 chose Option A). The `useWeatherAlerts.js` hook and `noaaWeather.js` module are the primary legacy files to be refactored. |
| IX. Technical Constraints — Library Management | PASS | No new dependencies. Existing `fast-xml-parser` (already used for IPAWS XML) and React/Mapbox stack suffice. |
| IX. Technical Constraints — Netlify Free Tier | PASS | Alert fetching is client-side from NWS API; zone/county/CWA proxies use edge functions well within 3M/month limit. Census county proxy called ~6 times per page load (paginated); FEMA proxy called once per refresh (every 60s). Total: well under free tier. |

## Project Structure

### Documentation (this feature)

```text
specs/004-fix-nws-alerts/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── unified-alert-pipeline.md
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── api/
│   ├── noaaWeather.js          # [REFACTOR] Unified NWS API client (single source of truth)
│   ├── noaaWeather.test.js     # [UPDATE] Tests for unified client
│   ├── fema.js                 # [KEEP] FEMA IPAWS client (already correct)
│   └── ...
├── hooks/
│   ├── useWeatherAlerts.js     # [REFACTOR] Single unified hook, consumes noaaWeather.js
│   └── ...
├── components/
│   ├── Sidebar/
│   │   ├── WeatherAlertsFeed.jsx   # [UPDATE] Error/empty states, geometry indicators
│   │   └── AddressAlertSearch.jsx  # [UPDATE] Use unified pipeline
│   ├── Map/
│   │   ├── MapView.jsx             # [UPDATE] Consistent data source
│   │   └── layers/
│   │       └── WeatherAlertsLayer.jsx  # [UPDATE] Malformed geometry handling
│   ├── AlertBanner/
│   │   └── AlertBanner.jsx         # [REVIEW] Ensure data consistency
│   ├── FireDetailPanel/
│   │   └── FireDetailPanel.jsx     # [UPDATE] Source indicator, geometry status
│   └── Legend/
│       └── Legend.jsx              # [REVIEW] Color fallback handling
├── context/
│   └── AppContext.jsx              # [UPDATE] Add error/status fields to state
├── utils/
│   ├── nwsColors.js               # [REVIEW] Ensure all types covered
│   └── ...
└── pages/
    └── LiveTrackerPage.jsx         # [UPDATE] Consume unified hook, error display
```

**Structure Decision**: Single frontend SPA (existing structure). No new directories needed. Primary changes are: consolidation of `noaaWeather.js` and `useWeatherAlerts.js` into a unified pipeline, and adding error/status display to UI components.

## Complexity Tracking

> No violations requiring justification.
