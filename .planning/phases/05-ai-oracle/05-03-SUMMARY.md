---
phase: 05-ai-oracle
plan: 03
subsystem: ui
tags: [react, nextjs, tailwind, glassmorphism, streaming, cross-highlighting, typescript]

# Dependency graph
requires:
  - phase: 05-02
    provides: "useOracleReading hook, /api/oracle/generate, /api/oracle/readings, /api/oracle/teaser"
  - phase: 05-01
    provides: "stripSentinels, extractPlanetMentions from lib/oracle/planet-parser"
  - phase: 04-astrology-engine-charts
    provides: "ChartView, NatalWheel, PlanetPosition types, selectedPlanet state"

provides:
  - "TopicCard: single Oracle topic card with active/locked/saved states, Bulgarian labels, accessible"
  - "TopicCards: 2x2 grid with free/premium tier gating"
  - "ReadingStream: streaming text display with sentinel stripping, planet cross-highlight detection, auto-scroll"
  - "LockedTopicTeaser: blurred teaser with glassmorphism upgrade CTA overlay"
  - "OraclePanel: main container orchestrating all Oracle states (streaming, saved, teaser, empty, regen)"
  - "ChartView: updated with subscriptionTier prop, OraclePanel integration, cross-highlight bridge"
  - "chart/page.tsx: fetches subscription_tier from users table, passes to ChartView, widened to max-w-7xl"

affects: [05-04, 07-payments]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - glassmorphism-card-ui
    - streaming-display-with-sentinel-parsing
    - oracle-cross-highlight-bridge
    - responsive-side-panel-pattern

key-files:
  created:
    - apps/web/components/oracle/TopicCard.tsx
    - apps/web/components/oracle/TopicCards.tsx
    - apps/web/components/oracle/ReadingStream.tsx
    - apps/web/components/oracle/LockedTopicTeaser.tsx
    - apps/web/components/oracle/OraclePanel.tsx
  modified:
    - apps/web/components/chart/ChartView.tsx
    - apps/web/app/(protected)/chart/page.tsx

key-decisions:
  - "OraclePanel mounted twice (desktop right-col + mobile below-wheel) — each instance creates its own useOracleReading; they share the same DB cache so both will reflect the same saved readings"
  - "Cross-highlight bridge in ChartView: handleOraclePlanetHighlight maps planet key to chart.planets array and reuses the same setSelectedPlanet/setSelectedPlanetData flow as wheel clicks"
  - "chart/page.tsx uses try/catch around users table query — fails silently to 'free' if Supabase is paused or user row missing"
  - "LockedTopicTeaser requests teaser from /api/oracle/teaser on mount; teaser content stored in local OraclePanel state keyed by topic"

patterns-established:
  - "Oracle components live in apps/web/components/oracle/ — one file per concern"
  - "TOPIC_META constant in TopicCard.tsx exports label + icon for all four topics — single source of truth"
  - "ReadingStream uses extractPlanetMentions() on accumulated completion string; tracks already-highlighted planets in a ref to only fire onPlanetHighlight on first encounter of each planet"

# Metrics
duration: 10min
completed: 2026-02-15
---

# Phase 5 Plan 3: AI Oracle - Topic Cards UI and Reading Panel Summary

**Five Oracle UI components with streaming reading display, Bulgarian topic cards, locked teaser with upgrade CTA, cross-highlighting bridge from reading text to natal wheel, and responsive layout integration**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-02-15T14:54:29Z
- **Completed:** 2026-02-15T15:04:00Z
- **Tasks:** 3/3 (2 auto complete + 1 checkpoint deferred to batch testing)
- **Files modified:** 7

## Accomplishments

- Created five Oracle UI components in `apps/web/components/oracle/`
- `TopicCard`: single card with active glow, locked padlock, saved checkmark, keyboard accessible
- `TopicCards`: 2-col (mobile) / 4-col (desktop) grid with free/premium tier gating logic
- `ReadingStream`: streaming text display with sentinel stripping, cross-highlight detection, auto-scroll, pulsing loading state "Celestia консултира звездите..."
- `LockedTopicTeaser`: blurred teaser text with glassmorphism upgrade CTA, skeleton loading, fallback placeholder
- `OraclePanel`: orchestrates all states (topic selection, streaming, saved reading, locked teaser, empty, regenerate)
- Updated `ChartView` with `subscriptionTier` prop, `OraclePanel` integration, and cross-highlight bridge mapping Oracle planet keys to NatalWheel selection state
- Updated `chart/page.tsx` to fetch `subscription_tier` from users table, pass to `ChartView`, widened to `max-w-7xl`

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Oracle UI components** - `ddaff68` (feat)
   - TopicCard.tsx, TopicCards.tsx, ReadingStream.tsx, LockedTopicTeaser.tsx, OraclePanel.tsx

2. **Task 2: Integrate OraclePanel with ChartView and chart page** - `e84334e` (feat)
   - apps/web/components/chart/ChartView.tsx, apps/web/app/(protected)/chart/page.tsx

3. **Task 3: Verify AI Oracle end-to-end** - DEFERRED (human-verify moved to batch testing after all phases)

## Files Created/Modified

### Created
- `apps/web/components/oracle/TopicCard.tsx` - Single Oracle topic card (active/locked/saved states, Bulgarian labels, keyboard accessible)
- `apps/web/components/oracle/TopicCards.tsx` - 2x2 grid of topic cards with free/premium gating
- `apps/web/components/oracle/ReadingStream.tsx` - Streaming reading display with sentinel parsing, cross-highlight, auto-scroll
- `apps/web/components/oracle/LockedTopicTeaser.tsx` - Blurred premium teaser with glassmorphism upgrade CTA
- `apps/web/components/oracle/OraclePanel.tsx` - Main Oracle panel container (all states orchestrated)

### Modified
- `apps/web/components/chart/ChartView.tsx` - Added subscriptionTier prop, OraclePanel import, cross-highlight bridge, responsive layout update
- `apps/web/app/(protected)/chart/page.tsx` - Fetches subscription tier, passes to ChartView, widened to max-w-7xl

## Decisions Made

1. **OraclePanel mounted twice** — Desktop uses the right column instance, mobile uses the below-wheel instance. Both call `useOracleReading(chartId)` independently. They share the same Supabase cache, so both reflect the same saved readings after load.
2. **Cross-highlight bridge** — `handleOraclePlanetHighlight` in ChartView maps the planet key from `extractPlanetMentions` to a `PlanetPosition` in `chart.planets`, then calls `setSelectedPlanet` / `setSelectedPlanetData` — same flow as wheel click events. This makes Oracle mentions visually highlight the planet ring and open PlanetDetail.
3. **Tier fetch fail-safe** — `chart/page.tsx` wraps the users table query in try/catch so Supabase project paused state or missing user row both silently default to `'free'` without breaking the page.

## Deviations from Plan

None - plan executed exactly as written. TypeScript compilation passed cleanly for both tasks with zero errors.

## Issues Encountered

None.

## User Setup Required

Ensure `GOOGLE_GENERATIVE_AI_API_KEY` is set in `apps/web/.env.local` before running the dev server for the human-verify checkpoint (Task 3).

## Next Phase Readiness

- All Oracle UI components are in place and integrated
- Cross-highlighting bridge from Oracle reading text to NatalWheel is wired
- Awaiting human verification (Task 3 checkpoint) to confirm streaming, tier gating, caching, and responsive layout work end-to-end
- Plan 04 (if it exists) can proceed after checkpoint approval

## Self-Check: PASSED

- FOUND: apps/web/components/oracle/TopicCard.tsx
- FOUND: apps/web/components/oracle/TopicCards.tsx
- FOUND: apps/web/components/oracle/ReadingStream.tsx
- FOUND: apps/web/components/oracle/LockedTopicTeaser.tsx
- FOUND: apps/web/components/oracle/OraclePanel.tsx
- FOUND: apps/web/components/chart/ChartView.tsx (modified)
- FOUND: apps/web/app/(protected)/chart/page.tsx (modified)
- FOUND: ddaff68 (feat(05-03): create Oracle UI components)
- FOUND: e84334e (feat(05-03): integrate OraclePanel with ChartView and chart page)

---
*Phase: 05-ai-oracle*
*Plan: 03*
*Completed: 2026-02-15*
