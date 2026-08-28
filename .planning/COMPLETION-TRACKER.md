---
title: Completion Tracker
status: living document — the single "where are we / what is left" reference
created: 2026-08-13
last-updated: 2026-08-27 LATE (RESOLVED: the app works in production — `POST /api/horoscope/generate` → 200 from a clean tab with Skew Protection OFF, plus every compute route + `/connect/test` friendly page. §0.8's "third failure" was a PHANTOM: skew protection routed every post-fix probe to a deployment pinned before the §0.6/§0.7 fixes, so the logged `SyntaxError` was pre-fix code. §0.6 sweph/geo-tz CLOSED + the win32→linux glob RESOLVED (this time on a live authed compute request vs. a probe from an unknown deployment). §0.8 shim REMOVED; 502 classification + Sentry.captureException KEPT (real gaps). §0.9 = the full post-skew re-verification table. VSG #10 added + the general form ("every observation has a scope, usually narrower than it appears") stated at the top of that doc. PROJECT-HISTORY.md written + postscript on how today ended. Earlier: Sentry caught a production-breaking bug 1h after going live — sweph/geo-tz/dictionary-bg missing from the deployed function; every compute path 500ing. §0.6: sweph + geo-tz FIXED and verified in production (`e64ef9f`), win32-trace residual risk resolved, `/connect/[token]` 500 resolved as a side effect. §0.7: the `bg-allowlist.txt` read — webpack froze `import.meta.url` to the build machine's path; FIXED (allowlist → bundled data module, parsed Set byte-identical). §0.8: NO THIRD FAILURE — it was a phantom. `/api/horoscope/generate` returns **200** from a clean tab with **Skew Protection off**; every probe after the §0.6/§0.7 fixes had been routed by skew to a deployment pinned *before* those fixes, so the `SyntaxError` in the logs was pre-fix code on a stale deployment. Sound reasoning, false observation (VSG #10). Kept: the `isUpstreamAiError` → **502 AI_UPSTREAM_FAILED** + quota refund on both AI routes, and `Sentry.captureException` in `toErrorResponse` — both fix real defects the phantom surfaced. Removed: the `[OPENROUTER-DEBUG]` shim (built for a bug that never existed). All six §0.9 re-verification items now pass against the confirmed-current deployment. VERIFICATION-SURFACE-GAPS #7 (build-time constant inlining), #8 (ad blocker eats the Sentry tunnel), #9 (`toErrorResponse` returns a 500 Response → Sentry never sees it), **#10 (a probe only tests the deployment you're routed to — skew protection can invalidate a whole session of probes)**. New §7: full path-to-launch sequence recorded (Tracks 1–6, auth Phase A/B + enrolment boundary, launch clock, zero-spend week plan). Apple enrolment + Play registration moved to next week (money). Earlier same day: FIRST SUCCESSFUL PRODUCTION DEPLOY — chain turbo.json env allowlist → lazy Stripe → Next.js 15.5.24; audit_logs de-identification, /support page.)
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

## 0. Open rulings — 2026-08-26 technical sweep

A full technical sweep ran 2026-08-26 across DB/RLS, secrets, auth, cost,
data integrity, scale, Vercel and RevenueCat, plus a founder-track list. The
founder ruled fix-order in two tiers same day. Full detail with
VERIFIED/INFERRED labels: `.planning/TECHNICAL-SWEEP-2026-08-26.md`.

**Tier 1 — shipped 2026-08-26** (`eddba71`, `ed5a1fc`, `5bc356b`):

- **#1 CRITICAL, RevenueCat webhook secret.** `REVENUECAT_WEBHOOK_SECRET` was
  byte-identical to `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`, a value shipped in
  the mobile bundle — anyone who unzipped the APK could forge a signed
  webhook payload and grant themselves premium. **Rotated to a random value
  local-only, in `apps/web/.env.local` (gitignored, no code change).** State
  is now safe-but-dead: the webhook will reject all real RevenueCat traffic
  until the real dashboard signing secret replaces the placeholder — see
  the RevenueCat row in §5 Blocked-externally, founder-owned.
- **#2+#3 CRITICAL, chained.** `/api/horoscope/generate` had no quota;
  chart creation was uncapped — chained, a free account could reach ~7,200
  unquota'd paid generations/day. **Fixed:** horoscope/generate now shares
  oracle/generate's monthly quota gate; `createBirthChart` caps at 20
  charts/user (`CHART_LIMIT_REACHED` → 429). Both proven against pre-fix
  code (git-stashed, confirmed fail, restored, confirmed pass).
- **#7 HIGH, cleanup cron swallowing delete errors.** supabase-js doesn't
  throw on `.delete()` failure — a non-throwing failure let the cron
  proceed to delete the Clerk account and the `users` row, destroying the
  Batch 5.5 #4 retry anchor. **Fixed:** every delete in that cron now goes
  through a `deleteOrThrow` wrapper; `deleteUserDiaryEntries`'s
  already-correct `ok:false` signal, previously logged and swallowed the
  same way, now throws too. Proven against pre-fix code the same way.

**Tier 2 — shipped 2026-08-26** (`fabe1d2`, `e825d7e`, `77c06b4`, `60fb5ab`,
`2081a20`):

- **#4 HIGH, premium unmetered on every AI path.** Fixed: oracle/generate
  and horoscope/generate now share one quota gate at
  `PREMIUM_MONTHLY_LIMIT` (300/month) instead of premium short-circuiting
  entirely. Deliberately invisible as a safety net, not a product feature
  — premium hitting it gets a generic 503 (no `CAP_REACHED` code, no
  number in the payload), indistinguishable from a real outage; free tier
  keeps its existing 429 + number, since that IS a surfaced product limit.
  Crossing 200/month alerts via `Sentry.captureMessage` (plain
  `console.error` would not reach Sentry — this repo's server config has
  no console-capture integration).
- **#5 HIGH, corrected — not "unmetered paid generations."** Read
  `lib/circle/report.ts` in full: both circle report routes build content
  from a deterministic template over an already-computed compatibility
  summary — zero `generateText`/`streamText`/`openrouter` calls anywhere
  in that path. Corrected in the sweep doc §4.4 rather than silently
  fixed. The real (smaller) cost — an uncapped version row + synastry
  recompute per POST, only a 5/min rate limit as a brake — got
  `MAX_REPORT_VERSIONS_PER_PAIR` (50), the same "rate limit but no hard
  ceiling" gap birth-data had before its chart cap.
- **#6/#13 HIGH, GDPR crystals tables.** `user_crystals` /
  `user_daily_crystals` added to both the cleanup cron and GDPR export
  (code fix, shipped). **FK migration prepared but NOT applied** — see §5
  Blocked-externally, founder-owned: checking read-only against production
  before writing it found 3 + 10 real orphaned rows, all one clerk_id with
  no `users` row, dated 2026-04-15 — this exact bug already having
  happened once.
- **#8 HIGH, 16 untracked tables.** Capture migration written
  (`supabase/migrations/20260826150000_capture_untracked_tables.sql`),
  extracted from production via read-only queries and self-verified
  programmatically (every column/type/nullable/default/constraint/index
  cross-checked — zero missing, zero extra). **NOT applied** — per §1.5's
  own "do not `db push` blind" warning, this needs
  `supabase migration repair --status applied 20260826150000`, not a push.
  Founder-owned; see §5.
- **#14 MEDIUM, regenerate cooldown resetting itself.** Fixed: a fresh
  generation now omits `last_regenerated_at` from its upsert instead of
  writing `null` over it — Postgres `ON CONFLICT DO UPDATE SET` only
  touches payload columns, so a prior regeneration's timestamp survives.
- **#17, rate limiter fails open everywhere.** Fixed on the three
  money-spending paths only (oracle/generate, horoscope/generate,
  birth-data create) via an opt-in `failClosed` flag on `assertRateLimit`
  — default unchanged (fail open) everywhere else, per the ruling.

Every Tier 2 fix proven against pre-fix code (git-stashed, confirmed fail,
restored, confirmed pass) before landing, same discipline as Tier 1.

**Tier 3 — shipped 2026-08-26** (`18cd9e2`, `97294fe`, `67ab42d`, `df3a411`,
plus `.env.local` fixes for #12 — local-only, gitignored, not a commit):

- **#12, Sentry dead in both apps.** Both `.env.local` var-name swaps fixed
  locally. **2026-08-27: assessed for what code/config could be wired in
  advance — answer is nothing.** `apps/mobile/lib/monitoring/sentry.ts`
  already reads `EXPO_PUBLIC_SENTRY_DSN` and guards `Sentry.init` on it
  being truthy; `@sentry/react-native` config plugin is already in
  `app.json`; `logError.ts` already tags events. The remaining work is
  100% Sentry-dashboard + EAS-env, all founder-owned:
  1. Create a **React Native** project in org `celestia-ul`, suggested
     slug `stellaeum-mobile`. Bring back: the new **DSN** and the
     **project slug**.
  2. Set `EXPO_PUBLIC_SENTRY_DSN` = new DSN as an **EAS environment
     variable** (dashboard, visibility plain — it's a public DSN),
     scoped to development + preview + production. Also replace the value
     in `apps/mobile/.env.local` (currently holds the *web* project's
     Next.js-platform DSN — mobile events landing there are
     mis-platformed, no RN release health).
  3. **Not** adding an `env` block to `eas.json` — there is nothing to
     wire. `sentry.ts` already reads the right var and guards on it, the
     plugin is already in `app.json`, and Expo now recommends
     dashboard-managed env vars over `eas.json` `env` (dashboard values
     take precedence anyway). An empty placeholder in `eas.json` would
     just add a second place to look for one value, with no benefit. Set
     the DSN in the EAS dashboard only.
  4. Source-map upload is a **separate follow-up, not a blocker**: needs
     `SENTRY_ORG=celestia-ul` + `SENTRY_PROJECT=stellaeum-mobile` +
     `SENTRY_AUTH_TOKEN` in the EAS env. The existing `sntrys_…` token in
     `apps/web/.env.local` is org-scoped for `celestia-ul` and should
     cover a new project in the same org (INFERRED — not verified against
     the token's actual scopes). Without these the build still succeeds;
     stack traces are just minified.
  5. `apps/web/.env.local` has `SENTRY_PROJECT=javascript-nextjs` — after
     the split, rename that project to `stellaeum-web` (cosmetic) or
     leave it; web is unaffected by the mobile project.
  6. Vercel still needs `NEXT_PUBLIC_SENTRY_DSN` in its project env
     before its first deploy (build-time inlined).
- **#10, diary list unbounded — defensive ceiling only, explicitly not a
  fix.** `listDiaryEntries` capped at 2000 rows. Real fix (pagination,
  client fetch-more, findByDate on-miss) needs a UX decision (infinite
  scroll vs. month view vs. cutoff) that belongs with the diary screen's
  design — full shape written up in the sweep doc §11 for Batch 8.
- **#11, both crons unbounded/sequential.** Defensive `.limit()` on all
  three unbounded selects (push_subscriptions, push_tokens, cleanup's
  expired-users query). Real throughput fix where safe to make without
  new state: the web-push send loop switched from fully sequential to
  batched concurrency (25 at a time) — changes the bottleneck shape from
  "latency × subscriber count" to "latency × batches." cleanup-deleted-
  accounts stays sequential — the Clerk-before-users-row ordering needs
  per-user sequencing to reason about correctly.
- **#15, Reanimated worklet warning.** `NatalWheelFrame` wasn't wrapped in
  `memo()` the way its sibling `WheelStaticLayers` is — fixed (mechanical
  parity). Inferred mechanism per the sweep, not verified — **needs
  on-device confirmation on the next device pass** (no
  device/emulator available this session).
- **#16, VirtualizedList nesting.** `CitySearch`'s `FlatList` (nested in a
  `ScrollView` at both its mount sites) replaced with a plain
  `ScrollView` + `.map()` — the dropdown is a small, bounded list (API
  defaults to 20 results), the case FlatList was never suited for.
- **#18, PostgREST filter injection + unclamped limit in
  `cities/search`.** Both fixed: query sanitized to letters/digits/space/
  hyphen/apostrophe before reaching the `.or()` filter; `limit` clamped
  to `[1, 100]` with a NaN guard. Caught and fixed a real tooling bug
  along the way — an unpaired apostrophe in the sanitize regex desynced
  the copy-lock extractor's naive quote-matching, silently swallowing two
  unrelated strings later in the same file.
- **#19, empty crystal_listings/crystal_vendors — not code-fixable.**
  Confirmed still 0 rows each (re-checked 2026-08-26). This is a content/
  business-development gap (real vendor partnerships and product data),
  not a defect — no code change closes it. Founder-owned.
- **#20, rate_limit_buckets RLS.** Confirmed already applied by the
  founder directly (per the Tier 1 turn) — `relrowsecurity = true`,
  verified read-only 2026-08-26. Nothing to do.

Every code-level Tier 3 fix proven against pre-fix code (git-stashed,
confirmed fail, restored, confirmed pass) the same as Tiers 1–2, except
#15 (no automated test is possible — a React Native dev-console warning
and on-device frame rate, not something vitest's DOM-less environment can
observe) and #19/#20 (not code changes).

**Tier 3 remaining, per the founder's list order: none.** All eight items
(#10, #11, #12, #15, #16, #18, #19, #20) addressed to the extent each one
can be — three (#12's EAS/Vercel wiring, #19, and the orphan/capture-
migration items from Tier 2) are explicitly founder-owned next steps, not
open engineering work.

Still true, unaffected by Tier 1/2 code fixes — both are prepared
migrations awaiting founder action, not open findings:

- Web production build **passes locally** (exit 0), so the Vercel failure is
  environmental; ranked diagnostic order in §7.
- Section 3 (authorisation) came out clean — no untrusted client IDs, no
  missing ownership scoping, no unauthenticated path to authenticated data.
- Diary list and both crons are unbounded; the web push cron is sequential
  under a 300s cap (Tier 3, not yet scheduled). (§6.3–6.4)

## 0.6 PRODUCTION-BREAKING — `sweph` / `geo-tz` / `dictionary-bg` missing from the deployed function (found 2026-08-27)

**Status 2026-08-27 — CLOSED, verified against the confirmed-current
deployment in a clean post-skew session.**
- **`sweph` — CLOSED.** `POST /api/horoscope/generate` → **200** from a
  clean tab (Skew Protection off, deployment confirmed current). That
  route runs a full chart compute, so `sweph` is demonstrably loading in
  the Lambda. `/chart`, `/circle`, `/rhythm`, `/dashboard` all 200 too.
- **`geo-tz` — CLOSED.** Same request — `calculateNatalChart` resolves a
  timezone via `geo-tz` before it can return, and it returned 200.
- **The win32→linux `outputFileTracingIncludes` glob was honored by
  Vercel's Linux build — RESOLVED.** *Why it is resolved this time, and
  the retraction mattered:* the earlier "RESOLVED" rested on browser
  probes from an unknown (possibly skew-pinned) deployment — worthless as
  proof. This one rests on a **live authed compute request that succeeded
  against a deployment confirmed current in the dashboard.** `sweph` only
  loads if `prebuilds/linux-x64/sweph.node` is physically in the Lambda,
  and it only got there via the explicit glob. That is the distinction
  the retraction was about — same conclusion, real evidence.
- **`/connect/[token]` invalid-token → friendly page (not 500):**
  **CLOSED.** `GET /connect/test` in the clean session renders «Поканата
  не е активна». It was the `sweph` failure all along, not token
  validation. No separate work.
- **`dictionary-bg` chain — STILL BROKEN in production.** `POST
  /api/horoscope/generate` still 500s (fired from the Днес page — real
  user path, not a synthetic probe). `/api/oracle/generate` shares the
  import and is broken identically (not probed yet, but same chunk). Root
  cause is NOT file tracing — see the dedicated section below. Fix
  pending founder go-ahead on approach.

**The fix (one pass, all three packages):**
- `sweph` (`2.10.0-11`) and `geo-tz` (`^8.1.6`) added as **direct
  `apps/web` dependencies** (they were transitive via `@stellaeum/astrology`
  only). This is the root fix for cause (1)/(2) — `@vercel/nft` now
  resolves `require('sweph')` / `require('geo-tz')` from the app root
  through the pnpm symlink `apps/web/node_modules/{sweph,geo-tz}`.
- `next.config.js`: `outputFileTracingRoot` set explicitly to the
  monorepo root (Vercel auto-detection is unreliable in a pnpm
  workspace), plus `outputFileTracingIncludes` keyed on `/api/**/*` and
  `/connect/[token]/**/*` force-copying every runtime sidecar with
  **platform-independent globs** (`linux-*`, both the clean
  `node_modules/<pkg>` symlink path and the `.pnpm` store path):
  `sweph/prebuilds/linux-*/**` (+ `index.js`/`index.mjs`), `node-gyp-build/**`,
  `geo-tz/data/**` (the `*.geo.dat` files `find-1970.js` opens via
  `fs.openSync` — only the `require()`'d `*.index.json` traced
  automatically), `dictionary-bg/index.aff` + `index.dic` (loaded via
  `fs.readFile(new URL(..., import.meta.url))`), and the repo-root
  `scripts/i18n/bg-allowlist.txt` (`readFileSync(__dirname)` at module
  scope in `bg-speller.mjs`).
- `serverExternalPackages` + the webpack `externals` hook **kept as-is** —
  still correct not to bundle native code; the fix is purely additive.
- **Not done:** the root `.npmrc` `node-linker`/`public-hoist-pattern`
  option — the direct-dep + `outputFileTracingIncludes` approach made it
  unnecessary and it would have hoisting side-effects across the whole
  workspace.

**Local verification (trace-artifact inspection, not "build passed"):**
`next build` exit 0; then the per-route `.nft.json` files were read
directly. `api/chart/calculate/route`, `connect/[token]/page`,
`api/crystals/route`, `api/circle/**`, `api/oracle/generate/route`,
`api/horoscope/generate/route` all now list
`sweph/prebuilds/linux-x64/sweph.node` (+ `linux-arm64`),
`sweph/index.js` + `node-gyp-build`,
`geo-tz/data/timezones-1970.geojson.geo.dat` + `.index.json`,
`dictionary-bg/index.aff` + `index.dic`, and `bg-allowlist.txt`. Before
the fix nft did not resolve even `sweph/index.js` from these routes.
195/195 web tests, typecheck clean.

**Residual risk that only the deploy can close:** the local `.nft.json`
is generated on win32; the auto-traced binary it names is
`win32-x64/sweph.node`. The explicit `outputFileTracingIncludes` globs are
what guarantee `linux-x64/sweph.node` ships (confirmed present in the
local trace via those globs). Vercel's Linux build should resolve the same
literal relative globs — but this is exactly the "local build is not the
deploy" gap, so **the fix is not closed until the production probe below
passes.**

**Original diagnosis (kept for the record):**

The first production deploy was declared healthy (`/`, `/privacy`,
`/pricing` all 200; three API routes clean 401). One hour after Sentry
went live it caught `Error: Cannot find module 'sweph'` on
`GET /connect/[token]`. The Swiss Ephemeris native module is not present
in the Vercel serverless function. **Every route whose static import
graph reaches `@stellaeum/astrology`'s server entry 500s at module
evaluation.** Verified by probing production 2026-08-27:

| 500 (broken) | Loads OK |
|---|---|
| `/api/chart/calculate` | `/api/crystals/today` (200) |
| `/api/transits/overview` | `/api/crystals/daily-streak` (401) |
| `/api/crystals` (overview) | `/api/crystals/collect` (405) |
| `/api/circle/invites`, `/invites/accept`, `/relationships`, `/relationships/*`, `/profiles`, `/profiles/*` (9 of 10 circle route files) | `/api/crystals/daily/collect` (405) |
| `/connect/[token]` (the reported bug — this, not token validation) | `/api/cron/daily-horoscope` (401 — imports no astrology) |
| `/api/oracle/generate` (`dictionary-bg` chain, not sweph) | `/api/birth-data` (401 — confirm compute path separately) |
| `/api/horoscope/generate` (both chains — `dictionary-bg` at module load, dynamic `sweph` at generation) | |

**Root cause (three reinforcing):** (1) `sweph` + `geo-tz` are deps of
`packages/astrology`, **not** of `apps/web` — `@vercel/nft` traces from
the app, which never declares them. (2) pnpm isolated `node_modules`, no
root `.npmrc` hoisting — the packages sit under `.pnpm/` symlinked into
`packages/astrology/node_modules` only, and nft doesn't reliably cross
that symlink boundary from `apps/web`. (3) `serverExternalPackages` +
webpack `config.externals` (both in `next.config.js`) deliberately remove
them from the webpack graph so webpack's own tracing can't see them
either, and there is **no `outputFileTracingIncludes`** to force-copy the
package dirs or their native/asset sidecars (`sweph/*.node`,
`geo-tz/data/`, `dictionary-bg/*.dic|*.aff`, and the repo-root
`scripts/i18n/bg-allowlist.txt` that `bg-speller.mjs` reads at module
scope). `geo-tz` rides the same import as `sweph` (`calculator.ts` →
`./utils/timezone` → `geo-tz`) so its blast radius is identical; whether
it *also* fails to trace is masked by `sweph` throwing first. `next build`
locally resolves all of them through the pnpm symlink graph and proves
nothing about the Lambda — same "passes locally" gap as the original
Vercel deploy failure.

**Verification-surface finding:** logged as
`.planning/VERIFICATION-SURFACE-GAPS.md` #6 — the strongest instance yet.
Deliberate, real HTTP probes against real production all passed; they just
never touched a compute path. A 401 proves auth middleware ran, not that
the handler's module graph is intact.

**PRODUCTION PROBE TO RUN (founder, after this deploys) — the fix is not
closed until this passes:** one authed request per compute path. Signed
in, from the browser devtools console on `www.stellaeum.com` (cookies ride
along), or with a copied `__session` cookie via curl:
- `GET /api/chart/calculate?chartId=<own chart id>` → expect 200 with
  chart JSON (or a clean 404 `CHART_NOT_FOUND` for a bad id — **not** 500)
- `GET /api/transits/overview` → 200
- `GET /api/crystals` → 200 (premium) or 403 (free) — not 500
- `GET /api/circle/profiles` → 200 `[]` or list — not 500
- `POST /api/oracle/generate` with a real `{chartId, topic}` → streams —
  not 500
- `POST /api/horoscope/generate` → 200 — not 500
- `GET /connect/<any string>` while signed in → the friendly "Поканата не
  е активна" page, **not** 500
If any still 500, pull the Sentry event — the module name in
`Cannot find module 'X'` says which glob missed, and the fix is adding
that one path to `outputFileTracingIncludes`.

**Deploy smoke test — SCOPED, not built (owned item, see §6).** This bug
existed because nothing exercises a compute path after a deploy. Scope: a
script (`scripts/smoke/post-deploy.mjs`) that takes a base URL + a test
`__session` cookie (a dedicated seeded test user), fires the seven probes
above, asserts none return 5xx, exits non-zero on any failure. Wire it as
a Vercel **Deploy Hook** / post-deploy GitHub Action against the
production URL, and/or a manual `pnpm smoke:prod`. Not built now per the
halt; tracked so it is not forgotten.

---

## 0.8 `/api/horoscope/generate` 500 — DIAGNOSED AGAINST STALE EVIDENCE. No such bug. (2026-08-27)

**Status: RESOLVED — there was never a third failure.**

`POST /api/horoscope/generate` returns **200** from a clean tab with Skew
Protection off, against the confirmed-current deployment. It loads
`dictionary-bg` via `check-bg-output`, calls OpenRouter, and returns a
real reading. Alongside it, all 200 in the same clean pass: `/dashboard`,
`/chart`, `/circle`, `/rhythm`, `/you`, `/you/crystals`,
`/api/oracle/readings`.

**What actually happened:** the §0.6 (`sweph`/`geo-tz`) and §0.7
(allowlist) fixes both worked. Every probe run *after* them — for hours —
was routed by **Vercel Skew Protection** to a deployment pinned *before*
those fixes landed. The `SyntaxError` in the Runtime Logs was the
**pre-fix code running on a stale deployment** (`bg-speller.mjs`'s
`readFileSync` on the frozen Windows path, or an equivalent early throw),
not a live OpenRouter failure. There was no empty response body, no failing
provider call, no Cloudflare IP block. The whole "Q1/Q2/Q3" analysis below
reasoned correctly from the stack trace — **the stack trace was false
evidence.** The lesson is not "the analysis was wrong", it is "the
observation was". See VERIFICATION-SURFACE-GAPS #10.

**What was built while chasing the phantom, and what stays:**
- **`[OPENROUTER-DEBUG]` fetch shim** — **REMOVED** (same-day, once §0.8 proved a phantom). Built
  for a bug that does not exist; logged 2 KB of every AI response.
- **`isUpstreamAiError` + the 502 `AI_UPSTREAM_FAILED` classification +
  quota refund** on both AI routes — **KEPT.** Correct regardless: an
  upstream provider will return garbage eventually, and an opaque 500 that
  also burns a quota claim is a real defect whether or not it has fired.
  Proven-against-pre-fix test retained.
- **`Sentry.captureException` in `toErrorResponse`'s non-`ApiError`
  branch** — **KEPT.** Six routes being blind to their own 500s
  (VERIFICATION-SURFACE-GAPS #9) is a real gap independent of today.

Not a wasted session: one thing built for a phantom (removed), two built
for real problems the phantom happened to surface (kept).

---

**2026-08-28 follow-up — a bodiless-probe `SyntaxError`, the 4th thing on this route.**
The founder ran a bodiless `fetch()` at `POST /api/horoscope/generate` to
verify an unrelated fix. `await req.json()` on an empty body threw
`SyntaxError: Unexpected end of JSON input` (`route.ts:45`), which reached
`toErrorResponse` and — because §0.8 KEPT the `Sentry.captureException` in
that path — produced a **High-priority Sentry alert with nothing marking
it as self-generated**. Diagnosed from the stack: `undici.parseJSONFromBytes`
frames = it is parsing the *incoming request body*, not an AI response;
release 5a4a2c8, Brave/Windows. Confirmed the founder's own probe.

This is the **fourth distinct thing chased on this one route, and the
second that was never a real defect** (first: the §0.8 phantom above). The
route has been correct since §0.7 landed. What kept producing "errors" was
probing and skew, not the handler.

Two outcomes:
1. **Small real fix — DONE 2026-08-28.** A malformed/absent request body is
   a client error and should be a `400`, not an unhandled `500` that pages
   Sentry at High. Added `readJsonBody(req)` to `lib/auth/guards.ts`
   (`try req.json() / catch → throw ApiError(400, 'Невалидна заявка',
   'INVALID_BODY')`), applied to all 8 routes that called `req.json()`
   unguarded (`horoscope/generate`, `oracle/generate`, `circle/invites`,
   `circle/invites/accept`, `circle/profiles`, `push/{subscribe,register,
   unsubscribe}`). The `ApiError` lands in `toErrorResponse`'s structured
   branch — no `Sentry.captureException`. Left deliberately alone:
   `stripe/cancel` (missing body is *intentionally optional* there — it
   reads `body?.reason`); `crystals/collect` + the two `circle/*/report`
   routes (already `.catch(() => …)`); `stripe/checkout` (already wrapped).
2. **Deferred, pre-launch — probe traffic must be identifiable at the
   monitor.** This alert was indistinguishable from a real user hitting a
   broken endpoint. Fine now (founder is the only traffic), a triage
   problem once there are real users. Belongs in the post-deploy smoke
   test's scoping (PRE_LAUNCH_PREREQS item 2), which will generate exactly
   this shape on every deploy. Tracked as VERIFICATION-SURFACE-GAPS **#11**.

---

**PRESERVED BELOW — the original diagnosis. Sound reasoning; the evidence
it reasoned from was a stale-deployment stack trace. Kept as the record of
how a false observation produced a confident wrong conclusion.**

**The stack (Vercel Runtime Logs, not Sentry):**
```
POST /api/horoscope/generate → 500, 1.66s
Failed to generate horoscope. SyntaxError: Unexpected end of JSON input
  at JSON.parse (<anonymous>)
  at async u (.next/server/app/api/horoscope/generate/route.js:34:689)
  at async (.next/server/chunks/1349.js:41:7566)
```

**Q1 — what is being `JSON.parse`'d:** the OpenRouter HTTP response,
**inside the `ai` SDK**, not our code. Verified: `chunks/1349.js` contains
the `ai` package (`streamText`/`generateText`/`ai-sdk` markers). The route
never calls `JSON.parse` directly — its only JSON parse is `await
req.json()` at `route.ts:45`, and the Днес client
(`hooks/useDailyHoroscope.ts:52`) always sends a valid
`JSON.stringify({ chartId })` body, so that path is fine. The failing
parse is `@ai-sdk/openai`'s response handler doing `JSON.parse('')` on an
**empty body** returned by OpenRouter during `await generateText(...)`
(`route.ts:312`). `JSON.parse('')` is exactly "Unexpected end of JSON
input".

**Q1 corollary — the 1.66s and the missing OpenRouter entry:** a 70B
non-streaming generation takes 5–30s; **1.66s means OpenRouter rejected
the request almost immediately** (auth/edge rejection, not a generation).
`assertRateLimit` (`route.ts:38`) hits Supabase *before* the AI call —
that is why Supabase shows in the invocation's External APIs list. The
OpenRouter fetch **did** happen (a fully-absent key would throw
`LoadAPIKeyError` before any fetch — see Q2 — and we got a `SyntaxError`
instead); Vercel's External-APIs panel just doesn't reliably surface a
fetch that was rejected fast / returned non-2xx. "Not in the panel" ≠ "no
request made".

**Q2 — is `OPENROUTER_API_KEY` in Vercel Production *runtime* env
(FOUNDER TO CHECK):** it is in `turbo.json` `build.env` (build-time only,
same distinction as `SENTRY_DSN`). `lib/ai/client.ts` reads
`process.env.OPENROUTER_API_KEY` **at module scope** and passes it to
`createOpenAI({ apiKey })`. Verified against `@ai-sdk/provider-utils@4.0.15`
`loadApiKey`:
- key **absent / `undefined`** → `loadApiKey` throws
  `LoadAPIKeyError: OpenAI API key is missing…`. That is a *different*
  error than what we see, so the key is **not simply missing**.
- key **`""` (empty string)** → `typeof "" === "string"` → returned
  as-is, **no emptiness check** → request goes out with
  `Authorization: Bearer ` (blank) → OpenRouter / its Cloudflare front
  rejects fast with an empty or HTML body → `JSON.parse('')` →
  `SyntaxError`. **This is the shape that matches.**
- key present but **invalid/revoked** → OpenRouter normally returns a
  *JSON* 401 → `@ai-sdk/openai` throws `APICallError`, not `SyntaxError`
  (unless a Cloudflare challenge served non-JSON).
- **What to check:** not "is it set" but "is the value a real, non-empty
  OpenRouter key" (prefix `sk-or-v1-`). An empty string or placeholder in
  the Production env explains the whole thing.
- Note: `/api/horoscope/generate` has **never completed a successful run
  in production** — production is 1 day old and was broken by §0.6 then
  §0.7 the entire time. The AI call has never actually executed in prod.
  So this is a latent config/resilience gap surfacing now, not a
  regression.

**Q3 — why an unhandled 500 instead of a handled error (two defects):**
1. `route.ts:319–322` catches the `generateText` error, runs
   `releaseClaimOnFailure()`, then **`throw err`** to the outer catch
   (`route.ts:397`), which calls `toErrorResponse(error, 'Failed to
   generate horoscope.')`. `toErrorResponse` (`lib/auth/guards.ts:20`)
   only builds a structured response for `ApiError`; **anything else →
   bare `500` + generic message + `console.error`**. A provider returning
   an empty body is a *foreseeable* upstream failure that should be a
   `502/503` with a retry hint, not an unhandled `500`.
2. The founder's point: **`generateText` is called with zero resilience** —
   no retry, no timeout-to-friendly-error, no catch that separates
   "provider returned garbage" from "our code threw". And the SDK itself
   `JSON.parse`s the provider response with no empty-body guard (not our
   line, but our exposure). Every failure here also burns → refunds a
   quota claim and an INSERT/delete on `daily_horoscopes`.

**Why Sentry had nothing (structural, not a misconfig) — see
VERIFICATION-SURFACE-GAPS #9:** `toErrorResponse` **catches** the error
and **returns** a `Response.json(500)`. A returned Response is a normal
return, not a thrown error, so Next's `onRequestError` /
`Sentry.captureRequestError` **never fires**. Only the `console.error`
inside `toErrorResponse` reaches anything — and that goes to Vercel logs,
not Sentry (the server config has no `console` integration). **All 6
routes using `toErrorResponse` are Sentry-blind for any non-`ApiError`
500.** So "no Sentry event for this release" is expected and is not
evidence server-side Sentry is broken — though whether `SENTRY_DSN` is in
the Production runtime env is still worth confirming (§0.7).

**KEY CONFIRMED PRESENT + WELL-FORMED 2026-08-27** (`sk-or-v1-b62c…`, 73
chars, correct prefix; founder rotating it anyway — it was screenshot-
exposed and set as Config not Secret, neither of which is the cause). So
the empty-string theory is dead. Next step is the raw OpenRouter response
body, not more inference.

**SHIPPED alongside the diagnosis (`4f751d2`) — the shim + the two
hardening items, all correct regardless of what the body turns out to
be:**
1. **`[OPENROUTER-DEBUG]` fetch shim** in `lib/ai/client.ts` — a custom
   `fetch` passed to `createOpenAI` that `console.error`s the outgoing
   `model=` plus the response `status` / `content-type` / first 2 KB of
   body, via `res.clone()` so the SDK still gets an intact stream. Dated,
   loud prefix, explicit REMOVAL note (delete the block + the
   `fetch: debugFetch` line). **Confirmed present in the built server
   bundle** (`chunks/4585.js`), so it will log in production. `AI_MODEL`
   is a hardcoded constant (`meta-llama/llama-3.3-70b-instruct`) — not
   env-configurable — confirmed inlined in the build; the shim logs the
   actual outgoing value too.
2. **Upstream-vs-ours error classification** — `isUpstreamAiError(err)` in
   `lib/ai/client.ts` (raw `SyntaxError` → true; fetch/network
   `TypeError` → true; `ai` SDK `APICallError`/`RetryError` by name →
   true; `LoadAPIKeyError` deliberately **false** — a blank key is our
   bug, "retry shortly" would be a lie). Both `horoscope/generate` and
   `oracle/generate` `jsonOnly` catch blocks now: refund the quota claim,
   then if `isUpstreamAiError` → `ApiError(502, RETRY_LATER_MESSAGE,
   'AI_UPSTREAM_FAILED')` (reuses `lib/rate-limit.ts`'s already-reviewed
   retry copy, now exported as `RETRY_LATER_MESSAGE` — net-zero new
   Cyrillic literals, baseline unchanged at 1772); anything else still
   500s. Oracle also nulls `claimedPeriodStart` in that branch so the
   outer catch can't double-refund.
3. **`Sentry.captureException` in `toErrorResponse`'s non-`ApiError`
   branch** (`lib/auth/guards.ts`) — closes the VERIFICATION-SURFACE-GAPS
   #9 blind spot for all 6 routes that use the helper. `ApiError` (the
   deliberate 4xx/5xx path, incl. the new 502) is NOT captured.
4. **Tests (206 total, +11):**
   - `test/ai/upstream-error.test.ts` — `isUpstreamAiError` truth table.
   - `test/auth/to-error-response.test.ts` — proves `captureException`
     fires for a non-`ApiError` 500 and does NOT for an `ApiError` (the
     "verify with a deliberate error" the founder asked for).
   - `test/horoscope/generate-upstream-failure.test.ts` — an SDK
     `SyntaxError` now yields **502 `AI_UPSTREAM_FAILED`** (not an opaque
     500) **and** `decrementQuotaUsage` fires (refund proven, not
     assumed); a non-upstream `TypeError` still 500s. **Proven against
     pre-hardening `route.ts`: the 502 assertion failed with `expected
     500 to be 502` before the fix was restored.**

**2026-08-27 — the `4f751d2` probe came back 500 with the IDENTICAL stack
(`route.js:34`, `chunks/1349.js:41:7566`) and NO `[OPENROUTER-DEBUG]`
line. If `4f751d2` were serving it, the shim would have logged and the
502 classification would have fired. Neither did → the request is not
being served by `4f751d2`.**

**Cause: Vercel Skew Protection is ENABLED (verified — production HTML
contains `?dpl=dpl_JChvkyHkhdYi1yT4gXybCDWcS6ry`).** With skew protection
on, a browser is pinned for the configured window (the founder saw 12h in
settings) to whatever deployment served its HTML — every `fetch()` from
that tab, including the Днес page's call to `/api/horoscope/generate`,
carries `?dpl=<old>` and is routed to the OLD deployment's functions. The
founder's tab was loaded before the recent deploys, so **every probe run
from it today may have hit stale functions** — which puts an asterisk on
the "sweph/geo-tz verified in prod" probe results too (those were still
independently confirmed by reading the local `.nft.json` trace artifacts,
so the *code* fixes stand; what is uncertain is which deployment prod is
actually serving the founder's browser).

**To force the current deployment** (do these before trusting any further
probe):
1. **Confirm which commit is current Production.** Vercel → Deployments →
   the Ready one → its git commit. Confirm it is `49b79ea` / includes
   `4f751d2`. A docs-only commit on top (`5a4a2c8`, `49b79ea`) still
   triggers a full rebuild, so it *should* — but confirm, don't assume.
2. **Hit the deployment's own URL directly.** Each deployment has a unique
   `*.vercel.app` URL (shown on its dashboard page). A request straight to
   that URL bypasses skew routing entirely — it targets that deployment's
   functions. Probe there.
3. **Browser: fully close every `stellaeum.com` tab, then open a fresh
   one (or a clean Incognito window).** A plain reload may keep the pin;
   a fresh document load fetches the current `?dpl`. Then re-probe.
4. **A fresh `curl` already hits latest** (no prior `dpl`), but the AI
   path needs a real `__session` cookie + a JSON body with `chartId` —
   without a body, `req.json()` at `route.ts:45` throws its own
   `SyntaxError` (empty-body) which the hardening does NOT wrap, so a
   bodiless curl 500s on every build and tells you nothing.
5. **Recommendation: turn Skew Protection OFF for the rest of pre-launch.**
   Its value is protecting real users mid-session during a deploy; with
   the founder as the only "user" and actively debugging, it only serves
   stale functions and corrupts every probe. Re-enable before launch.

The route change (`4f751d2`) is verified correct locally — build, the
compiled bundle carrying `[OPENROUTER-DEBUG]`, +11 tests, 502-proven-
against-pre-fix. What is unverified is that production is *running* it.

---

## 0.7 `bg-allowlist.txt` read fails in production — webpack freezes `import.meta.url` at build time (found 2026-08-27, part of §0.6)

**Status: FIX APPLIED + verified locally 2026-08-27 (`<this commit>`).
AWAITING PRODUCTION PROBE — re-run `POST /api/horoscope/generate` and
`POST /api/oracle/generate` on the deploy; both must stop 500ing.**

**What shipped:**
- `scripts/i18n/bg-allowlist.txt` (276 unique entries) → converted to
  `scripts/i18n/bg-allowlist.data.mjs` (`export const BG_ALLOWLIST = [...]`),
  provenance comments preserved. **Verified: the parsed Set is byte-for-byte
  identical to the old `loadAllowlist()` output — 276 words, zero
  duplicates, `in-txt-not-mjs: []`, `in-mjs-not-txt: []` (content compared,
  not just size).**
- `bg-speller.mjs` now `import { BG_ALLOWLIST }` + `new Set(BG_ALLOWLIST)`;
  the `readFileSync` + `dirname`/`resolve`/`fileURLToPath` imports removed.
- `next.config.js`: the now-dead `bg-allowlist.txt` entry removed from
  `outputFileTracingIncludes` (sweph/geo-tz/dictionary-bg globs stay).
- Docs updated: `scripts/i18n/README.md`, this file.
- **Grep sweep for the same shape — see the dedicated finding below. One
  broken instance (this one), zero others, one same-shape-but-shimmed
  pattern noted.**

**Verified locally:** `next build` exit 0; the compiled chunk
`4585.js` no longer contains `bg-allowlist` or the frozen
`file:///C:/Users/...` path, and `BG_ALLOWLIST` / `Асцендент` are now
inlined as bundled data; the `.nft.json` for `oracle/generate` +
`horoscope/generate` no longer references `scripts/` or `bg-allowlist.txt`;
`check:bg-strings` PASS (the CI consumer, same allowlist behaviour);
195/195 web tests; typecheck clean; bg-lint-baseline + error-code checks
PASS.

**PRODUCTION CONFIRMATION IS BLOCKED ON GETTING THE CURRENT ERROR
(2026-08-27).** The two Sentry events pulled so far are both release
`2df6aeb71509…` — a build that **predates every fix in this section**
(`c9dc9c1`, `e64ef9f`, `8031ee5` all come after `2df6aeb`). They are the
*original* errors (`Cannot find module 'sweph'` on `/connect/[token]`;
ENOENT in `bg-speller.mjs:26` `loadAllowlist` — code deleted in
`8031ee5`), not the current one. The founder's fresh 500 repro was on
Vercel deploy `dpl_EvjecA4vGGHgqBm7QZvDiYp8fzTe`; we do not yet know which
commit that deploy built, nor whether a current-release event exists.

**Sentry `release` = the full git commit SHA** (verified: `withSentryConfig`
in `next.config.js` sets no explicit `release`, so `@sentry/nextjs`
auto-detects the build SHA; the stale events prove the format). Current
fix SHAs to filter by:
- `e64ef9fdbc16c40dfcb70e58b0d4f9961cc4c333` (sweph/geo-tz fix)
- `8031ee56bcff7a8902c579ef3528320a8bf770bb` (allowlist fix — current HEAD)
- Sentry UI truncates to 12: `e64ef9fdbc16`, `8031ee56bcff`.

**Un-verified gap this exposed:** server-side Sentry (`SENTRY_DSN`,
unprefixed, read at runtime by `sentry.server.config.ts`) has **never
been confirmed live in production**. §5's "web browser Sentry verified
live" was about `NEXT_PUBLIC_SENTRY_DSN` (a different var, inlined in the
client bundle). `SENTRY_DSN` is in `turbo.json` `build.env` (build-time
only — that does NOT put it in the Lambda runtime env); it must also be
set in Vercel → Project Settings → Environment Variables → Production for
`Sentry.init` to be anything but a no-op in the function. If it is
missing, **no API-route 500 has ever reached Sentry** and the "stale
events" are simply the last ones the *client* SDK managed to send.
`instrumentation.ts` correctly exports
`onRequestError = Sentry.captureRequestError`, so the wiring is right —
the question is purely whether the runtime DSN is set.

**Capture routes if the current release has no Sentry event** (see the
report for the full walkthrough): (1) confirm `SENTRY_DSN` in Vercel
Production runtime env; (2) **Vercel Runtime Logs** for deploy
`dpl_EvjecA4v…`, path `/api/horoscope/generate` — a module-eval throw
(`const ALLOWLIST = loadAllowlist()` at top level) can fault *before* the
request handler and surface as a raw Vercel `FUNCTION_INVOCATION_FAILED` /
`500` that `onRequestError` never sees, but Vercel's runtime always logs
it. The generic `filename="500"`, `Content-Length: 2303` page the earlier
probes returned is consistent with a Vercel-level 500, not a
Next-rendered error.

**No further fix until the current error is in hand. Two failed attempts
already — sweph fix (real, verified) then allowlist fix (real, unverified
in prod). The third must be driven by the actual current stack trace, not
by another inference.**

**UPDATE 2026-08-27: current stack trace obtained from Vercel Runtime
Logs. §0.6 (sweph/geo-tz) and §0.7 (allowlist) are BOTH confirmed working
— the route now loads and runs. The third failure is diagnosed in §0.8
below: `generateText` receives an empty body from OpenRouter, the `ai` SDK
does `JSON.parse('')`, `SyntaxError` propagates to an unhandled 500.
Leading cause: `OPENROUTER_API_KEY` in Vercel Production runtime env is
blank/empty (a fully-missing key throws a distinct `LoadAPIKeyError`
instead). Founder to check the value before any fix.**

---

**Original diagnosis:**

`POST /api/horoscope/generate` and `POST /api/oracle/generate` 500 at
module evaluation. Both statically import `@/lib/ai/check-bg-output` →
`scripts/i18n/bg-speller.mjs`, which is **bundled** by webpack (it is not
in `serverExternalPackages` — only `dictionary-bg` is). `bg-speller.mjs`
computes its allowlist path as
`resolve(dirname(fileURLToPath(import.meta.url)), 'bg-allowlist.txt')` at
module scope.

**The smoking gun — `apps/web/.next/server/chunks/4585.js` contains
literally:**

```
(0,g.fileURLToPath)("file:///C:/Users/ntone/Desktop/sub-project/scripts/i18n/bg-speller.mjs")
```

Webpack replaced `import.meta.url` with a **hard-coded absolute `file://`
URL of the build machine**. At runtime the code does
`readFileSync("C:/Users/ntone/Desktop/sub-project/scripts/i18n/bg-allowlist.txt")`
→ ENOENT on Vercel's Linux filesystem. `outputFileTracingIncludes` copied
`bg-allowlist.txt` into the function correctly — but the code never looks
there; it looks at the frozen Windows path. **On Vercel's own Linux build
the frozen path would be `/vercel/path0/...` (the build workspace), which
also does not exist in the Lambda runtime (`/var/task/...`) — so this
fails regardless of build OS. Tracing cannot fix it.** This is a *third*
mechanism, distinct from the two "fragile asset" cases named in §0.6
(missing-file and `new URL(import.meta.url)` resolution) — here the file
is present and the resolution logic is sound; webpack's build-time
`import.meta.url` inlining is what breaks it.

**Why `dictionary-bg` (same file, same chain) is NOT broken:** it is in
`serverExternalPackages`, so webpack does **not** bundle it — its own
`index.js` runs un-transformed from `node_modules/dictionary-bg/` in the
Lambda, its `new URL('index.aff', import.meta.url)` resolves against the
real file location, and the `outputFileTracingIncludes` glob put
`index.aff`/`index.dic` right next to it. The externalization that made it
*look* fragile is what protects it. `bg-speller.mjs` gets bundled;
`dictionary-bg` doesn't — that asymmetry is the whole story.

**Sentry confirmation (for the founder, independent of the above):**
sentry.io → org `celestia-ul` → project `javascript-nextjs` → Issues →
filter `is:unresolved`, look for the `/api/horoscope/generate` issue.
Open it → latest event → the exception should be `ENOENT: no such file or
directory, open '.../bg-allowlist.txt'` with the path in the message. If
the path starts `C:\Users\ntone\...` that is the frozen-build-path
mechanism above, confirmed. (Could not pull programmatically — the
`SENTRY_AUTH_TOKEN` in `.env.local` is a `sntrys_` source-map-upload
token with no `event:read` scope. See §6 "Sentry read token".)

**Fix (APPLIED) — eliminated the runtime file read:**
`scripts/i18n/bg-allowlist.txt` → `scripts/i18n/bg-allowlist.data.mjs`
(`export const BG_ALLOWLIST = [ ... ]`, provenance comments kept);
`bg-speller.mjs` does `import { BG_ALLOWLIST }` + `new Set(BG_ALLOWLIST)`,
with the `readFileSync`/`dirname`/`resolve`/`fileURLToPath` imports
removed. Webpack bundles it as data — no `fs`, no `import.meta.url`, no
tracing dependency; works identically under `node` (CI: `check:bg-strings`
PASS) and under webpack (runtime). The dead `bg-allowlist.txt` glob is
gone from `next.config.js` (`dictionary-bg` / `sweph` / `geo-tz` globs
stay). `scripts/i18n/README.md` updated; `STAGE5_PREVENTION.md` left as
the historical record it is. This also answers the founder's design
question: **yes — the allowlist belongs with the code that reads it, as
code. The coupling (a production route reading a file from `scripts/i18n/`
— a tooling directory — at module scope) was the defect; tracing was
always the wrong lever.**

---

## 0.9 Re-verify list — today's "confirmed in production" claims audited against skew (2026-08-27)

Skew Protection was on all day (§0.8). Every probe run from the founder's
long-lived browser tab may have hit a stale deployment, not the latest.
Splitting today's production claims by **how** they were verified:

### STANDS — verified by reading an artifact or a fresh `curl` (no pinned-tab dependency)

- **`sweph` / `geo-tz` / `dictionary-bg` assets are traced into the
  function** — read from the per-route `.nft.json` in the local build
  (`sweph/prebuilds/linux-x64/sweph.node`, `geo-tz/data/*.geo.dat`,
  `dictionary-bg/index.{aff,dic}` all listed). Local artifact. The *code*
  fix is sound.
- **Allowlist fix** — compiled `chunks/4585.js` no longer contains the
  frozen `file:///C:/…` path; `BG_ALLOWLIST` inlined; `.nft.json` for the
  AI routes no longer references `scripts/`. Local artifact.
- **`/`, `/privacy`, `/pricing` return 200** — re-hit with a fresh `curl`
  this session (fresh curl sends no `dpl`, so it reaches latest).
- **Vercel deployment reached "Ready" / Production** — dashboard state,
  not a probe.
- **Web browser Sentry SDK is inlined in the production bundle** —
  re-verified 2026-08-27 with a **fresh curl**: prod HTML carries
  `sentry-trace` + `baggage` meta tags; `main-app-50f12ad7….js` contains
  a real DSN (`o4511290988429312.ingest…sentry.io/4511290989805648`).
  (Whether events actually *leave the founder's browser* is still
  unverified — ad blocker, VSG #8 — but that was never the claim.)
- **Skew Protection is enabled** — prod HTML contains `?dpl=dpl_…` on
  fresh curl.
- **The `4f751d2` hardening** (502 classification, shim, +11 tests) —
  local build + tests + proven-against-pre-fix. Never claimed verified in
  prod.

### VERIFIED POST-SKEW — all six re-run in one clean pass 2026-08-27

Skew Protection disabled, fresh tab, deployment confirmed current. All
`www.stellaeum.com`, all 200 unless noted:

| # | Claim | Result |
|---|---|---|
| 1 | `sweph` loads at runtime in the current function | ✅ `POST /api/horoscope/generate` → 200 (full chart compute) |
| 2 | `geo-tz` loads at runtime | ✅ same request — `calculateNatalChart` resolves a tz via `geo-tz` before returning |
| 3 | win32→linux `outputFileTracingIncludes` glob honored by Vercel's Linux build | ✅ by implication — `sweph` only loads if `prebuilds/linux-x64/sweph.node` is physically in the Lambda, and it only got there via the glob. **Evidence this time: a live authed compute request that succeeded against a confirmed-current deployment — not a probe from an unknown one.** That distinction is the whole point of the earlier retraction. |
| 4 | `/connect/[token]` invalid token → friendly page, not 500 | ✅ `GET /connect/test` renders «Поканата не е активна» |
| 5 | API compute routes load | ✅ `/chart`, `/circle`, `/rhythm`, `/dashboard`, `/you`, `/you/crystals`, `/api/oracle/readings` all 200 |
| 6 | `/api/horoscope/generate` on current code | ✅ 200 — loads `sweph` + `geo-tz` + `dictionary-bg`, calls OpenRouter, returns a real reading. **This single result closed 1, 2, 5, 6 and (by implication) 3.** |

**§0.8's "third failure" was a phantom** — the `SyntaxError` in the logs
was pre-fix code on a skew-pinned stale deployment. See §0.8.

**Still only artifact-verified, not exercised in prod** (not on the list
above because they were never *claimed* prod-verified — recorded here so
the boundary stays honest):
- Server-side Sentry (`SENTRY_DSN`) actually capturing in the Lambda —
  §0.7 note. `instrumentation.ts` wiring is correct; whether the runtime
  DSN is set and events arrive is unconfirmed. A deliberate thrown error
  in a route would confirm it.
- `/api/oracle/generate` end-to-end (the streaming path) — only
  `/api/oracle/readings` (the GET) was in the clean pass.
- The premium free-state CTA and `/support` page rendering correctly —
  founder was going to probe these; add the result when run.

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
  scoped gap. **CORRECTED 2026-08-26:** the long-standing
  `crystal_recommendations` "RLS disabled in production" entry was WRONG —
  a direct `pg_class`/`pg_policy` query confirms RLS is enabled with
  `crystal_recommendations_owner_all` present. Nothing to run. The one real
  RLS divergence is `rate_limit_buckets` (RLS off; the enable migration
  `20260803133000` was never applied). See
  `.planning/TECHNICAL-SWEEP-2026-08-26.md` §1.2–1.3.
- **Mobile (Expo, v1.0 launch track): most of parity phase shipped.** Днес,
  Карта (with a just-fixed tap-select perf issue), Ритъм + lunar diary, most
  of Ти (crystals, recommendations, guide, GDPR settings), RevenueCat SDK +
  Clerk-identity sync all live. Кръг is functionally complete on mobile as
  of 2026-08-14 (Crush/saved-profiles + Connections/invites/reports/
  weather, Batch 4 both sub-batches), device-tested and passed 2026-08-26; two
  check-then-act races found and fixed during the port (invite-accept,
  report-version conflicts — see Batch 4's own sections). Кръг has NOT
  had a design pass — screens match web's structure, not Днес/Карта's
  design language; redesign pass is Batch 8. `/you/premium` subscription
  status/management (Batch 5) is now built and device-tested 2026-08-26 — the
  free-state branch's "subscribe on web" CTA is functional but its target
  URL is an unfilled placeholder blocked on the founder's Vercel fix, see
  halt-required register. **Not yet built on mobile:** the RevenueCat
  paywall/purchase flow (native purchase UI — halt-required) and the
  push-notification permission/settings UI (Batch 8) — the push *backend*
  (schema, registration route, cron delivery) is fully built and wired,
  corrected 2026-08-16, was understated here. Amber→bronze is done
  (Batch 6, 2026-08-16). This whole bullet is otherwise dated — see
  Batches 6/7/8 sections below for current state, not this paragraph.
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

**Standing rules, established during batching (apply going forward, not
just to the batch that produced them):**
- **When a design-token source doc (`WARM_COOL_AMENDMENT.md`, etc.) and
  the committed mockups (`.planning/design/mockups/*.html`) disagree on a
  color value, the mockups win.** They're the actual built reference; a
  planning doc's number can go stale (or, per Batch 6, be provisional —
  its own text called it a "candidate value" and never confirmed). The
  divergence itself is a finding to report explicitly, not something to
  silently reconcile — the founder needs to know a value changed on
  already-approved components, not just that it's now "correct."
  (Established: Batch 6's `bronzeText` correction, `#e0b587`→`#d9a06a`.)
- **Estimation calibration: counts derived from a planning doc, not a
  fresh grep, run low, consistently.** Three instances this session —
  Batch 2's 6.2 (a web behavior that never existed), Batch 4/4B's Кръг
  premise going stale underneath the port, and Batch 6's file count (48
  claimed vs. 52 actual, plus a literal-hex-stray count of "2" vs. the
  actual ~28, since a classname grep structurally can't find those).
  Scope every batch against a fresh grep of the current codebase, not a
  prior scoping doc's number, even a recent one.

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
- REVISIT-64 — **PARTIALLY FIXED 2026-08-26 (Tier 3 #12).** Root cause was
  the var-name swap: `apps/mobile/.env.local` had `NEXT_PUBLIC_SENTRY_DSN`
  (mobile's `lib/monitoring/sentry.ts` reads `EXPO_PUBLIC_SENTRY_DSN`, so
  `dsn` was undefined and `Sentry.init` never ran) while
  `apps/web/.env.local` had the mirror-image `EXPO_PUBLIC_SENTRY_DSN`
  (web's `instrumentation-client.ts` reads `NEXT_PUBLIC_SENTRY_DSN`) —
  browser-side Sentry was dead in both apps; only web *server*-side worked.
  The 2026-08-26 device pass ran with no crash reporting attached. See
  `.planning/TECHNICAL-SWEEP-2026-08-26.md` §2.2.
  **Fixed: both local `.env.local` files now have the correct var name**
  (both gitignored, so this is dev-only — verified `git status` shows
  nothing to commit). **Still open, founder-owned:**
  1. Both apps currently point at the SAME Sentry project/DSN — issue
     streams will merge until a dedicated mobile project is created in the
     dashboard and its DSN swapped in.
  2. `apps/mobile/eas.json` has no Sentry var at all (grepped — zero
     hits), so production EAS builds have never had a DSN of any kind;
     `EXPO_PUBLIC_SENTRY_DSN` needs to be added as an EAS secret/env var
     (`preview` and `development` profiles at minimum) before this fix
     reaches a real device build, not just local dev.
  3. Vercel needs `NEXT_PUBLIC_SENTRY_DSN` set in its project env once it
     deploys — it's build-time inlined, so it must exist before the first
     successful build, not added after.
- RevenueCat placeholder key, and the `EXPO_PUBLIC_API_BASE` mismatch
  (192.168.1.4 vs the cleartext-whitelisted 10.0.2.2) — founder is applying
  these directly, not Claude-Code work.

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
- **DEVICE-TESTED AND PASSED (2026-08-26).** Founder ran the real Android
  build; this batch verified working. The prior "not device-tested" caveat
  is retired. See `.planning/TECHNICAL-SWEEP-2026-08-26.md` §0.

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
- **DEVICE-TESTED AND PASSED (2026-08-26).** Founder ran the real Android
  build; this batch verified working. The prior "not device-tested" caveat
  is retired. See `.planning/TECHNICAL-SWEEP-2026-08-26.md` §0.

**Batch 4 status: done, both sub-batches shipped.** Кръг redesign pass
(promised in Batch 4's original ruling) stays scoped into Batch 8, after
Batch 5.5's Circle backend security review per the sequencing above.

---

### Batch 5.5 — Backend security sweep, all routes (2026-08-14)

**Status: in progress. Tier 1 done, Tier 2 done, Tier 3 done (two items
recorded-not-fixed with specific refactors, see below), Migration A
declined, Migration C resolved (application-only, no migration).
Migration B code done — SQL below, waiting on founder to run and confirm.**

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
  limit, doing real Swiss Ephemeris compute, and no caller anywhere in
  `apps/web` or `apps/mobile` (grepped exhaustively — its own doc comment
  claiming the web celestial-background animation consumes it is stale,
  `CelestialBackground.tsx` never fetches it). First fix (`0ab401c`)
  added IP-keyed rate limiting; founder correction — dead public code
  that runs real compute on every GET is attack surface with no user,
  rate-limiting it was hardening unreachable-in-practice risk instead of
  removing it. **Deleted entirely** (route, the underlying
  `getCurrentPlanets` core function, its `packages/core` export, the
  rate-limit-surface test entry) — rewrite from scratch if a future
  widget genuinely needs it. Fix: `2f828bc`.
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
  report) — checked, **not fixed, specific refactor recorded so this
  doesn't quietly become permanent:** `collectDailyCrystal`
  (`packages/core/src/crystals/daily-collect.ts`) pre-reads whether
  today's row exists BEFORE calling `getCrystalOfTheDay`, which does its
  own insert-or-noop. A concurrent racer can insert between that read and
  `getCrystalOfTheDay`'s own insert, so this function's `alreadyCollected`
  can be wrong (false when it should be true) even though DB state stays
  correct. Real fix: change `getCrystalOfTheDay`'s internal auto-collect
  insert (`packages/core/src/crystals/today.ts` lines ~92-103) to return
  whether ITS OWN insert attempt hit `23505` (already existed) vs.
  actually created a new row — that's the only place the true signal
  exists — and thread that boolean back out through
  `GetCrystalOfTheDayOptions`/the response shape (additive, so other
  callers of `getCrystalOfTheDay` — dashboard, `/you/crystals`,
  `/api/crystals/today` — aren't affected) instead of `daily-collect.ts`
  doing its own separate, race-prone pre-check.
- **#8** (`crystals/today` GET-mutates-state) — **not fixed, specific
  refactor recorded:** `getCrystalOfTheDay` (`today.ts`) performs an
  INSERT into `user_daily_crystals` as a side effect of every
  authenticated GET via `GET /api/crystals/today`, `GET
  /api/crystals/daily-streak`, and the dashboard/`/you/crystals` Server
  Component callers. Real fix is a verb split: extract the auto-collect
  insert (today.ts lines ~88-103) into its own explicit write path — a
  POST/mutation the client calls once per session (e.g. on first
  dashboard mount) — and make `getCrystalOfTheDay` a pure read that
  reports `collectedToday` without also causing it. Touches every call
  site listed above, not just the route handler, which is why this
  wasn't cheap enough for this batch. Impact stays low in the meantime
  (idempotent, no extra reward, same unique constraint as #17/#18
  absorbs any race).
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
- **C (`webhooks/stripe` idempotency) — RESOLVED, application-only fix,
  no migration.** Whether `processed_webhook_events.stripe_event_id` had
  a live unique constraint could not be verified from the repo (no
  tracked `CREATE TABLE` for this table — same "predates migration
  tracking" situation `connection_spaces` was in before its 2026-08-03
  capture migration) or from any local tool (Docker unavailable for local
  Supabase, no `pg` client installed). Founder ran the query directly
  against production: `processed_webhook_events_stripe_event_id_unique`
  — `UNIQUE (stripe_event_id)` — is live. No migration needed; fixed by
  mirroring the RevenueCat webhook's already-correct insert-first
  pattern (insert the marker before any processing, 23505 = duplicate,
  return 200 with no handler call; roll back via delete on a genuine
  processing failure). Fix: `427415b`.

**`processed_webhook_events` CREATE TABLE gap — already tracked,
cross-referenced here so it isn't rediscovered as new.** This table has
a live production schema (confirmed above) but no `CREATE TABLE` in
tracked migrations — a fresh environment built from `supabase/migrations/`
alone would be missing it entirely. This is not a new finding: it's
already one of the eight B.0d-remediated tables named explicitly in
`20260803102000_b0d_rls_lockdown_capture.sql`'s own header comment and
in `.planning/SECURITY-MODEL.md` line 59 as having zero migration-file
record for their base schema (RLS was captured for these eight; the
base schema wasn't — a separate, larger, deliberately-not-fixed-there
gap per that migration's own "SCOPE NOTE"). Not re-scoped here; flagging
so a future session doesn't treat it as undiscovered.

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
- **DEVICE-TESTED AND PASSED (2026-08-26).** Founder ran the real Android
  build; this batch verified working. The prior "not device-tested" caveat
  is retired. See `.planning/TECHNICAL-SWEEP-2026-08-26.md` §0.

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

**Status: done (2026-08-16). Not yet device-reviewed — founder review
required before this counts as visually verified, same standing caveat as
every UI-touching batch.**

**Scoping correction, same pattern as Batches 2/4's parity-doc misses:**
the real surface was bigger than either prior estimate. 52 files used
`amber-*` Tailwind classes (not 48), across ~40 distinct shade/opacity
combinations — not one class, five (`amber-100` through `amber-500`).
`WARM_COOL_BUILD_PLAN.md` §1.1c estimated "2 literal-hex strays"; the
actual count was **~28** (`shadowColor` props, SVG gradient stops, icon
colors, none catchable by an `amber-` classname grep).

**The one real decision, ruled by founder before building:** bronze
existed only as a `tokens.ts` JS value, not a Tailwind class. Ruled:
add `bronze`/`bronze-text` as real Tailwind colors
(`tailwind.config.js`) and mechanically rename classes onto them,
rather than rewriting ~80 files' `className` structure to inline
`style={{ color: color.bronze }}` — same visual result, far less
structural churn. Founder's reasoning on record: "bronze is an inline
JS token" described how bronze happened to land in 9 files, not a
requirement it stay that way.

**Mapping verified before applying, not assumed:** checked every
`amber-{100,200,300,400,500}` usage's Tailwind role (`text-`/`bg-`/
`border-`), not just a sample. Clean split confirmed — `amber-100`/
`amber-200` are 100% `text-` roles (51 instances) → `bronze-text`;
`amber-300` spans all three roles (171 instances) → `bronze`;
`amber-400`/`amber-500` are `bg-`/`border-` only (25 instances) →
`bronze`. No stragglers that didn't fit the two-bucket split.

**Real divergence found and resolved per founder's explicit rule ("if
they diverge, the mockup wins, tell me"):** `WARM_COOL_AMENDMENT.md` and
the shipped `tokens.ts` both said `bronzeText: '#e0b587'`, but every
actual mockup (`.planning/design/mockups/*.html`, `--bronze-hi`) uses
`#d9a06a` — and the amendment doc's own table calls its value
"candidate, refine against real device render before final." The
mockups are the built reference; `tokens.ts`'s `bronzeText` corrected to
`#d9a06a` (matches `bronze: '#b8763e'`, which was already correct — no
divergence there). This changes the rendered color on the 6 files that
already consumed `color.bronzeText` pre-batch (`LeadLine.tsx`,
`CtaPanel.tsx`), not just newly-migrated ones — flagging explicitly since
it's a visual change to already-shipped components, not only new ones.

**Shipped:**
- `tailwind.config.js`: added `bronze`/`bronze-text` matching
  `tokens.ts` exactly; dropped dead `amber-stellaeum` (zero consumers,
  confirmed via grep before deleting).
- `tokens.ts`: `amber`/`amberText` keys deleted (6 real JS consumers —
  `wizard/_layout.tsx`, `AmbientBackground.tsx`, `NavRow.tsx`,
  `States.tsx`, `StepIndicator.tsx` — repointed to `color.bronze`/
  `color.bronzeText` first, confirmed via grep no consumer remained
  before deleting the keys).
- 51 files: mechanical `amber-{100,200,300,400,500}` → `bronze`/
  `bronze-text` class rename, opacity suffixes (`/40`, `/[0.05]`, etc.)
  preserved untouched.
- ~28 literal-value strays converted: `#fbbf24`→`#b8763e`,
  `#fde68a`→`#d9a06a`, `rgb(251,191,36)`→`rgb(184,118,62)` and its rgba
  variants — `oracle.tsx`, both wizard confirm/location/time screens,
  `PlanetDisambiguation.tsx`, `WheelArrivalContainer.tsx`,
  `SavedProfileForm.tsx`, `DailyStreakPanel.tsx`, `LunarPhaseCard.tsx`,
  `MoonGlyph.tsx`, `CapReachedNotice.tsx`, `TopicCards.tsx`,
  `OracleEntry.tsx`, `StoriesContent.tsx`, `CitySearch.tsx`,
  `StepIndicator.tsx`, `TimePicker.tsx`.
- SVG gradient ids and comments referencing the old name renamed for
  clarity where the underlying color is now actually bronze
  (`ambient-amber`→`ambient-bronze`, `lunarHeroAmber`→
  `lunarHeroBronze`, `storiesHeroAmber`→`storiesHeroBronze`,
  `rail-with-amber-diamond`→`rail-with-bronze-diamond` comment).
- Full amber-reference sweep after the mechanical pass (per founder's
  instruction 3) — found and **deliberately left alone**, reported
  rather than silently converted:
  - `NatalWheel.tsx`'s `MIDHEAVEN_LINE_COLOR = '#fcd34d'` and its
    `NatalWheelLegend.tsx` reference — Карта's chart data-viz color
    (Ascendant/Midheaven line semantics), never the brand accent token,
    a different hex family (`fcd34d`, not `fbbf24`) even before this
    batch. Out of scope by design — cool-surface data-viz, not warm
    brand accent.
  - `TransitOverviewCard.tsx`'s `STATE_COLOR` map (`amber:
    'rgba(252,211,77,0.85)'`) and its `tone: 'amber'` type — a
    self-contained transit-urgency status scheme (indigo/amber/emerald/
    slate), distinct hex, not a `color.amber`/Tailwind-`amber-*`
    consumer. First pass mistakenly renamed the `tone` type to
    `'bronze'` while leaving the `STATE_COLOR` key as `'amber'` — caught
    before commit (would have been a type error, `'bronze'` not in
    `keyof typeof STATE_COLOR`), reverted to leave this file's own enum
    untouched.
  - Prose comments using "amber" as a plain descriptive word rather than
    a code reference (`CrystalCard.tsx`, `AspectsList.tsx`,
    `usePressLift.ts`, `ManifestDiaryContent.tsx`) — left as-is; the
    code under them already migrated to `bronze` classes in the
    mechanical pass, the English word in the comment is accurate prose,
    not a stale reference.
- `apps/mobile`: `tsc --noEmit` clean. `pnpm run check:all` (strictness,
  bg-strings, copy-lock, lint-baseline, typecheck both apps, lint, 156
  tests) exit 0 — no Cyrillic-string changes in this batch, so
  copy-lock/lint-baseline were unaffected as expected, run anyway per
  standing discipline.
- Final grep sweep: zero remaining `amber-{100..500}` classes, zero
  remaining `#fbbf24`/`#fde68a`/`rgb(251,191,36)` literals, zero
  remaining `color.amber`/`color.amberText` JS references, zero
  remaining `amber-stellaeum` anywhere — the only two `amber` hits left
  in the whole app are this batch's own historical-record comments
  (`_layout.tsx`'s changelog entry, `tailwind.config.js`'s "was
  '#fbbf24'" note).

**DEVICE-TESTED AND PASSED (2026-08-26)** — the founder's device pass
covered this batch and it verified working. Review should focus on whether
anything deliberately warm went cold or vice versa (a mechanical rename
can't tell "amber because bronze" from "amber because it meant something
else" — the two deliberate exclusions above, Карта's Midheaven line and
the transit-urgency colors, are exactly that distinction applied once
already).

---

### Batch 7 — Parity sweep (non-UI, unblocked)

**Status: done (2026-08-16).**

**Scoping, per the estimation-calibration rule above (fresh grep, not the
parity doc's own claims):** a fork re-verified every `not started`/`in
progress` row in `MOBILE-WEB-PARITY-GAP.md` against current code. Result:
most of what the doc still listed as open was already shipped by earlier
batches and never had its status flipped — 3.4 (Кръг, done Batch 4), 5.6/
7.1 (subscription management, done Batch 5, duplicate rows), 5.9
(Ти→Премиум free-state half, done Batch 5). Section 11 (rate-limiting
coverage) was similarly stale — 8 of its ~15 listed gaps were already
fixed by Batches 1/5.5 and never updated. All five corrected in place in
the parity doc (each now cites what actually shipped and where), not
just noted here.

**One genuine gap found and fixed:** 7 routes with zero rate limiting —
`crystals/route.ts`, `crystals/today`, `crystals/collect`,
`crystals/daily/collect`, `crystals/daily-streak`, `transits/overview`,
`user/route.ts`. Same `assertRateLimit`-first-in-handler pattern as
Batches 1/5.5. Two things worth recording:
- `user/route.ts` needed the rate-limit-before-DB-work ordering fix
  Batch 3 established (`gdpr/delete-account`, `stripe/checkout`) — it
  called `ensureUserRecord`'s DB upsert with no guard in front of it.
- `crystals/today` is deliberately open to unauthenticated callers
  (`getCrystalOfTheDay(userId: string | null, ...)` — today's crystal is
  public teaser content, same category as a horoscope-of-the-day, not an
  oversight). Rate-limit key falls back to IP (`getRequestIp`) when
  there's no session, matching `cities/search`'s dual-key pattern.
- All 7 added to `test/rate-limit/routes-surface-429.test.ts` (40 tests,
  was 33) — same discipline as Batch 1: force `assertRateLimit` to throw
  and assert a clean 429, not a 500, for each. `pnpm run check:all` green
  (strictness, bg-strings, copy-lock, lint-baseline, typecheck both apps,
  lint, tests).

**One real gap found and deliberately deferred, not built:** row 1.3
(Днес premium badge) claimed a stubbed component (`isPremium = false`
hardcoded, "single-line edit" to wire real data) — **that stub no longer
exists**, grepped `index.tsx` and got zero hits; Днес was fully rebuilt
2026-07-22 and the stub didn't survive it. Web still ships this badge.
Real gap, but building it now means drawing new visual chrome (the old
stub's markup is gone), not wiring existing chrome to Batch 5's real
tier data — that's Batch 8 (UI) work, not Batch 7's non-UI scope. Moved,
not built, doc corrected to say so.

**No founder ruling needed this batch** — nothing ambiguous turned up;
every open item was either already-done-but-mislabeled, one small
unambiguous rate-limit gap, or clearly UI-scoped (deferred to Batch 8).

---

### Batch 8 — UI phase (iterative)

**Design research done 2026-08-27 — `.planning/design/DESIGN-RESEARCH-2026-08-27.md`.**
Audit + craft references + user psychology. Headline findings: (1) the
shipped mobile core (Днес, Карта, primitives, AppLoadingScreen) is clean
of the vibe-coded tells — verified by grep, not concluded from absence;
(2) the tells cluster in the two surfaces that never got a design pass —
`you/premium.tsx` and the web `/pricing` it links to (pills, cards,
gradients, orbs, shimmer CTA, diamond bullets, Cinzel-on-Cyrillic, Roman
numerals, amber holdout); (3) **contradiction:** the 4-step wizard
collects date+time+place before showing any value; (4) `faint` `#64748b`
measured 4.23:1 on `base` — under WCAG AA for the 12px/9.5px type it's
used on.

**Founder rulings 2026-08-27 (recorded so they can't drift):**
- **Contrast fix — DONE in `tokens.ts`, `faint` `#64748b` → `#6d7e97`
  (computed 4.87:1). Highest priority; device-verified BEFORE the paywall
  mockup, not after.** Background-floor lift not ruled — separate,
  deferred.
- **Ти-premium + paywall mockup is next after the contrast verifies —
  built FROM SCRATCH against DESIGN-LANGUAGE-REFERENCE.md.** `/pricing`
  not opened during design, read only afterward to check nothing
  functional was missed. `you/premium.tsx` rebuilt not patched; its
  Cinzel-on-Cyrillic is a live REVISIT-42 production defect.
- **Wizard partial-value — NOT ruled. Investigation DONE 2026-08-27:
  `.planning/WIZARD-PARTIAL-VALUE-INVESTIGATION-2026-08-27.md`.** Finding:
  `calculateNatalChart` already fully supports an unknown birth time
  (noon-local convention, always has). Recommended path (Design A) is a
  stateless `POST /api/chart/preview` wrapping the existing pure function
  + one wizard screen state — no schema change, no migration, no change
  to the wizard-completion gate. Persisting a provisional row (Design B)
  is much larger: needs a migration + gate rework + abandoned-row sweep.
  Four founder decisions listed in §4 of that doc. Approved mockup order
  unchanged — paywall stays next.
- **Skeletons — bespoke + layout-matching per-screen only, never a
  system.** Viget evidence supports the `States.tsx` caution.
- **Reduced-motion, delayed spinners, considered empty states — approved
  in principle, deferred; each attaches to its screen, not a sweep.**

**ADDED TO SCOPE 2026-08-26 (founder, after the device pass):**

- **`AppLoadingScreen`** (`apps/mobile/components/design-system/AppLoadingScreen.tsx`)
  — the initial loading animation, the first thing every user sees. Predates
  the design language entirely. **Needs a fresh mockup**; there is none.
- **The whole wizard.** `.planning/design/mockups/wizard-v4.html` exists but
  the shipped screens do not match it. First question for this screen is not
  "build it" but "is the mockup usable as-is, or does it need redoing?"
  Note: the *only* VirtualizedList-nesting defect in the app is in the wizard
  (`CitySearch` inside `location.tsx`'s ScrollView — see
  `.planning/TECHNICAL-SWEEP-2026-08-26.md` §6.1), so a wizard redesign is the
  natural place to fix it rather than a separate patch.

**ADDED TO SCOPE 2026-08-28 (founder ruling — push opt-in split, see §6):**

- **A "notifications" row in Settings — BOTH platforms — designed as part
  of the settings screen's Batch 8 pass (`settings-v4.html`).** Recorded
  now so it is not missed when the mockup is worked. Rationale: "Manage my
  notifications" is something users go looking for, not something they
  should have to catch in a transient banner. A banner is fine as an
  *additional* prompt; it is not acceptable as the *only* route.
  - **Web:** re-mount `PushNotificationBanner.tsx` (complete, currently
    imported by nothing — unmounted as collateral damage in `d230a3f`),
    but the settings row is the canonical home, not `/dashboard`. Banner
    optional and secondary.
  - **Mobile:** worse than a missing feature — a real UX defect. The only
    trigger today is a one-time `Alert` after the first Oracle reading,
    with an AsyncStorage flag (`stellaeum.notifications.prompted.v1`) that
    never re-fires. Anyone who taps "Не сега" is permanently locked out of
    notifications with no in-app path back. `you/settings.tsx` needs a real
    toggle that reads current OS permission state and can re-request /
    deep-link to OS settings.
  - **Parity implication (open question the founder flagged):** web has a
    working-but-unmounted banner; mobile has an incidental one-time prompt.
    Neither matches the other. Under the same-on-both bar they need the
    *same* control, designed once and built twice — another case where
    parity is more work than the tracker's screen count implies. Feed this
    into the Batch 8 settings mockup as a single cross-platform spec.

**Status: scoped (2026-08-16), not started building.** Doesn't batch like
the rest — screen-by-screen, founder approves every gate (mockup, then
build, then device verify), per the process that finally worked for
Днес/Карта after three earlier rejected attempts. This scoping pass
corrected the prior "roughly eleven screens" estimate against actual
mockup inventory and current shipped code, not against this doc's own
prior guess.

**Mockup inventory** (`.planning/design/mockups/`, 21 files): the
canonical "v4" set covers 13 screens + navbar (Днес, Карта, Ти, Оракул,
Ритъм, Guide, Crystals, Recommendations, Lunar diary, Settings, Wizard,
Auth, Кръг, navbar) — all one dated session. Plus 3 older/secondary files:
`journal-v1.html` (superseded by `lunar-diary-v4.html`, use the v4),
`moon-detail-v1.html` (Днес's moon-detail sub-screen, `moon-detail.tsx` is
real shipped code but its mockup was never refreshed to v4 — quick
currency check needed, not a full redo), `dnes-povece-detaili-v1.html`
(v1 only). **No mockup exists at all for:** the Ти→Premium subscription
screen (Batch 5 built it with none), the paywall/purchase UI, the Днес
premium badge (small, moved here from Batch 7).

**Token drift: none found.** Every v4 mockup already defines `--bronze:
#b8763e` / `--bronze-hi:#d9a06a` — the exact value Batch 6 corrected
`tokens.ts` *toward*. The mockups were never behind Batch 6; they were
its reference. Only 3 stray prose mentions of "amber" exist, all
describing an already-superseded first pass, not live styling.

**Functional drift — one real case, `krug-v4.html`.** Its entire content
is a single empty-state hero moment (two orbs, nothing else) — no
relationship picker, no saved-profile list/form, no invite flow, no
connection-space detail, no reports, no weather, no archive.
`WARM_COOL_BUILD_PLAN.md` §2.4 itself already scoped it as just "two
orbs." **Verdict, confirmed: background mood reference only, never a
spec** — exactly the founder's own read. Every real Circle screen needs a
mockup made from scratch.

**Днес/Карта mockups are not stale — if anything the build history runs
the other way.** `MOBILE_ALPHA_REDESIGN.md:598` shows the doc's own prior
text (a 32-40px hero phase-name tier) was corrected *to match*
`dnes-v4.html`, not the reverse; `tokens.ts`/`MoonGlyph.tsx` still cite
exact mockup selectors/values in their comments. `BUILD_VERIFICATION_
GUARDS.md`'s three device-wiring guards are mostly already fixed in the
reference render — **except Guard 2 (moon brightness), still explicitly
open, "verify on device"** — a real outstanding check, already covered by
the Днес step in `DEVICE-PASS-2026-08.md`, not a mockup problem.

**Ти-premium's mockup gap isn't new — it was flagged and never
closed.** `MOBILE_ALPHA_REDESIGN.md:331` explicitly logged, when P.9/P.11
were first scoped, that `ti-v4.html` doesn't cover the subscription/
premium surface and that work shouldn't start "until a mockup exists."
Batch 5 built the real screen anyway, with none. Same situation Кръг is
in, smaller.

**Proposed order, evaluated against the founder's own instinct (screens a
user hits first + screens others depend on, before the long tail) and
against `WARM_COOL_BUILD_PLAN.md` §3's existing Ти-first proposal:**
1. **Ти-premium + paywall** — fresh mockups, zero exist. Highest priority
   by dependency logic, not just recency: it's the money surface, already
   referenced from three shipped entry points (You-menu, crystals gate,
   Кръг teaser), and every day without it is a day mobile can't
   monetize at all. Narrows `WARM_COOL_BUILD_PLAN`'s original "Ти first"
   reasoning to the two items that actually still need it — the rest of
   Ти already has a usable `ti-v4.html`.
2. **Кръг** — fresh mockup needed, zero usable reference (`krug-v4.html`
   confirmed background-only, above). Largest ported-but-undesigned
   surface (~2,200 LOC reference), so the gap between functional and
   designed is largest and most user-visible here.
3. **Днес premium badge** — trivial, small addition to an already-approved
   screen. Bundle into whichever of #1/#2's session has room, not its own
   gate.
4. **Remaining screens with existing, unchallenged v4 mockups** (Оракул,
   Ритъм, Guide, Crystals, Recommendations, Lunar diary, Settings, Wizard,
   Auth) — none blocks anything else; build in whatever order is
   convenient. This scoping pass didn't line-by-line diff shipped code
   against all 9 of these the way it did Днес/Карта/Ти/Кръг — spot-check
   each briefly at build time before treating its mockup as current.

**Fresh-mockup-needed:** Ти-premium, paywall, all Кръг screens.
**Existing-and-usable:** Днес, Карта (incl. moon-detail — quick currency
check only), Оракул, Ритъм, Guide, Crystals, Recommendations, Lunar diary
(`lunar-diary-v4.html`, not the superseded `journal-v1.html`), Settings,
Wizard, Auth.

**Process, confirmed with the founder (2026-08-16) — do not deviate:**
mockup designed from scratch as a complete object (never opening the old
screen's code while designing, never framed as a diff against it) →
founder approves the mockup → build reads exact values from the committed
file, not prose or memory → founder verifies on device → only then the
next screen. One screen at a time.

**Design language reference written (2026-08-16), before any Batch 8
mockup starts:** `.planning/design/DESIGN-LANGUAGE-REFERENCE.md`. Derived
from shipped code and the committed v4 mockups only, not from
`WARM_COOL_AMENDMENT.md` (proven unreliable — the superseded `bronzeText`
value). Covers actual token values with warm/cool/neutral consumer
mapping, the precise temperature rule (`ScreenShell`'s wash + the "app
speaking vs. reading data vs. chrome" distinction from `BackButton`'s own
comment), every primitive to reuse with its verified API and the
literal no-container mechanism behind "bronze is light and fittings,"
and — as important as what shipped — every recorded deliberate departure
from the original spec (`Plaque`'s restructure off a rejected
hairline-framed-plate design, `CtaPanel`'s corrected background bug,
`ScreenShell`'s wash-opacity correction, R7's categorical-not-degree
calibration). Two open risks flagged for Batch 8 to carry, not solved by
writing them down: `NavRow` still uses the function-style Pressable prop
pattern that broke three sibling primitives on the same day and was never
itself audited; Cinzel's Cyrillic-fallback bug (REVISIT-42) has no central
guard, only ad hoc per-component fixes at 6+ sites — a new screen can
still reintroduce it silently. Every Batch 8 mockup states which
primitives it reuses and where/why it departs; a genuinely new primitive
is a flag to raise, not a decision to make silently inside a mockup file.

**Consolidated (2026-08-16), per founder instruction — five documents
describing one language is the mechanism behind the `bronzeText`
incident, not a one-off.** `MOBILE_ALPHA_REDESIGN.md`, `WARM_COOL_
AMENDMENT.md`, and `WARM_COOL_BUILD_PLAN.md` are now retired to
stub-with-pointer files (same treatment Batch 1 gave six stale stack
docs) — `DESIGN-LANGUAGE-REFERENCE.md` absorbed everything from them with
ongoing design-language value, including the full R1-R7 rule text (§0,
not previously ported) and the "converted means typeface too" checklist
item. End state, per instruction: the reference (the language), the
designer brief (the commission — `DESIGNER_BRIEF_ASSETS.md`, corrected in
the same pass — its intro line still said "amber," fixed to bronze/cool),
and the committed mockups (per-screen specs). Nothing else. Full
retirement rationale and the one real divergence it surfaced — the old
build plan's Кръг sequencing predates the Кръг port and is now wrong, not
just stale, corrected in Batch 8's own order above — is in the reference
doc's own §8, not duplicated here.

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

### Push notification delivery — RESOLVED, not actually halt-required

**Correction, Part 2 real-status sweep, 2026-08-16: this register entry was
stale.** It described a state that no longer matches the code — the thing
it says needs a founder decision (`push_tokens` schema scope) was already
decided and shipped, not pending. **[VERIFIED]** `supabase/migrations/
20260803070000_push_tokens.sql` defines the table (RLS, FK to users,
unique-per-device). `apps/web/app/api/push/register/route.ts` already
upserts into it (rate-limited, Batch 5.5 #20). `apps/web/app/api/cron/
daily-horoscope/route.ts` already sends via `expo-server-sdk`, handles
`DeviceNotRegistered` receipts, revokes dead tokens. `apps/web/vercel.json`
already schedules it (`0 6 * * *`). The backend delivery path is fully
built and wired — this was never a live blocker by the time this entry was
last read, it just never got flipped when the work shipped.

**What's actually left, and it's Batch 8 (UI) scope, not a halt:** the
push-notification permission/settings UI (already on Batch 8's list) and a
real device test of token registration end-to-end — possible now that a
dev client exists, folded into the device-pass work rather than a separate
gate. `DAILY-04` in `REQUIREMENTS.md` should be re-checked against this,
not assumed still partially-complete.

---

## 5. Blocked-externally

Items that can't move regardless of engineering capacity — waiting on
something outside this repo.

**Vercel: RESOLVED 2026-08-27.** First successful production deployment in
the project's history — `www.stellaeum.com` live (Status Ready,
Environment Production, 3m29s), custom domains assigned, `stellaeum.com`
→ `www` redirect working. The chain that fixed it: `turbo.json` env
allowlist (`83317a6`) → lazy Stripe client (`008d189`) → **Next.js
15.2.4 → 15.5.24** (`15febcb`), which cleared Vercel's "Vulnerable
version of Next.js detected" deploy gate. Verified live 2026-08-27:
`/` 200, `/privacy` 200 (**Apple privacy-URL submission blocker CLOSED**),
`/pricing` 200; `/api/user` `/api/stripe/status` `/api/cities/search`
all return clean structured **401** (routes load, run, auth-gate — the
lazy-Stripe failure mode works; no 500s); web browser Sentry verified
**live** for the first time (DSN inlined in `main-app-*.js`, `sentry-*`
meta tags in prod HTML, `/monitoring` tunnel configured — a no-op'd
Sentry would produce none of these).

**What the deploy unblocks** (was all "stuck on Vercel"):
- **`EXPO_PUBLIC_WEB_APP_URL`** — founder to set `= https://www.stellaeum.com`
  in `apps/mobile/.env.local` (dev) **and** EAS env (builds). The
  `/you/premium` free-state CTA guard (`lib/config/webAppUrl.ts`) returns
  the real URL once set → `FreeStateCta` renders (currently hidden by the
  `REPLACE_WITH_` placeholder check). No committed code change — it's an
  `EXPO_PUBLIC_` env var.
- **`NEXT_PUBLIC_APP_URL` in Vercel** — must be `https://www.stellaeum.com`,
  not the `?? 'http://localhost:3000'` fallback. Used by
  `stripe/checkout` + `stripe/portal` (success/cancel redirect URLs) and
  `circle/invites` (the `${appUrl}/connect/${token}` invite link). If
  still localhost in Vercel, production checkout redirects to localhost
  and Кръг invite links are broken.
- **Privacy URL** for the Apple submission form — `/privacy` resolves.
- **`/terms` + `/support`** — now buildable (were blocked on the deploy).
  `/support` **shipped 2026-08-27** (`71ba344`) — live on next deploy.
- **RevenueCat webhook end-to-end test** — a live HTTPS webhook endpoint
  now exists (still needs the real signing secret, see the row below).
- **Clerk production instance** — needs DNS records on the domain, which
  now resolves.
- **Google Cloud OAuth consent screen** — needs a resolving homepage +
  privacy URL, now available.
- **`/connect/[token]` invite-acceptance page** — the mobile Кръг invite
  flow's web landing page. **BUG found 2026-08-27:** an invalid/unknown
  token returns **HTTP 500**, not a friendly 404 / "invalid invite" page
  (`curl /connect/test` → 500). A user with a stale link, or a reviewer
  poking the URL, hits a raw error. Not urgent (happy path needs a real
  token to test) but a rough edge to fix — logged here so it isn't lost.

The repo-side diagnostic (`.planning/VERCEL-DEPLOY-DIAGNOSTIC.md`) has
the full root-cause chain in its resolution block.
| **RevenueCat webhook integration + real signing secret** — sweep finding #1 (CRITICAL), Tier 1 fix landed 2026-08-26 but only half-closes it. `REVENUECAT_WEBHOOK_SECRET` in `apps/web/.env.local` was rotated off the forgeable value (byte-identical to `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`, shipped in the app bundle) to a random placeholder never in any client bundle. **Current state: the webhook is dead, not forgeable** — safer, but not working: the placeholder isn't RevenueCat's real signing secret and every real webhook call 401s at the HMAC check. **Vercel now deployed (2026-08-27), so the end-to-end test is finally possible — this is now fully founder-actionable, no remaining blocker.** | Real subscription-state sync from RevenueCat to `users.subscription_tier` (`revenuecat/webhook-events.ts` against live traffic) + the end-to-end test. | **Founder — dashboard-only.** RevenueCat Dashboard → Project Settings → Webhooks: create the integration, toggle HMAC signing on, copy the signing secret (shown once). Set `REVENUECAT_WEBHOOK_SECRET` to that value in `apps/web/.env.local` **and** in the Vercel project env — both. Then fire a test event at `https://www.stellaeum.com/api/webhooks/revenuecat` and confirm it 200s + syncs. |
| **Two prepared DB migrations** (Tier 2 #6/#8, 2026-08-26) — `supabase/migrations/20260826140000_user_crystals_fk.sql` (delete 13 orphaned rows, then FK `user_crystals`/`user_daily_crystals` → `users`) and `20260826150000_capture_untracked_tables.sql` (CREATE TABLE capture for the 16 untracked tables, self-verified against production, zero missing/extra). Neither was applied by this session, matching the sweep's own §1.5 "do not `db push` blind" warning. | **Orphan ruling made 2026-08-26 — delete, then add the FK.** Three checks before ruling, not inferred from the missing join alone: (1) Clerk API for `user_3CJ6TxYOTVGpGhsznsp3Sevygng` directly — 404, account genuinely gone, not a live partially-deleted user; (2) `audit_logs` for that clerk_id — zero rows, and since that table's FK to `users` is `ON DELETE SET NULL` not `CASCADE`, a real GDPR deletion run through the app would have left a null-`user_id` row behind rather than none at all, ruling out "deletion partially failed" as the cause (most likely pre-cron manual test data, dated 2026-04-15); (3) both tables hold only derived/generated content, nothing user-authored. **The general move worth repeating: absence of a SPECIFIC expected artifact (the null-user_id audit row a real deletion would leave) rules out a SPECIFIC cause more reliably than absence-of-evidence in general does.** Migration file now contains the DELETE + verification queries followed by the ADD CONSTRAINT statements. | **Founder — ready to run.** FK migration: run as one file (DELETE → verify 0 orphans → ALTER TABLE → verify constraints exist), verification queries inline. Capture migration: `supabase migration repair --status applied 20260826150000` once reviewed — see the exact command sequence given alongside this ruling for why repair, not push, and what order matters. |
| **Apple Developer Program enrollment** | TestFlight provisioning, SR 9 (EAS Dev Client + TestFlight + biometric auth bundle), the soft-launch milestone itself (iOS internal beta can't open without it) | Founder — application/payment step, not automatable |
| **LLM provider decision** — full criteria + integration scoping in `.planning/LLM-PROVIDER-DECISION-2026-08-27.md`. Open for weeks; **now on the critical path** because two things depend on the *provider* (not just the model): **(1)** the privacy policy's AI sub-processor + third-country-transfer + retention section — the lawyer brief (`PRIVACY-POLICY-LAWYER-BRIEF-2026-08-27.md` §4) is written vendor-agnostic with `[[AI PROVIDER]]` / `[[JURISDICTION]]` placeholders, but the policy can't ship until they're filled; **(2)** the 300/month premium safety-net cap, derived from Llama 3.3 70B pricing, must be re-derived on swap. Decision criteria: Bulgarian quality (test on real prompts via `bg-speller.mjs`), $/call at ~1.25k-in/1.75k-out, single-company-vs-router (→ sub-processor list shape), retention/training terms in writing, **EU-hosted-or-not** (EU hosting removes the whole Chapter V transfer section). **Integration scoped and it is NOT a project:** verified `lib/ai/client.ts` is the single source of truth, two consumers use the provider-agnostic Vercel AI SDK — an OpenAI-compatible provider is a ~3-line change, a first-party `@ai-sdk/*` provider is ~10-20 lines + one dependency in that one file, routes unchanged either way. | The privacy policy (long-pole legal item) and the premium cap number. Not launch-blocking on its own but blocks the policy. | **Co-founder (web) — researching, has not reported back. Owner named so this stops being an open-ended note.** |
| **Swiss Ephemeris Professional License purchase** | Nothing pre-launch by design — GPL-2.0 path is legally sufficient until the trigger fires. CHF 700 one-time, no retroactive coverage (contract clause 13) once the trigger does fire | Founder — automatic trigger already wired (`[Licensing]`-prefixed warnings on first genuine paying subscriber in both `stripe/subscription.ts` and `revenuecat/webhook-events.ts`); founder must act promptly once it fires, not "eventually" |
| **Designer assets** (`DESIGNER_BRIEF_ASSETS.md`) | Currently blocks nothing launch-critical — planet/zodiac glyphs render as Unicode placeholders pending real assets; brief itself is unfulfilled, no deliverable exists yet | Whoever the founder commissions; brief is written and ready |

---

## 6. Known-open, not batched

Deliberately not scheduled yet. Recorded so nobody re-proposes these as if
they were forgotten rather than deferred on purpose.

- **Cinzel-Cyrillic ESLint guard.** Founder ruling 2026-08-16: build it,
  but not until Batch 8's first new screen exists to test the rule
  against — "a guard with nothing to guard is untested." Shape already
  scoped in `DESIGN-LANGUAGE-REFERENCE.md` §1: flag a Cyrillic codepoint
  (`[Ѐ-ӿ]`) inside a component that also sets `fontFamily: font.cinzel`
  or the `font-cinzel` NativeWind class, same pattern as the existing
  `no-new-bg-strings` custom rule (`packages/config/eslint/
  no-new-bg-strings.cjs`). Trigger: once Batch 8's first screen (Ти-
  premium or paywall, per the ratified order) is built, not before.
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
- **Next.js version-block upgrade — DONE (`15febcb`).**
  `.planning/NEXTJS-UPGRADE-2026-08-27.md`. `turbo.json` env fix
  (`83317a6`) unblocked the Turbo compile; Vercel then hard-blocked the
  deploy on "Vulnerable version of Next.js detected". **Upgraded
  `next` 15.2.4 → 15.5.24** (minimum that clears the gate — no patch on
  15.2/15.3/15.4). Verified: `pnpm why react` still 19.1.0 (no
  movement); local `next build` exit 0 (40 routes + 20 pages, middleware
  147 kB, native externals intact); `check:all` green, 195 tests. `next
  lint` prints its 15.5 deprecation warning (not a failure) — migrating
  it to the ESLint CLI is a pre-Next-16 task. Founder to redeploy.
  Note: `pnpm add` briefly desyncs `apps/mobile` node_modules from the
  rewritten lockfile (`eslint-config-expo` jiti peer flip); `pnpm
  install` reconciles it and CI/Vercel does a clean install so is
  unaffected.
- **Auth provider expansion (Google + Sign in with Apple) —
  `.planning/AUTH-PROVIDER-EXPANSION-2026-08-27.md`.** Founder ruled
  2026-08-27: **Google sign-in IS a launch feature**, which makes **SIWA
  mandatory** (Guideline 4.8) — now a submission blocker, tracked in
  `APPLE-REVIEW-REQUIREMENTS-2026-08-27.md` §1 (flipped from "not
  applicable"). Deps already installed. **Google needs no native build**
  (browser SSO flow); **SIWA needs a new dev-client build** (config
  plugin + `ios.usesAppleSignIn`) — flag to founder before starting, it
  changes the testing loop. SIWA config + end-to-end test blocked on
  Apple enrolment; all client work can start now. Web gets both nearly
  free via Clerk prebuilt components but MUST ship the buttons in the
  same release (a Google-only mobile signup can't log into web
  otherwise). **SIWA sits UNTESTED for however long Apple enrolment
  takes** — the native-auth path needs a new dev-client build the founder
  can't produce/test on the current one, and end-to-end config needs the
  Apple capability + keys. Clerk account-linking: verified 2026-08-27 via
  Clerk docs — email-based linking "is always on" with "no dashboard
  setting to enable or disable" it (Google always verified, Apple relay
  address is stable per-app). There is NO account-linking toggle to find
  or set on either instance; the only lever is "Verify at sign-up" (ON,
  done). **Why archived docs disagree:** earlier Clerk builds exposed an
  account-linking mode/strictness setting in the dashboard, and
  `APPLE-REVIEW-REQUIREMENTS` §7 + `AUTH-PROVIDER-EXPANSION` §4/§6 (pre
  2026-08-27 revisions) told the founder to "confirm it's set to link on
  verified email." That setting no longer exists — linking is now
  unconditional. If an archived planning doc says to check it, this note
  is why it's wrong. **Unfixable edge:** Apple "hide my email" user who later
  uses Google = two different addresses = two accounts, nothing automatic
  merges them (a future "Connected accounts" screen would let them
  self-serve; not a launch blocker). Open rulings: SIWA
  token-revoke-on-delete failure handling (best-effort-and-proceed
  recommended); `displayName.ts` relay-host guard. Cost ~Google 3 d +
  SIWA 5–7 d + ~2 h config.
- **Legal / support pages (Apple submission blockers) — scoped
  2026-08-27 in `APPLE-REVIEW-REQUIREMENTS-2026-08-27.md` §5–§8.**
  - **`/support` page — SHIPPED 2026-08-27 (`71ba344`), live on next
    deploy.** Plain static route, Bulgarian (informal ти), matches
    `/privacy`'s structure/styles (not Batch 8). App name, one-line
    description, `support@stellaeum.com`, four FAQ (не мога да вляза /
    възстановяване на покупки / изтриване на акаунт / не получавам
    известия), link to `/privacy`. BG copy through the checks;
    bg-lint-baseline 1756 → 1772. Also fixed: `/privacy` had
    `support@stellaeum.app` (wrong TLD) in two places → `.com`.
    **Founder:** create `support@stellaeum.com` via Cloudflare Email
    Routing (free, ~15 min — NOT a personal Gmail in the App Store
    field).
  - **`/terms`.** Doesn't exist. Apple's standard EULA covers the
    licence; ours must add subscription terms (3.1.2: in-app + web),
    acceptable use, liability, governing law (BG), astrology disclaimer.
    Template + a SHORT Bulgarian-lawyer review — no data-processing
    content, ships in days once the lawyer is engaged.
  - **`/privacy`.** Route exists but content is lawyer-gated — needs a
    **Bulgarian-language** policy from a **Bulgarian data-protection
    lawyer**. **Scoping brief written 2026-08-27:
    `.planning/PRIVACY-POLICY-LAWYER-BRIEF-2026-08-27.md`** (Part A =
    GDPR section inventory reconstructed w/o Termly; Part B = verified
    app-specific facts incl. the exact OpenRouter payload — derived chart
    text only, no name/DOB/location/identifiers sent; §15 = the 10
    decisions the policy turns on). Hand this to the lawyer. **Long-pole
    legal item — start the engagement now.** Founder still to confirm:
    controller entity, Supabase project region, minimum age (14 in BG).
  - **Termly — do NOT buy (recommendation, needs ratification).**
    Verified 2026-08-27: **no Bulgarian support** (consent-manager and
    multi-language policy generator both). English-only policy for a
    BG consumer app is a CPDP weakness.
  - **Cookie consent — likely NOT needed at launch.** GDPR requires a
    banner only for non-essential cookies; Clerk/Stripe cookies are
    strictly-necessary (exempt). Gated on the still-open analytics-vendor
    decision. Recommend: no third-party analytics at launch → no banner.
- **`audit_logs` payment-row de-identification — code DONE (`edefd47`).**
  `audit_logs` FK is `ON DELETE SET NULL` (verified vs production
  `pg_constraint` 2026-08-27) so rows outlive the account; payloads
  carried Stripe `cus_`/`sub_`/`in_` ids + one raw Clerk `user_` id.
  `logAuditEvent` now scrubs id-shaped values to `prefix_…last4` before
  insert (shape-based, recursive; proven against pre-fix code, 4 new
  tests). **Pre-existing rows still hold raw ids — one-off `UPDATE`
  backfill is a follow-up** (or moot if the rows get pruned). Same query
  run also VERIFIED: `subscription_quotas`, `push_tokens`,
  `push_subscriptions`, `user_crystals`, `user_daily_crystals` all
  `ON DELETE CASCADE` → `users` (and the `user_crystals` FK the sweep
  said was "prepared not applied" IS applied in production). Open:
  accountant question — must BG law keep the `audit_logs` payment rows
  at all? If no, prune them in the cron.
- **Wizard partial-value (show a chart before the birth-time step).**
  **Design A ruled 2026-08-27** (founder): stateless `POST /api/chart/preview`
  wrapping the existing `calculateNatalChart` pure function + one wizard
  screen state. **No schema change, no migration, no change to the
  wizard-completion gate.** Full investigation:
  `.planning/WIZARD-PARTIAL-VALUE-INVESTIGATION-2026-08-27.md`. Build is
  **deferred to the wizard mockup**, not now; paywall stays the next
  mockup. Three things the implementer must get right, and one trap:
  1. **TRAP for anyone who later reaches for Design B (persist a
     provisional row):** `apps/mobile/app/(authed)/_layout.tsx:31–40`'s
     forced-wizard redirect keys on `useFirstChart().data === null` —
     row *existence*, not completeness. A persisted half-chart silently
     marks the wizard done and the user is never pushed back to finish.
     Design B therefore also costs a gate rework + an abandoned-row
     sweep. Design A exists specifically to avoid this. Do not "just
     save the provisional chart" without reading this.
  2. The **noon-local convention must be visible to the user**, not
     silent — a provisional chart is computed at noon local time, so
     adding a real birth time changes the Ascendant / houses / possibly
     the Moon. If that change is unexplained it reads as the app being
     wrong. Framing to be proposed with the wizard screen mockup.
  3. **Rate-limit `/api/chart/preview`** — it runs a real ephemeris
     compute. Confirmed 2026-08-27: the wizard sits **behind** auth
     (`AuthedLayout` redirects unauthenticated users to `/sign-in`), so
     a preview route called mid-wizard is an authenticated call and
     should be a normal `auth()` + `assertRateLimit` route, same as
     `/api/chart/calculate`. Keep it that way — it must **not** ship as
     a public/unauthenticated endpoint.
  4. Answer the **four §4 decisions** in the investigation doc as a
     batch when the wizard mockup comes up (teaser content, Moon
     handling, wheel vs. sign-list, time-step framing) — not piecemeal.

- **Post-deploy smoke test — OWNED, scoped 2026-08-27, PRIORITY RAISED
  2026-08-27, not built.** After every production deploy, one authed
  request per compute path (chart calculate, transits overview, crystals
  overview, one circle route, both AI routes, `/connect/<token>`),
  asserting no 5xx. **Founder raised this up the queue after
  `/api/horoscope/generate` failed three separate ways in one session
  (§0.6 missing module → §0.7 frozen build path → §0.8 empty upstream
  body), each one invisible until the previous came off.** That is the
  argument: page-level checks and even a first authed probe kept passing
  while a core route was dead. Scope: `scripts/smoke/post-deploy.mjs`
  taking a base URL + a seeded test user's `__session` cookie; assert no
  5xx on any probe; wired as a Vercel Deploy Hook / post-deploy GitHub
  Action + a manual `pnpm smoke:prod`. For the AI routes, "no 5xx" now
  includes accepting a **502 `AI_UPSTREAM_FAILED`** as a *known* state to
  report-but-not-fail-on until §0.8's root cause is closed (else the smoke
  test just red-flags the same known issue every run). **Must not depend
  on anyone remembering to curl things.** Owner: engineering (Claude
  Code); next in the queue after §0.8's root cause is identified from the
  `[OPENROUTER-DEBUG]` logs.
  - **2026-08-28 — scope additions + hard design requirements from the VAPID-cron incident.**
    Scope addition:
    - **The scheduled jobs are in scope, not just request routes.** The
      `daily-horoscope` cron threw on every 06:00 UTC run since Web Push
      shipped (malformed `VAPID_PRIVATE_KEY` → `setVapidDetails` throw) and
      nothing surfaced it until server-side Sentry went live weeks later.
      That is the one-sentence case for this whole item, sharpened: **a
      scheduled job that fails silently is invisible by construction** — no
      user is watching it, and it has no caller to return an error to. The
      smoke test hits both cron paths (`daily-horoscope`,
      `cleanup-deleted-accounts`) with the Production `CRON_SECRET` bearer
      and asserts 200 + a sane body (`web`/`mobile` tallies present, no
      `error` field). This is now the pre-launch mechanism for cron
      observability — **PRE_LAUNCH_PREREQS item 2's "cron observability
      deferred post-launch" line is overturned as of 2026-08-28, not merely
      contested** (a contested deferral is still a deferral, and we now have
      a concrete weeks-long silent failure). Sentry Crons / heartbeat
      remains the better long-term shape and can replace this later; it is
      no longer a reason to ship launch with zero cron coverage.

    Two hard requirements of the smoke test's **design** — if it ships
    without either, it is a net negative:
    1. **Probe traffic MUST be identifiable at the monitor.** The smoke
       test deliberately generates error-shaped traffic on every deploy (a
       malformed body → 400, a 502 `AI_UPSTREAM_FAILED`, a cron hit).
       Without a marker, each run pages exactly like a real user outage, and
       once real users exist a probe failure and a user failure are the
       same Sentry event — we would have built a machine for generating
       indistinguishable false alarms. Requirement: every smoke request
       carries `x-stellaeum-probe: 1` (or a dedicated synthetic user / DSN
       env), and `beforeSend` in `sentry.server.config.ts` tags or drops
       it. Ship the `beforeSend` filter and the header **together**, in the
       same change as the smoke script. Tracked as VERIFICATION-SURFACE-GAPS
       #11 (a requirement of this item, not a note attached to it).
    2. **The response MUST carry a build/version marker** so a probe can
       tell *which deployment answered it* from the response body alone —
       e.g. `x-stellaeum-build: <VERCEL_GIT_COMMIT_SHA>` header, or a
       `build` field in each JSON response. 2026-08-28's cron probe returned
       the pre-refactor `{sent, failed, mobile}` shape, which by accident
       revealed it had hit a stale deployment — the smoke test should give
       that signal on purpose, not by luck. This is the direct fix for the
       Skew Protection episode (VSG #10): "did the fix deploy" becomes
       answerable without dashboard archaeology.

- **Mobile has ZERO automated tests — OWNED, scoped 2026-08-27.** `pnpm
  test` = 195 tests, **all `@stellaeum/web`** (`apps/web/test/**`, vitest).
  `apps/mobile` has no test runner configured, no test files, no
  `test` script. Every mobile guarantee to date is device-pass + code
  read only. For an end state described as "built and tested" this is a
  real gap that was never explicitly owned. Scope (not a decision to make
  silently — founder confirms shape): (a) unit-level — the pure hooks and
  lib helpers (`lib/config/webAppUrl.ts`, `lib/clerk/displayName.ts`, the
  Кръг hooks' cache logic, `lib/haptics`) under vitest + React Testing
  Library, mirroring the web setup; (b) NOT full RN render/e2e (Detox/
  Maestro) at launch — disproportionate pre-users, revisit post-launch.
  Smallest useful first slice: the auth-error mapping in `sign-in.tsx` /
  `sign-up.tsx` and the `getWebAppUrl` placeholder guard, both of which
  are logic with branches and both of which have shipped bugs before.
  Owner: engineering; sequence after the §0.6 fix and the Google button,
  before Batch 8's later screens.

- **Push notification opt-in — WEB has no user-reachable subscribe control;
  MOBILE prompt is incidental-only. Found 2026-08-28 after the VAPID cron
  fixes.** The two transports are on different tracks and were being
  conflated:
  - **Web push has NO Apple dependency and is otherwise shippable today.**
    Server side is complete and verified: `/api/push/subscribe` +
    `/api/push/unsubscribe` (tested), `public/sw.js` service worker,
    `NEXT_PUBLIC_VAPID_PUBLIC_KEY` inlined, the `daily-horoscope` cron web
    branch confirmed working in prod on `d151f5a`. **The gap is the opt-in
    UI.** `apps/web/components/horoscope/PushNotificationBanner.tsx` is a
    complete, styled subscribe/unsubscribe control — but it is imported by
    nothing. Git history: it was mounted on `/dashboard`
    (`DashboardContent.tsx`, gated on `birthChart`) in `fd15199`, then the
    `<PushNotificationBanner />` render **and** its import were deleted in
    `d230a3f` ("style: editorial front-end overhaul across web app") — the
    same commit restyled the component file, so the unmount looks
    incidental to the aesthetic pass, not a deliberate product call. Net:
    `push_subscriptions` can only be populated by re-mounting that
    component (one line) or building a new control. Until then the entire
    web push path is server-only with no way for a user to subscribe.
    **Founder ruling 2026-08-28:** the canonical home is a notifications
    row in Settings, both platforms, designed in the Batch 8 settings pass
    — re-mounting the banner is fine as an additional prompt but not as the
    only route. Full ruling + parity note in the Batch 8 "ADDED TO SCOPE
    2026-08-28" block. Also VERIFICATION-SURFACE-GAPS #12 (nothing caught
    the unmount because every gate tests code that runs, not reachability).
    No Claude UI work until asked.
  - **Mobile push permission flow exists and is reachable, but only fires
    incidentally.** `maybePromptPushPermission` (`apps/mobile/lib/
    notifications/`) is wired to `oracle.tsx`'s `onFreshGeneration` — it
    prompts once, ever (AsyncStorage flag `stellaeum.notifications.
    prompted.v1`), after the user's first successful Oracle reading. FF
    `EXPO_PUBLIC_FF_PUSH` defaults on. There is **no explicit
    "notifications" toggle** anywhere — `you/settings.tsx` has only
    name/email/password rows — so a user who declines or misses the
    one-shot prompt has no in-app way back. End-to-end verification
    (system prompt → `getExpoPushTokenAsync` → `/api/push/register` →
    APNs delivery) is blocked on Apple Developer enrolment (APNs
    credentials) and needs a real iOS build — see §5 Blocked-externally.
    The permission *scaffold* is code-complete (SR 8.3); the reachable,
    manageable opt-in and the real-device verification are not. **Founder
    ruling 2026-08-28:** the one-shot-prompt-with-no-way-back is a UX
    defect, not just a missing feature — a real notifications toggle in
    `you/settings.tsx` is Batch 8 scope (see the "ADDED TO SCOPE
    2026-08-28" block).

- **Unimported-module / reachability CI gate — OWNED, scoped 2026-08-28,
  not now.** Adopt `knip` as a CI check with Next app-router entry points
  (`app/**/{page,layout,route,default,loading,error,not-found}.tsx`,
  `instrumentation*.ts`, `middleware.ts`, `sentry.*.config.ts`, config
  files, `scripts/**`) declared as roots, so a component/module that
  nothing reaches from a real entry point fails the build. Rationale +
  the full "why not (b)/(c)/(d)" reasoning: VERIFICATION-SURFACE-GAPS #12.
  This is the automatable slice of the reachability gap — it would have
  caught `PushNotificationBanner.tsx` the day `d230a3f` orphaned it.
  **Stated one-time cost: baseline triage.** A monorepo this size will
  surface a first-run list mixing real dead code with intentional-but-
  unreferenced files (generated code, type-only barrels, scripts invoked
  by name, EAS/Expo config, test fixtures); each needs a keep/delete call
  and a `knip.json` `ignore` entry or deletion before the gate can go
  red-on-new. Budget that as the bulk of the work, not the wiring.
  Explicitly **not** in scope: dead-conditional render detection (#12 (b),
  undecidable — skip); route-with-no-nav-path sweep (#12 (c), optional
  advisory only if someone asks). Real user-reachability (#12 (d)) is
  handled by the per-feature obligation now in
  `.planning/phases/m3-uat/BROWSER_CHECKLIST.md`, not by tooling. Owner:
  engineering; no fixed sequence — slots into any CI-hardening pass.

## Correction — Кръг mobile is functionally ported (parity-doc error #6)

`.planning/phases/phase-b-mobile-parity/MOBILE-WEB-PARITY-GAP.md` §3
still describes `apps/mobile/app/(authed)/(tabs)/circle.tsx` as a
"70 LOC ... original empty-state placeholder ... three static Pressable
cards with no onPress." **That is stale — verified against code
2026-08-27.** Actual: `circle.tsx` is **432 LOC**, plus
`circle/new-connection.tsx` (152), `circle/new.tsx` (46),
`components/circle/{ConnectionSpaceDetailPanel,SavedProfileDetailPanel,
SavedProfileForm}.tsx` (~970 LOC combined), and **13 hooks** under
`apps/mobile/hooks/use*` hitting `/api/circle/*` (`useConnectionSpaces`,
`useCreateInvite`, `useSavedProfiles`, `useGenerateConnectionReport`,
`useAnalyzeSavedProfile`, `useArchiveSpace`, …) plus
`lib/circle/{inviteLinks,types}.ts`. Batch 4 sub-batches A + B did this.
**Кръг mobile's remaining work is design only** (Batch 8 fresh mockups),
not functional. This is the sixth documented instance of that doc's
status column being wrong — treat every cell there as a hypothesis
(its own header says so).

---

## 7. Path to launch — full sequence (recorded 2026-08-27)

Written down because it previously lived only in a session and would be
lost on a context clear. Supersedes the scattered auth/UI notes above
where they conflict. Re-verify any code claim against the tree.

### 7.1 The launch clock — three wall-clock items, none shortened by code

Launch is not gated on the engineering queue. It is gated on three
founder-owned items that consume calendar time regardless of what is
built:

| Clock | Duration once started | Start date |
|---|---|---|
| **Apple Developer enrolment** | Days (Individual) to weeks (Organization — needs a D-U-N-S number, the long pole). The Individual-vs-Organization choice is the first fork. | **NEXT WEEK** — costs money the founder does not have this week |
| **Google Play registration -> closed testing** | Registration + **hard 14-day** closed test with >=12 testers, counted from when a signed build is uploaded | **NEXT WEEK** — same money constraint |
| **Bulgarian data-protection lawyer** — `/privacy` (long pole) + short `/terms` review | Weeks: engagement + drafting + founder review. Brief is written (`PRIVACY-POLICY-LAWYER-BRIEF-2026-08-27.md`). Also needs Petko's LLM-provider decision to fill the AI section. | **THIS WEEK** — the email costs nothing |

**Timeline read:** if all three start on schedule and engineering runs in
parallel, launch is ~4-6 weeks out. Serialised (finish Batch 8, then
start the clocks) it is that plus the whole Batch 8 duration.

### 7.2 What the one-week slip on Apple + Play actually moves

Apple enrolment and Play registration slipping from "this week" to "next
week" (money):

**Slips by ~1 week:**
- Store submission and therefore the Play 14-day closed-test window ->
  **launch date moves ~1 week later.** This is the binding effect.
- SIWA end-to-end config/testing (already gated on Apple enrolment).

**Does NOT slip:**
- Anything in Batch 8 — mockup -> approve -> build -> device-verify runs
  on founder-review cycles, not money.
- The Google button and everything in Tracks 4 and 5 (all zero-spend).
- Legal readiness — the pole there is the **lawyer's** turnaround, not
  enrolment; the engagement email goes this week regardless.
- The 0.6 / 0.7 production fixes.

**Therefore the week is genuinely free** to spend on engineering that
would otherwise be critical-path — the Google button, Track 4, Track 5,
the 0.7 fix — rather than on Batch 8's long tail, which can wait without
moving the launch date.

### 7.3 Zero-spend plan for THIS week, ordered

0. **0.7 fix** — `bg-allowlist.txt` -> code module. Unblocks
   `/api/horoscope/generate` + `/api/oracle/generate` in production.
   First, on founder go-ahead. **[me, free]**
1. **Lawyer email** — send `PRIVACY-POLICY-LAWYER-BRIEF-2026-08-27.md`.
   Starts the longest legal clock. **[founder, free]**
2. **`support@stellaeum.com`** — Cloudflare Email Routing, ~15 min.
   **[founder, free]**
3. **Track 5 env values** — `NEXT_PUBLIC_APP_URL` in Vercel ->
   `https://www.stellaeum.com`; `EXPO_PUBLIC_WEB_APP_URL` in
   `apps/mobile/.env.local` + EAS env. Small, was blocked on Vercel (now
   resolved). **[me + founder, free]**
4. **Google button** — Track 1 Phase A (see 7.4). ~2 days, device-testable
   on the current dev client. **[me, free]**
5. **Track 4 loose ends** as time allows — the two prepared migrations,
   `subscription_quotas` export gap, `audit_logs` id backfill. All small,
   all free. **[me, free]**

**Next week, when money is available:** Apple enrolment (decide
Individual vs Organization first), Google Play registration + line up 12
testers.

### 7.4 Auth work — Phase A (now) vs Phase B (after Apple enrolment)

Deps already installed: `@clerk/expo ^3.2.4`, `expo-auth-session`,
`expo-apple-authentication`, `expo-dev-client`, `expo-web-browser` (the
last already in `app.json` plugins). No `expo-apple-authentication`
plugin, no `ios.usesAppleSignIn` — verified 2026-08-27. Account linking:
no Clerk toggle exists, it is always on; only "Verify at sign-up" (ON,
done) matters — see 6 and `APPLE-REVIEW-REQUIREMENTS 7`.

**Phase A — no Apple enrolment needed, all doable now:**
- A1. Google connection on the Clerk **dev** instance — reportedly already
  enabled on the shared credentials; confirm. ~0. **[me]**
- A2. Mobile "Continue with Google" button + `useSSO`/`startSSOFlow` +
  `setActive(createdSessionId)` + Bulgarian error mapping (mirror the
  `ERROR_MESSAGES` maps in `sign-in.tsx`). ~1-2 d. **Device-testable on
  the current dev client — browser SSO needs no native build.** **[me]**
- A3. `displayName.ts` relay-host guard (skip the email-username step when
  the host is `privaterelay.appleid.com`). ~15 min. **[me]**
- A4. SIWA client code — `expo-apple-authentication` config plugin +
  `ios.usesAppleSignIn` in `app.json`, native Apple-sheet flow, token
  handoff to Clerk (`oauth_token_apple`), the compliant
  `<AppleAuthentication.AppleAuthenticationButton>`. ~2-3 d of code.
  **Writable now, NOT testable — needs the new build (A5) + Phase B.**
  **[me]**
- A5. New dev-client build with the Apple plugin. Changes the founder's
  testing loop — flag before starting A4. **[me + founder]**

**=== APPLE ENROLMENT BOUNDARY ===**

**Phase B — only after enrolment clears:**
- B1. Developer portal: "Sign In with Apple" capability on
  `com.stellaeum.app`; Services ID; `.p8` key + Key ID + Team ID. ~45 min.
  **[founder]**
- B2. Paste those into Clerk's Apple connection. ~15 min. **[me + founder]**
- B3. End-to-end SIWA test on the new dev-client build. ~0.5 d.
  **[me + founder]**
- B4. Token-revocation-on-delete in `cron/cleanup-deleted-accounts` —
  best-effort revoke + Sentry alert (recommended ruling), client-secret
  JWT signing server-side, `.p8` as a Vercel secret + a `turbo.json`
  `build.env` entry. ~1-1.5 d. **[me, needs the .p8 from B1]**

**Gates "Google is shipped" regardless of client code:** the founder's own
Google Cloud OAuth client + consent screen (needs the resolving privacy
URL — have it now); and **web must render the Google button in the same
release as mobile** (a Google-only mobile signup cannot log into web
otherwise). Web is near-zero via Clerk's prebuilt `<SignIn/>` once the
connection exists on the **production** Clerk instance — but that is a
Vercel deploy plus the Clerk production instance setup (DNS on the domain,
now resolving).

### 7.5 Tracks 1-6 — the full dependency sequence

Tags: **[me-free]** = no external dependency, do any time - **[me-coupled]**
= no external dependency but sequenced behind another internal item -
**[external]** = blocked on money / Apple / Play / lawyer / Petko.

**Track 1 — Auth** (detail in 7.4)
- Phase A1-A5 — **[me-free]** (A4/A5 writable now, SIWA untestable)
- Phase B1-B4 — **[external]** (Apple enrolment)
- Google production OAuth client + consent screen — **[external]** (founder
  + needs Clerk production instance)
- Web Google/Apple buttons + Clerk production instance — **[me-coupled]**
  (Vercel deploy; must ship same release as mobile Google)

**Track 2 — Batch 8 UI** (screen-by-screen, founder gate at every step)
- Device-check the contrast fix (`#6d7e97` at 12px / 9.5px) — **[me-free]**,
  the thing blocking Batch 8 start
- Ti-premium + paywall mockup -> approve -> build -> verify — **[me-free]**
  (fresh mockups, zero exist)
- Krug — fresh mockups every screen (`krug-v4.html` is mood-only), build
  against the already-ported functionality (see the "Krug mobile is
  functionally ported" correction above) — **[me-free]**, design only
- Dnes premium badge — trivial, bundle into another session — **[me-free]**
- Remaining screens with usable v4 mockups (Orakul, Ritam, Guide,
  Crystals, Recommendations, Lunar diary, Settings, Auth) — **[me-free]**
- Wizard — mockup currency check, then build; includes `POST
  /api/chart/preview` (Design A, wraps existing `calculateNatalChart`;
  route does not exist yet) + the one VirtualizedList-nesting fix —
  **[me-free]**
- AppLoadingScreen — needs a mockup from scratch — **[me-free]**
- Cinzel-Cyrillic ESLint guard — after Batch 8's first screen exists —
  **[me-coupled]**

**Track 3 — Money path**
- Item 16: **native RevenueCat purchase-call layer** —
  `RevenueCatProvider.tsx` is `configure()` + identity only; zero
  `getOfferings`/`purchasePackage`/`CustomerInfo`/paywall anywhere in
  mobile. Real engineering, no external dependency, but **coupled to the
  paywall mockup** -> lands with Batch 8's first screen, not before.
  ~3-4 d + tests. **[me-coupled]**
- Item 17: **RevenueCat webhook signing secret** — still a random
  placeholder, so subscription state never syncs to
  `users.subscription_tier`. RevenueCat dashboard, ~15 min, then an e2e
  webhook test. A finished paywall grants nothing server-side until this
  is real, but item 16 can be built before it. **[external]** (founder,
  dashboard — but free; do it any time)

**Track 4 — Backend loose ends** (all **[me-free]**, all small)
- Two prepared DB migrations (`user_crystals` FK + orphan cleanup;
  capture 16 untracked tables via `migration repair` — never `db push`)
- `subscription_quotas` missing from GDPR export
- `audit_logs` pre-existing-rows id backfill `UPDATE` (or moot if the
  accountant says prune)
- Mobile test suite — see 6 "Mobile has ZERO automated tests"
- ~~`/connect/[token]` 500~~ — **RESOLVED by the 0.6 fix**, it was the
  `sweph` failure, not token validation. No separate work.

**Track 5 — Env values** (all **[me-free]**, ~5 min each; were blocked on
Vercel, now unblocked)
- `NEXT_PUBLIC_APP_URL` in Vercel -> `https://www.stellaeum.com`
- `EXPO_PUBLIC_WEB_APP_URL` in `apps/mobile/.env.local` + EAS env

**Track 6 — External, founder-owned**
- Apple enrolment — **[external]**, NEXT WEEK (money)
- Google Play registration + 12 testers + 14-day closed test —
  **[external]**, NEXT WEEK (money); the 14-day wall is the true critical
  path
- Bulgarian privacy lawyer — **[external]**, email THIS WEEK (free); brief
  ready
- Accountant — controller legal entity + `audit_logs` payment-row
  retention — **[external]**
- Petko's LLM-provider decision — **[external]**, blocks the privacy
  policy's AI section + the 300/mo premium-cap re-derivation
- `support@stellaeum.com` — **[me-free / founder]**, THIS WEEK, 15 min
- App icon + designer assets (glyphs are Unicode placeholders now) —
  **[external]**
- Termly — **[me]** decision: don't buy (no Bulgarian). Needs ratification.

### 7.6 Sentry read token — noted, not urgent

The `SENTRY_AUTH_TOKEN` in `apps/web/.env.local` is a `sntrys_...`
org-scoped token provisioned for **source-map upload only**. It returns
`You do not have permission` on the Issues and Events APIs (tried both
`sentry.io` and the `de.sentry.io` EU region — the org is EU-hosted per
the token's `region_url`). Consequence: every production error diagnosis
currently depends on the founder screenshotting or pasting from the Sentry
dashboard. A **read token** for programmatic diagnosis needs, at minimum,
scopes **`event:read`** and **`project:read`** (add **`org:read`** to
enumerate projects). Create it as a Sentry **User Auth Token** (Settings ->
Account -> Auth Tokens) or an **Organization Auth Token** with those
scopes, store it as a separate env var (e.g. `SENTRY_READ_TOKEN`) so it is
not conflated with the upload token, and keep it out of `turbo.json` /
Vercel (local-diagnosis only). Not launch-blocking; do it when convenient.

### 7.7 Before real traffic — flip-these-back checklist

Things deliberately set to a debugging-friendly state during solo
pre-launch that MUST be reverted before the first real users:

- **Re-enable Vercel Skew Protection.** Turned OFF 2026-08-27 because,
  with the founder as the only user and actively deploying-then-probing,
  its only effect was pinning the browser to stale functions and
  corrupting every probe (§0.9, VSG #10). It exists to keep real users on
  a consistent version mid-rollout — that value returns the moment there
  is real traffic. Re-enable it (12h window is fine) before the closed
  test opens.
- ~~Remove the `[OPENROUTER-DEBUG]` shim in `lib/ai/client.ts`~~ —
  **DONE 2026-08-27**, removed the same day it was added once §0.8 turned
  out to be a phantom.
- **Back-out any temporary `console.error(await res.text())` / debug
  instrumentation** — none currently outstanding; keep the habit of
  listing new ones here.
- (Add here as more debug-state toggles accumulate.)
