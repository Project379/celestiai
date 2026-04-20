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
- `[deferred post-ephemeris]` — intentionally held until ephemeris validation (item 6) closes; see status-change log below
- `[done]` — shipped, verified, evidence link provided

---

## Status-change log

- **2026-04-20 — sequencing pivot: diary persistence deferred post-ephemeris; ephemeris golden-file validation prioritized.** Rationale: of the three hard pre-launch items (correct math, safe user data, working payments), ephemeris validation is the only one without a graceful degradation path — wrong astrology math produces confident-looking wrong output that users can't recognize as wrong. Discovering discrepancies now via deliberate audit is strictly better than discovering them via user reports post-launch. §8 (diary persistence workstream) paused after §8.0; §9 (ephemeris validation) opened with `.planning/phases/09-ephemeris-validation/00-PLAN.md`. Item 6 moves to `[in progress]`; new item 8 (diary persistence gate) added at `[deferred post-ephemeris]`.

---

## Gate list

Last reviewed: 2026-04-20

| # | Item | Status | Owner | Last updated | Notes / evidence |
|---:|---|---|---|---|---|
| 1 | **Telemetry / analytics wired** — signup-funnel event coverage (visit → sign-up → onboarding complete → first chart saved → first reading) + feature-engagement events (daily crystal collect, diary save, oracle generate, transit view). Candidates: PostHog, Plausible, Vercel Analytics. No solution committed yet. | `[not started]` | unassigned | 2026-04-20 | Surfaced during §7 Bug 1 investigation — we couldn't quantify how many users hit the `approximate_time_range` crash and bounced because no funnel telemetry exists. Absence-of-data is the problem. Decide on a solution + ship the instrumentation before public launch. |
| 2 | **Error monitoring (Sentry or equivalent)** — server-side error aggregation replacing `console.error` as the destination for error-ID-tagged failures. Must capture the `ERR-*` tag so ticket triage can grep by code. | `[not started]` | unassigned | 2026-04-20 | The `ERR-BD-*` scheme introduced in §7 Bug 1 commit 5 assumes this exists eventually. Current implementation writes to stdout via `console.error` — works for local dev, invisible in production. One-line swap path documented: `Sentry.captureException(err, { tags: { errorId: 'ERR-BD-001' } })`. |
| 3 | **Browser UAT sign-off** — a human runs through `BROWSER_CHECKLIST.md` in incognito + DevTools Disable cache before each release. Every `[must-exercise]` item signed off. | `[not started]` | unassigned | 2026-04-20 | See `.planning/phases/m3-uat/BROWSER_CHECKLIST.md`. Programmatic UAT (66 assertions in `apps/web/scripts/m3-uat-harness.mjs`) is necessary but not sufficient — rendering fidelity, multi-cookie scenarios, and the Stripe `session_id` redirect_url round-trip only verifiable in a browser. |
| 4 | **Load-test Scenarios B and C passing** — per `LOAD_TEST_PLAN.md §3` — warm-cache at 100 concurrent + cold-cache at 50 concurrent. Acceptance criteria: P95 TTFB, throughput, cost envelope. Streaming endpoints depend on this per M4 predecessor chain. | `[blocked]` | unassigned | 2026-04-20 | Blocked on M4 (streaming-endpoint extraction) per `DATA_FETCHING_INVENTORY.md §7.2 Phase M4 predecessor chain`. Harness infra for the scenarios does not exist yet — that's the first predecessor. |
| 5 | **AI provider verification (OpenRouter / Llama 3.3 70B)** — current provider per `AI_PROVIDER_DECISION.md`. Before launch: verify `OPENROUTER_API_KEY` quota, document OpenRouter's per-model rate-limit policy for `meta-llama/llama-3.3-70b-instruct` (requests/minute, tokens/minute), document cost envelope against expected launch traffic. Tied to M4 streaming work via `LOAD_TEST_PLAN.md §7.1` prerequisite. | `[not started]` | unassigned | 2026-04-20 | Scope was originally "BgGPT verification" — rewritten 2026-04-20 after the env audit confirmed OpenRouter/Llama is the actual primary, not BgGPT. BgGPT stays `[deferred / post-launch]` with revisit conditions in `AI_PROVIDER_DECISION.md §5`; not a pre-launch item. |
| 5a | **Fallback strategy for AI provider outages** — OpenRouter is the single AI provider today. No retry, no alternate-provider failover; a 429/5xx from OpenRouter mid-stream produces a raw 500 with a generic Bulgarian error. Product decision: (a) graceful degradation — hard-fail with a specific Bulgarian "AI четенето е временно недостъпно, опитай след малко" message + cached-response fallback where possible, OR (b) alternate-provider failover — install a second Vercel AI SDK provider (Claude / GPT-4o / Gemini), wire as fallback behind the same `streamText` call. Default recommendation: (a) for simplicity; revisit (b) if post-launch outage data shows the degradation window hurts retention. | `[not started]` | unassigned | 2026-04-20 | Surfaced during `AI_PROVIDER_DECISION.md` audit. Don't ship without this resolved — single-provider-no-fallback fails catastrophically on OpenRouter outages. Not a decision I should make unilaterally; it's a product call. |
| 6 | **Swiss Ephemeris output validation against JPL / astro.com reference** — golden-file tests comparing `@celestia/astrology` output against known reference data for ~10-20 historically significant dates or synthetic cases. Compare planet positions, house cusps, aspects to within a precision threshold (threshold calibration in §9.1, proposed 1 arc-minute pending sign-off). | `[in progress]` | §9 workstream | 2026-04-20 | **Genuine correctness gate.** If ephemeris outputs are wrong, the product is wrong regardless of UI polish. Opened as `§9` on 2026-04-20 after the sequencing pivot above. Workstream plan at `.planning/phases/09-ephemeris-validation/00-PLAN.md`. Six-sub-round baseline (§9.0 plan → §9.6 CI promotion); +N rounds if §9.2-§9.4 surface discrepancies requiring §9.5 fix work. Cross-reference: JPL Horizons for raw planetary positions, astro.com for full natal comparison (houses + aspects). |
| 7 | **Privacy / GDPR compliance** — EU-resident user data handling. Cookie consent if tracking cookies are used (decision depends on item 1). User-accessible data export + deletion paths (partially exists at `/api/gdpr/*` — confirm complete). Privacy notice copy in Bulgarian, reviewed for legal accuracy. Data processor contracts with Clerk / Supabase / Stripe / the chosen analytics vendor. | `[not started]` | unassigned | 2026-04-20 | `apps/web/app/api/gdpr/export/route.ts` + `apps/web/app/api/gdpr/delete-account/route.ts` exist — audit what they actually export/delete and whether coverage is complete across every table that holds user data. The `users.trial_claimed_at` and `users.subscription_status` columns flagged as "extra in DB" in `SCHEMA_DRIFT_AUDIT.md` are relevant here — if they hold user-identifying data, GDPR export must include them. |
| 8 | **Diary persistence — server-side storage, markdown export, GDPR deletion cascade** — the diary is currently localStorage-only (`hooks/useManifestEntries.ts`), which means users lose entries on browser clear or device change. Launch requires: (a) Supabase-backed persistence with RLS, (b) `/api/diary/*` CRUD endpoints with `ERR-DI-NNN` error domain, (c) markdown export of all entries per user, (d) GDPR deletion cascade when an account is deleted, (e) expansion from 8 single-variant prompts to 24+ (3 variants per phase × 8 phases) with cycle-based per-user rotation. | `[deferred post-ephemeris]` | §8 workstream (paused post-§8.0) | 2026-04-20 | Full workstream scoped in `.planning/phases/08-diary-persistence/00-PLAN.md`. Sub-rounds §8.1-§8.9 are all planning-complete and ready to execute. Paused 2026-04-20 behind item 6 (ephemeris) per the sequencing pivot in the status-change log above. Resumes at §8.1 when item 6 closes and user confirms re-open. Decisions captured in `.planning/research/DIARY_PRODUCT_DECISIONS.md` — durable regardless of pause length. |

---

## Categorization and ordering

**Hard correctness gates (must pass before any public user hits the product):**
- Item 6 — ephemeris validation. Wrong astrology = wrong product. **Active workstream §9 as of 2026-04-20.**
- Item 2 — error monitoring. Without it, production bugs stay invisible.
- Item 7 — GDPR. Legal exposure in EU markets including Bulgaria.
- Item 8 — diary persistence. Safe-user-data gate; deferred post-ephemeris per sequencing pivot.

**Observability gates (needed to operate post-launch):**
- Item 1 — telemetry. Can't tune what we can't measure.

**Performance gates (needed to handle real traffic):**
- Item 4 — load-test scenarios. Depends on M4.
- Item 5 — OpenRouter rate-limits + cost envelope. Depends on M4.
- Item 5a — fallback strategy decision. Doesn't depend on M4 — the product decision can happen in parallel.

**Release-process gates (per-release, not one-time):**
- Item 3 — browser UAT sign-off. Recurring, not a one-shot.

---

## Trail

- Birth of this doc: §7 Bug 1 investigation 2026-04-20 exposed the telemetry gap. User directed that telemetry + 6 other pre-launch items deserve their own canonical list.
- See `.planning/phases/m3-uat/BROWSER_CHECKLIST.md` (release-gate UAT items)
- See `.planning/research/LOAD_TEST_PLAN.md` (load-test scenarios)
- See `.planning/research/AI_PROVIDER_DECISION.md` (OpenRouter/Llama ground truth + BgGPT deferral trail)
- See `.planning/research/SCHEMA_DRIFT_AUDIT.md` (background for item 7's "extra columns" note)
