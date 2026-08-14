---
title: Completion Tracker
status: living document — the single "where are we / what is left" reference
created: 2026-08-13
last-updated: 2026-08-14 (Batch 5 complete — /you/premium status/management + free-state CTA shipped)
---

# Completion Tracker

This document exists because four other status docs (`PROJECT.md`, `ROADMAP.md`,
`STATE.md`, `REQUIREMENTS.md`) sat frozen at a 2026-05-09 "0% progress"
snapshot while Phases 3 through 8 actually shipped, and nobody caught it for
three months — see `.planning/VERIFICATION-SURFACE-GAPS.md` item 4. This file
replaces those four as the thing anyone (founder or a fresh Claude Code
session) reads first to know the real state. **Rule for maintaining it: every
claim below is checked against code, not carried over from another doc, and
is updated at the end of every batch as part of that batch's own report —
not on request.**

---

## 1. Context block

**Product:** Stellaeum AI — a subscription astrology app for the Bulgarian
market. Swiss Ephemeris precision (`sweph`, native, GPL-2.0-pinned) +
AI-generated readings (OpenRouter, Llama 3.3 70B — not Gemini/GPT-5 as
CLAUDE.md's header still says; that line is stale and should be corrected
next time CLAUDE.md is touched). Web (Next.js 15) and mobile (Expo SDK 54,
Solito) share ~90% of code via `packages/core`, `packages/astrology`.

**Who works on it:** one founder (Toni), doing product/design/business calls
and running device tests; Claude Code sessions do the engineering, docs, and
verification work under a "decide-and-proceed for implementation, halt for
product/money/auth/schema/ambiguity" operating model established 2026-08-13.

**Actual current state, not aspirational, verified 2026-08-13:**

- **Web (v0.1 MVP): shipped and live.** Landing, auth, birth-data wizard,
  natal chart, AI Oracle, daily horoscope, Stripe payments, GDPR export/
  delete, diary/lunar-journal, Кръг (relationship compatibility) full
  backend+UI, crystals, recommendations, astrology guide. `REQUIREMENTS.md`
  (refreshed today) has the item-by-item state; two items have a known,
  scoped gap (`crystal_recommendations` table RLS disabled in production,
  fix migration written but not applied — not currently exploitable, service-
  role-only access path).
- **Mobile (Expo, v1.0 launch track): most of parity phase shipped.** Днес,
  Карта (with a just-fixed tap-select perf issue), Ритъм + lunar diary, most
  of Ти (crystals, recommendations, guide, GDPR settings), RevenueCat SDK +
  Clerk-identity sync all live. Кръг is functionally complete on mobile as
  of 2026-08-14 (Crush/saved-profiles + Connections/invites/reports/
  weather, Batch 4 both sub-batches), not yet device-tested; two
  check-then-act races found and fixed during the port (invite-accept,
  report-version conflicts — see Batch 4's own sections). Кръг has NOT
  had a design pass — screens match web's structure, not Днес/Карта's
  design language; redesign pass is Batch 8. `/you/premium` subscription
  status/management (Batch 5) is now built, not yet device-tested — the
  free-state branch's "subscribe on web" CTA is functional but its target
  URL is an unfilled placeholder blocked on the founder's Vercel fix, see
  halt-required register. **Not yet built on mobile:** the RevenueCat
  paywall/purchase flow, push notification delivery (scaffold only), the
  amber→bronze visual-token migration (in progress, up to 48 files still
  on the old token).
- **First real device build (2026-08-13) surfaced two real mobile bugs**,
  both since fixed: an infinite `/api/birth-data` request loop after wizard
  completion (stale TanStack Query cache never invalidated after save), and
  a chart-tab FPS drop on planet tap (unmemoized static SVG layers
  re-rendering on every selection change — see Batch 1 below for both).
- **Pre-launch gates not yet clear** (see `.planning/PRE_LAUNCH_PREREQS.md`
  for full detail, not duplicated here): telemetry/analytics `[not started]`,
  browser UAT sign-off `[not started]`, load-testing `[blocked on M4]`, AI
  provider fallback strategy `[not started, founder product call]`, GDPR/
  privacy `[partial — no cookie consent banner, no /terms route, processor
  DPAs unsigned]`, third-party licensing `[partial — 5 provider TOS reviews
  outstanding]`.

---

## 2. End state

Everything technical, every feature, all UI — built, tested, and
launch-ready. The **only** things remaining once every batch below closes
should be:

- Apple Developer Program enrollment and anything gated on it (TestFlight
  provisioning, SR 9 biometric auth bundle).
- Compliance/legal items: cookie consent banner, `/terms` route, signed
  processor DPAs (Clerk/Supabase/Stripe/OpenRouter TOS reviews), the Swiss
  Ephemeris Professional License purchase (deferred by design until the
  first genuine paying subscriber, not a launch blocker).

Every batch below is scoped and judged against this bar — a batch is not
"done" if it ships code but leaves something that isn't Apple/compliance
still open; it's done when the gap it targeted is genuinely closed or has
been explicitly moved to the halt-required or blocked-externally registers
with a reason.

---

## 3. Batch ledger

### Batch 1 — Mobile stability & doc hygiene

**Status: done (2026-08-13).**

**Scope:** rate-limit the unprotected sensitive API routes, fix the
chart-tab perf regression, close out documentation hygiene from the
2026-08-13 audit.

**Shipped:**
- Rate limiting added to 17 previously-unprotected routes: `birth-data`
  (GET/POST), `birth-data/[id]` (GET/PATCH/DELETE), `chart/calculate`,
  both `gdpr/*` routes, all 5 `stripe/*` routes, `oracle/readings`, and 6
  `circle/*` routes (invites create/accept/cancel, profiles list/create/
  delete, relationship archive). Pattern: `assertRateLimit` from the
  existing `apps/web/lib/rate-limit.ts`, per-user keys, limits chosen by
  comparison to already-protected routes (writes 5-10/min, reads 30-60/
  min). Verified via `pnpm exec tsc --noEmit` clean on `apps/web`.
- Webhook/cron exclusion made explicit in code, not just doc: `webhooks/
  stripe`, `webhooks/revenuecat`, and both `cron/*` routes now carry a
  comment stating the actual condition ("not rate-limited because
  signature/secret-verified — if this ever accepts unverified requests, it
  needs rate limiting"), per founder ruling — the lesson is the condition,
  not the category.
- Chart-tab perf fix: `NatalWheel.tsx` split into `WheelStaticLayers`
  (zodiac/house/aspect layers — ~430 of ~500 SVG nodes, memoized on
  chart-derived props that never change on tap) and `PlanetGems` (~70
  selection-dependent nodes, the only part that should re-render on tap).
  **[verified]** via `tsc --noEmit`; **[not yet verified on device]** — the
  founder still needs to confirm this restores 60fps. The memo fix
  narrows per-tap cost but does not explain the reported "stays at ~30fps
  until force-quit" persistence; if the fix doesn't fully resolve it on
  device, that points at something accumulating across taps (an animated-
  value/worklet leak, most likely from `WheelArrivalContainer`), which
  needs a profiler session (Xcode Instruments / Android GPU profiler),
  not another source-read hypothesis.
- Infinite `/api/birth-data` request loop fixed: `wizard/confirm.tsx` now
  seeds the `['first-chart']` TanStack Query cache from the POST response
  instead of leaving it stale, so `AuthedLayout`'s forced-wizard redirect
  no longer fires against outdated data.
- Black-screen investigation closed as **superseded, not diagnosed** — see
  `.planning/HANDOFF-CC-2026-08-11.md`'s 2026-08-13 update. `isLoaded`
  confirmed `true` via device log; none of the four build-pipeline fixes
  that shipped alongside it actually touch Clerk's auth-loading path, so
  there is no verified causal fix, only a stopped-reproducing outcome.
  Temp `[AuthedLayout]` console logging removed.
- Documentation: `full-project-UAT.md` deleted (superseded scaffold, never
  executed). Six stale stack/architecture docs (`research/{ARCHITECTURE,
  STACK,PITFALLS,Stellaeum_AI_Reference,SUMMARY,COMPETITOR_UX_VISUALS}.md`)
  retired to stub-with-pointer files — original content stays in git
  history. `PROJECT.md`/`ROADMAP.md`/`STATE.md`/`REQUIREMENTS.md` status
  lines refreshed to reflect Phases 3-8 shipped (previously frozen at
  2026-05-09). `VERIFICATION-SURFACE-GAPS.md` got a new entry (#4) recording
  this exact failure class. Seven loose top-level historical docs
  (`HANDOFF-CC-2026-05-12-EOD.md`, `HANDOFF-CC-2026-08-03-EOD.md`,
  `HANDOFF-CC-2026-08-04-EOD.md`, `CHECKPOINT-2026-08-04.md`,
  `INCIDENT-2026-05-09-RLS-EXPOSURE.md`, `RENAME.md`,
  `BUILD-LOG-ANALYSIS-2026-08-05.md`) moved into `.planning/archive/`;
  three live cross-references to their old paths fixed.

**Deferred within this batch, and why:**
- Two background agents assigned to the rate-limit sweep and doc mechanics
  died mid-task on a session usage cap — neither had made any edits before
  dying (confirmed via `git status` before resuming), so all of the above
  was redone directly rather than resumed from a partial agent state.
- REVISIT-64 (mobile Sentry events landing in web's `javascript-nextjs`
  Sentry project) — root cause confirmed: mobile's Sentry init
  (`lib/monitoring/sentry.ts`) only depends on `EXPO_PUBLIC_SENTRY_DSN`,
  and that DSN was created under web's Sentry project. **Not code-fixable
  — needs a founder action**: create a dedicated "react-native" Sentry
  project in the dashboard and set the new DSN as `EXPO_PUBLIC_SENTRY_DSN`
  in both EAS env (`preview`/`development`) and local `.env.local`.
- RevenueCat placeholder key, `.env.local` var-name fix
  (`NEXT_PUBLIC_SENTRY_DSN` → `EXPO_PUBLIC_SENTRY_DSN`), and the
  `EXPO_PUBLIC_API_BASE` mismatch (192.168.1.4 vs the cleartext-whitelisted
  10.0.2.2) — founder is applying these directly, not Claude-Code work.

**Rulings that constrain this batch:** webhook/cron rate-limit exclusion is
correct (signature/secret verification is a stronger control) but must be
worded as a condition in-code, not a blanket category (founder ruling,
2026-08-13).

---

### Batch 2 — Oracle parity polish

**Status: done (2026-08-13). All four items resolved — three shipped, one closed permanently by founder ruling.**

**Scope:** the four remaining Oracle parity gaps from
`MOBILE-WEB-PARITY-GAP.md` Section 6 — SSE streaming text (6.1), sentinel
planet-mention color rendering (6.2), animated loading state (6.4), and a
regenerate-reading button (6.5).

**Shipped:**
- **6.2 (sentinel colors) — done, but not a web port.** Checked
  `ReadingStream.tsx` before building: web's own Oracle never rendered
  colored sentinels — it strips them for display, same as mobile did; the
  parity doc's claim otherwise was stale, corrected as part of this batch.
  Mobile's `ReadingBody.tsx` now reuses the bronze `renderSentinelChunks`
  pattern already shipped on Днес, lifted to a shared
  `lib/oracle/renderSentinelChunks.tsx` so both screens share one
  implementation instead of two copies (also removed the duplicate from
  `index.tsx`). Mobile Oracle is now ahead of web Oracle here, not at
  parity with it — worth knowing, not a problem.
- **6.4 (loading animation) — done.** Ported web's fully-specified
  animation (pulsing violet halo, spinning partial-arc amber ring,
  rotating diamond) to RN using Reanimated (`useSpin`/`usePing`, new
  reusable hooks added to `components/design-system/motion.ts`) and an
  SVG `strokeDasharray` arc in place of web's CSS conic-gradient mask (RN
  has no mask equivalent — same visual result via a different primitive).
  Judged this a translation of an existing spec, not new design, per this
  batch's explicit design-invention guardrail — did not skip it.
- **6.5 (regenerate button) — done.** `useOracleReading.ts` now exposes
  `canRegenerate`/`regenerate`, mirroring web's exact 24h-since-last-
  generation gate. UI is a pill button in the reading footer, shown only
  next to a saved (not freshly-generated) reading, disabled state dimmed
  to match web.
- `apps/mobile` typechecks clean after all of the above.

**Closed permanently within this batch, founder ruling — not deferred:**
- **6.1 (streaming text) — won't-do, do not reopen.** Web itself no longer
  uses SSE/`useCompletion` (replaced 2026-05-10 with a manual `fetch` +
  `response.body.getReader()` ReadableStream reader). React Native's
  `fetch` has no `ReadableStream`-body support and no polyfill is
  installed in `apps/mobile`. Founder ruling, 2026-08-13: a fragile
  streaming layer on the app's most-used AI surface is worse than
  JSON-only — RN streaming polyfills are known-flaky, and the
  perceived-wait problem streaming exists to solve is already addressed
  by 6.4's loading animation (shipped same batch). This is a permanent
  close, not an open item waiting on an infra decision — do not reopen
  without a fundamentally different constraint (e.g. a maintained RN
  streaming-fetch solution becoming standard, not just "someone wants to
  try again").

**Pattern flagged for Batch 5 (parity sweep):** this is the *second* stale
parity-doc row caught this way in one session (the first was Кръг's
premise going stale after web shipped underneath it; this one was 6.2
describing a web behavior that never existed). **Treat the parity doc as
a hypothesis to verify against code before porting from it, not as a
build spec** — re-check each row's actual web-side behavior at the point
of building, not just at the point the row was last written.

---

### Batch 3 — The four remaining Vitest areas

**Status: done (2026-08-13).** Scope: chart calculation/persistence,
Oracle quota enforcement, GDPR delete, and rate limiting (verifying
Batch 1's 17 newly-protected routes, not just re-testing the limiter).
Extended the existing Stripe/RevenueCat webhook-suite fixtures
(`test/mocks/supabase.ts`, `test/mocks/fixtures.ts`) rather than building
new ones — that mock's own docstring already anticipated this batch.
1358 LOC added across 6 new test files + the mock extension (somewhat
above the 750-1090 estimate — real bugs found needed extra coverage/
plumbing, not padding).

**Real findings — two confirmed Batch 1 bugs, caught by these tests, not assumed:**
- **`gdpr/delete-account` POST and `stripe/checkout` POST both called
  `assertRateLimit` AFTER `requireAppUser()`**, which does a DB upsert/
  read (`ensureUserRecord`) before the burst guard ever runs. A rapid-fire
  burst still cost a DB call (and for checkout, briefly reached toward
  Stripe) per request before being limited — the 429 was still eventually
  returned correctly, but the rate limiter wasn't actually gating the
  expensive work it exists to gate. **Fixed**: both routes now resolve
  `userId` from `auth()` directly, rate-limit first, then call
  `requireAppUser()`/do the DB work. Confirmed via
  `test/rate-limit/routes-surface-429.test.ts`, which forces
  `assertRateLimit` to throw for all 17 routes and asserts each surfaces a
  clean 429 — these two initially returned 500 because a mocked
  `ensureUserRecord` failure got hit first, which is exactly how the
  ordering bug surfaced. The other 15 routes were correctly ordered
  already (verified, not assumed — checked via grep for which routes use
  `requireAppUser` at all: only these two).
- Everything else tested — `assertRateLimit` itself, `calculateChartForUser`,
  the birth-data CRUD functions, `checkQuotaAvailable`/`incrementQuotaUsage`/
  `decrementQuotaUsage`, the GDPR delete-account route logic, and the
  cleanup-deleted-accounts cron's batch-continues-past-one-failure
  property — matched actual code behavior with no defects found. Notably:
  quota.ts's premium short-circuit, race-loss handling, and refund-failure
  audit logging are all correct as documented; the cron's dependency-order
  cascade correctly isolates one user's failure from the rest of the batch.

**Coverage notes, stated explicitly rather than implied by test count:**
- The cleanup-deleted-accounts cron is NOT tested per-table (it has ~15
  sequential delete calls across the cascade) — asserting each would
  encode "the code does what the code does," not verify a real property.
  Tested instead: auth gate, empty-result short-circuit, and the
  batch-continues-past-a-single-failure property, which is the one most
  likely to silently regress and hardest to catch by inspection.
- `/api/oracle/generate`'s full route handler (the AI-SDK streaming path)
  is NOT tested end-to-end — `quota.ts`, the logic it depends on, is
  fully covered instead. A full route test would require mocking the
  Vercel AI SDK's `streamText`/`generateText` on top of everything already
  mocked here; judged lower value than the quota logic itself, which is
  where the actual enforcement risk lives.
- `apps/web` typechecks clean and the full suite (121 tests, 11 files)
  passes.

---

### Batch 4 lead-in — copy-lock CI gate fix

**Status: done (2026-08-14).** Not part of Batch 4's Кръг scope — this was
fixing Batch 3's push, which failed CI on `check:copy-lock`.

**Finding:** the gate's first real catch, and it caught two different
things in one run. Of 4 new/changed Cyrillic literals since the last
snapshot, 3 were genuine approved copy (two Oracle regenerate strings from
Batch 2, the session-expired string ratified earlier) and 1 —
`'Тест'` in `apps/web/test/charts/birth-data.test.ts` — was a test fixture,
not product copy. The extractor shared by `check:copy-lock` and
`check:bg-strings` (`scripts/i18n/extract-literals.mjs`), and the
`no-new-bg-strings` ESLint rule behind `check:bg-lint-baseline`
(`packages/config/eslint/no-new-bg-strings.cjs`), both scanned
`apps/web/test/**` with no exclusion — a tooling scope gap that predates
this run but was invisible until Batch 3 put a Cyrillic string in a test
file for the first time.

**Fixed:** added a shared `TEST_IGNORE_GLOBS` list (test dirs,
`__tests__/**`, `*.test.ts(x)`, `*.spec.ts(x)`) — applied to
`extract-literals.mjs`'s `IGNORE` array and to all three ESLint configs'
(`web`, `mobile`, `core`) rule block via `ignores`, so the two enforcement
paths can't drift into two different definitions of "test file" again.
`check:bg-lint-baseline`'s `BASELINE` raised 1613 → 1616 (the 3 legitimate
strings; the test literal no longer counts at all). `copy-lock.json`
regenerated — diff confirmed to contain exactly the 3 legitimate entries,
no `'Тест'`. Full `check:all` (strictness, bg-strings, copy-lock,
lint-baseline, typecheck, lint, 121 tests) passes locally; pushed
(`f42291d`) and confirmed green on the actual GitHub Actions run
(`31782637622`, `conclusion: success`), not assumed from a local pass.

---

### Batch 4 — Кръг mobile port (split in two)

**Status: sub-batch A done (2026-08-14) — hub + saved-profiles. Sub-batch B
(invites, connection spaces, relationship reports/weather) not started.**

**Scope:** full functional port of web's Кръг (relationship compatibility)
feature to mobile — relationship types, compatibility domains, saved-people
profiles, connection invites, relationship reports/weather. ~2,200 LOC of
web reference (`CircleHub.tsx` 936 LOC, `SavedProfileForm.tsx` 278 LOC,
`ConnectInviteAcceptance.tsx` 95 LOC, 9 API routes ~878 LOC), against a
mobile `circle.tsx` that (pre-sub-batch-A) was a 70-line non-functional
placeholder — real per source-inspection, unlike two other parity-doc rows
already caught stale this session. Split into two batches given size: (a)
hub/saved-profiles, (b) invites/reports-weather.

**Sub-batch A shipped (`ec9f642`), verified against source before and
after building, not against the parity doc's premise:**
- Full Crush/saved-profiles flow: create (`SavedProfileForm.tsx`, reusing
  the wizard's own native date/time pickers and `CitySearch` rather than
  inventing new form primitives), list, select, analyze/regenerate
  compatibility report, delete. Wired against the existing `GET/POST
  /api/circle/profiles`, `DELETE /api/circle/profiles/[id]`, `POST
  /api/circle/profiles/[id]/report` routes — all already rate-limited from
  Batch 1.
- **One new backend route**: `GET /api/circle/profiles/[profileId]/report`.
  Web never needed this — `CircleHub` reads `latestSavedProfileReports` off
  a direct server-side DB call (`getCircleDashboardData`); mobile only has
  HTTP, and re-running the existing POST (rate-limited 5/min, and it writes
  a new report version every call) just to redisplay an already-computed
  report on screen open would be wrong. Read-only, wraps the
  already-existing `getLatestSavedProfileReport` service function. Judged
  as filling an obvious REST gap forced by mobile's architecture, not a
  product/schema decision — built without halting, consistent with the
  narrower halt boundary.
- `circle.tsx` (tab root) keeps the ratified §12.2 empty state
  (`MOBILE_UX_RESEARCH.md`) and the chart-gate exactly as they were —
  confirmed via source read that this screen was a deliberate, ratified
  design (not throwaway placeholder text) before touching it. Only the
  Crush card and "Или добави" line are wired to `/circle/new`; Партньор/
  Приятел stay inert (as they already were pre-port) since those lead to
  Connections-space invite flows scoped to sub-batch B, not built yet.
- **Flagged, not unilaterally decided — founder review needed:**
  1. No Connections/Crush tab switcher, unlike web's `CircleHub`. Building
     that chrome now would show a tab with nothing behind it until
     sub-batch B ships invites — judged worse than omitting it, but this
     is the kind of structural call the ruling asked to flag rather than
     assume.
  2. The chart-gate paragraph is web's own sentence with "connection
     spaces или" trimmed out (that clause names the not-yet-built
     Connections surface) — an edit, not a verbatim port.
  3. Teaser-mode "Отключи пълния прочит" routes to `/you/premium` (the
     in-app paywall destination) rather than web's `/pricing` (an SEO
     landing page mobile doesn't have) — a mapping decision, not a new
     product call.
- **Two real bugs caught by self-review before shipping, not device-
  tested yet:** the populated/empty branch briefly rendered the ratified
  empty state during the saved-profiles fetch (gate was `!profiles ||
  profiles.length === 0`, true while `profiles` was still `undefined`;
  fixed to gate on `profiles !== undefined` first). The relationship-type
  picker didn't reset to `romantic` when switching to a profile with no
  report yet — web's `CircleHub` does (`if (!selectedSavedProfileReport)
  setSavedProfileRelationshipType('romantic')`); mobile's first pass only
  set it when a report existed. Matched web's behavior.
- Copy: see the founder-review list below (report handed to founder
  separately from this file, per the batch's own instruction to report
  provenance per string). Lint baseline `1616 → 1659` (+43: +40 mobile,
  +3 web from the new GET route reusing 3 already-approved error strings
  as new AST literal nodes). `copy-lock.json` regenerated, diff verified
  to contain exactly the new/changed literals — no stray entries.
  `check:all` green locally (strictness, bg-strings, copy-lock,
  lint-baseline, typecheck both apps, lint, all 160 tests) and confirmed
  green on the actual CI run (`31784121821`, `conclusion: success`).
- **Not device-tested.** Founder verification still outstanding for this
  sub-batch, same as Batch 1's chart-tap fix — typecheck/lint/tests are
  necessary but not sufficient evidence for UI correctness on a real
  device.

**Ruling that constrains this batch, reversed once already — record both
so nobody re-derives it:**
1. First ruling (2026-08-13, same session): hold Кръг for a design pass —
   web's Circle UI was never designed (structurally unrelated to the
   existing `krug-v4.html` mockup) and porting an undesigned surface then
   redesigning it is doing the work twice.
2. **Reversed minutes later, same session:** port now against the existing
   web UI, as faithfully as practical, functional parity first. Founder is
   accepting the trade knowingly — ported mobile screens will look like
   web, not like Днес/Карта, until a redesign pass happens **after**, not
   instead. This is NOT a design-approved surface; don't let anyone
   downstream read shipped Кръг screens as design-ratified.
3. Where the app's design language applies cheaply without inventing
   anything (ScreenShell's `temperature` prop, the existing type scale,
   bronze-as-light-not-container, no cards/pill buttons) — apply it during
   the port. Where matching web would require an actual design decision —
   match web, and flag it rather than deciding unilaterally.
4. Кръг redesign pass is scoped into Batch 8 (UI phase), after the
   functional port ships.

**Founder review of sub-batch A (2026-08-14) — all three flags ratified:**
1. No Connections/Crush tab switcher — approved. "A tab with nothing
   behind it is worse than no tab."
2. Trimmed chart-gate paragraph — approved.
3. `/you/premium` over `/pricing` for the teaser upsell CTA — approved as
   the correct destination, **with a consequence to track**: `/you/premium`
   is currently Batch 5's target, still a 45-line stub. Until Batch 5
   ships, the Кръг paywall CTA leads to a dead end. Acceptable pre-launch,
   not acceptable at launch — added explicitly to Batch 5's scope below so
   it can't ship half-wired.
New copy ratified: `+ Нов профил`, the delete-confirmation Alert strings,
the edited chart-gate paragraph.

---

### Batch 4 sub-batch B investigation — invite-accept race condition (security finding, not a Кръг feature item)

**Status: all three fixes done and merged (`0d64d17` invite-accept,
`7d60778` both report routes), all ratified, sub-batch B UI shipped
(`f733c08`). Batch 4 is done.**

This is filed separately from the Batch 4 ledger on purpose — a security
fix landing as a footnote inside a feature batch reads as a feature
detail, and it isn't one.

**Finding:** per the founder's explicit instruction to verify the invite
backend's authorisation model before porting its UI (not assume a
production-shaped backend is sound), `POST /api/circle/invites/accept`
had a real concurrent-replay race. It fetched the invite with a plain
SELECT (`status='pending' AND expires_at>now`), did all the expensive
work (create a `connection_spaces` row, insert members, run
`buildSpaceComputation`, insert a `connection_reports` row), and only
flipped the invite to `status='accepted'` in its LAST write. Two POSTs
against the same still-valid token, close enough in time, could both pass
the SELECT before either write landed — producing two separate spaces
(each granting mutual relationship-data access) and two AI-cost report
generations from one token. Token entropy (`crypto.randomBytes(24)`, 192
bits) and sequential reuse-after-acceptance were both already sound; this
was specifically a TOCTOU gap in the accept route, not the token itself.

**Fix:** the SELECT-then-UPDATE became a single conditional
`UPDATE connection_invites SET status='accepted', ... WHERE status='pending'
AND expires_at>now() RETURNING *` — one atomic statement, executed as the
FIRST write, not the last. A losing racer gets the identical 404 a
stale/unknown token would (no timing or message signal). All the
post-claim work runs inside an inner try/catch that reverts the claim
back to `pending` if anything downstream fails, so a post-claim failure
doesn't permanently burn the token. That release is best-effort, not a
database transaction — a true rollback would need an RPC function
(a migration), judged out of scope for this fix and noted rather than
silently built. Also fixed, caught by Batch 3's own
`routes-surface-429.test.ts` the moment the rewrite landed: the rewrite
had briefly called `createServiceSupabaseClient()` before
`assertRateLimit()`, the exact rate-limit-first ordering bug Batch 3
fixed elsewhere — corrected before merge.

**Defense-in-depth schema constraint — answered, not built:** a
uniqueness constraint tying one `connection_spaces` row to its originating
invite would survive future refactors of the route, but no `invite_id`
column exists on `connection_spaces` today — nothing to constrain without
adding one. Cheap in concept (one nullable column + a partial unique
index), but it's a migration, which halts for ratification regardless of
size, per standing instruction. Not built. Flagged for the founder to
rule on, not decided unilaterally.

**Test:** `apps/web/test/circle/invite-accept-race.test.ts` — two
concurrent `POST /accept` calls against one token, asserting exactly one
space is created and the loser gets the standard 404. Uses a
purpose-built stateful fake Supabase client (not the shared FIFO mock,
which can't model "the second concurrent UPDATE sees the row the first
one already flipped") so the test genuinely exercises the race, not a
scripted replay of it. **Verified empirically, not just reasoned about:**
ran this exact test against the pre-fix route and confirmed it fails (2
winners, 2 spaces created) before restoring the fix — a test that only
checked sequential reuse would have passed against the broken code too,
which was the whole point of building this one instead.

**General lesson, worth recording as its own line item:** this was found
because porting Кръг to mobile forced an actual read of the invite
backend's authorisation model — not because anyone was auditing it. The
Circle backend has been running in production-shaped form since
2026-08-04 (`STREAM-K-PORT-LOG.md` "Port 1") with nobody having looked at
it this closely until a port required it. **Worth asking, separately and
not now (per founder instruction): what else in the Circle backend has
never actually been reviewed.**

**Founder ratification (2026-08-14):** fix approved for both open items.
Best-effort release (not a true transaction) accepted with reasoning —
right call for scope. The defence-in-depth unique index stays parked in
the halt-required register; founder rules on it alongside other
migration-shaped items together, not one at a time. Two things recorded
as standing discipline going forward, not just praise: (1) the test was
proven to fail against the pre-fix code before being trusted — "a test
not proven to fail against the bug it targets is just a test that
passes," now the standard for anything security/correctness-shaped (see
`feedback_prove_test_fails_against_bug` in Claude's memory). (2)
`routes-surface-429.test.ts` (Batch 3) caught a real ordering slip in the
rewrite itself before merge — the gate paid for itself twice in one
session, once finding Batch 1's original ordering bugs, once preventing a
new one during the fix that closed a *different* bug.

**Wider question promoted to a real batch, not left as a note:** see
Batch 5.5 below.

**Sub-batch B investigation (2026-08-14) — same check-then-act shape found
twice more, one of them already live in production:**

Per the founder's instruction to treat any check-then-act shape in this
sub-batch's surface the same way the invite-accept race was treated —
halt, fix separately, don't fix inline — the remaining Circle routes this
sub-batch touches were read before any UI work started. Two genuinely
match the invite-accept bug's shape and severity class (real duplicate
resource creation, real doubled AI/ephemeris cost); three are lower
severity but still check-then-act and are recorded rather than silently
judged fine unilaterally.

| # | Route | Shape | Consequence of a race | Severity / status |
|---|---|---|---|---|
| 1 | `POST /api/circle/relationships/[id]/report` | reads `latest.version`, then inserts a report with `nextVersion` — no exclusivity | **FIXED (`7d60778`).** See below. | was high, now fixed |
| 2 | `POST /api/circle/profiles/[id]/report` | identical shape, `saved_people_reports` table | **FIXED (`7d60778`).** See below. | was high, now fixed |
| 3 | `POST /api/circle/relationships/[id]/archive` | checks `space.status !== 'active'`, then updates it | idempotent action — a race produces the same final state either way | low — ratified. Goes to Batch 5.5. |
| 4 | `POST /api/circle/invites` (create) | checks `hasActiveRomanticSpace` before creating an invite | could create two pending romantic invites for one user | low — ratified, **with a correction to the original framing**: this route's safety is not self-contained, it's *dependent* on the accept route's own `hasActiveRomanticSpace` re-check at accept time. That dependency must stay visible, not implicit — if the accept path is ever refactored, this becomes exploitable again. Recorded here explicitly so a future refactor of accept has to reckon with it. Goes to Batch 5.5. |
| 5 | `POST /api/circle/profiles` (create, already shipped) | checks the free-tier 1-profile cap before inserting | a race could let a free user create 2 profiles instead of 1 | **reclassified medium, not low** — founder correction: "I am not comfortable calling a free-tier quota bypass minor. It is a paid boundary... 'minor quota bypass' is how paid limits stop meaning anything." Fix in Batch 5.5, likely a single conditional insert (analogous to the report-route fix's `23505` handling, if `saved_people_profiles` already constrains one-per-user-per-kind — not yet checked; that check is Batch 5.5's job, not done here per the founder's "do not investigate now" instruction). |

**Clean, no issue found:** `GET .../weather` (pure read, no writes — no
TOCTOU possible), `DELETE invites/[inviteId]` (cancel), `GET
/api/circle/profiles` (list).

**#1 and #2 — corrected assessment, then fixed (`7d60778`, 2026-08-14).**
The original table entries above claimed both routes needed a
`UNIQUE(parent_id, version)` migration to fix. **That claim was wrong** —
found by pattern-matching the invite-accept bug's shape without actually
checking the schema, exactly the kind of error this whole workstream
exists to catch. Both `connection_reports` and `saved_people_reports`
already have `UNIQUE(space_id/profile_id, version)` constraints
(`connection_reports_unique_version`, `saved_people_reports_unique_version`),
live since the original schema migration (`20260803101500`) — the
database was already rejecting duplicate-version inserts the whole time.
The actual bug: neither route handled the resulting `23505`
unique-violation gracefully, so a losing racer got a generic 500 instead
of a defined outcome. **Fix:** on insert failure, check for
`error.code === '23505'` specifically; if that's the cause, fetch and
return the current (winning) report instead of a 500. Two racers now
always end with exactly one report row and two 200 responses describing
the same report — the loser gets the winner's data, decided and stated:
the existing/winning report, not a generic conflict error, because it's
more useful (the user asked for a compatibility report and now has one)
and converges cleanly with no visible failure. No migration needed for
either fix. Both new tests
(`test/circle/relationship-report-race.test.ts`,
`test/circle/saved-profile-report-race.test.ts`) model the real
`UNIQUE(parent_id, version)` constraint in their fake Supabase clients and
were verified empirically against the pre-fix routes (both failed with a
500 to the loser) before restoring the fixes — same discipline as the
invite-accept test.

**Founder ratification (2026-08-14):** both high-severity fixes approved.
Two standing-discipline lessons reaffirmed as the norm going forward, not
just for this fix: (1) prove a new security/correctness test fails
against the pre-fix code before trusting it (now in Claude's memory as
`feedback_prove_test_fails_against_bug`). (2) `routes-surface-429.test.ts`
(Batch 3) catching the invite fix's own ordering slip before merge is on
record as the gates paying for themselves twice in one session.

**Sub-batch B UI shipped (`f733c08`), verified against source, not just
against the parity doc:**
- Invite creation/share/cancel, connection-space list + detail (headline
  score, members, weather, domain scores, latest report preview),
  generate/regenerate report, archive. Two new backend GET routes
  (`/api/circle/relationships` list, `GET /api/circle/invites` list) —
  same class of gap as sub-batch A's saved-profile-report GET: web reads
  this off a direct server-side DB call, mobile only has HTTP.
- `circle.tsx` gained the Connections/Crush surface toggle that
  sub-batch A deliberately omitted while Connections had nothing behind
  it — now that it does, built it. All three ratified §12.2 empty-state
  cards are wired (Партньор/Приятел pre-select romantic/friendship,
  Crush unchanged). Chart-gate paragraph restored to web's exact
  verbatim text — sub-batch A's trimmed version (with "connection spaces
  или" removed) is stale now that Connections exists.
- **Mobile-loop-risk commitment, now verified against shipped code, not
  just stated as intent:** all three new list queries
  (`useConnectionSpaces`, `usePendingInvites`, `useCachedInviteLinks`)
  are plain TanStack queries, default `staleTime`, no polling; every
  mutation (`useCreateInvite`, `useCancelInvite`,
  `useGenerateConnectionReport`, `useArchiveSpace`) invalidates its own
  query key on success, no `useEffect`-driven refetch anywhere in the
  new code. Same pattern as sub-batch A's already-reviewed hooks.
- **Flagged simplifications, not unilaterally assumed fine forever:**
  1. Invite acceptance has no native mobile screen — the shared link
     opens web's existing, already-auth-gated `/connect/[token]` page in
     the recipient's browser. Reuses working infrastructure rather than
     duplicating it; deep-linking `/connect/*` straight into the app is a
     reasonable future improvement, not built here.
  2. "Покани още човек" (invite another person into an existing space)
     routes through the same create-invite screen with the relationship
     type locked, rather than firing immediately the way web's
     equivalent button does (no intermediate form on web at all).
     Arguably safer (a confirmation step before creating another invite)
     but is a real behavioral deviation from web, not a bug.
  3. The invite label field isn't pre-filled from the existing space's
     name the way web's forced-label parameter does on that same
     "invite more" action.
- Copy: mostly ported verbatim from `CircleHub.tsx` (`TYPE_LABELS`,
  `TYPE_BLURB`, `DOMAIN_LABELS`, `WEATHER_TONE_LABELS`, error/button
  strings). New, needs founder review: `"Име (по избор)"` field caption,
  `"+ Нова връзка"` button (matches the already-approved `"+ Нов профил"`
  pattern from sub-batch A). Lint baseline `1660 → 1719`; copy-lock
  regenerated and diff-verified to contain exactly the new/changed
  literals. `check:all` green locally and confirmed green on the actual
  CI run (`31790951174`, `conclusion: success`).
- **Not device-tested.** Same standing caveat as every UI batch this
  session — typecheck/lint/tests are necessary, not sufficient, evidence
  for real-device correctness.

**Batch 4 status: done, both sub-batches shipped.** Кръг redesign pass
(promised in Batch 4's original ruling) stays scoped into Batch 8, after
Batch 5.5's Circle backend security review per the sequencing above.

---

### Batch 5.5 — Backend security sweep, all routes (2026-08-14)

**Status: in progress. Tier 1 done, Tier 2 done, Tier 3 mostly done,
Migration A declined, Migration B code done (SQL not yet run), Migration
C blocked on a founder-run schema query.**

**Why it exists:** the invite-accept race was found only because porting
Кръг to mobile forced an actual read of the authorisation model — not
because anyone was auditing it. Founder instruction: make the sweep
systematic across **all** routes, not just Circle's, since Circle was
only where the port happened to force the first close look.

**Scoping investigation (2026-08-14):** dispatched 5 parallel read-only
audits covering all 41 `apps/web/app/api/**/route.ts` files against six
vulnerability classes (check-then-act races, ID-substitution auth
bypass, trusted client identifiers, rate-limit ordering, missing
ownership scoping, inconsistent-state failure paths). Full findings
table (1 high, 8 medium, 14 low, plus re-confirmations of the three
items parked from Batch 4) was reported to the founder for a single
consolidated ruling before any fix work started, per instruction.
VERIFIED vs. INFERRED stated per finding; the one INFERRED item
(`processed_webhook_events` unique constraint existence) was flagged
rather than guessed at, expressly per the founder's approval of that
discipline.

**Tier 1 — done, both fixed same day as found, ahead of everything else:**
- **#1, oracle/generate quota bypass — HIGH, the most serious finding of
  the project.** `regenerate:true` skipped both the 24h cooldown and the
  full quota check/claim whenever no live cached reading existed (never
  generated, or past the 7-day TTL) — a free-tier user could get
  unlimited paid AI generations for free, repeatable forever. Fixed by
  gating the B.0f-2-fix-1 quota exemption on `existingReading`
  truthiness (`isRegenerationOfExisting`), not on the raw `regenerate`
  flag alone. Checked `horoscope/generate` for the same shape (same
  author, same pattern, per founder instruction to verify not assume) —
  it has no quota system at all, so the specific bypass doesn't apply
  there (its own issue is #5, below). Fix: `cd00147`.
- **#4, cron/cleanup-deleted-accounts orphaned Clerk account — GDPR
  contract failure.** Supabase `users` row deleted before the Clerk
  account; a Clerk API failure left a live, loginable, data-wiped account
  with no retry path (the row that anchors tomorrow's selection query was
  already gone). Fixed: Clerk deleted first, `users` row last (the retry
  anchor stays until every side effect, including Clerk, succeeds); a
  Clerk 404 (already-deleted by a prior run) is treated as success rather
  than a stuck retry loop. Fix: `854035f`.

**Tier 2 — done, all seven items:**
- **#2**, `invites/accept` group-space branch — same unchecked-insert-
  error bug Batch 4 fixed elsewhere (`7d60778`), missed at this
  third call site. Two different invites into the same group space,
  accepted concurrently, race the same `connection_reports` version;
  23505 now treated as success (member was already added), any other
  error now surfaces instead of a silent false-200. Fix: `2b10618`.
- **#5**, `horoscope/generate` duplicate paid-AI-call race — claimed the
  chart+date pair via a real INSERT against the existing
  `daily_horoscopes_chart_date_unique` constraint (no migration needed)
  before calling the AI model; the loser gets 429 instead of a duplicate
  paid generation. Fix: `6fc97b6`.
- **#6**, `planets/current` — the one route with zero auth AND zero rate
  limit, doing real Swiss Ephemeris compute. **Also found while fixing:
  this route has no caller anywhere in `apps/web` or `apps/mobile`** —
  currently dead code from a product-surface perspective, reachable by
  anyone who finds the URL regardless. Added IP-keyed rate limiting
  either way; founder should separately decide keep-public-for-a-future-
  widget vs. remove. Fix: `0ab401c`.
- **#7**, `diary/entries/[id]` — GET/PATCH/DELETE had no rate limiting at
  all, unlike sibling `birth-data/[id]`. Added matching 60/10/10 limits.
  Fix: `d42e216`.
- **#10**, `diary/entries` POST TOCTOU — `upsertDiaryEntry`'s SELECT-then-
  INSERT could 23505 a legitimate concurrent request into a spurious 500.
  Recovers by re-fetching the winner's row and applying the request's own
  data via UPDATE. Fix: `d42e216`.
- **#19**, `push/subscribe` missing ownership guard — the upsert
  (`onConflict:'endpoint'`) could silently reassign another user's
  subscription to the caller. Added a check-then-act ownership read
  (409 if the endpoint belongs to someone else) — not a DB constraint,
  judged acceptable given the low likelihood and non-sensitive payload.
  Fix: `a8c6907`.
- **#20**, `push/register`/`subscribe`/`unsubscribe` — none rate-limited
  at all. Added 20/min limits to all three. Fix: `a8c6907`.

**Tier 3 — mostly done, judgement applied per instruction:**
- **#12/#13** (unchecked `connection_spaces` cache-update error in the
  standalone report route and the currently-unreachable
  `recomputeAndPersistSpace` helper) — cheap, now logged. Not fatal
  either way (cache staleness only). Fix: `65929b0`.
- **#22** (cron `CRON_SECRET` non-constant-time comparison) — cheap,
  extracted a shared `verifyCronSecret` (timingSafeEqual, same pattern
  already used in the RevenueCat webhook's signature check) into both
  cron routes. Fix: `65929b0`.
- **#11** (birth-data/[id] chart_calculations cache-invalidation) —
  checked, found already adequate: already logged via `console.error`
  and non-fatal by design. The original audit's "silent" characterization
  was imprecise. No change made.
- **#21** (gdpr/delete-account POST check-then-act, duplicate audit log)
  — same atomic-conditional-UPDATE pattern as the invite-accept/oracle-
  quota claims (`.is('deletion_scheduled_at', null)`), closing the race
  entirely rather than just reducing its blast radius. Added an `is`
  chain method to the shared FIFO test mock (`test/mocks/supabase.ts`) —
  needed for this fix, reusable going forward. Fix: `9a98797`.
- **#17** (`crystals/collect` check-then-act, absorbed by a unique
  constraint) — cheap one-line `.is('collected_at', null)` guard added
  for defense-in-depth, even though no double-reward was ever possible.
  Fix: `67ba684`.
- **#18** (`crystals/daily/collect` cosmetic "alreadyCollected" double-
  report) — checked, **not fixed**: a correct fix needs the shared
  auto-collect insert (`today.ts`) to expose a fresh-vs-existing signal
  to both call sites, not a one-line patch, despite the low severity.
  Recorded per instruction ("otherwise record and move on").
- **#8** (`crystals/today` GET-mutates-state) — **not fixed**: a proper
  fix needs a route/verb redesign (GET shouldn't have a write side
  effect), not a cheap patch. Impact is already low (idempotent, no
  extra reward, absorbed by the same unique constraint as #17/#18).
  Recorded, not fixed this batch.
- **#23** (Stripe webhook cross-event delivery ordering) — accepted, no
  fix. Inherent to Stripe's at-least-once/unordered delivery guarantees,
  not something this codebase controls.
- **#14/#15/#16** (Circle archive/invite-create/invite-cancel
  check-then-act, all previously judged idempotent-or-dependent-on-a-
  re-check) — re-confirmed genuinely safe during the original audit
  re-read. Closed, no fix needed.

**Migrations — ruled on all three at once, as the founder asked:**
- **A (`connection_spaces.invite_id` defense-in-depth index) —
  DECLINED.** The actual TOCTOU is already fixed at the route level;
  founder judged this not worth a migration on an already-safe path.
  Stays in the register as available, not needed.
- **B (`saved_people_profiles` free-tier quota) — APPROVED, code done,
  SQL NOT YET RUN.** Per founder instruction, used the RPC pattern
  already proven for oracle quota (`increment_quota_if_available`)
  rather than denormalising tier onto the profile row (a second source
  of truth for subscription tier). New function
  `create_saved_profile_if_allowed`
  (`supabase/migrations/20260814180000_saved_profile_quota_rpc.sql`)
  wraps the tier check, count check, and insert in one atomic Postgres
  function — a brand-new user has zero existing profile rows for their
  first profile (the exact race window), so there's no row to lock via
  `SELECT...FOR UPDATE`; `pg_advisory_xact_lock(hashtext(p_user_id))`
  serializes concurrent calls for the same user instead.
  `apps/web/app/api/circle/profiles/route.ts` POST already calls this
  RPC. **Not yet live** — per standing discipline, a migration isn't
  done until confirmed landed. Founder needs to run the SQL (dashboard
  or `supabase migration repair --status applied 20260814180000` if
  applied out-of-band, matching the existing quota-functions migration's
  own operational note) and confirm. Fix: `851d5ce`.
- **C (`webhooks/stripe` idempotency) — blocked on a founder-run query.**
  Whether `processed_webhook_events.stripe_event_id` has a live unique
  constraint could not be verified from the repo (no tracked
  `CREATE TABLE` for this table — same "predates migration tracking"
  situation `connection_spaces` was in before its 2026-08-03 capture
  migration) or from any local tool (Docker unavailable for local
  Supabase, no `pg` client installed). SQL given to the founder to run
  in the dashboard; fix shape depends entirely on the result — not
  guessed at.

---

### Batch 5 — Premium subscription status/management port

**Status: done (2026-08-14).**

**Scope:** port web's subscription status/management surface
(`SettingsContent.tsx`) to mobile's `/you/premium` (was a 45-line stub).
Confirmed cleanly separable from the paywall/purchase flow —
`SettingsContent.tsx` shows tier, renewal date, payment method, and wires
`/api/stripe/{portal,cancel,subscription}` for cancel/reactivate/manage-
billing; its only "upgrade" affordance is a plain `<Link href="/pricing">`,
no purchase logic. Shipped: status/management half (all four subscription
states) plus a minimal free-state branch, per founder ruling below — the
purchase/paywall half itself stays in the halt-required register.

**Halt, ruled 2026-08-14 — three rounds, all resolved before building:**

1. **Free-state scope.** The Кръг teaser CTA arrives as a free user by
   definition, so "the CTA must not dead-end" is a statement about
   `/you/premium`'s free-state branch, not the status/management branch
   this batch was originally scoped around — and the stub's own in-file
   note (D13, ratified 2026-05-12) already calls for both halves to live
   here eventually. Founder ruled: build a minimal free-state branch now
   (tier label + a features list ported from web, a CTA that sends users
   to web to subscribe) — zero purchase calls, zero RevenueCat offering
   reads. If building it had required `getOfferings()`, that would have
   made it halt-required; it didn't.
2. **CTA copy.** Founder rejected "coming soon"-shaped copy outright —
   Premium exists and is purchasable on web today; only the *mobile*
   purchase path is missing, and saying otherwise is false. Approved,
   verbatim: button `„Абонирай се на stellaeum.com"`, caption `„Купуваш и
   управляваш абонамента от уеб приложението."` (domain corrected from an
   initial `.ai` draft — founder owns `.com`, not `.ai`).
3. **No live domain to send users to.** Verified, not assumed: nothing in
   the repo (`next.config.js`, `.env.example`, `layout.tsx` metadata,
   `robots.txt`, every planning doc) references `stellaeum.com` or any
   other live URL — consistent with Vercel's deploy still being broken
   (blocked-externally register, below). Also checked and reported before
   building: Clerk's `<SignIn>` in `apps/web/app/(auth)/sign-in/
   [[...sign-in]]/page.tsx` has no explicit `redirect_url` wiring, and its
   fallback redirect is hardcoded to `/dashboard`, not `/pricing` — a
   mobile user bouncing through sign-in would not reliably land back on
   pricing. Founder ruled: don't block Batch 5 on the Vercel fix (that's
   founder-owned work, see blocked-externally). Build now with the URL as
   a single named, guarded config value that fails loudly rather than
   rendering a dead link — same shape as `RevenueCatProvider`'s
   `REPLACE_WITH_` placeholder check. **This is now tracked as an explicit
   unfilled item, see the halt-required register below — it must not be
   forgotten.** The sign-in-then-purchase flow itself stays unverified,
   blocked on the same thing (recorded as blocked, not assumed working).

**Shipped:**
- `apps/mobile/lib/config/webAppUrl.ts` — new file. `getWebAppUrl()` /
  `getWebPricingUrl()` read `EXPO_PUBLIC_WEB_APP_URL`, treat a missing
  value or the `REPLACE_WITH_` placeholder prefix as absent: logs once via
  `logError('ERR-MOB-WEBURL-001', ...)` and returns `null`. Callers must
  not render on `null` — the free-state CTA section (button + caption)
  simply doesn't render when unset, it never links to nothing silently.
  Added `EXPO_PUBLIC_WEB_APP_URL=REPLACE_WITH_WEB_APP_URL` to both
  `.env.example` and `.env.local`.
- `apps/mobile/hooks/useSubscription.ts` — `useSubscription` (GET
  `/api/stripe/subscription`), `useBillingPortal` (POST `/api/stripe/
  portal`, opens the returned URL via `expo-web-browser`'s
  `openBrowserAsync` — already a mobile dependency, no native module
  added), `useCancelSubscription` (POST `/api/stripe/cancel` with an
  optional reason), `useReactivateSubscription` (DELETE `/api/stripe/
  cancel`). Follows the established `useConnectionSpaces`/`useArchiveSpace`
  hook shape: exported query-key constant, mutations invalidate it on
  success (React Query, not web's `router.refresh()`).
- `apps/mobile/app/(authed)/you/premium.tsx` — full rewrite of the stub.
  Five branches: loading, error+retry, free (+ expired sub-case, same CTA),
  active, cancelling — mirrors web's `SettingsContent.tsx` state logic
  (`isFree`/`isExpired`/`isActive`/`isCancelling`) exactly. Cancel
  confirmation is an RN `Modal` (web's `<dialog>` has no RN equivalent)
  with the same 4 preset reason buttons, all copy ported verbatim from
  `SettingsContent.tsx` — already-approved existing copy being reused, not
  newly written, except the two founder-approved free-state strings above.
- Verified all three real entry points to `/you/premium`
  (`you.tsx`'s "Премиум" menu row, `crystals.tsx`'s `PremiumGate`, and
  Batch 4's Кръг teaser CTA in `SavedProfileDetailPanel.tsx`) now land on
  the real screen, not the stub — grepped for every `you/premium`
  reference in `apps/mobile`, not assumed from the one Кръг call site.
- Lint baseline `1719 → 1749` (+30, all from the new/changed screen and
  hook, reviewed — matches the 30 new-Cyrillic-literal ESLint warnings
  exactly). `copy-lock.json` regenerated (2963 → 2993 entries) and
  diff-verified to contain exactly the new/changed literals from
  `premium.tsx` and `useSubscription.ts`, no stray entries. Full
  `check:all` (strictness, bg-strings, copy-lock, lint-baseline,
  typecheck, lint, 126 web tests + astrology/core suites) passes locally,
  exit 0.
- **Not device-tested.** Same standing caveat as every UI batch this
  session.

**Known gap, not built, low priority:** `GET /api/stripe/subscription`
doesn't return `subscription_provider`, so this screen can't currently
distinguish a Stripe-provider subscriber from a (theoretical) RevenueCat-
provider one. Not a live risk — RevenueCat's mobile provider scaffold
(`RevenueCatProvider.tsx`) only configures the SDK and syncs Clerk
identity; no offerings/purchase/entitlement code exists anywhere in
`apps/mobile`, so no real user can currently reach `subscription_provider
=== 'revenuecat'`. Revisit when the RevenueCat paywall batch ships — at
that point this screen will show Stripe portal/cancel/reactivate actions
to a RevenueCat subscriber, which is wrong (those subscriptions are
managed via the App/Play Store, not Stripe's portal).

**Related finding, not fixed (out of scope, flagged for awareness):**
`apps/mobile/app/(authed)/you/settings.tsx` already hardcodes `const
PRIVACY_URL = 'https://stellaeum.com/privacy'` with no placeholder guard —
the same "assumed-live domain" shape this batch just added a guard for,
already shipped elsewhere before this batch existed. Not touched here (no
ask, different file, would be scope creep) — worth the same guard
treatment whenever `/you/settings` is next touched.

---

### Batch 6 — Amber→bronze design-token migration

**Status: not started — planning only.**

**Scope:** finish the amber→bronze token migration already underway (9
files already on bronze per `MOBILE-WEB-PARITY-GAP.md` Section 12; up to
48 files still on `amber-*` NativeWind classes, including
`tailwind.config.js` itself). Not a find-and-replace — amber is a Tailwind
class, bronze is an inline JS token, different mechanisms — so this is
file-by-file conversion. Token itself is already ratified
(`WARM_COOL_AMENDMENT.md`, LIVE); no new design decision needed, but the
size warrants its own batch and its own post-batch visual review rather
than folding into Batch 1.

---

### Batch 7 — Parity sweep (non-UI, unblocked)

**Status: not started.** Whatever's left in `MOBILE-WEB-PARITY-GAP.md`
once Batches 2, 4, and 5 close — smaller now than the founder's original
draft since Circle/subscription/Oracle/perf/rate-limits are accounted for
in earlier batches. Re-scope against the parity doc when this batch opens.

---

### Batch 8 — UI phase (iterative)

**Status: not started.** The one thing that doesn't batch the same way as
the rest — UI work is iterative and needs founder review per-screen, not a
single decide-and-proceed pass. Roughly eleven screens/surfaces make up
what's left once the above batches close: the 4 Oracle polish items (if
any carry visible UI decisions beyond Batch 2's scope), subscription
status/management screen review, the paywall UI (once ruled on, see
halt-required below), push-notification permission/settings UI, and ~4
Кръг screens (hub/list, saved-profile form, invite acceptance, relationship
report/weather) — including the **Кръг redesign pass** promised in Batch
4's ruling. Sequence and pace TBD by founder, not pre-planned here.

---

## 4. Halt-required register

Items pulled out of batching because they need a founder ruling before any
implementation work starts.

### Кръг invite UI (Batch 4 sub-batch B) — RATIFIED 2026-08-14

**Was:** ratify the invite-accept race-condition fix (`0d64d17`) before
any invite-acceptance UI gets built on top of it. **Resolved:** founder
ratified the fix 2026-08-14; both open items from that fix (best-effort
release, deferred unique-index) were explicitly addressed — see Batch 4's
own section above. Kept here, marked resolved, rather than deleted, so
the "halt → ratify → proceed" sequence stays visible.

### Кръг relationship/saved-profile report generation — version race (Batch 4 sub-batch B investigation, 2026-08-14) — RATIFIED AND FIXED

**Was:** whether to fix `POST /api/circle/relationships/[id]/report` and
`POST /api/circle/profiles/[id]/report` now or defer to Batch 5.5.
**Resolved:** founder ruled fix both now (`7d60778`), as their own
reviewed change before any sub-batch B UI — reasoning: the saved-profile
route is live in production and already mobile-reachable, so "later"
means shipping more UI on top of a known-broken write path. Both fixed —
see Batch 4 sub-batch B's investigation section above for the corrected
diagnosis (no migration needed; the `UNIQUE(parent_id, version)`
constraints already existed) and the fix itself. Kept here marked
resolved for the same reason as the invite-UI entry above.

### `/you/settings.tsx` privacy-policy URL — 404s, Apple submission blocker

**Not a decision to rule on — a tracked broken link with a real consequence,
escalated 2026-08-14 from a passing mention in Batch 5's report to its own
entry per founder correction.** `apps/mobile/app/(authed)/you/settings.tsx`
hardcodes `const PRIVACY_URL = 'https://stellaeum.com/privacy'` — no
placeholder guard, shipped before Batch 5 existed. Because web has no live
deployment (Vercel still broken, see blocked-externally below), that URL
currently 404s. **Apple requires a reachable privacy-policy URL at App
Store submission** — this isn't just a dead link a user might tap, it's a
review-blocking defect sitting in already-shipped code. **Do not add a
guard here** — a guard that hides a broken privacy link is worse than a
visibly broken one; the fix is the domain going live, which makes the
existing link correct, not a code change. Cross-referenced from
`PRE_LAUNCH_PREREQS.md` item 7 (Privacy/GDPR). **Blocked on:** the same
founder-owned Vercel fix as the entry below. Resolves automatically once
`stellaeum.com` serves the app — verify the link actually resolves at that
point, don't assume.

### `/you/premium` free-state CTA — unfilled URL, blocked on Vercel

**Not a decision to rule on — a tracked unfilled config value**, recorded
here per founder instruction so it can't be forgotten the way the EAS
`REPLACE_WITH_` RevenueCat key incident nearly was (a placeholder shipped
in a GREEN build once before because nothing surfaced it). `apps/mobile/
.env.local`'s `EXPO_PUBLIC_WEB_APP_URL=REPLACE_WITH_WEB_APP_URL` is a
placeholder; `getWebAppUrl()` (`lib/config/webAppUrl.ts`) detects that
prefix and hides the free-state "subscribe on web" CTA entirely rather
than rendering a dead link, logging `ERR-MOB-WEBURL-001` once. **Blocked
on:** the founder's own Vercel fix (Root Directory → `apps/web`, "Include
source files outside the Root Directory" ON, Framework Preset Next.js,
Node 22.x, Clerk publishable key in both Production and Preview — founder-
owned, in progress). Once `stellaeum.com` serves the app, the founder
gives Claude Code the confirmed URL to fill both `.env.local` and, before
any real build, EAS env. **Also blocked on the same thing and still
unverified:** whether a mobile user with no existing web session can
actually complete sign-in-then-purchase there — Clerk's `<SignIn>` has no
confirmed `redirect_url` wiring and its hardcoded fallback goes to
`/dashboard`, not `/pricing` (see Batch 5's own section for detail). Check
this the moment the domain is live, not assumed working.

### RevenueCat paywall and purchase flow

**Decision needed:** what the paywall UI shows (offerings, pricing
presentation, upsell copy) and what test coverage is required before a
real-money purchase path ships. **Why it halts:** money path (real IAP
purchases), zero tests exist, no committed mockup exists anywhere for a
mobile paywall. RevenueCat SDK itself is already live and Clerk-identity-
linked (`RevenueCatProvider.tsx`) — this is purely the missing UI/purchase-
call layer on top of working plumbing.
**Blocks:** Batch 5's subscription-management screen shipped without this
(status/management doesn't need purchase logic) — its free-state CTA
points at web's `/pricing` instead of a native purchase flow, per founder
ruling (see Batch 5's own section). That web-redirect CTA is itself
blocked on a different thing (the Vercel deploy, see the entry above) —
this paywall ruling still gates the eventual *native* purchase path, not
Batch 5's screen.

### Push notification delivery

**Decision needed:** confirm the `push_tokens` schema migration scope
(REVISIT-26) and the registration-endpoint design before building. **Why
it halts:** requires a schema migration, which is on the founder's explicit
halt list regardless of how mechanical the rest looks. Mobile already has
an `expo-notifications` permission scaffold (SR 8.3) — this is specifically
about the missing end-to-end delivery wiring (token registration → storage
→ the existing `cron/daily-horoscope` route actually reaching mobile
devices, not just web Web Push subscribers).
**Blocks:** `DAILY-04` in `REQUIREMENTS.md` stays partially-complete
(web-only) until this ships.

---

## 5. Blocked-externally

Items that can't move regardless of engineering capacity — waiting on
something outside this repo.

| Item | Blocks | Owner |
|---|---|---|
| **Apple Developer Program enrollment** | TestFlight provisioning, SR 9 (EAS Dev Client + TestFlight + biometric auth bundle), the soft-launch milestone itself (iOS internal beta can't open without it) | Founder — application/payment step, not automatable |
| **Vercel** (production deploy target) | Not currently a hard blocker — web is deployed; flagged here because `VERIFICATION-SURFACE-GAPS.md` item 2 notes a local `next build` passing is not evidence a Vercel deploy will, so any future deploy-affecting change should be watched live, not inferred | Founder watches deploys; no outstanding blocker as of 2026-08-13 |
| **LLM model swap (OpenRouter/Llama → BgGPT)** | Nothing currently — deliberately deferred, not gating launch. Would need a controlled quality eval (same prompts/chart/topic, human-rated) before it's even a live decision, not just an engineering swap | Founder — product call on Bulgarian-quality-vs-parameter-count tradeoff, per `AI_PROVIDER_DECISION.md §5` |
| **Swiss Ephemeris Professional License purchase** | Nothing pre-launch by design — GPL-2.0 path is legally sufficient until the trigger fires. CHF 700 one-time, no retroactive coverage (contract clause 13) once the trigger does fire | Founder — automatic trigger already wired (`[Licensing]`-prefixed warnings on first genuine paying subscriber in both `stripe/subscription.ts` and `revenuecat/webhook-events.ts`); founder must act promptly once it fires, not "eventually" |
| **Designer assets** (`DESIGNER_BRIEF_ASSETS.md`) | Currently blocks nothing launch-critical — planet/zodiac glyphs render as Unicode placeholders pending real assets; brief itself is unfulfilled, no deliverable exists yet | Whoever the founder commissions; brief is written and ready |

---

## 6. Known-open, not batched

Deliberately not scheduled yet. Recorded so nobody re-proposes these as if
they were forgotten rather than deferred on purpose.

- **i18n namespaced strings-module migration.** Cyrillic literals currently
  live inline in components rather than a central strings module. Deferred
  — large mechanical migration with low urgency; `STAGE5_PREVENTION.md`'s
  drift-baseline script is designed to have its `BASELINE` lowered as the
  migration proceeds incrementally, whenever it does start.
- **Composed-output register check.** No systemic check exists for
  tone/register (formal/informal Bulgarian) consistency across AI-composed
  strings vs. hand-written UI copy — currently caught ad hoc, not
  systematically. Deferred — no committed design for what "the check"
  would even assert yet.
- **AI provider fallback strategy (`PRE_LAUNCH_PREREQS.md` item 5a).**
  OpenRouter is the single AI provider with no retry/failover. This is
  listed as a **pre-launch gate**, not a fully "not batched" item — but it's
  an explicit founder product call (graceful-degradation message vs.
  second-provider failover), not something to decide unilaterally, so it
  sits here until ruled rather than being silently folded into a batch.
- **Cookie consent banner / `/terms` route / signed processor DPAs.**
  `PRE_LAUNCH_PREREQS.md` item 7 — genuinely open, not started. Depends
  partly on item 1 (telemetry vendor decision, since a chosen analytics
  tool determines what needs consent).
- **Telemetry/analytics vendor decision** (`PRE_LAUNCH_PREREQS.md` item 1).
  PostHog was the prior candidate but was never installed — no vendor
  decision has actually been ratified. Not batched because it's a founder
  product decision (which vendor, what events) before it's an engineering
  task.
- **Load-testing (Scenarios B/C).** Blocked on M4 streaming-endpoint
  extraction per `LOAD_TEST_PLAN.md` — not re-scoped here, carried forward
  as-is from `PRE_LAUNCH_PREREQS.md` item 4.
