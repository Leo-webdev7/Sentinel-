# Implementation Plan: Fix Production CORS and FIRMS/FIRIS Errors

**Branch**: `003-fix-cors-firms-errors` | **Date**: 2026-06-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-fix-cors-firms-errors/spec.md`

## Summary

Fix production console errors caused by CORS policy blocking Supabase edge function requests, FIRIS ArcGIS service errors, and census counties endpoint failures. The primary issue is a **Supabase project mismatch** — production is hitting `hmtavsjepgefjhwcqqhd.supabase.co` while the codebase config references `phcjcwrymsvjzedtysao.supabase.co`. The Supabase edge functions may not be deployed to the correct project, causing CORS preflight failures. Secondary issues include the census counties proxy returning HTML instead of JSON and FIRIS service rate limiting.

## Critical Finding: Edge Functions Not Deployed (RESOLVED)

The CORS error references `hmtavsjepgefjhwcqqhd.supabase.co` — this IS the correct production Supabase project (CEI's project). The local `.env` has a different project (`phcjcwrymsvjzedtysao`) for local development only.

**Root Cause**: The Supabase edge functions (`firms-proxy`, etc.) have never been deployed to the production Supabase project (`hmtavsjepgefjhwcqqhd`). When the browser sends an OPTIONS preflight request to a non-existent function, Supabase returns an error (not HTTP 200), triggering the CORS block. There is no `config.toml`, no `.supabase/` directory, no deploy scripts, and no CI/CD pipeline for edge function deployment.

**Fix**: Deploy the edge functions to the production Supabase project:
```bash
supabase link --project-ref hmtavsjepgefjhwcqqhd
supabase secrets set NASA_FIRMS_API_KEY=<key>
supabase functions deploy firms-proxy
```

## Technical Context

**Language/Version**: JavaScript/TypeScript (Vite + React frontend, Supabase Deno functions, Netlify Edge Functions)

**Primary Dependencies**: React, Supabase, Mapbox GL, Vite

**Storage**: N/A (error handling fixes only)

**Testing**: Vitest (existing test infrastructure)

**Target Platform**: Web browser (nationalwildfiretrackingteam.org)

**Project Type**: web-application

**Performance Goals**: Fire data loads within 5 seconds of page load

**Constraints**: Must not break existing fallback mechanisms or data integrity

**Scale/Scope**: Single production website with dual-proxy architecture (Netlify Edge Functions + Supabase Edge Functions)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Privacy & Data Isolation**: No private data exposure in this fix
- **Clean Sharing Protocol**: All changes are production-safe
- **CI/CD Pipeline**: Changes must pass PR validation before merge to Main
- **Testing Discipline**: Bug fix — tests recommended but not mandatory for error handling changes
- **Netlify Free Tier**: No resource-intensive operations added

**GATE STATUS**: PASS

## Project Structure

### Documentation (this feature)

```text
specs/003-fix-cors-firms-errors/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (this plan)
```

### Source Code (repository root)

```text
supabase/functions/
├── firms-proxy/index.ts        # Primary CORS fix target (Supabase)
└── ...

netlify/edge-functions/
├── firms-proxy.js              # Netlify proxy (primary in current code)
├── census-counties-proxy.js    # Census endpoint fix needed
└── ...

src/
├── api/nasaFirms.js            # FIRMS data fetching with tiered fallback
├── api/nifc.js                 # FIRIS/NIFC data fetching with retry logic
├── hooks/useFireHotspots.js    # FIRMS polling hook
├── hooks/useWeatherAlerts.js   # Census counties consumer
└── utils/errorThrottle.js      # Error throttling utility
```

**Structure Decision**: Existing dual-proxy architecture. Focus changes on:
1. Netlify environment variable verification (Supabase URL + API keys)
2. Supabase edge function deployment verification
3. Census counties proxy error handling
4. FIRIS service graceful degradation

## Complexity Tracking

No violations to track. This is a deployment verification and error handling improvement, not a new architectural feature.

## Tasks

### Phase 1: Environment Verification (Manual — Requires Dashboard Access)

**Purpose**: Verify production environment configuration matches expected values

- [ ] T001 **[CRITICAL]** Check Netlify environment variables for production site:
  - `VITE_SUPABASE_URL` — should point to correct Supabase project
  - `VITE_SUPABASE_ANON_KEY` — should match the Supabase project
  - `VITE_NASA_FIRMS_API_KEY` — should be set for Netlify edge function proxy
- [ ] T002 **[CRITICAL]** Check Supabase dashboard for `hmtavsjepgefjhwcqqhd` project:
  - Verify `firms-proxy` edge function is deployed
  - Verify `NASA_FIRMS_API_KEY` secret is set: `supabase secrets list`
  - Check function logs for recent errors
- [ ] T003 **[CRITICAL]** Verify Supabase project linkage:
  - Confirm which Supabase project ID the production site should use
  - If `hmtavsjepgefjhwcqqhd` is correct, ensure edge functions are deployed there
  - If `phcjcwrymsvjzedtysao` is correct, update Netlify env var `VITE_SUPABASE_URL`
- [ ] T004 Test Netlify edge function at `/api/firms/*` directly in browser
  - Navigate to `https://nationalwildfiretrackingteam.org/api/firms/api/area/csv/{KEY}/VIIRS_SNPP_NRT/-130,24,-65,50/1`
  - Verify it returns CSV data (not an error)

### Phase 2: Fix Census Counties Proxy (P2)

**Purpose**: Fix the `[WeatherAlerts] Non-JSON response (text/html; charset=utf-8) from /api/census/counties` error

- [ ] T005 Investigate why `census-counties-proxy.js` returns HTML instead of JSON
  - The Census Bureau WAF may be blocking the request
  - Check if the `User-Agent` header is sufficient
  - Test the proxy endpoint directly
- [ ] T006 If Census WAF is blocking, add retry logic or alternative headers in `netlify/edge-functions/census-counties-proxy.js`
- [ ] T007 Add error handling in `src/hooks/useWeatherAlerts.js` to gracefully handle non-JSON responses
  - Currently logs `[WeatherAlerts] Non-JSON response` — need to catch and return empty data

### Phase 3: Improve FIRIS Error Handling (P3)

**Purpose**: Reduce console noise from FIRIS ArcGIS service errors

- [ ] T008 Review FIRIS retry logic in `src/api/nifc.js` — current 3-attempt retry with exponential backoff is reasonable
- [ ] T009 Consider extending cache TTL during detected FIRIS outages (currently 10 minutes)
  - If FIRIS fails, cache the empty result for longer to avoid repeated failed requests
- [ ] T010 Verify FIRIS error throttling is working — `throttleError('[FIRIS]', ...)` should limit messages to once per 5 minutes

### Phase 4: NIFC Rate Limiting (P3)

**Purpose**: Address the `[NIFC] Using fallback perimeters: Unable to perform query. Too many requests.` error

- [ ] T011 The NIFC ArcGIS service is rate-limiting requests. Options:
  - Add request deduplication (prevent concurrent identical requests)
  - Increase cache TTL for NIFC perimeters (currently 10 minutes)
  - Add jitter to retry delays to avoid thundering herd
- [ ] T012 Update `src/api/nifc.js` to implement request deduplication or longer cache during rate-limiting

### Phase 5: Validation

**Purpose**: Verify all fixes work in production

- [ ] T013 Deploy changes to `stage` branch and validate on Netlify preview
- [ ] T014 Test on production after merge to `Main`:
  - Open browser dev tools → Network tab
  - Verify no CORS errors for `firms-proxy`
  - Verify `/api/census/counties` returns JSON (not HTML)
  - Verify FIRIS errors are throttled (max 1 per 5 minutes)
  - Verify NIFC rate limiting is handled gracefully
- [ ] T015 Verify success criteria:
  - SC-001: Zero CORS-related console errors
  - SC-002: FIRMS data loads on 95%+ of page visits
  - SC-003: Console error messages reduced by 80%
  - SC-004: Fire data visible within 5 seconds of page load

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Environment)**: Must complete FIRST — all other phases depend on correct env config
- **Phase 2 (Census)**: Independent of other phases
- **Phase 3 (FIRIS)**: Independent of other phases
- **Phase 4 (NIFC)**: Independent of other phases
- **Phase 5 (Validation)**: Depends on all other phases

### Critical Path

```
Phase 1 (Env Verification) → Phase 5 (Validation)
         ↓
    Phase 2, 3, 4 (can run in parallel)
```

## Implementation Strategy

### MVP First (CORS Fix Only)

1. **Complete Phase 1**: Verify/fix environment variables and Supabase deployment
2. **Deploy to production**
3. **Validate**: CORS errors eliminated
4. **STOP and SHIP** if only CORS fix is needed

### Incremental Delivery

1. Phase 1 → CORS errors fixed (MVP)
2. Phase 2 → Census counties errors fixed
3. Phase 3 → FIRIS errors throttled
4. Phase 4 → NIFC rate limiting handled
5. Phase 5 → Full validation

## Notes

- Phase 1 tasks are **MANUAL** — they require access to Netlify and Supabase dashboards
- The code changes in Phases 2-4 are small and low-risk
- All existing error throttling (`errorThrottle.js`) is already implemented and working
- The Supabase project mismatch is the root cause of the CORS errors

## Success Criteria Verification

| Criterion | How to Verify | Task(s) |
|-----------|---------------|---------|
| SC-001: Zero CORS errors | Check Console tab in browser dev tools | T014, T015 |
| SC-002: 95%+ FIRMS load rate | Monitor multiple page loads | T014, T015 |
| SC-003: 80% error reduction | Compare console output before/after | T014, T015 |
| SC-004: 5-second load time | Measure time from page load to fire markers | T015 |
