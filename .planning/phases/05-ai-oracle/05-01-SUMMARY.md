---
phase: 05-ai-oracle
plan: 01
subsystem: database
tags: [drizzle, supabase, postgres, ai, gemini, prompt-engineering, typescript]

# Dependency graph
requires:
  - phase: 04-astrology-engine-charts
    provides: "charts table and ChartData types for FK and prompt serialization"
  - phase: 03-birth-data-database
    provides: "chart_calculations service role pattern (no RLS)"

provides:
  - "users table with clerk_id (unique) and subscription_tier"
  - "ai_readings table with chart_id FK, topic, content, teaser_content, expires_at, model_version"
  - "Unique index on (chart_id, topic) — one live reading per chart-topic pair"
  - "Drizzle migration: 0004_parched_lizard.sql"
  - "buildSystemPrompt(topic) — Celestia mystical guide system prompt with sentinel instructions"
  - "chartToPromptText(chartData) — ChartData to Bulgarian textual prompt serializer"
  - "extractPlanetMentions() and stripSentinels() — [planet:KEY] sentinel parser"

affects: [05-02, 05-03, 05-04, 07-payments]

# Tech tracking
tech-stack:
  added: []
  patterns: [sentinel-markers, chart-to-prompt-serialization, topic-suffix-prompting]

key-files:
  created:
    - packages/db/src/schema/users.ts
    - packages/db/src/schema/ai-readings.ts
    - packages/db/drizzle/0004_parched_lizard.sql
    - apps/web/lib/oracle/prompts.ts
    - apps/web/lib/oracle/chart-to-prompt.ts
    - apps/web/lib/oracle/planet-parser.ts
  modified:
    - packages/db/src/schema/index.ts
    - packages/db/drizzle/meta/_journal.json

key-decisions:
  - "No RLS on users or ai_readings — service role access only (consistent with chart_calculations)"
  - "Sentinel markers use English planet keys (sun, moon, mars...) in format [planet:KEY]Bulgarian[/planet]"
  - "[\s\S]*? instead of .*?+s flag for ES2017 regex compatibility in web app"
  - "Topic suffixes appended to base system prompt (not separate prompts) for voice consistency"
  - "Migration applied manually — Supabase free tier was paused, apply 0004_parched_lizard.sql via dashboard"

patterns-established:
  - "Oracle utilities live in apps/web/lib/oracle/ — one file per concern"
  - "Sentinel pattern: [planet:KEY]text[/planet] enables cross-highlighting between reading and chart wheel"
  - "Fresh RegExp per call (not module-level) to avoid stateful lastIndex bugs with 'g' flag"

# Metrics
duration: 5min
completed: 2026-02-15
---

# Phase 5 Plan 1: AI Oracle - Schema and Prompt Utilities Summary

**users and ai_readings Drizzle tables with sentinel-based Oracle prompt system for Bulgarian natal chart readings (general, love, career, health topics)**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-15T14:38:34Z
- **Completed:** 2026-02-15T14:43:52Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Created `users` table with `clerk_id` (unique), `subscription_tier` (default 'free'), timestamps
- Created `ai_readings` table with `chart_id` FK (cascade), `topic`, `content`, `teaser_content`, `expires_at`, `last_regenerated_at`, `model_version`, and unique index on `(chart_id, topic)`
- Generated Drizzle migration `0004_parched_lizard.sql` for both new tables
- Built `buildSystemPrompt(topic)` producing a Bulgarian mystical guide system prompt with sentinel marker instructions and topic-specific suffixes for general/love/career/health
- Built `chartToPromptText(chartData)` serializing `ChartData` to Bulgarian textual format with planet positions (including retrograde), Ascendant, MC, and full aspect list
- Built `extractPlanetMentions()` and `stripSentinels()` for round-tripping `[planet:KEY]...[/planet]` sentinel markers

## Task Commits

Each task was committed atomically:

1. **Task 1: Create users and ai_readings database schema** - `36abaa1` (feat)
   - users.ts, ai-readings.ts, schema index update, migration SQL and snapshot

2. **Task 2: Create Oracle prompt utilities** - `4d539a5` (feat)
   - prompts.ts, chart-to-prompt.ts, planet-parser.ts

**Plan metadata:** (this commit)

## Files Created/Modified

### Created
- `packages/db/src/schema/users.ts` - Users table (clerk_id, subscription_tier)
- `packages/db/src/schema/ai-readings.ts` - AI readings table (chart FK, topic, content, expires_at, model_version)
- `packages/db/drizzle/0004_parched_lizard.sql` - Migration SQL for both tables
- `apps/web/lib/oracle/prompts.ts` - buildSystemPrompt() with Bulgarian mystical guide persona
- `apps/web/lib/oracle/chart-to-prompt.ts` - chartToPromptText() ChartData serializer
- `apps/web/lib/oracle/planet-parser.ts` - extractPlanetMentions() + stripSentinels()

### Modified
- `packages/db/src/schema/index.ts` - Added users and aiReadings exports
- `packages/db/drizzle/meta/_journal.json` - Updated with migration 0004 entry

## Decisions Made

1. **No RLS on users or ai_readings** — Both tables accessed via service role client only, consistent with `chart_calculations` pattern. Users table will gain RLS + Stripe integration in Phase 7.
2. **English planet keys in sentinels** — `[planet:sun]`, `[planet:mars]` etc. for consistent mapping to chart wheel planet IDs regardless of Bulgarian translations.
3. **ES2017 regex fix** — Web app targets ES2017 (Next.js), so `s` (dotAll) flag is unsupported. Used `[\s\S]*?` instead of `.*?` with `s` flag in planet-parser.ts.
4. **Topic suffix approach** — Single base system prompt + topic suffix (not separate prompts) ensures consistent Celestia voice across all reading types.
5. **Fresh RegExp per call** — Module-level regex with `g` flag would accumulate `lastIndex` state across calls, causing intermittent failures. New RegExp instance per invocation is the safe pattern.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed stateful regex lastIndex issue**
- **Found during:** Task 2 (planet-parser.ts implementation)
- **Issue:** Plan specified regex `/\[planet:(\w+)\](.*?)\[\/planet\]/gs` — the `g` flag retains `lastIndex` between calls if the same RegExp object is reused, causing alternating successes and failures
- **Fix:** Plan already called out this risk ("Reset regex lastIndex between calls or create new RegExp each time"). Implemented as fresh RegExp created inside each function call, not at module level.
- **Files modified:** apps/web/lib/oracle/planet-parser.ts
- **Verification:** Node.js inline test: extractPlanetMentions('[planet:mars]Марс[/planet]') => ['mars'], stripSentinels returns 'Марс'
- **Committed in:** 4d539a5

**2. [Rule 1 - Bug] Fixed ES2017 regex compatibility**
- **Found during:** Task 2 (TypeScript compilation check)
- **Issue:** `s` (dotAll) regex flag requires ES2018+. Web app tsconfig targets ES2017. TypeScript error TS1501.
- **Fix:** Replaced `.*?` with `[\s\S]*?` and removed `s` flag. Functionally identical for sentinel parsing.
- **Files modified:** apps/web/lib/oracle/planet-parser.ts
- **Verification:** `npx tsc --noEmit -p apps/web/tsconfig.json` passes cleanly
- **Committed in:** 4d539a5

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes essential for correctness. No scope creep.

## Issues Encountered

**Supabase project paused (free tier auto-pause)**

The Supabase project (`zsypmpswqrhkfvlnowcp`) was not reachable — DNS for the REST endpoint didn't resolve and the Supabase pooler returned "Tenant or user not found". Free tier projects auto-pause after 1 week of inactivity (last activity: 2026-02-01, today: 2026-02-15 = 14 days inactive).

**Resolution:** The migration SQL (`packages/db/drizzle/0004_parched_lizard.sql`) is generated and correct. Apply it manually:
1. Go to Supabase dashboard → unpause the project
2. Open SQL Editor
3. Paste and execute `0004_parched_lizard.sql` contents
4. Verify: `SELECT table_name FROM information_schema.tables WHERE table_name IN ('users', 'ai_readings')`

All TypeScript code is correct and compiles cleanly — this is purely a database state issue.

## User Setup Required

The plan specifies `GOOGLE_GENERATIVE_AI_API_KEY` from Google AI Studio will be needed for Plan 02 (the streaming API route). No setup required for this plan's deliverables.

## Next Phase Readiness

- `users` and `ai_readings` tables defined (apply migration when Supabase project is unpaused)
- `buildSystemPrompt(topic)` ready for use in the streaming API route (Plan 02)
- `chartToPromptText(chartData)` ready to serialize chart data for AI context
- `extractPlanetMentions()` and `stripSentinels()` ready for streaming response processing
- All exports available from `@celestia/db` schema index

## Self-Check: PASSED

- FOUND: packages/db/src/schema/users.ts
- FOUND: packages/db/src/schema/ai-readings.ts
- FOUND: packages/db/src/schema/index.ts
- FOUND: packages/db/drizzle/0004_parched_lizard.sql
- FOUND: apps/web/lib/oracle/prompts.ts
- FOUND: apps/web/lib/oracle/chart-to-prompt.ts
- FOUND: apps/web/lib/oracle/planet-parser.ts
- FOUND: 36abaa1 (feat(05-01): create users and ai_readings database schema)
- FOUND: 4d539a5 (feat(05-01): create oracle prompt engineering utilities)

---
*Phase: 05-ai-oracle*
*Plan: 01*
*Completed: 2026-02-15*
