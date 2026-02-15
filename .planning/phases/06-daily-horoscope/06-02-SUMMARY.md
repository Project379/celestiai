---
phase: 06-daily-horoscope
plan: 02
subsystem: ui
tags: [react, hooks, streaming, ai-sdk, horoscope, tailwind, glassmorphism, sentinel-markers]

# Dependency graph
requires:
  - phase: 06-daily-horoscope
    provides: POST /api/horoscope/generate streaming endpoint, two-layer cache (daily_transits + daily_horoscopes), Sofia timezone date key pattern
  - phase: 05-ai-oracle
    provides: useOracleReading hook pattern, useCompletion streamProtocol:'text', sentinel marker [planet:KEY] pattern, ReadingStream component pattern

provides:
  - useDailyHoroscope hook in apps/web/hooks — streaming, date selection, caching, yesterday unavailable state
  - HoroscopeStream component — sentinel marker rendering with planet color highlighting, streaming cursor
  - DailyHoroscope component — full card with date navigation, loading skeleton, error states, glassmorphism styling
  - DailyHoroscopeEmpty component — empty state for users without birth data
  - Dashboard integration — DailyHoroscope rendered as first content section when user has birth chart

affects:
  - 06-daily-horoscope plan 03+ (any future horoscope features build on this UI layer)
  - 07+ phases adding dashboard widgets (established placement pattern)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - useDailyHoroscope mirrors useOracleReading: useCompletion with streamProtocol:'text', isLoading transition tracking via ref
    - Date params passed as URL query strings (?date=YYYY-MM-DD) not in body — matches API route searchParams parsing
    - HoroscopeStream: parseSentinels() uses RegExp with lastIndex tracking to emit React nodes inline with colored spans
    - Planet color map (PLANET_COLORS) maps English keys to Tailwind text- classes for accent highlighting
    - Two-phase init: fetch to check cache first, fall through to stream if no cache (avoids unnecessary generation)

key-files:
  created:
    - apps/web/hooks/useDailyHoroscope.ts
    - apps/web/components/horoscope/HoroscopeStream.tsx
    - apps/web/components/horoscope/DailyHoroscope.tsx
  modified:
    - apps/web/components/dashboard/DashboardContent.tsx

key-decisions:
  - "Date param passed as URL query string (?date=YYYY-MM-DD) to match API route searchParams parsing — not in POST body"
  - "parseSentinels() returns React.ReactNode[] to render planet names with accent colors inline — no DOM manipulation"
  - "PLANET_COLORS map uses Tailwind text- classes per planet key — reuses cosmic theme palette"
  - "DailyHoroscope placed after BirthDataCard section and before 3-column grid — first astrology content section"
  - "DailyHoroscopeEmpty exported as separate component for future use but dashboard uses conditional rendering with main DailyHoroscope"

patterns-established:
  - "Horoscope cache-check flow: fetch JSON response first → if cached return immediately → if stream use useCompletion"
  - "Planet sentinel inline rendering: RegExp with lastIndex tracking + React.ReactNode[] array construction"
  - "Loading skeleton: animate-pulse white/5 bars while awaiting first content"

# Metrics
duration: 3min
completed: 2026-02-15
---

# Phase 6 Plan 02: Daily Horoscope UI Summary

**useDailyHoroscope hook + HoroscopeStream with planet sentinel color highlighting + DailyHoroscope dashboard card with date navigation tabs**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-15T16:02:05Z
- **Completed:** 2026-02-15T16:05:00Z
- **Tasks:** 2
- **Files modified:** 4 (3 created, 1 modified)

## Accomplishments

- `useDailyHoroscope` hook managing streaming (via `useCompletion`), Sofia-timezone date selection, two-layer client cache, and yesterday-unavailable state
- `HoroscopeStream` renders text with `[planet:KEY]...[/planet]` sentinel markers — each planet name styled with an accent color matching the cosmic theme
- `DailyHoroscope` full-width glassmorphism card with today/yesterday tab navigation, loading skeleton, error state, and streaming cursor
- Dashboard integration: `DailyHoroscope` rendered as first content section when user has a birth chart

## Task Commits

Each task was committed atomically:

1. **Task 1: Client hook and streaming display components** - `ea1e316` (feat)
2. **Task 2: Dashboard integration** - `16d8199` (feat)
3. **Auto-fix: Date query param bug** - `d317356` (fix)

## Files Created/Modified

- `apps/web/hooks/useDailyHoroscope.ts` - Client hook: useCompletion streaming, date switching, cache management, yesterday unavailable flag
- `apps/web/components/horoscope/HoroscopeStream.tsx` - Streaming text display with sentinel marker parsing and planet color highlighting
- `apps/web/components/horoscope/DailyHoroscope.tsx` - Main horoscope card with header, date navigation, content area; DailyHoroscopeEmpty for no-chart state
- `apps/web/components/dashboard/DashboardContent.tsx` - Added DailyHoroscope import and render section (first content section, conditional on birthChart)

## Decisions Made

- Date param passed as URL query string `?date=YYYY-MM-DD` to match how the API route reads it via `url.searchParams.get('date')` — not in POST body
- `parseSentinels()` returns `React.ReactNode[]` to render colored planet spans inline within paragraph text — preserves text flow without DOM manipulation
- Planet colors defined as a simple key-to-Tailwind-class map (`PLANET_COLORS`) rather than importing from a shared file — keeps component self-contained
- `DailyHoroscopeEmpty` exported as a separate component for potential future direct use, but dashboard uses `{birthChart && <DailyHoroscope chartId={birthChart.id} />}` pattern directly

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed date parameter passing — query param vs body**
- **Found during:** Post-task verification (review of API route vs hook implementation)
- **Issue:** `useDailyHoroscope` passed `date` in the POST body (`{ chartId, date: yesterdayStr }`), but the API route reads it from URL search params (`url.searchParams.get('date')`). Would silently fail to filter yesterday's horoscope.
- **Fix:** Changed `fetchYesterday` to append `?date=YYYY-MM-DD` as a query param to the URL
- **Files modified:** `apps/web/hooks/useDailyHoroscope.ts`
- **Verification:** TypeScript passes cleanly (tsc --noEmit)
- **Committed in:** `d317356`

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Essential correctness fix — yesterday navigation would silently treat every request as "today" without this fix. No scope creep.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. All UI components integrate with existing backend from plan 06-01.

## Next Phase Readiness

- Daily horoscope UI is fully integrated into the dashboard
- `useDailyHoroscope` hook is ready — streams today's horoscope on first visit, shows cached on return
- Yesterday navigation returns content if previously generated, or shows "Не е наличен" if not
- Planet sentinel markers render with accent colors in horoscope text
- Next: Execute 06-03-PLAN.md (if exists) or this completes Phase 6 UI

---
*Phase: 06-daily-horoscope*
*Completed: 2026-02-15*

## Self-Check: PASSED

All files verified present:
- apps/web/hooks/useDailyHoroscope.ts: FOUND
- apps/web/components/horoscope/HoroscopeStream.tsx: FOUND
- apps/web/components/horoscope/DailyHoroscope.tsx: FOUND
- apps/web/components/dashboard/DashboardContent.tsx: FOUND

All commits verified present:
- ea1e316: feat(06-02): add client hook and horoscope streaming components
- 16d8199: feat(06-02): integrate DailyHoroscope into dashboard as primary content
- d317356: fix(06-02): pass yesterday date as query param in useDailyHoroscope
