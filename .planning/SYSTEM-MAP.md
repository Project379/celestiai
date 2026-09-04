---
title: Stellaeum system map — plain-language orientation
status: SNAPSHOT, 2026-09-01. Not a living document. Where this conflicts with the code or the placeholder register, the code and the register win.
created: 2026-09-01
method: synthesis of the two 2026-08-31 audits (ground-truth inventory, compliance/cost inventory) plus the 2026-08-26 technical sweep, the completion tracker, and the session handoff. New investigation this session only where those did not cover something.
---

# Stellaeum system map

This document explains what Stellaeum is, what state each part is in, and
what that means — for a reader who is not holding the codebase in their
head. It is an orientation document, not an audit. Two deep audits already
ran this week (a ground-truth inventory and a compliance/cost inventory);
this synthesises them rather than re-deriving their facts.

## How to read the tags

Every factual claim below carries one of three tags.

- **VERIFIED** — confirmed in one of the two 2026-08-31 audits, or read
  directly in the code or a live system this session (2026-09-01).
- **INFERRED** — taken from a dated planning document that the two audits
  did not re-check (most often the 2026-08-26 technical sweep, or the
  April-dated pre-launch prerequisites). Probably still true. Not
  re-confirmed.
- **UNKNOWN** — nobody has checked this week or in the two prior audits.
  The claim states what it would take to find out. UNKNOWN is a real
  answer here, not a gap in this document.

"We" / "our" means the Stellaeum project. "Rented" means a third-party
service we pay for and do not control. "Ours" means code in this repo.

---

# One-page summary

Stellaeum is a subscription astrology app for the Bulgarian market, built
for web, iOS and Android from one codebase. **Almost all of it is built** —
web has 19 pages, mobile has 27 screens, and the two are close to feature
parity; the astronomy engine is validated against an outside reference; the
backend's authentication and access-control came through a security sweep
clean. **Almost none of it has met a real user.** Every external service is
on test credentials, there is no privacy-policy text and no cookie consent,
nothing identifies the operating company, the AI model is an explicit
placeholder that writes weak Bulgarian and invents precise-looking numbers
it is not actually reading, and there is no safety check of any kind
between that model and the screen. Performance is essentially unmeasured:
no page-load, latency, bundle-size or cold-start numbers exist anywhere.
Launch is gated less by code than by three calendar clocks that have not
started — Apple Developer enrolment, Google Play's mandatory 14-day closed
test, and a Bulgarian data-protection lawyer for the privacy policy.

**The three things to fix first, in dependency order:**

1. **Close the LLM provider decision.** It has been open for weeks and it
   is now the critical path for the privacy policy — the policy cannot name
   its AI sub-processor or its data-transfer jurisdiction until a provider
   is chosen, and the policy is the long pole for launch. The same decision
   re-sets the premium usage cap. It is a co-founder (Petko) call, not an
   engineering task; the code change afterwards is a few lines in one file.

2. **Build Sign in with Apple.** Shipping Google sign-in as a launch
   feature made Apple's "Sign in with Apple" mandatory. The mobile app
   cannot be submitted to the App Store without it. The client-side work
   can start now; the final configuration and device test wait on Apple
   Developer enrolment, which is a founder payment step.

3. **Reconcile the database migration ledger.** Production's record of
   which schema migrations have run (8 entries) does not match the
   migration files in the repo (18 files; 13 unrecorded). The next careless
   move here — a blind `supabase db push` — would replay migrations that
   include dropping a column that is live in production. That is silent
   data loss. Reconcile it deliberately, one file at a time, before anyone
   touches migrations again.

A fourth item is not dependency-gated but deserves a product ruling before
launch regardless: **there is zero content-safety handling** on AI output
that reaches users in emotionally serious territory. Even a static
disclaimer line would be a change from nothing.

---

# 1. Product surface — what a user can actually do

**1. What it is.** The set of things a person can do in the app, on web
and on mobile. Stellaeum's promise is a daily, personalised astrology
reading that feels like advice from a knowledgeable friend, backed by
real astronomical calculation.

**2. Current state (VERIFIED, both 2026-08-31 audits).**

A user can:

- **Create an account** — email + password, with two-factor, via Clerk
  (the rented auth service). **Google sign-in** works on mobile
  (device-verified on Android 2026-08-31; not yet tested on iPhone).
- **Enter their birth data** — date, time, and place, with a Bulgarian
  city/village search covering ~200 settlements. On mobile this is a
  4-screen wizard; on web it is one stepped form. Same feature, different
  shape.
- **See their natal chart** — an interactive wheel (tap a planet, get a
  Bulgarian interpretation), plus "big three" (Sun, Moon, Rising) cards.
- **Get an AI Oracle reading** — a long-form Bulgarian reading tied to
  their chart. Free accounts get a general reading; premium unlocks
  love / career / health topics. On mobile this is a full screen; on web
  it is a panel inside the chart page.
- **Get a daily horoscope** — a short reading based on the day's planetary
  movements against their chart, with a "today / yesterday" toggle.
- **Keep a lunar journal ("Ритъм" / Rhythm)** — diary entries tied to moon
  phases, stored server-side, exportable as a Markdown file.
- **Browse "You" content** — a crystals collection, personalised
  recommendations, and an astrology guide.
- **Use "Кръг" (Circle)** — save other people's profiles and generate
  compatibility ("synastry") reports; invite someone via a shareable link
  that lands on a web page (`/connect/[token]`) before they install the app.
- **Manage a subscription** — on web: subscribe via Stripe, open the
  billing portal, cancel (with an optional reason), and resubscribe, all
  without contacting support.
- **Export or delete their account and data** — a real GDPR data export
  (pulls from 9+ tables) and a real 30-day-grace hard delete.

**Moon detail** is a mobile-only screen with no web equivalent (VERIFIED).
This is a genuine one-platform feature, not an architecture difference.

**3. What is missing, broken, or unknown.**

- **Terms of service.** Placeholder status: see `.planning/PLACEHOLDERS.md`
  TERMS.
- **Mobile sells nothing.** The subscription screen on mobile is
  status/management only; the free-tier "subscribe" button sends the user
  to the web pricing page (VERIFIED). There is no native purchase flow —
  placeholder status: see `.planning/PLACEHOLDERS.md` PAYWALL-MOBILE.
- **Push-notification opt-in is barely reachable.** On web the
  subscribe/unsubscribe control was unmounted by an unrelated restyle
  commit; on mobile the permission prompt fires once, ever, after the
  first Oracle reading (VERIFIED). Placeholder status: see
  `.planning/PLACEHOLDERS.md` PUSH-ORPHAN.
- Whether every one of the 39 web API routes works end to end is
  **INFERRED** for 38 of them (file exists, non-trivial) and VERIFIED only
  for `oracle/generate`.

**4. Health: GOOD.** Nearly every promised feature is built and present on
both platforms; the gaps are edges (terms page, native paywall, push
opt-in), not missing core features.

**5. What would make it GOOD-with-no-asterisk.** A native mobile purchase
flow; a reachable notifications setting on both platforms; the `/terms`
page; and one end-to-end pass confirming each API route actually returns
real data, not just a 200.

---

# 2. Stack & architecture — the technologies and how a request flows

**1. What it is.** The list of technologies in use, what job each does,
and the path a single request takes from a user's tap to a response.

**2. Current state (VERIFIED against CLAUDE.md and the session handoff,
cross-checked with code reads in the audits).**

**The shape of the codebase.** One repository ("monorepo") managed by
Turborepo, with two apps and four shared packages:

- `apps/web` — the Next.js 15 website. Most features are built here first.
  Also hosts all the server-side API routes.
- `apps/mobile` — the Expo / React Native app (iOS + Android). Shares
  roughly 90% of its code with web through a library called Solito.
- `packages/core` — the load-bearing shared package: plain business logic
  and database access, deliberately free of any web/mobile framework code.
- `packages/astrology` — wraps the Swiss Ephemeris astronomy library.
- `packages/ui` — a tiny set of shared visual primitives.
- `packages/config` — shared linter and TypeScript settings.

**What each rented service does:**

| Service | Job | Ours or rented |
|---|---|---|
| **Clerk** | Sign-up, login, sessions, 2FA, Google sign-in | Rented |
| **Supabase** | The PostgreSQL database (and nothing else — see §3) | Rented |
| **OpenRouter** | Routes our AI calls to a language model | Rented |
| **Stripe** | Web subscription payments | Rented |
| **RevenueCat** | Mobile in-app purchase handling | Rented (not live) |
| **Sentry** | Catches and reports crashes/errors | Rented |
| **Vercel** | Hosts the web app and runs the API routes | Rented |
| **Swiss Ephemeris (`sweph`)** | The actual planetary math | Ours (library, GPL-2.0) |

**How a request flows, end to end** (VERIFIED for the Oracle path,
2026-08-31 audit; representative of the pattern):

1. The user taps "get a reading" in the mobile app (or web).
2. Mobile does **not** do the astronomy itself — it calls a web API route
   over HTTPS. (The native astronomy library is too heavy for the phone
   bundle and only runs server-side.)
3. The API route on Vercel checks the Clerk session (`auth()`), applies a
   rate limit, validates the request body, and confirms the user owns the
   chart they asked about.
4. It checks a cache table. On a miss, it claims one unit of the user's
   monthly quota (an atomic database operation with a refund path if
   generation fails).
5. It loads the **already-computed** chart data from the database, turns
   it into prompt text, and calls the language model through OpenRouter
   via the Vercel AI SDK.
6. The response is lightly cleaned of formatting markers, written to the
   cache table, and returned. A spell-check runs after the fact and only
   logs — it never blocks or rewrites.

**3. What is missing, broken, or unknown.**

- **The one real portability risk (INFERRED, 2026-08-31 compliance audit):**
  `sweph` is a native binary. It needs a Node-capable serverless host.
  Everything else could move off Vercel fairly easily; the astronomy
  routes could not move to an edge-only host without recompiling Swiss
  Ephemeris to WebAssembly.
- **CLAUDE.md's stack line says "PostgreSQL + Realtime."** The "Realtime"
  half is stale — there is zero realtime usage anywhere (VERIFIED). Also
  corrected in prior notes: the app uses native `sweph`, not
  `swisseph-wasm`; charts render to SVG, not Canvas/Skia.

**4. Health: GOOD.** The architecture is coherent, well understood, and
mostly built on portable pieces. The team can explain any part of it.

**5. What would make it GOOD-with-no-asterisk.** A decision on whether the
`sweph` native-host constraint is acceptable long-term or worth a WASM
port; and a refresh of CLAUDE.md's stack section to match reality.

---

# 3. Database — what we store, how it is protected, the migration situation

**1. What it is.** One PostgreSQL database, hosted by Supabase. It holds
every piece of user data: accounts, charts, readings, journal entries,
Circle profiles and reports, crystal collections, subscription state,
and an audit log. Supabase is used as **plain managed Postgres** — none
of its extra features (realtime, file storage, edge functions, vector
search, its own auth) are used (VERIFIED, 2026-08-31 compliance audit).

**2. Current state.**

- **Size and scale (VERIFIED, queried live 2026-08-31):** 15 MB total.
  5 users, 5 charts, 20 daily horoscopes, 1 diary entry. This is
  pre-launch test data.
- **"RLS" — Row-Level Security — in practice (VERIFIED):** RLS is a
  Postgres feature that attaches an ownership rule to each table so a
  query can only return rows belonging to the logged-in user, enforced by
  the database itself rather than by application code. Stellaeum uses it
  heavily — 92 policy statements across the schema. User-data tables are
  locked to the owner; a set of internal tables (readings cache, transit
  cache, audit log, rate-limit buckets) are reachable only by the
  server's privileged "service role" key, never by a browser. A security
  sweep confirmed the lockdown holds and that no table leaks to an
  anonymous or wrong-user request (VERIFIED, technical sweep §1.1 and
  §3).
- **Indexes (INFERRED, technical sweep §6.5):** reviewed and judged good
  — the queries that will run at scale are covered.

**3. What is missing, broken, or unknown.**

- **The migration ledger does not match the repo.** Placeholder status:
  see `.planning/PLACEHOLDERS.md` MIGRATIONS (full ledger detail:
  `SCHEMA_DRIFT_AUDIT.md`). The operational trap: one unrecorded file
  (`20260413141504_schema_hardening.sql`) contains
  `DROP COLUMN subscription_tier` on a column that is **live in production
  right now**, so `supabase db push` is unsafe — the safe path is
  `supabase migration repair --status applied <version>`, one file at a
  time, only after reading production to confirm that file's effect is
  already there. Written into the session handoff as a named trap.
- **Two prepared migrations are written but not applied (INFERRED,
  technical sweep, marked "founder-owned"):** one adds a foreign key on
  the crystals tables (after deleting 13 known orphaned rows), one
  formally records the tables that exist in production but were never
  captured in a tracked migration (a leftover from an earlier ORM being
  removed). Placeholder status: see `.planning/PLACEHOLDERS.md`
  SCHEMA-UNTRACKED. Note: the two most recent migrations, previously
  documented as unapplied, **now show as applied in the live ledger**
  (VERIFIED 2026-08-31).
- **A drift-detection script exists but is not wired into CI (VERIFIED,
  2026-08-31 ground-truth audit).** If turned on today it would fail
  immediately, because of the state above.

**4. Health: WEAK.** Access control is genuinely strong and verified, but
the gap between what the repo thinks the schema is and what production
actually runs is large, undocumented in places, and booby-trapped against
the standard tooling.

**5. What would make it GOOD.** The ledger reconciled so repo and
production agree; the two prepared migrations applied via `repair`; the
drift script wired into CI and passing; and a short written record of why
the 16 tables were untracked so the history is not a mystery.

---

# 4. LLM & AI — the model, the prompt, and what is not checked

**In bad shape. Read this section first if you read only one.**

**1. What it is.** The part that turns a user's chart into a written
reading in Bulgarian. It calls one language model, through OpenRouter,
using a fixed system prompt plus a text description of the user's
computed chart. Two features use it: the Oracle reading and the daily
horoscope.

**2. Current state (VERIFIED — traced in full and measured with 10 real
generations, 2026-08-31 ground-truth audit).**

- **The model is `meta-llama/llama-3.3-70b-instruct`**, via OpenRouter,
  using a generic OpenAI-compatible client. CLAUDE.md and every planning
  doc call this an **explicit placeholder with known-weak Bulgarian
  output**. It is not the intended production model.
- **The prompt is built server-side only.** It contains: the fixed
  voice/format instructions, four topic variants, and a plain-text
  serialisation of the user's computed chart (planet, sign, degree,
  house, retrograde, aspects, ascendant). **No user free text ever
  reaches it** — not diary entries, not chart nicknames, nothing typed
  (VERIFIED). Only a chart ID (looked up server-side) and server-computed
  astronomy. So prompt injection is not a live attack surface on this
  feature.
- **What is checked about the output before the user sees it: nothing.**
  There is no safety filter, no sensitive-topic handling, no disclaimer,
  no format validation, and no retry on a malformed or truncated
  response (the last is a deliberate standing ruling — no
  retries/workarounds for a placeholder model). A spell-check runs
  afterwards and only writes a log line.

**3. What is wrong, plainly.**

- **Fabricated precision (VERIFIED, 10/10 sample readings, zero
  exceptions).** Every reading cites planetary positions in
  precise-looking degree-and-minute form (e.g. "14°49'") five to twelve
  times. **Within any single reading, every one of those citations is the
  same number** — the Sun, Moon, Mercury, Ascendant and Venus were all
  cited at "14°49'" in one reading — even though the chart data fed in
  gives each planet a different degree. In plain terms: the reading
  prints a specific-looking number to sound like it is reading your
  chart, and it is not reading your chart. This held in all ten samples.
- **Repetition (VERIFIED).** Across ten deliberately different charts,
  there were effectively two distinct opening sentences, not ten. The
  phrase "космически път" appeared in 10 of 10 readings. Six of ten
  opened with a construction that is **grammatically broken Bulgarian** —
  the model mashing two example phrases from the prompt into one
  ungrammatical clause.
- **No awareness of crisis, grief, medical, or self-harm content
  (VERIFIED).** The project's own market research says Bulgarians turn to
  astrology for psychological comfort during hard times. The pipeline has
  no signpost to any support resource anywhere, and no filter for these
  topics.

**4. Health: BROKEN.** The plumbing works — caching, quota, streaming
normalisation all function — but the actual product (a good Bulgarian
reading) is not fit to show a paying user on the current model, and there
is no safety layer at all on emotionally serious output.

**5. What would make it GOOD.** A production model chosen and swapped in
(a small code change once decided — see §12); its Bulgarian output
measured against the same speller the gates use and read for register; a
minimum content-safety decision made and shipped (even a static
disclaimer line and a crisis-resource link); and a re-run of the
10-reading variety test showing distinct openings and per-planet degrees
that actually match the input.

---

# 5. Astrology engine — what calculates the charts, and is it right

**1. What it is.** The code that takes a birth date, time and place and
produces planet positions, house cusps, and aspects. It is
`packages/astrology`, wrapping the Swiss Ephemeris library (`sweph`) in
"Moshier" mode, meaning it computes positions from formulae with no
external data files. It runs server-side only.

**2. Current state (VERIFIED, pre-launch prerequisites item 6, closed
2026-04-21).**

- The output was validated against outside references: a 12-case test set
  (5 well-documented famous births plus 7 synthetic edge cases) checked
  through four tiers — planet positions against NASA's JPL Horizons
  service, the lunar node against a standard astronomy text, house cusps
  against an independent Placidus calculation, and aspects via unit
  tests.
- **Modern-era dates (roughly 1879–2020) passed clean** on all four
  tiers. This range matches the app's real user base by construction.
- Two far-future/far-past synthetic cases (year 1600, year 2200) showed
  small divergences, attributed (best guess, not proven) to differences
  between ephemeris generations. Out of scope for real users.
- A 39-test validation harness runs in its own CI workflow on any change
  to `packages/astrology` (VERIFIED, ground-truth audit §2).
- The house system is Placidus only, by decision (VERIFIED, PROJECT.md).

**3. What is missing, broken, or unknown.**

- The validation is explicitly scoped to modern-era dates. A user
  entering a pre-1879 birth date is outside what was checked (UNKNOWN in
  effect; low practical risk).
- The Swiss Ephemeris **Professional License** (CHF 700, one-time) is
  deliberately not purchased yet — the GPL-2.0 path is legally sufficient
  until the first real paying subscriber. A trigger is wired to log
  loudly when that happens. Not a correctness issue.

**4. Health: GOOD.** This is the most rigorously checked part of the
system. Someone did confirm the output against an outside source, and it
is re-checked on every relevant change.

**5. What would make it GOOD-with-no-asterisk.** It already is, for the
user base it serves. The only additions would be extending the validated
range if pre-1879 births ever matter, and buying the professional licence
promptly when the subscriber trigger fires.

---

# 6. Security — auth, rate limiting, secrets, input, injection, scanning

**1. What it is.** Everything that keeps one user out of another user's
data, keeps costs from running away, keeps secrets out of the wrong
hands, and catches bad input.

**2. Current state (VERIFIED, technical sweep 2026-08-26 §3 + Tier 1/2/3
fixes, cross-checked in the 2026-08-31 ground-truth audit).**

- **Authentication:** every one of the ~40 API routes is covered. Each
  either checks the Clerk session and returns 401 if absent, or (the two
  scheduled jobs) verifies a shared secret with a timing-safe compare, or
  (the two payment webhooks) verifies a cryptographic signature over the
  raw request body.
- **Authorisation:** the sweep read the ownership model of all 40 routes
  and found it clean — no route trusts a client-supplied ID without
  checking ownership; unscoped helper functions are always paired with a
  membership check at the caller.
- **Rate limiting:** every authenticated route rate-limits before doing
  database work. On the three money-spending routes (Oracle generate,
  horoscope generate, birth-data create) the limiter **fails closed** (a
  limiter outage blocks the request); everywhere else it **fails open**
  by deliberate ruling, so a limiter bug cannot cause a full outage on a
  route that was not spending money.
- **The serious money-path holes found in the sweep are fixed
  (VERIFIED):** the horoscope route had no quota at all and chart
  creation was uncapped — chained, that was ~7,200 free paid generations
  a day; both now share the monthly quota gate and chart creation caps at
  20. The RevenueCat webhook secret was byte-identical to a key shipped
  inside the mobile app bundle (anyone could have forged a "grant me
  premium" call) — rotated to a random value (the webhook is now dead
  rather than forgeable until the real secret is set).
- **Input validation is inconsistent (VERIFIED, ground-truth audit §2):**
  only 4 of 40 routes use a schema validator (`zod`), all four in Circle.
  Every other route hand-casts the request body. One confirmed injection
  point was fixed in the sweep (`cities/search` interpolated raw input
  into a database filter string).

**3. What is missing (VERIFIED, ground-truth audit §2, "explicit
yes/no"):**

- **No dependency-vulnerability scanning.** No `pnpm audit` step, no
  Dependabot. On a monorepo that will process real payments.
- **No secret scanning, and no pre-commit hooks of any kind.** The
  repo's own history includes an API key that was screenshot-exposed
  once.
- **No automated licence checking** beyond one hand-written grep for
  `sweph`.
- **Everything is on test/development credentials (INFERRED, sweep §2.3):**
  Clerk (`pk_test_`/`sk_test_`), Stripe (`sk_test_`), RevenueCat (Test
  Store). Moving Clerk to production is a separate instance — every
  current user record becomes orphaned, the domain needs DNS records, and
  the database's JWT verification must be re-pointed or every
  browser-side query silently returns nothing.

**4. Health: OK.** The parts that were audited hard — auth, authorisation,
ownership, the money paths — are genuinely solid and were fixed where
weak. The gap is the automated safety net around them: no scanning of any
kind, and input validation that depends on each route author remembering.

**5. What would make it GOOD.** Dependency and secret scanning wired into
CI (both are cheap — under an hour each per the audit); one shared
request-body validation helper adopted across the routes; and the
production-credentials cutover planned and rehearsed rather than done
under launch pressure.

---

# 7. Performance — what is measured

**Almost nothing is measured. This category is mostly UNKNOWN, and that
is the finding.**

**1. What it is.** How fast the app is in the ways users feel it: page
load, API response time, database query time, JavaScript bundle size,
mobile app cold-start time, and how long an Oracle reading takes to
generate.

**2. Current state — what is actually measured (VERIFIED, 2026-08-31
compliance audit §8–§9):**

- **Cost per AI generation**, measured with real API calls: Oracle
  ~$0.00086, horoscope ~$0.00021. This is a **cost** number, not a
  **speed** number — it says nothing about how long the user waits.
- **Database size and cache-hit rate:** 15 MB, 97–98% cache hits. At this
  size, query performance is not a concern yet.
- **Database indexes:** reviewed and judged adequate for scale (INFERRED,
  sweep §6.5).
- **Web middleware bundle:** 147 kB, seen in passing during the Next.js
  upgrade (INFERRED, completion tracker). No full bundle analysis.

**3. What is not measured (UNKNOWN):**

| Metric | Status | What it would take |
|---|---|---|
| Web page load (real users) | UNKNOWN | A real-user monitoring tool (e.g. Vercel Analytics / a synthetic Lighthouse run in CI). Hours to set up. |
| API latency (p50/p95) | UNKNOWN | Either the load-test harness below, or per-route timing logged to Sentry/an APM. The harness does not exist yet. |
| DB query times under load | UNKNOWN | The load test. Blocked on M4 (streaming-endpoint extraction) per the load-test plan. |
| JS bundle size (web + mobile) | UNKNOWN | A bundle analyzer run — a few hours for a one-off look, half a day for a CI regression gate. |
| Mobile cold start | UNKNOWN | Timed on a real device / emulator with the profiler. Needs a device pass. |
| Oracle generation wall-clock time | UNKNOWN | Time the real end-to-end call. The 10-reading audit measured tokens and cost but not latency. |

The load test (Scenarios B and C: 100 concurrent warm-cache, 50
concurrent cold-cache) is a named pre-launch gate and is **blocked** — the
harness to run it has not been built, and it depends on M4 work.

**4. Health: UNKNOWN.** Not "bad" — genuinely unmeasured. There is no
evidence the app is slow and no evidence it is fast.

**5. What would make it GOOD.** A number for each row in the table above,
taken once before launch to set a baseline; real-user monitoring on web
so regressions are visible; and the load test unblocked and passing its
thresholds.

---

# 8. Testing & gates — what runs on every push, and what it misses

**1. What it is.** The automated checks that run on every pull request and
every push to `main`, and what they actually catch.

**2. Current state (VERIFIED, ground-truth audit §2–§3, ran the suites
directly).**

CI runs, in order: an install, a hand-written check that pins the `sweph`
licence version, then `check:all` — nine gates (referred to by script
name only; the `&&`-chain position is not a stable identifier):

- **`check:strictness`** — one TypeScript strictness flag stays on in
  `packages/core`. Nothing else.
- **`check:bg-strings`** — spell-checks every hard-coded Bulgarian string
  against a dictionary. Catches typos and garbled text only — not
  register, not translated-sounding phrasing.
- **`check:copy-lock`** — compares all Bulgarian text against an
  approved snapshot (3,025 entries). Any unreviewed change fails it. A
  failure on genuinely new text is correct behaviour, not a bug.
- **`check:bg-lint-baseline`** — a ratchet: the count of Bulgarian
  strings sitting outside designated "content" files may not grow past
  1,778.
- **`check:error-codes`** — the same `ERR-*` code may not be reused
  across two files.
- **`typecheck`** — `tsc --noEmit` per workspace.
- **`lint`** — `next lint` (web) / `expo lint` (mobile) / eslint
  (`packages/core` only).
- **`test`** — `vitest run` per workspace.
- **`check:placeholders`** — the placeholder-register gate; see
  `.planning/PLACEHOLDERS.md` § "The gate".

**Test counts, run directly (VERIFIED):** web 209 pass, mobile 5 pass,
astrology 39 pass, `packages/core` **0 — no test script and no test
files**. The money path (paywall gating, entitlement resolution, both
payment webhook handlers, quota enforcement) is covered by web's tests.

**3. What it does not catch (VERIFIED, ground-truth audit):**

- **`packages/core` — the most load-bearing package in the repo — has no
  lint script and no test script.** It is not failing the gate; it is
  invisible to the gate. Confirmed zero test files.
- **`packages/ui` and `packages/astrology` have no lint script;** turbo
  silently skips them.
- **Mobile has 5 tests total**, all on one display-name helper. Its
  money-path UI has zero coverage.
- **No dead-code / unused-dependency / unused-export checking** anywhere
  (no knip, depcheck, or ts-prune). A `knip` reachability gate is scoped
  but not built — it would have caught the orphaned push-notification
  component.
- **No accessibility testing** beyond free static linting on web; mobile
  has none.
- **No bundle-size regression gate.**
- The through-line from the verification-surface-gaps doc: **a gate that
  has never run is not evidence of a clean codebase.** Every time a check
  in this project was turned on for the first time, it found something.

**4. Health: OK.** The gates that exist are well designed and catch real
classes of bug, especially around Bulgarian text. But the highest-value
package is uncovered, mobile is nearly uncovered, and there is no
scanning for dead code, vulnerable dependencies, or bundle bloat.

**5. What would make it GOOD.** Lint and a first real test suite on
`packages/core`; mobile tests on the money-path hooks; and the three
cheap missing scanners (dependency audit, secret scan, knip) wired in and
their first-run findings triaged.

---

# 9. Observability — what we would find out if it broke at 3am

**1. What it is.** The ability to learn that something is wrong in
production, and what, without a user telling us.

**2. Current state.**

- **Sentry is live on web (VERIFIED 2026-08-27):** error DSN inlined in
  the production bundle, the `/monitoring` tunnel configured, confirmed
  receiving events. It captures thrown server errors tagged with an
  `ERR-*` code, and unhandled React render errors.
- **Sentry is wired on mobile and receiving real events (VERIFIED
  2026-08-31):** a correctly-platformed `stellaeum-mobile` project with 4
  real issues, most recently updated same-day. Not freshly triggered by
  the audit, but the pipeline demonstrably works.
- **A premium-cap alert** fires via `Sentry.captureMessage` when a user
  crosses 200 generations in a month (VERIFIED).
- **A licensing alert** logs loudly on the first real paying subscriber
  (VERIFIED).

**3. What we would NOT find out (VERIFIED, verification-surface-gaps
#9/#10 and the completion tracker):**

- **A caught error returned as a 500 response is invisible to Sentry.** A
  route that catches its own error and returns `Response.json(..., 500)`
  is a normal return value, not a thrown exception — Sentry's error hooks
  never fire. "The dashboard is clean" means "nothing that reaches
  Sentry's instrumented surface has failed," not "production is healthy."
  This exact shape hid a production outage once already. Placeholder
  status: see `.planning/PLACEHOLDERS.md` CAUGHT-500S.
- **A silently failing scheduled job.** The `daily-horoscope` cron threw
  on every 06:00 run for weeks (a malformed push key) and nothing
  surfaced it until server-side Sentry went live. A scheduled job has no
  user watching and no caller to return an error to.
- **Which deployment answered a request.** A hazard on both sides of the
  Vercel Skew Protection switch. **Off (current state):** a browser that
  loaded the app from one deployment can fetch JS chunks or hit API
  routes served by a newer one — chunk-load failures and version
  mismatch mid-session. **On:** a browser is pinned to the deployment it
  first reached, so a shipped fix can be live for hours while that
  session still sees the old behaviour — "deployed the fix, still
  failing" and "the fix isn't served to me yet" look identical from
  outside. Neither state is diagnosable without a build/version marker in
  responses. Placeholder status: see `.planning/PLACEHOLDERS.md`
  SKEW-PROTECT and BUILD-SHA.
- **Anything about user behaviour.** No funnel (visit → sign-up → first
  chart → first reading), no feature-engagement events (VERIFIED,
  compliance audit §5). If sign-ups dropped 50% overnight we would not
  have a number for it. Placeholder status: see `.planning/PLACEHOLDERS.md`
  ANALYTICS-VENDOR.
- **No uptime / heartbeat monitor.** A post-deploy smoke test would hit
  every compute route and both crons, with a probe marker so it doesn't
  page like a real outage. Placeholder status: see
  `.planning/PLACEHOLDERS.md` SMOKE-TEST.

**4. Health: WEAK.** Crash reporting works and has already earned its
keep. But the two things you most want at 3am — "is the money path up?"
and "are scheduled jobs running?" — are not monitored, caught-error 500s
are invisible, and there is no behavioural data at all.

**5. What would make it GOOD.** The post-deploy smoke test built and
wired (covering routes and crons, with the probe marker and a build-SHA
in responses); an analytics vendor chosen and the signup funnel
instrumented; and `Sentry.captureException` added at the point routes
return a 500 so caught errors stop being invisible.

---

# 10. Payments & money path — how a user pays, per platform

**1. What it is.** The path from "I want premium" to money arriving and
the account being upgraded, on each platform.

**2. Current state.**

**Web (VERIFIED, compliance audit §2–§3, code read in full):**

- Subscribe via Stripe's hosted checkout page. Plans shown as €6,99/mo
  and €59,99/yr on `/pricing`.
- A Stripe webhook updates the user's tier on payment; it verifies the
  signature, is idempotent, and returns 500 on error so Stripe retries.
  Covered by 17 tests against the real route.
- Cancel, reason-capture, resubscribe, and the billing portal all work
  in-product without contacting support.
- **All of this is on Stripe test-mode keys and test-mode prices**
  (INFERRED, sweep §2.3).

**Mobile (VERIFIED, compliance audit §7):**

- **Mobile sells nothing.** The premium screen is status/management only;
  the RevenueCat paywall UI is a separate halt-required batch. Placeholder
  status: see `.planning/PLACEHOLDERS.md` PAYWALL-MOBILE.
- The free-tier CTA opens web's `/pricing` in a browser (whether a mobile
  user with no web session can complete sign-in-then-purchase there is
  unverified). The CTA is currently hidden because the mobile web-app-URL
  env var is unset — placeholder status: see `.planning/PLACEHOLDERS.md`
  APP-URL-MOBILE.
- The RevenueCat SDK is installed and linked to the Clerk identity, but
  every real RevenueCat webhook call fails the signature check until the
  real signing secret is set. Placeholder status: see
  `.planning/PLACEHOLDERS.md` RC-WEBHOOK-SECRET.

**3. What is incomplete.**

- Web: the entire path is unproven with real money (test keys).
- Mobile: no native paywall UI, no purchase call, dead webhook. This is a
  halt-required item — it needs a founder ruling on what the paywall
  shows and what test coverage is required before a real-money path ships.
- Pricing-page legal disclosures (VAT rate, auto-renewal, cancellation,
  Terms/Privacy links): status tracked in §11, not restated here.

**4. Health: WEAK.** Web has a complete, well-tested path that has never
run in production or taken a real payment. Mobile cannot take money at
all, and the one integration that is wired (RevenueCat) is non-functional
pending a five-minute dashboard action.

**5. What would make it GOOD.** Web flipped to live Stripe keys and one
real end-to-end purchase confirmed; the RevenueCat signing secret set and
a test event confirmed to sync; and a native mobile paywall built after
the founder ruling. Pricing-page legal disclosures: see §11.

---

# 11. Compliance — the legal obligations, plainly

**Status: see `.planning/PLACEHOLDERS.md`** — TERMS, AI-ACT-COPY,
ENTITY-NAME, WITHDRAWAL-COPY, STRIPE-TOS-URL, PRIVACY-REVIEW,
DPA-CONTRACTS, COOKIE-CONSENT, COMPLIANCE-AUDIT-RERUN. The per-obligation
status lives there, not here; this section is the narrative of what each
obligation requires and why it matters.

**1. What it is.** The things EU and Bulgarian law require of a
subscription app that collects personal data and sells to consumers.

**2–3. Obligation by obligation (VERIFIED, compliance audit 2026-08-31):**

- **A privacy policy that actually describes this app.** Required by
  GDPR. A `/privacy` route exists; the real policy must name birth date +
  exact birth time + birth location as the data collected, state the
  lawful basis and retention period, and disclose that this data (in
  computed form) is sent to a third-party AI provider, possibly outside
  the EU. **Consequence of missing it:** regulator
  exposure with Bulgaria's CPDP, and an automatic App Store rejection if
  the privacy URL does not resolve to a real policy. **Status:** see
  `.planning/PLACEHOLDERS.md` PRIVACY-REVIEW.
- **Terms of service.** Apple requires a EULA (its standard one is
  acceptable if we supply none) plus visible subscription terms. Ours
  must add subscription price/renewal/cancellation wording, governing law
  (Bulgaria), an acceptable-use clause, a liability limit, and an
  astrology disclaimer ("for self-knowledge and entertainment, not
  professional advice"). **Consequence:** a subscription app with no
  visible terms is a common App Store rejection. Lighter than the privacy
  policy — a template plus a short lawyer review. **Status:** see
  `.planning/PLACEHOLDERS.md` TERMS.
- **AI-generated-content disclosure (EU AI Act Article 50).** Content
  that is AI-generated must be labelled as such. **Consequence:** a
  compliance gap under the AI Act's transparency rules, on every Oracle
  and horoscope surface. **Status:** see `.planning/PLACEHOLDERS.md`
  AI-ACT-COPY.
- **Trader identification.** EU consumer law requires the operating
  company be identifiable: legal entity name, company number (ЕИК),
  registered address, VAT number, and the supervisory authority.
  **Consequence:** a straightforward consumer-protection breach; also
  weakens the App Store and payment-provider position. **Status:** see
  `.planning/PLACEHOLDERS.md` ENTITY-NAME.
- **Cookie consent.** Required only for non-essential cookies/trackers.
  Clerk and Stripe cookies are strictly necessary and exempt.
  **Consequence:** none *if* the launch decision is no third-party
  analytics — then no banner is needed. The moment analytics is added, a
  banner becomes mandatory. **Status:** see `.planning/PLACEHOLDERS.md`
  COOKIE-CONSENT.
- **Data-processor contracts (DPAs).** GDPR requires a signed data
  processing agreement with each processor — Clerk, Supabase, Stripe,
  OpenRouter (or its replacement), Sentry. **Consequence:** direct GDPR
  liability for transfers to processors with no contract in place.
  **Status:** see `.planning/PLACEHOLDERS.md` DPA-CONTRACTS.
- **Right to erasure and data export.** GDPR Articles 15 and 17.
  **Status:** genuinely met — a real data export across 9+ tables and a
  real hard-delete (not a soft disable), which also satisfies Apple's
  account-deletion rule. This is the one obligation in good shape.
- **Consumer withdrawal right (14-day).** For digital subscriptions, EU
  law needs either a consent to immediate performance (waiving the right)
  or a withdrawal notice. **Consequence:** the 14-day withdrawal right
  technically still applies to every subscriber. **Status:** see
  `.planning/PLACEHOLDERS.md` WITHDRAWAL-COPY.

**4. Health.** Data-subject rights (export/delete) are done well. Current
per-obligation health: see `.planning/PLACEHOLDERS.md` (the row IDs
listed at the top of this section) — not restated here to avoid drift.
The real Bulgarian privacy policy is on the critical path for launch
regardless of the other rows' status.

**5. What would make it GOOD.** The lawyer engaged and the real Bulgarian
privacy policy and terms shipped (not the current placeholder copy); real
entity data (name / ЕИК / address / VAT) replacing the bracketed
placeholders in the footer; the processor DPAs signed; and an independent
re-verification of the rest of this section's code-level claims — see
COMPLIANCE-AUDIT-RERUN.

---

# 12. Third parties & data flow — every external service

**1. What it is.** Each outside service, what it does for us, what data it
receives, and what breaks if it goes down.

**2. Current state (VERIFIED, compliance audit §6 + portability §10).**

| Service | What it does | Data it receives | If it goes down |
|---|---|---|---|
| **Clerk** | Auth, sessions, 2FA, Google sign-in | Email + name | Nobody can log in or sign up. Total outage of the authed app. |
| **Supabase** | The database | All user data | Total outage. Nothing reads or writes. |
| **OpenRouter** | Routes AI calls to the model | **Computed chart data only** — planet/sign/degree/house/aspect/ascendant + a "birth time known" flag. **No birth date, time, or place. No free text.** | Oracle and horoscope generation fail. **There is no fallback provider and no retry** — a 429 or 5xx becomes a 502 to the user. Rest of the app is fine. |
| **Stripe** | Web payments | Customer ID + metadata. No astrology data. | No new web subscriptions; existing users unaffected until renewal. |
| **RevenueCat** | Mobile IAP (not live) | The Clerk user ID only | Nothing today (not in use). |
| **Sentry** | Error reporting | Errors with PII scrubbing on (`sendDefaultPii: false`), no session replay | We fly blind on errors; app keeps working. |
| **Vercel** | Hosts web + API routes | All request traffic | Total outage of web and of the API that mobile depends on. |
| **PostHog (Cloud EU)** | Product analytics — added 2026-09-03. Exactly five events (signup completed, birth data submitted, chart first viewed, free Oracle reading generated, subscription started), no autocapture, no session replay, no heatmaps, no surveys, no feature flags/experiments (`advanced_disable_flags` / `disableRemoteFeatureFlags` on both platforms) | The Clerk user ID as `distinct_id` (same opaque string RevenueCat uses — never email, never name), each bare event name, and PostHog's own default event metadata (`$browser`/`$os`/`$device_type`/`$lib`/`$session_id` on web; RN's device/app-version fields on mobile — no autocapture DOM/touch data on either). **No birth data, no reading content, no free text.** Configured cookieless (`persistence: 'memory'`, both platforms — see COOKIE-CONSENT, `.planning/PLACEHOLDERS.md`); a `before_send` hook strips the query string from `$current_url`/`$pathname`/etc. on web so a URL like `/subscription/success?session_id=...` never ships the Stripe session id. IP: `disableGeoip: true` is set on mobile (stops geo enrichment); the browser SDK has no equivalent client option — full "PostHog never sees/stores the raw IP" requires the project-level "Discard client IP data" toggle in the PostHog dashboard, which is **founder-owned, not verifiable from code** | Analytics blind spot only — no user-facing feature depends on PostHog. The `signup completed` event captures server-side from Vercel (see `lib/analytics/server-capture.ts`), so a PostHog outage cannot block account creation (fire-and-forget, try/caught). |

Google Maps and Cloudflare Turnstile: this line previously claimed they
were dead CSP allowlist entries. Re-checked 2026-09-04 (compliance
batch) — neither domain appears anywhere in `apps/web/middleware.ts`'s
CSP directives or any other CSP-relevant file, so there is nothing to
remove. Either they were already removed since this was written, or the
claim was never accurate; either way, current code has no such entries
(VERIFIED 2026-09-04).

**3. What is missing or unknown.**

- **Single AI provider, no failover (VERIFIED, pre-launch item 5a).** This
  is a named pre-launch gate awaiting a founder product decision: graceful
  degradation (a clear Bulgarian "temporarily unavailable" message) versus
  wiring a second provider behind the same call.
- **The provider choice drives the privacy policy.** A single direct
  provider = one name, one contract, one jurisdiction in the policy. A
  router (like OpenRouter) = the router plus every downstream model it can
  reach, unless an allowlist and zero-retention mode are enforced. An
  EU-hosted provider removes an entire cross-border-transfer section from
  the policy. This is why the LLM decision is the legal critical path.
- Whether the current OpenRouter account has zero-data-retention enabled
  is **UNKNOWN** — it would need checking in the OpenRouter dashboard.

**4. Health: OK.** The data flow is well understood and minimal — notably,
no birth identifiers leave our systems to the AI provider. The weak point
is the single AI provider with no failover and an unresolved retention
posture.

**5. What would make it GOOD.** The AI provider decided (with retention
terms in writing and zero-retention on); a failover or graceful-
degradation path shipped; and the dead allowlist entries removed.

---

# 13. Costs — what we pay, what scales, and break-even

**1. What it is.** The running cost of the service, which parts grow with
user count, and how many subscribers cover the bill.

**2. Current state (VERIFIED where measured, compliance audit §8–§9).**

- **AI generation, measured with real calls:** Oracle ~$0.00086 each,
  horoscope ~$0.00021 each, on the current placeholder model. The two
  recommended replacement models are **INFERRED** at roughly 7× that
  (~$0.006 Oracle) using catalog rates as a proxy — flagged as a likely
  overestimate.
- **Bulgarian costs ~2.2× more tokens per word than English** on this
  tokenizer (measured). A real cost driver on any model.
- **Supabase:** 15 MB database (0.19% of the free-tier cap). Not a cost
  constraint at any near-launch scale. Realtime and edge functions are
  unused, so those quotas are moot.
- **Vercel:** fully usage-based on the Pro plan — there is no clean
  "quota exceeded at N users" number. Cost is a credit that draws down at
  a rate this pre-launch app has no real traffic data to model.

**3. What scales with users vs. what does not.**

- **Scales with users:** AI generation calls (bounded per user by the
  monthly cap), Vercel function invocations and compute, Supabase egress
  and monthly-active-user count, Stripe's per-transaction fee.
- **Does not scale much:** database size (tiny, slow-growing), Clerk and
  Sentry at these volumes, the one-time Swiss Ephemeris licence.

**4. Break-even — with a caveat.** The audit's break-even math uses a
**€5.83 net per subscriber** assumption. That figure is not consistent
across the project's own documents: the LLM decision doc works from
€9,99/mo list, and the live pricing page shows €6,99/mo and €59,99/yr.
**The break-even numbers are only meaningful once the real net price is
fixed.** Against the audit's own €5.83 assumption:

- Current model: a subscriber would need ~6,700 Oracle generations/month
  to go margin-negative.
- Replacement models (estimated, list price): ~800–950/month.
- **The 300/month premium cap sits comfortably below the margin-negative
  line on every model checked** — by ~2.7× even in the worst case tested.
  Cost is not a launch risk on any model under consideration, at the cap.

**5. Health: OK.** The unit economics are measured and comfortable within
the usage cap. The open issues are the inconsistent price basis across
docs, and that the replacement-model costs are estimates, not
measurements — and the cap must be re-derived when the model swaps (a
named cross-reference to update).

**What would make it GOOD:** a single agreed net-price figure used
everywhere; the replacement model's cost measured on real calls; and the
premium cap re-derived at that model's list price (not its current
promotional price).

---

# 14. Mobile & app stores — state of the app, and what stands between us and acceptance

**1. What it is.** The Expo / React Native app for iOS and Android, and
the specific requirements Apple and Google enforce before they will list
it.

**2. Current state (VERIFIED).**

- **The app is built:** 27 real screens, all implemented, no stubs
  (ground-truth audit §1). Feature parity with web is close; Circle is
  functionally ported (a stale doc still says otherwise). Visual/design
  parity is a separate open workstream (Batch 8).
- **Google sign-in works** — device-verified on an Android emulator
  2026-08-31 (happy path and both cancel paths). Not yet tested on
  iPhone.
- **Sentry is receiving real events from the mobile project.**
- **First automated tests exist** (5 cases) — before that, mobile had
  zero.

**3. What stands between us and store acceptance:**

- **Sign in with Apple — hard App Store submission blocker (VERIFIED).**
  Shipping Google sign-in made it mandatory under Apple Guideline 4.8.
  Client work (config plugin, `app.json`, button) can be done now; the
  capability, keys, Clerk config, and a device test are **blocked on
  Apple Developer enrolment** (a founder payment step, next week). It
  will sit untested for however long enrolment takes.
- **Apple Developer enrolment itself** — not started; days (Individual)
  to weeks (Organization, needs a D-U-N-S number).
- **Google Play** — registration, then a **mandatory 14-day closed test
  with at least 12 testers**, counted from the first signed build upload.
  Not started.
- **A live, resolving privacy-policy URL** — the mobile app hardcodes
  `stellaeum.com/privacy`; Apple checks it resolves. It now does (Vercel
  deployed 2026-08-27), but the page content is still a placeholder (§11).
- **Store listing** must disclose which features are paid (Apple 3.1.2),
  which constrains the still-unbuilt paywall mockup.
- **Production Clerk instance** — mobile currently ships a test
  publishable key baked into the bundle; production is a separate
  instance and a new build (§6).
- **A native paywall** — nothing to submit for review as the purchase
  experience yet (§10).
- **APNs push credentials** — end-to-end push delivery on iOS is
  unverified, blocked on Apple enrolment.

**4. Health: WEAK.** The app is substantially built and stable, but it is
**not submittable today** — Sign in with Apple alone blocks it, and
behind that sit enrolment, the production Clerk cutover, the paywall, and
the 14-day Play clock that has not started.

**5. What would make it GOOD.** Apple enrolment complete; Sign in with
Apple live and device-tested; the production Clerk instance cut over and
a fresh build shipped; a native paywall built; the privacy policy real;
and the Play closed test started (its 14 days are unavoidable calendar
time).

---

# 15. Developer tasks — everything that needs doing

Grouped by what each one blocks, ordered within each group by dependency
(what has to happen first), not by size.

## Blocks launch

1. **LLM provider decision (co-founder / Petko).** Waiting on: nobody —
   it is a decision, and it has been open for weeks. Unblocks the privacy
   policy (AI sub-processor + jurisdiction) and the premium-cap
   re-derivation. The code change afterward is small.
2. **Engage the Bulgarian data-protection lawyer (founder).** Waiting on:
   nothing (the brief is written) — though the AI section needs task 1's
   output to finalise. Longest legal clock.
3. **Apple Developer enrolment (founder).** Waiting on: money (next
   week). Unblocks Sign in with Apple config, APNs, TestFlight.
4. **Google Play registration + start the 14-day closed test (founder).**
   Waiting on: money (next week) + a signed build. The 14 days are
   unavoidable once started.
5. **Sign in with Apple — client work (engineering).** Waiting on:
   nothing to start; final config and device test wait on task 3.
6. **Privacy policy + Terms pages (lawyer, then engineering).** Waiting
   on: task 2, and task 1 for the AI section.
7. **AI-generated-content label on Oracle + horoscope (engineering).**
   Waiting on: a founder ruling on wording. Small.
8. **Trader-identification footer — entity name, ЕИК, VAT, CPDP
   (founder supplies details, engineering builds).** Waiting on: the
   founder confirming the operating entity.
9. **Content-safety decision for AI output (founder ruling, then
   engineering).** Waiting on: a product call. Even a static disclaimer +
   crisis-resource link is a change from nothing.
10. **Reconcile the migration ledger (engineering).** Waiting on: nothing
    — but must be done carefully, one file at a time, via `migration
    repair`, never `db push`. Blocks any further schema change safely.
11. **Post-deploy smoke test (engineering).** Waiting on: nothing. Must
    ship with a probe marker and a build-SHA in responses.
12. **Analytics vendor decision + signup-funnel instrumentation (founder
    decides, engineering builds).** Waiting on: a vendor choice. Also
    determines whether a cookie banner is needed.
13. **Production-credentials cutover — Clerk, Stripe, RevenueCat
    (founder-owned dashboard work + a mobile rebuild).** Waiting on: the
    domain/DNS and a planned cutover; orphans every current test user.

## Blocks revenue

14. **RevenueCat webhook signing secret (founder, dashboard, ~5 min).**
    Waiting on: nothing. Placeholder status: see
    `.planning/PLACEHOLDERS.md` RC-WEBHOOK-SECRET.
15. **Native mobile paywall UI + purchase call (founder ruling, then
    engineering).** Waiting on: a ruling on what it shows and required
    test coverage. Halt-required. Placeholder status: see
    `.planning/PLACEHOLDERS.md` PAYWALL-MOBILE.
16. **Auto-renewal + VAT + legal-link disclosures on the pricing page
    (engineering).** Waiting on: the Terms page existing (task 6).
17. **Mobile sign-in-then-purchase-on-web flow — verify it works
    (engineering).** Waiting on: `NEXT_PUBLIC_APP_URL` / redirect wiring
    confirmed against the live domain.

## Blocks scale

18. **Load test — Scenarios B and C (engineering).** Waiting on: the M4
    streaming-endpoint work and a load-test harness that does not exist
    yet.
19. **OpenRouter (or successor) rate-limit + cost envelope documented
    (engineering).** Waiting on: task 1.
20. **AI provider failover or graceful degradation (founder ruling, then
    engineering).** Waiting on: a product call.
21. **Cron throughput for real subscriber counts.** Partly done
    (defensive limits, batched sends). Full fix waits on real scale data.
22. **Baseline performance numbers (engineering).** Waiting on: nothing
    — page load, bundle size, cold start, generation latency all
    measurable now.

## Cleanup

23. **`packages/core` — add a lint script and a first test suite.**
24. **Dependency-vuln scanning, secret scanning, `knip` reachability —
    wire in, triage first-run findings.**
25. **Adopt one shared request-body validation helper across the API
    routes.**
26. **Fix the 5 `react-hooks/exhaustive-deps` correctness warnings** and
    remove the 2 stale eslint-disable directives.
27. **Fix `/connect/[token]` returning HTTP 500 (not a friendly 404) for
    an unknown token.**
28. **Re-mount or replace the orphaned web push-notification control;**
    add a notifications toggle to mobile settings.
29. **Apply the two prepared migrations** (crystals FK + untracked-table
    capture) via `migration repair`.
30. **Refresh stale docs** — CLAUDE.md's "Realtime" line, PROJECT.md /
    STATE.md progress snapshots, the Circle parity doc.
31. **Split or refactor the 3 largest/riskiest files** (`CelestialCanvas.tsx`,
    mobile `index.tsx`, `CircleHub.tsx`) — not urgent.
32. **Flip-back-before-traffic checklist** — re-enable Vercel Skew
    Protection; remove any debug instrumentation.

**Health of this list: WEAK** — the launch-blocking group is long, and
several items are gated on calendar time (Apple, Play, lawyer) that
cannot be compressed by working harder.

---

# 16. What nobody is watching

Parts of the system that no test, no gate, no monitor, and no document
currently covers. These are the blind spots — where the next problem is
most likely to go unnoticed until a user or a regulator finds it.

Each item names an unwatched surface. Current status of the tracked ones
lives in the register — pointers below, not restated here.

1. **`packages/core` is outside every gate.** No lint script, no test
   script, so the gate can neither pass nor fail on it. Register:
   `.planning/PLACEHOLDERS.md` CORE-TESTS.
2. **A caught error returned as a 500 raises no Sentry event.** A green
   dashboard cannot distinguish "healthy" from "failing inside a
   try/catch." Register: `.planning/PLACEHOLDERS.md` CAUGHT-500S.
3. **A scheduled job has no caller to notice when it stops.** No
   post-deploy probe hits the crons. Register: `.planning/PLACEHOLDERS.md`
   SMOKE-TEST.
4. **Nothing checks whether a component is still reachable.** Gates
   exercise code that runs, not code that is wired in; an unrelated commit
   can orphan a component and every gate still passes. Register:
   `.planning/PLACEHOLDERS.md` PUSH-ORPHAN (the tracked instance).
5. **A response does not say which deployment produced it.** No
   build/version marker, so "did the fix deploy?" is not answerable from
   the response. Register: `.planning/PLACEHOLDERS.md` BUILD-SHA and
   SKEW-PROTECT.
6. **No user-behaviour signal of any kind.** No funnel, no drop-off, no
   feature-engagement events. Register: `.planning/PLACEHOLDERS.md`
   ANALYTICS-VENDOR.
7. **Nothing scans dependencies for known vulnerabilities.** Register:
   `.planning/PLACEHOLDERS.md` DEP-AUDIT.
8. **Nothing scans commits or the history for secrets.** No secret
   scanner, no pre-commit hook. Register: `.planning/PLACEHOLDERS.md`
   SECRET-SCAN.
9. **The repo's schema and production's schema are not checked against
   each other.** The drift-detection script is not wired into CI, and the
   standard reconcile command is unsafe here. Register:
   `.planning/PLACEHOLDERS.md` MIGRATIONS and SCHEMA-UNTRACKED.
10. **No performance dimension a user feels is measured** — load time,
    latency, bundle size, cold start, generation time. Nothing to
    regress against. (No register ID — no perf gate is scoped.)
11. **Nothing inspects an AI generation before it reaches the user.** No
    check for the fabricated-precision pattern, register drift, script
    drift into Russian, truncation, or crisis-topic content — the only
    post-generation step is a spell-check that logs. Register:
    `.planning/PLACEHOLDERS.md` LLM-GUARDRAILS and ASTRO-INJECT.
12. **No systemic check for register mix in composed Bulgarian strings**
    (formal and informal forms assembled into one sentence) — caught ad
    hoc only. (No register ID.)
13. **No accessibility checking on mobile** — no lint rule, no runtime
    check. (No register ID.)
14. **Only one of the ~39 web API routes has been verified to return
    correct data**, not just a status code. (No register ID.)
15. **Nothing alerts on a webhook receiving zero valid traffic.** The
    RevenueCat webhook currently cannot succeed, and that silence is
    indistinguishable from "no purchases yet." Register:
    `.planning/PLACEHOLDERS.md` RC-WEBHOOK-SECRET.
