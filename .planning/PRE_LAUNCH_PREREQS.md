# Pre-Launch Prerequisites

**Purpose:** single canonical list of product-readiness gates that must clear before Celestia AI goes to public launch. Items here are not scoped to a specific M-phase — they cut across phases and don't belong in any single phase doc.

**How this differs from other planning artifacts:**
- `BROWSER_CHECKLIST.md` — manual UAT scope: what a human clicks through to sign off a release candidate.
- `LOAD_TEST_PLAN.md` — load-test scope: the scenarios + acceptance thresholds for concurrent-user capacity.
- `DATA_FETCHING_INVENTORY.md` / phase research docs — phase-specific planning.
- **This file** — readiness gates that don't fit any of the above. Telemetry, error monitoring, external-API rate limits, correctness validation, compliance.

**Adding items:** when something surfaces that needs to hold pre-launch but doesn't belong in an existing planning doc, add a row. Keep "why it's a blocker" short and explicit so future readers don't re-debate it.

**Status tags:**
- `[not started]` — identified, not picked up
- `[in progress]` — actively being worked, name the owner
- `[blocked]` — waiting on a prerequisite; name the blocker
- `[done]` — shipped, verified, evidence link provided

---

## Gate list

Last reviewed: 2026-04-20

| # | Item | Status | Owner | Last updated | Notes / evidence |
|---:|---|---|---|---|---|
| 1 | **Telemetry / analytics wired** — signup-funnel event coverage (visit → sign-up → onboarding complete → first chart saved → first reading) + feature-engagement events (daily crystal collect, diary save, oracle generate, transit view). Candidates: PostHog, Plausible, Vercel Analytics. No solution committed yet. | `[not started]` | unassigned | 2026-04-20 | Surfaced during §7 Bug 1 investigation — we couldn't quantify how many users hit the `approximate_time_range` crash and bounced because no funnel telemetry exists. Absence-of-data is the problem. Decide on a solution + ship the instrumentation before public launch. |
| 2 | **Error monitoring (Sentry or equivalent)** — server-side error aggregation replacing `console.error` as the destination for error-ID-tagged failures. Must capture the `ERR-*` tag so ticket triage can grep by code. | `[not started]` | unassigned | 2026-04-20 | The `ERR-BD-*` scheme introduced in §7 Bug 1 commit 5 assumes this exists eventually. Current implementation writes to stdout via `console.error` — works for local dev, invisible in production. One-line swap path documented: `Sentry.captureException(err, { tags: { errorId: 'ERR-BD-001' } })`. |
| 3 | **Browser UAT sign-off** — a human runs through `BROWSER_CHECKLIST.md` in incognito + DevTools Disable cache before each release. Every `[must-exercise]` item signed off. | `[not started]` | unassigned | 2026-04-20 | See `.planning/phases/m3-uat/BROWSER_CHECKLIST.md`. Programmatic UAT (66 assertions in `apps/web/scripts/m3-uat-harness.mjs`) is necessary but not sufficient — rendering fidelity, multi-cookie scenarios, and the Stripe `session_id` redirect_url round-trip only verifiable in a browser. |
| 4 | **Load-test Scenarios B and C passing** — per `LOAD_TEST_PLAN.md §3` — warm-cache at 100 concurrent + cold-cache at 50 concurrent. Acceptance criteria: P95 TTFB, throughput, cost envelope. Streaming endpoints depend on this per M4 predecessor chain. | `[blocked]` | unassigned | 2026-04-20 | Blocked on M4 (streaming-endpoint extraction) per `DATA_FETCHING_INVENTORY.md §7.2 Phase M4 predecessor chain`. Harness infra for the scenarios does not exist yet — that's the first predecessor. |
| 5 | **BgGPT API access verified + rate-limit policy understood** — Bulgarian-language LLM path. Confirm API key, rate limits, fallback behavior when the provider returns 429/5xx. Tied to M4 streaming work. | `[not started]` | unassigned | 2026-04-20 | Current oracle + horoscope implementations use OpenRouter (Llama 3.3 70B) as the primary model — Bulgarian quality is acceptable but not native-first. BgGPT as a dedicated Bulgarian-optimized provider is the target; integration path not yet scoped. |
| 6 | **Swiss Ephemeris output validation against JPL / astro.com reference** — golden-file tests comparing `@celestia/astrology` output against known reference data for ~10-20 historically significant dates or synthetic cases. Compare planet positions, house cusps, aspects to within a precision threshold (~0.01° for inner planets, looser for outer). | `[not started]` | unassigned | 2026-04-20 | **Genuine correctness gate.** If ephemeris outputs are wrong, the product is wrong regardless of UI polish. Flagged way back in round-1 planning but never built. Proposed approach: (a) pick a set of dates — e.g. J2000.0 epoch, a total solar eclipse, a notable historical figure's birth chart, random dates spanning 1900-2100 — (b) run `calculateNatalChart` against each, (c) fetch the same chart from astro.com's public output, (d) compare. Write as Vitest or Jest golden-file tests under `packages/astrology/` so regressions fail CI. |
| 7 | **Privacy / GDPR compliance** — EU-resident user data handling. Cookie consent if tracking cookies are used (decision depends on item 1). User-accessible data export + deletion paths (partially exists at `/api/gdpr/*` — confirm complete). Privacy notice copy in Bulgarian, reviewed for legal accuracy. Data processor contracts with Clerk / Supabase / Stripe / the chosen analytics vendor. | `[not started]` | unassigned | 2026-04-20 | `apps/web/app/api/gdpr/export/route.ts` + `apps/web/app/api/gdpr/delete-account/route.ts` exist — audit what they actually export/delete and whether coverage is complete across every table that holds user data. The `users.trial_claimed_at` and `users.subscription_status` columns flagged as "extra in DB" in `SCHEMA_DRIFT_AUDIT.md` are relevant here — if they hold user-identifying data, GDPR export must include them. |

---

## Categorization and ordering

**Hard correctness gates (must pass before any public user hits the product):**
- Item 6 — ephemeris validation. Wrong astrology = wrong product.
- Item 2 — error monitoring. Without it, production bugs stay invisible.
- Item 7 — GDPR. Legal exposure in EU markets including Bulgaria.

**Observability gates (needed to operate post-launch):**
- Item 1 — telemetry. Can't tune what we can't measure.

**Performance gates (needed to handle real traffic):**
- Item 4 — load-test scenarios. Depends on M4.
- Item 5 — BgGPT rate-limits. Depends on M4.

**Release-process gates (per-release, not one-time):**
- Item 3 — browser UAT sign-off. Recurring, not a one-shot.

---

## Trail

- Birth of this doc: §7 Bug 1 investigation 2026-04-20 exposed the telemetry gap. User directed that telemetry + 6 other pre-launch items deserve their own canonical list.
- See `.planning/phases/m3-uat/BROWSER_CHECKLIST.md` (release-gate UAT items)
- See `.planning/LOAD_TEST_PLAN.md` (load-test scenarios)
- See `.planning/research/SCHEMA_DRIFT_AUDIT.md` (background for item 7's "extra columns" note)
