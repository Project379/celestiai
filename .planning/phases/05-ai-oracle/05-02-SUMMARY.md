---
phase: 05-ai-oracle
plan: 02
subsystem: api
tags: [gemini, streaming, vercel-ai-sdk, ai-sdk-v6, supabase, typescript, react-hooks]

# Dependency graph
requires:
  - phase: 05-01
    provides: "users + ai_readings schema, buildSystemPrompt, chartToPromptText, stripSentinels"
  - phase: 04-astrology-engine-charts
    provides: "chart_calculations table with JSONB chart data, ChartData type"

provides:
  - "POST /api/oracle/generate — Gemini streaming endpoint with auth, tier gating, caching, rate limiting"
  - "GET /api/oracle/readings — Saved readings retrieval by chart ID"
  - "POST /api/oracle/teaser — Non-streaming teaser generation for locked topics"
  - "useOracleReading hook — Client streaming wrapper with saved readings state management"

affects: [05-03, 05-04]

# Tech tracking
tech-stack:
  added:
    - ai@6.0.86 (Vercel AI SDK v6)
    - "@ai-sdk/google@3.0.29 (Gemini provider)"
    - "@ai-sdk/react@3.0.88 (useCompletion hook)"
  patterns:
    - streamText-with-onFinish-db-write
    - toTextStreamResponse-for-useCompletion-text-protocol
    - upsert-on-conflict-for-cache

key-files:
  created:
    - apps/web/app/api/oracle/generate/route.ts
    - apps/web/app/api/oracle/readings/route.ts
    - apps/web/app/api/oracle/teaser/route.ts
    - apps/web/hooks/useOracleReading.ts
  modified:
    - apps/web/package.json
    - pnpm-lock.yaml

key-decisions:
  - "AI SDK v6 uses toTextStreamResponse() — toDataStreamResponse() was removed"
  - "AI SDK v6 uses maxOutputTokens not maxTokens for token limits"
  - "useCompletion streamProtocol: 'text' pairs with toTextStreamResponse() in v6"
  - "Teaser upsert creates a row with empty content to hold teaser_content until full generation"
  - "Tier gate upserts user row on first encounter (idempotent, ignoreDuplicates: true)"

patterns-established:
  - "Oracle API routes follow chart/calculate pattern: auth -> ownership -> cache -> action"
  - "streamText onFinish writes to DB after stream completes, does not block client response"
  - "useOracleReading uses wasLoadingRef to detect isLoading true->false transition for auto-refresh"

# Metrics
duration: 5min
completed: 2026-02-15
---

# Phase 5 Plan 2: AI Oracle - Streaming API and Client Hook Summary

**Vercel AI SDK v6 streaming infrastructure with Gemini gemini-2.5-flash, tier-gated reading generation, cache layer, and client hook for streaming display**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-15T14:47:05Z
- **Completed:** 2026-02-15T14:51:44Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Installed `ai@6`, `@ai-sdk/google`, `@ai-sdk/react` in the `apps/web` package
- Created `POST /api/oracle/generate` with full auth, subscription tier gating (403 for premium topics on free tier), chart ownership check, cache-first pattern, 24h regeneration rate limit, Gemini streaming, and `onFinish` DB upsert
- Created `GET /api/oracle/readings` that returns non-expired readings for a chart (empty array if none exist)
- Created `POST /api/oracle/teaser` that generates and caches short 2-3 sentence Bulgarian teasers using `generateText` (non-streaming)
- Created `useOracleReading` client hook wrapping `useCompletion` with saved readings state management, topic tracking, and auto-refresh on generation completion

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Vercel AI SDK and create streaming generation API route** - `3dd620a` (feat)
   - apps/web/package.json, pnpm-lock.yaml, apps/web/app/api/oracle/generate/route.ts

2. **Task 2: Create readings retrieval, teaser endpoint, and client hook** - `ed018d9` (feat)
   - apps/web/app/api/oracle/readings/route.ts, apps/web/app/api/oracle/teaser/route.ts, apps/web/hooks/useOracleReading.ts

**Plan metadata:** (this commit)

## Files Created/Modified

### Created
- `apps/web/app/api/oracle/generate/route.ts` — Streaming POST endpoint via Gemini + onFinish DB write
- `apps/web/app/api/oracle/readings/route.ts` — GET endpoint for saved readings by chart
- `apps/web/app/api/oracle/teaser/route.ts` — POST endpoint for locked-topic teaser generation
- `apps/web/hooks/useOracleReading.ts` — useCompletion wrapper with savedReadings, activeTopic, auto-refresh

### Modified
- `apps/web/package.json` — Added ai, @ai-sdk/google, @ai-sdk/react
- `pnpm-lock.yaml` — Updated lockfile

## Decisions Made

1. **AI SDK v6 API compatibility** — Plan was written for AI SDK v3/v4 which had `toDataStreamResponse()`. v6 replaced it with `toTextStreamResponse()`. Used v6 API throughout with `streamProtocol: 'text'` on the client to match.
2. **maxOutputTokens not maxTokens** — AI SDK v6 renamed the parameter from `maxTokens` to `maxOutputTokens` in `streamText` and `generateText` CallSettings.
3. **Teaser upsert strategy** — When creating a teaser row that has no full content yet, `content` is set to empty string. The unique constraint on `(chart_id, topic)` means later full generation will update the same row with real content and overwrite the empty string.
4. **Tier gate upsert** — On first visit, the users table row may not exist (created by Clerk webhook in Phase 7). The upsert pattern with `ignoreDuplicates: true` ensures the row is created with 'free' tier if missing, without overwriting existing tier data.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] AI SDK v6: toDataStreamResponse() removed**
- **Found during:** Task 1 (TypeScript compilation)
- **Issue:** Plan specified `result.toDataStreamResponse()` but AI SDK v6 removes this method. `StreamTextResult` only exposes `toTextStreamResponse()` and `toUIMessageStreamResponse()`.
- **Fix:** Used `result.toTextStreamResponse()` on server, set `streamProtocol: 'text'` in `useCompletion` on client. The text stream protocol sends raw UTF-8 text deltas which `useCompletion` accumulates into the `completion` string — functionally identical for this use case.
- **Files modified:** apps/web/app/api/oracle/generate/route.ts, apps/web/hooks/useOracleReading.ts
- **Commit:** 3dd620a, ed018d9

**2. [Rule 1 - Bug] AI SDK v6: maxTokens renamed to maxOutputTokens**
- **Found during:** Task 1 (TypeScript compilation — TS2353 error)
- **Issue:** `CallSettings` interface does not include `maxTokens`. The correct property is `maxOutputTokens`.
- **Fix:** Replaced `maxTokens: 2000` with `maxOutputTokens: 2000` in both `streamText` and `generateText` calls.
- **Files modified:** apps/web/app/api/oracle/generate/route.ts, apps/web/app/api/oracle/teaser/route.ts
- **Verification:** `npx tsc --noEmit -p apps/web/tsconfig.json` passes cleanly
- **Committed in:** 3dd620a, ed018d9

---

**Total deviations:** 2 auto-fixed (2 API version compatibility bugs)
**Impact on plan:** Both fixes essential for compilation. No behavioral change — functionality is identical using the v6 API surface.

## Next Phase Readiness

- `POST /api/oracle/generate` ready to stream Gemini readings (requires `GOOGLE_GENERATIVE_AI_API_KEY` in `.env.local`)
- `GET /api/oracle/readings` ready to serve cached readings to the UI
- `POST /api/oracle/teaser` ready to generate teasers for locked topics
- `useOracleReading` hook ready for use in Plan 03 (Topic Cards UI)

## Self-Check: PASSED

- FOUND: apps/web/app/api/oracle/generate/route.ts
- FOUND: apps/web/app/api/oracle/readings/route.ts
- FOUND: apps/web/app/api/oracle/teaser/route.ts
- FOUND: apps/web/hooks/useOracleReading.ts
- FOUND: 3dd620a (feat(05-02): install Vercel AI SDK and create Gemini streaming generate route)
- FOUND: ed018d9 (feat(05-02): create readings GET, teaser POST endpoints, and useOracleReading hook)

---
*Phase: 05-ai-oracle*
*Plan: 02*
*Completed: 2026-02-15*
