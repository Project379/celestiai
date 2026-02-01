---
phase: 04-astrology-engine-charts
plan: 02
subsystem: api
tags: [chart-calculation, caching, supabase, drizzle, authentication]

# Dependency graph
requires:
  - phase: 04-astrology-engine-charts
    provides: "@celestia/astrology package with calculateNatalChart()"
  - phase: 03-birth-data-database
    provides: charts table with user birth data
provides:
  - "POST /api/chart/calculate endpoint for natal chart calculation"
  - "chart_calculations database table for caching calculated charts"
  - "chartCalculationSchema Zod validator with Bulgarian messages"
affects: [04-03, 05-ai-oracle]

# Tech tracking
tech-stack:
  added: [pg]
  patterns: [cache-first-calculation, service-role-supabase]

key-files:
  created:
    - apps/web/app/api/chart/calculate/route.ts
    - apps/web/lib/validators/chart.ts
    - packages/db/src/schema/chart-calculations.ts
    - packages/db/drizzle/0003_big_winter_soldier.sql
  modified:
    - packages/db/src/schema/index.ts
    - packages/db/package.json

key-decisions:
  - "Use service role client for chart_calculations (internal cache, no direct user access)"
  - "Cache lookup before calculation for performance"
  - "JSONB columns for flexible chart data storage"
  - "Unique constraint on chart_id (one calculation per chart)"

patterns-established:
  - "Cache-first pattern: check cache, calculate if missing, store result"
  - "Ownership verification: fetch chart, verify user_id matches before access"

# Metrics
duration: 65min
completed: 2026-02-01
---

# Phase 4 Plan 2: Chart Calculation API Summary

**POST /api/chart/calculate endpoint with database caching using @celestia/astrology package and chart_calculations table for storing calculated natal charts**

## Performance

- **Duration:** 65 min
- **Started:** 2026-02-01T14:13:09Z
- **Completed:** 2026-02-01T15:18:11Z
- **Tasks:** 2
- **Files created:** 4

## Accomplishments
- Created chart_calculations database table with JSONB columns for chart data
- Built POST /api/chart/calculate with authentication and ownership verification
- Implemented cache-first pattern: returns cached result if exists, calculates if missing
- All error messages in Bulgarian Cyrillic
- Security: users can only calculate their own charts

## Task Commits

Each task was committed atomically:

1. **Task 1: Create chart_calculations database schema** - `56fb6ed` (feat)
   - chartCalculations table with JSONB columns
   - Foreign key to charts with cascade delete
   - Schema exports updated

2. **Task 2: Create chart calculation API route** - `86642cf` (feat)
   - POST endpoint with Clerk authentication
   - Cache lookup and storage
   - Bulgarian error messages

**Plan metadata:** (to be committed)

## Files Created/Modified

### Created
- `apps/web/app/api/chart/calculate/route.ts` - Chart calculation API endpoint
- `apps/web/lib/validators/chart.ts` - Zod schema for chartId validation
- `packages/db/src/schema/chart-calculations.ts` - Database table schema
- `packages/db/drizzle/0003_big_winter_soldier.sql` - Migration SQL

### Modified
- `packages/db/src/schema/index.ts` - Export chartCalculations
- `packages/db/package.json` - Added pg dev dependency for migration

## Decisions Made

1. **Service role client for chart_calculations** - Internal cache table accessed only via API, no direct user access needed
2. **Cache-first approach** - Check cache before expensive Swiss Ephemeris calculation
3. **JSONB for flexibility** - Planet positions, houses, aspects stored as JSONB for easy querying
4. **Unique constraint on chart_id** - One calculation per chart, upsert on recalculation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Applied migration via pg client instead of drizzle-kit push**
- **Found during:** Task 1 (database schema push)
- **Issue:** drizzle-kit push took extremely long time (20+ minutes stuck on "Pulling schema")
- **Fix:** Generated migration SQL with drizzle-kit generate, then applied via pg client directly
- **Files modified:** packages/db/apply-migration.mjs (temporary, deleted)
- **Verification:** Table verified via pg client query showing all columns
- **Committed in:** 56fb6ed (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Auto-fix necessary due to network/database latency. Same result achieved via alternative method.

## Issues Encountered

- **drizzle-kit push extremely slow**: The drizzle-kit push command was stuck on "Pulling schema from database" for over 20 minutes. This is likely due to Supabase free-tier database hibernation or network latency. Resolved by using drizzle-kit generate to create migration SQL, then applying it directly via pg client.

## User Setup Required

None - no external service configuration required. The chart_calculations table was created in the existing Supabase database.

## Next Phase Readiness

- POST /api/chart/calculate ready for frontend integration
- Returns ChartData with planets (10), houses (12), aspects, ascendant, and mc
- Caching reduces calculation time for repeat requests
- Ready for Plan 03: Chart visualization with D3.js

---
*Phase: 04-astrology-engine-charts*
*Plan: 02*
*Completed: 2026-02-01*
