---
phase: 06-daily-horoscope
plan: 01
subsystem: api
tags: [swiss-ephemeris, sweph, drizzle, supabase, gemini, streaming, horoscope, transits, astrology]

# Dependency graph
requires:
  - phase: 04-astrology-engine-charts
    provides: calculateNatalChart pattern, sweph bindings, PlanetPosition types, getJulianDay utility
  - phase: 05-ai-oracle
    provides: Oracle streaming API pattern, buildSystemPrompt pattern, sentinel markers, service role client

provides:
  - calculateDailyTransits(date) in @celestia/astrology — returns TransitData for any date at noon UTC
  - calculateTransitAspects(transits, natalPlanets) — transit-to-natal aspect detection with tighter orbs
  - daily_transits Drizzle schema — global date-keyed transit position cache
  - daily_horoscopes Drizzle schema — per-chart-per-date AI horoscope text cache
  - POST /api/horoscope/generate — streaming personalized Bulgarian daily horoscope endpoint
  - buildDailyHoroscopePrompt() — Bulgarian mystical guide system prompt for daily horoscopes
  - transitAndNatalToPromptText() — formats transits + natal + aspects as AI prompt text

affects:
  - 06-daily-horoscope plans 02+ (UI components need this API)
  - any phase adding push notifications (uses daily_horoscopes table)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Two-layer transit cache: global daily_transits by date, per-chart daily_horoscopes by chart+date
    - Sofia timezone date key using Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Sofia' })
    - Dynamic import of @celestia/astrology in API routes (same as oracle pattern)
    - Transit orbs separate from natal: inner planets 2-3deg, outer planets 3-4deg
    - Yesterday horoscope: only return if previously cached, never generate retroactively

key-files:
  created:
    - packages/astrology/src/transit.ts
    - packages/db/src/schema/daily-transits.ts
    - packages/db/src/schema/daily-horoscopes.ts
    - apps/web/lib/horoscope/prompts.ts
    - apps/web/lib/horoscope/transit-to-prompt.ts
    - apps/web/app/api/horoscope/generate/route.ts
  modified:
    - packages/astrology/src/index.ts
    - packages/db/src/schema/index.ts

key-decisions:
  - "Sofia timezone date key (Intl.DateTimeFormat en-CA) prevents UTC boundary mismatch for Bulgarian users"
  - "Two-layer cache: global daily_transits (all users share same transit positions per date) + per-chart daily_horoscopes"
  - "Yesterday horoscope returns unavailable if no prior cache — no retroactive AI generation"
  - "Transit orbs separate from natal: inner planets conjunction/opposition 3deg, outer planets 4deg"
  - "Transit positions upserted with onConflict:'date' to handle concurrent requests safely"
  - "daily_transits and daily_horoscopes use service role only (no RLS) — consistent with ai_readings pattern"

patterns-established:
  - "Transit calc: same sweph.calc_ut call as natal, just different date (today vs birth date), no house placement"
  - "Transit aspect applying/separating uses only transit planet speed — natal positions are fixed"
  - "Prompt format: ТРАНЗИТНИ ПЛАНЕТИ + НАТАЛНА КАРТА + АКТИВНИ ТРАНЗИТНИ АСПЕКТИ sections"

# Metrics
duration: 5min
completed: 2026-02-15
---

# Phase 6 Plan 01: Daily Horoscope Backend Summary

**Transit calculation pipeline from sweph to streaming Gemini Bulgarian horoscope with Sofia-timezone two-layer cache (global daily_transits + per-chart daily_horoscopes)**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-15T15:54:44Z
- **Completed:** 2026-02-15T15:59:11Z
- **Tasks:** 2
- **Files modified:** 8 (6 created, 2 modified)

## Accomplishments

- Transit calculation in @celestia/astrology: calculateDailyTransits (noon UTC, 10 planets) and calculateTransitAspects (tighter transit orbs, applying/separating via transit speed only)
- Two-layer Drizzle schema: daily_transits (global per date) and daily_horoscopes (unique per chart+date)
- Streaming POST /api/horoscope/generate following Oracle pattern — cache-first, Sofia timezone key, yesterday support

## Task Commits

Each task was committed atomically:

1. **Task 1: Transit calculation and DB schema** - `43168bd` (feat)
2. **Task 2: Horoscope prompt builder and streaming API route** - `1457cf6` (feat)

## Files Created/Modified

- `packages/astrology/src/transit.ts` - calculateDailyTransits and calculateTransitAspects functions
- `packages/astrology/src/index.ts` - Re-exports TransitData, TransitAspect, calculateDailyTransits, calculateTransitAspects
- `packages/db/src/schema/daily-transits.ts` - daily_transits table (id, date unique, planet_positions jsonb, calculated_at)
- `packages/db/src/schema/daily-horoscopes.ts` - daily_horoscopes table (id, chart_id FK, user_id, date, content, generated_at, model_version) with uniqueIndex on chart_id+date
- `packages/db/src/schema/index.ts` - Re-exports dailyTransits, DailyTransit, NewDailyTransit, dailyHoroscopes, DailyHoroscope, NewDailyHoroscope
- `apps/web/lib/horoscope/prompts.ts` - buildDailyHoroscopePrompt() with Bulgarian voice, sentinel markers, 4-6 paragraph format
- `apps/web/lib/horoscope/transit-to-prompt.ts` - transitAndNatalToPromptText() with Bulgarian section headers
- `apps/web/app/api/horoscope/generate/route.ts` - Full streaming API with auth, chart ownership, two-layer cache, transit calculation, aspect detection, Gemini stream

## Decisions Made

- Used Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Sofia' }) for date keys — en-CA locale produces YYYY-MM-DD format, Sofia timezone prevents UTC boundary mismatch for Bulgarian users
- Transit orbs use separate TRANSIT_ASPECT_DEFINITIONS: inner planets (Sun/Moon/Mercury/Venus/Mars) get 2-3 degree orbs, outer planets (Jupiter-Pluto) get 3-4 degree orbs — prevents overwhelming AI prompt with too many aspects
- Yesterday horoscope: if date param is yesterday and no cache row exists, return { content: null, unavailable: true } — no retroactive AI generation per research decision
- Transit positions use upsert with onConflict: 'date' to handle concurrent requests safely (two users requesting horoscope simultaneously won't cause duplicate transit rows)
- daily_transits and daily_horoscopes both use service role access only (no RLS) — consistent with ai_readings and chart_calculations patterns

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- packages/db TypeScript compilation fails standalone (pre-existing issue: drizzle-orm module not resolved by package's tsconfig.json in isolation). The monorepo relies on the consuming app (apps/web) for module resolution. This is a pre-existing issue affecting all schema files, not introduced by this plan. apps/web TypeScript check passes cleanly.

## User Setup Required

Database migration: The new daily_transits and daily_horoscopes tables must be created in Supabase. Run from packages/db after unpausing Supabase:

```bash
npx drizzle-kit push
```

Or apply the generated migration SQL manually via Supabase dashboard SQL Editor. This is consistent with the existing migration blocker documented in STATE.md (Supabase free tier auto-pauses after 14 days).

## Next Phase Readiness

- POST /api/horoscope/generate is complete and ready for UI integration
- daily_transits and daily_horoscopes Drizzle schemas are ready — migration needed in Supabase
- buildDailyHoroscopePrompt() and transitAndNatalToPromptText() ready for use in frontend hooks
- Next: UI components (DailyHoroscope widget, HoroscopeStream, dashboard integration)

---
*Phase: 06-daily-horoscope*
*Completed: 2026-02-15*

## Self-Check: PASSED

All files verified present:
- packages/astrology/src/transit.ts: FOUND
- packages/db/src/schema/daily-transits.ts: FOUND
- packages/db/src/schema/daily-horoscopes.ts: FOUND
- apps/web/lib/horoscope/prompts.ts: FOUND
- apps/web/lib/horoscope/transit-to-prompt.ts: FOUND
- apps/web/app/api/horoscope/generate/route.ts: FOUND

All commits verified present:
- 43168bd: feat(06-01): add transit calculation and DB schema
- 1457cf6: feat(06-01): add horoscope prompt builder and streaming API route
