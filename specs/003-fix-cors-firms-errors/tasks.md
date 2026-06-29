# Tasks: Fix Production CORS and FIRMS/FIRIS Errors

**Input**: Design documents from `/specs/003-fix-cors-firms-errors/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Not requested in feature specification - omitting test tasks

**Organization**: Tasks are grouped by phase to enable focused implementation.

## Format: `[ID] [P?] [Phase] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Phase]**: Which phase this task belongs to
- Include exact file paths in descriptions

## Path Conventions

- **Supabase Edge Functions**: `supabase/functions/`
- **Netlify Edge Functions**: `netlify/edge-functions/`
- **Client-Side API**: `src/api/`
- **Client-Side Hooks**: `src/hooks/`
- **Utilities**: `src/utils/`

---

## Phase 1: Deploy Edge Functions to Production Supabase (MANUAL — Requires Supabase Access)

**⚠️ CRITICAL**: This is the root cause of all CORS errors. The edge functions are not deployed to the production Supabase project.

**Purpose**: Deploy the `firms-proxy` edge function to the production Supabase project (`hmtavsjepgefjhwcqqhd`)

- [x] T001 **[CRITICAL]** Link the local project to the production Supabase project:
  ```bash
  supabase link --project-ref hmtavsjepgefjhwcqqhd
  ```
- [x] T002 **[CRITICAL]** Set the required secrets in the production Supabase project:
  ```bash
  supabase secrets set NASA_FIRMS_API_KEY=<your_key>
  ```
- [x] T003 **[CRITICAL]** Deploy the `firms-proxy` edge function:
  ```bash
  supabase functions deploy firms-proxy
  ```
- [x] T004 **[CRITICAL]** Verify the deployment by testing the OPTIONS request:
  - Open browser dev tools → Network tab
  - Navigate to `https://nationalwildfiretrackingteam.org`
  - Find the `firms-proxy` request
  - Verify the OPTIONS request returns HTTP 200 with CORS headers
- [x] T005 **[CRITICAL]** Test the production site:
  - Verify no CORS errors in console
  - Verify FIRMS fire data loads on the map
- [ ] T006 **[P]** Deploy other edge functions as needed (calfire-proxy, airnow-proxy, etc.)

**Checkpoint**: CORS errors eliminated — FIRMS data loads successfully

---

## Phase 2: Fix Census Counties Proxy (P2)

**Purpose**: Fix the `[WeatherAlerts] Non-JSON response (text/html; charset=utf-8) from /api/census/counties` error

- [ ] T007 [P] Investigate why `census-counties-proxy.js` returns HTML instead of JSON
  - The Census Bureau WAF may be blocking the request
  - Check if the `User-Agent` header is sufficient
  - Test the proxy endpoint directly
- [ ] T008 [P] If Census WAF is blocking, add retry logic or alternative headers in `netlify/edge-functions/census-counties-proxy.js`
- [ ] T009 [P] Add error handling in `src/hooks/useWeatherAlerts.js` to gracefully handle non-JSON responses
  - Currently logs `[WeatherAlerts] Non-JSON response` — need to catch and return empty data

**Checkpoint**: Census counties data loads without console errors

---

## Phase 3: Improve FIRIS Error Handling (P3)

**Purpose**: Reduce console noise from FIRIS ArcGIS service errors

- [ ] T010 [P] Review FIRIS retry logic in `src/api/nifc.js` — current 3-attempt retry with exponential backoff is reasonable
- [ ] T011 [P] Consider extending cache TTL during detected FIRIS outages (currently 10 minutes)
  - If FIRIS fails, cache the empty result for longer to avoid repeated failed requests
- [ ] T012 [P] Verify FIRIS error throttling is working — `throttleError('[FIRIS]', ...)` should limit messages to once per 5 minutes

**Checkpoint**: FIRIS errors throttled and graceful degradation working

---

## Phase 4: NIFC Rate Limiting (P3)

**Purpose**: Address the `[NIFC] Using fallback perimeters: Unable to perform query. Too many requests.` error

- [ ] T013 [P] The NIFC ArcGIS service is rate-limiting requests. Options:
  - Add request deduplication (prevent concurrent identical requests)
  - Increase cache TTL for NIFC perimeters (currently 10 minutes)
  - Add jitter to retry delays to avoid thundering herd
- [ ] T014 [P] Update `src/api/nifc.js` to implement request deduplication or longer cache during rate-limiting

**Checkpoint**: NIFC rate limiting handled gracefully

---

## Phase 5: Validation

**Purpose**: Verify all fixes work in production

- [ ] T015 Deploy changes to `stage` branch and validate on Netlify preview
- [ ] T016 Test on production after merge to `Main`:
  - Open browser dev tools → Network tab
  - Verify no CORS errors for `firms-proxy`
  - Verify `/api/census/counties` returns JSON (not HTML)
  - Verify FIRIS errors are throttled (max 1 per 5 minutes)
  - Verify NIFC rate limiting is handled gracefully
- [ ] T017 Verify success criteria:
  - SC-001: Zero CORS-related console errors
  - SC-002: FIRMS data loads on 95%+ of page visits
  - SC-003: Console error messages reduced by 80%
  - SC-004: Fire data visible within 5 seconds of page load

**Checkpoint**: All success criteria met — production errors resolved

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Environment)**: Must complete FIRST — BLOCKS all other phases
- **Phase 2 (Census)**: Independent — can start after Phase 1
- **Phase 3 (FIRIS)**: Independent — can start after Phase 1
- **Phase 4 (NIFC)**: Independent — can start after Phase 1
- **Phase 5 (Validation)**: Depends on all other phases being complete

### Critical Path

```
Phase 1 (Env Verification) → Phase 2, 3, 4 (parallel) → Phase 5 (Validation)
```

### Parallel Opportunities

- Once Phase 1 completes, Phases 2, 3, and 4 can run in parallel
- Tasks within each phase marked [P] can run in parallel

---

## Implementation Strategy

### MVP First (CORS Fix Only)

1. Complete Phase 1: Verify/fix environment variables and Supabase deployment
2. Deploy to production
3. Validate: CORS errors eliminated
4. **STOP and SHIP** if only CORS fix is needed

### Incremental Delivery

1. Phase 1 → CORS errors fixed (MVP!)
2. Phase 2 → Census counties errors fixed
3. Phase 3 → FIRIS errors throttled
4. Phase 4 → NIFC rate limiting handled
5. Phase 5 → Full validation

---

## Notes

- Phase 1 tasks are **MANUAL** — they require Supabase CLI access and deployment
- The code changes in Phases 2-4 are small and low-risk
- All existing error throttling (`errorThrottle.js`) is already implemented and working
- The root cause is that edge functions are not deployed to the production Supabase project (`hmtavsjepgefjhwcqqhd`)
- Commit after each task or logical group
- Stop at any checkpoint to validate independently

---

## Success Criteria Verification

| Criterion | How to Verify | Task(s) |
|-----------|---------------|---------|
| SC-001: Zero CORS errors | Check Console tab in browser dev tools | T005, T016 |
| SC-002: 95%+ FIRMS load rate | Monitor multiple page loads | T005, T016 |
| SC-003: 80% error reduction | Compare console output before/after | T012, T016 |
| SC-004: 5-second load time | Measure time from page load to fire markers | T017 |
