---
title: Placeholder register
status: living document — the single index of every known placeholder, stub, and deferred decision
created: 2026-09-01
enforced-by: scripts/check-placeholders.mjs (check:all gate — see "The gate" below)
---

# Placeholder register

Every placeholder value, temporary stub, hardcoded fake, and deferred
decision in Stellaeum lives as one row in the table below. This file is the
index; `scripts/check-placeholders.mjs` enforces the parts that can be
enforced mechanically.

Nothing here is deleted. When an item resolves, flip **Status** to
`RESOLVED`, fill **Resolved-date**, and leave the row in place — the
history is the point.

---

## Marker convention

Any placeholder value, stub, or deferred decision that **lives in code**
carries a comment containing the exact token:

```
STELLAEUM_PLACEHOLDER: <ID>
```

where `<ID>` is the register ID from the table below. One marker per ID, at
the single most load-bearing site (a second relevant site is named in that
row's **Description** instead of double-marked). Format, per file type:

```ts
// STELLAEUM_PLACEHOLDER: LLM-FAILOVER — <one line>; see .planning/PLACEHOLDERS.md
```
```sql
-- STELLAEUM_PLACEHOLDER: <ID> — <one line>
```

The token is matched by the regex `STELLAEUM_PLACEHOLDER:\s*([A-Z0-9-]+)`,
so keep the ID immediately after the colon and use only `A–Z`, `0–9`, `-`.

**`Location` column (schema deviation, deliberate).** The brief specified
seven columns (ID | Description | Type | Owner | Blocks | Status |
Resolved-date). An eighth, **Location**, is added because gate rule (c) —
"an OPEN CODE entry has zero tokens in code" — is otherwise unimplementable
for the CODE entries that describe the *absence* of code (no secret
scanning, no smoke test, …; 9 such entries as of the 2026-09-01 compliance
batch). Those carry `Location = —` and are exempt from
rule (c); they are listed under **CODE entries with no enforceable
location** below. `n/a` = the row is not CODE-type, so no marker applies.
Keeping this in a column rather than a hidden allowlist inside the script
keeps the register's truth in one file.

---

## Register

43 OPEN rows + 12 RESOLVED rows = 55 total, per `check-placeholders`'s own
count. LLM-MODEL-SWAP, GATE9-PHRASE-REPETITION and CHART-CALC-BACKFILL
added 2026-09-03 (PostHog hardening pass); COOKIE-CONSENT and
ANALYTICS-VENDOR flipped OPEN → RESOLVED the same day. GEMINI-API-TIER and
ORACLE-WORD-BAND added 2026-09-03 (sentinel-example / Gate 9 follow-up on
`gemini/rebased-onto-injection`). STRIPE-TOS-URL added 2026-09-03 and
OAUTH-COPY-GOOGLE flipped OPEN → RESOLVED the same day (OAuth de-Googling
pass).

| ID | Description | Type | Owner | Blocks | Status | Resolved-date | Location |
|---|---|---|---|---|---|---|---|
| LLM-GUARDRAILS | Zero content-safety layer on Oracle/horoscope output (also `apps/web/app/api/horoscope/generate/route.ts`) | CODE | Toni | Launch | OPEN | | apps/web/lib/ai/check-bg-output.ts |
| ASTRO-TIMEZONE | Bulgarian timezone/DST path — was unverified; Phase 1 diagnosis confirmed the 4 core BG charts convert correctly and found a DST-boundary bug (probe sampled the offset on the wrong side of a transition). Phase 2 rewrote `localTimeToUTC` with round-trip disambiguation (ambiguous fall-back hour → earlier occurrence + flag; spring-forward gap → forward shift + flag) and added `packages/astrology/test/timezone-dst.test.ts` (10 cases, incl. the 4 regression guards). geo-tz only resolves the zone name; offsets come from historically-aware ICU. Closes ephemeris-validation doc-drift #7. | CODE | CC | Launch | RESOLVED | 2026-09-02 | packages/astrology/src/utils/timezone.ts |
| ASTRO-INJECT | Model wrote its own degrees/signs/houses/orbs — Phase 1 found this UNSTABLE run-to-run (not reliably broken), so it could not be regression-tested. Phase 2 removed the ability entirely: both system prompts now forbid figures and require `[pos:]`/`[house:]`/`[aspect:]`/`[tpos:]`/`[taspect:]` tokens; the server substitutes real chart values (`buildOraclePlaceholderValues` / `buildHoroscopePlaceholderValues`) and a pre-display validator (`apps/web/lib/ai/validate-reading.ts`) rejects any model-authored digit, unresolved token, non-Bulgarian glyph, unbalanced sentinel or out-of-range length, regenerating once then failing visibly. Oracle + daily horoscope no longer stream. Gate 9 (`apps/web/scripts/oracle-gate9.mjs`) is the manual regression harness. | CODE | CC | Launch | RESOLVED | 2026-09-02 | apps/web/lib/oracle/prompts.ts |
| PAYWALL-MOBILE | RevenueCat native paywall not built; no mobile CTA anywhere | CODE | CC | Store submission | OPEN | | apps/mobile/components/oracle/CapReachedNotice.tsx |
| MIGRATIONS | 13 unrecorded migrations, 3 orphaned ledger rows, one with a live DROP COLUMN (`supabase/migrations/20260413141504_schema_hardening.sql`) | CODE | CC | Any schema change | OPEN | | — |
| SCHEMA-UNTRACKED | 16 Drizzle-era tables with no CREATE TABLE; production schema unreproducible from repo (partly captured by `20260826150000_capture_untracked_tables.sql`) | CODE | CC | Staging env | OPEN | | — |
| APP-URL-MOBILE | EXPO_PUBLIC_WEB_APP_URL unfilled; hides the web pricing fallback CTA. File already implements a placeholder guard | CODE | CC | Revenue | OPEN | | apps/mobile/lib/config/webAppUrl.ts |
| 2FA-BUG | Backup-code sign-in blocks users; lead at two-factor.tsx:44-54, undiagnosed | CODE | CC | Launch | OPEN | | apps/mobile/app/(public)/two-factor.tsx |
| CORE-TESTS | packages/core has zero test files and no lint script (package.json cannot hold a marker comment) | CODE | CC | — | OPEN | | — |
| SECRET-SCAN | No secret scanning, no pre-commit hooks; prior key exposure on record | CODE | CC | Real traffic | OPEN | | — |
| DEP-AUDIT | No dependency vulnerability scanning | CODE | CC | Real traffic | OPEN | | — |
| CAUGHT-500S | Caught errors returned as bare `Response.json(…, {status:500})` bypass `toErrorResponse` and never reach Sentry | CODE | CC | Real traffic | OPEN | | apps/web/lib/auth/guards.ts |
| SMOKE-TEST | No post-deploy smoke test; crons fail silently | CODE | CC | Real traffic | OPEN | | — |
| BUILD-SHA | No build/version marker in responses; the deployment that answered a request is unidentifiable without dashboard archaeology. Blocks turning SKEW-PROTECT on safely | CODE | CC | Real traffic | OPEN | | — |
| LLM-FAILOVER | Single provider, no retry — a 5xx becomes a 502 | CODE | CC | Real traffic | OPEN | | apps/web/lib/ai/client.ts |
| PUSH-ORPHAN | Web push control imported by nothing; mobile has no settings toggle | CODE | CC | — | OPEN | | apps/web/components/horoscope/PushNotificationBanner.tsx |
| NEVER-EXPIRES-SENTINEL | `'2999-12-31T00:00:00.000Z'` duplicated between lib/oracle/expiry.ts and the restore SQL in TIER-DEFINITION-2026-09-01.md §12; drift silently expires lifetime readings | CODE | CC | — | OPEN | | apps/web/lib/oracle/expiry.ts |
| LINT-BASELINE-1800 | Ratchet has moved 1778→1800→1784→1785 (2026-09-01 through 2026-09-03); each move logged with justification in the script header. ID keeps its "-1800" suffix as a stable handle; current value 1785 | CODE | CC | — | OPEN | | scripts/i18n/check-bg-lint-baseline.mjs |
| SIWA-BG-LABEL | Apple button may render English on bg-locale devices; unverifiable until a device build (twin at `apps/mobile/app/(public)/sign-up.tsx`) | CODE | CC | Store submission | OPEN | | apps/mobile/app/(public)/sign-in.tsx |
| APPLE-ERROR-CODES | Real oauth_token_apple codes unmappable until a device sign-in; revisit from Sentry after Phase B | CODE | CC | — | OPEN | | apps/mobile/lib/clerk/errorMessages.ts |
| OAUTH-COPY-GOOGLE | RESOLVED 2026-09-03: form_param_missing / oauth_access_denied / external_account_exists rewritten provider-neutral (wording approved by Toni) — no longer say "Google". `oauth_email_domain_reserved_by_saml` was already neutral and untouched | CODE | Toni | Store submission | RESOLVED | 2026-09-03 | apps/mobile/lib/clerk/errorMessages.ts |
| ANR | Android ANR, no usable main-thread data; emulator device class is the leading suspect | CODE | CC | — | OPEN | | — |
| DOC-DRIFT | CLAUDE.md "Realtime" line; stale COMPETITOR_ANALYSIS and FEATURES docs. Retyped CODE→DECISION 2026-09-01: all three locations are docs and the work is "decide the current truth, then write it" — same shape as EN-LOCALE | DECISION | CC | — | OPEN | | n/a |
| COOKIE-CONSENT | RESOLVED 2026-09-03: PostHog (the analytics that made this row live, see ANALYTICS-VENDOR) is configured cookieless — `persistence: 'memory'` at `apps/web/components/analytics/PostHogProvider.tsx:71` and `apps/mobile/lib/analytics/posthog.ts:31` means neither platform ever writes a cookie/localStorage/AsyncStorage-persisted analytics identity. This is CONFIG-verified (the option is posthog-js's own documented storage-mode enum, not a workaround) but NOT live-browser-verified — the claude-in-chrome extension was unavailable in the session that made this change, so `document.cookie` / Application > Storage were never inspected empirically in a running app. Do that check before treating this as fully closed; re-open this row if it turns up a cookie. If persistence is ever changed off `'memory'` on either file, re-open regardless | CODE | CC | EU traffic | RESOLVED | 2026-09-03 | apps/web/components/analytics/PostHogProvider.tsx |
| TERMS | `/terms` route exists as a placeholder only (compliance batch 2026-09-01) — body is not lawyer-reviewed; linked from checkout + pricing + footer | CODE | Lawyer | Store submission | OPEN | | apps/web/app/terms/page.tsx |
| WITHDRAWAL-COPY | CRD immediate-performance / 14-day-withdrawal consent wording now shipped at Stripe Checkout (`custom_text`), still not lawyer-reviewed (compliance batch 2026-09-01) | CODE | Lawyer | Web payments | OPEN | | apps/web/lib/legal/compliance-copy.ts |
| AI-ACT-COPY | Article 50 disclosure now shown on Oracle (web+mobile), daily horoscope (web+mobile) and pricing (compliance batch 2026-09-01); wording not lawyer-reviewed; other AI surfaces still unaudited | CODE | Lawyer | Already overdue | OPEN | | apps/web/lib/legal/compliance-copy.ts |
| ENTITY-NAME | Legal entity name, ЕИК, address, VAT rendered in the site footer as bracketed placeholder values (compliance batch 2026-09-01); founder must supply real values | CODE | Toni | Launch, DSA trader | OPEN | | apps/web/lib/legal/compliance-copy.ts |
| TIER-ITEM-4 | Recommendations gating built (2026-09-01) — free sees the daily pick; the monthly arc renders identity + teaser with detail behind PremiumLock, web + mobile (`StoriesContent` takes `isPremium`) | CODE | CC | Launch | RESOLVED | 2026-09-01 | n/a |
| TIER-ITEM-5 | Shared `PremiumLock` / `LockBadge` primitive built and applied on both platforms: Oracle (`CapReachedNotice` folded in), recommendations (monthly arc), crystals (grid returns `locked` state; collect + collection tabs gated), and Кръг (2nd saved profile, connection invite, connection report — locked affordances before the attempt; server 403s carry `code: 'PREMIUM_REQUIRED'`). Saved-profile compatibility teaser left as the ruled locked state | CODE | CC | Launch | RESOLVED | 2026-09-01 | n/a |
| PROD-CREDS | Clerk/Stripe/RevenueCat on test keys; Clerk is a separate instance — orphans users, needs DNS + mobile rebuild | CONFIG | Toni | Launch | OPEN | | n/a |
| RC-WEBHOOK-SECRET | Placeholder signing secret; webhook dead | CONFIG | Toni | Revenue | OPEN | | n/a |
| SKEW-PROTECT | Vercel Skew Protection off — while off, a browser can mix JS chunks / API routes across deployments mid-session. Target state: ON before real traffic, **paired with** BUILD-SHA — ON on its own makes a session pinned to a stale deployment indistinguishable from an undeployed fix | CONFIG | Toni | Real traffic | OPEN | | n/a |
| SUPABASE-PLAN | Free tier pauses on inactivity | CONFIG | Toni | Launch | OPEN | | n/a |
| EAS-SENTRY-DSN | EAS env var carrying the mobile Sentry DSN unconfirmed | CONFIG | Toni | — | OPEN | | n/a |
| STRIPE-TOS-URL | Stripe is sandbox-only until the company is registered, so the Terms of Service URL cannot be set on the live account; `consent_collection: { terms_of_service: 'required' }` in the checkout route has never been exercised against a real Stripe session. Resolves when the live account has the URL set and one real checkout has completed | CONFIG | Toni | Revenue | OPEN | | n/a |
| MOON-PARITY | Moon detail is mobile-only; violates the parity ruling | DECISION | Toni | Launch | OPEN | | n/a |
| PRICE-BASIS | €9.99 in the LLM decision doc vs €6.99 on the live pricing page | DECISION | Toni | Paywall | OPEN | | n/a |
| ANALYTICS-VENDOR | PostHog Cloud EU chosen 2026-09-03 — cookieless (memory persistence), five events only (signup completed, birth data submitted, chart first viewed, free Oracle reading generated, subscription started), no autocapture/session replay/heatmaps/surveys/feature flags/experiments. This resolves the cookie-consent question this row existed to answer — see COOKIE-CONSENT | DECISION | Toni | Launch | RESOLVED | 2026-09-03 | n/a |
| EN-LOCALE | English deferred; FEATURES.md still claims BG+EN | DECISION | Toni | — | OPEN | | n/a |
| LLM-RETENTION | Zero-data-retention status on the chosen provider unknown | EXTERNAL | Petko | Privacy policy | OPEN | | n/a |
| PRIVACY-REVIEW | Privacy policy content is a placeholder, not lawyer-reviewed | EXTERNAL | Lawyer | Launch | OPEN | | n/a |
| DPA-CONTRACTS | Processor DPAs unsigned: Clerk, Supabase, Stripe, OpenRouter, Sentry, PostHog (added 2026-09-03) | EXTERNAL | Toni | Launch | OPEN | | n/a |
| SE-LICENCE | CHF 700 Swiss Ephemeris Professional; triggers on first paying subscriber; deferral reasoning undocumented | EXTERNAL | Toni | First subscriber | OPEN | | n/a |
| DESIGN-ASSETS | Placeholder icon/logo; IP assignment email sent, reply pending | EXTERNAL | Designer | Store submission | OPEN | | n/a |
| FREE-TIER | Frozen 2026-09-01 | DECISION | Toni | — | RESOLVED | 2026-09-01 | n/a |
| PRICE-ANNUAL | €59.99/yr | DECISION | Toni | — | RESOLVED | 2026-09-01 | n/a |
| VERCEL-PLAN | Confirmed not Hobby | CONFIG | Toni | — | RESOLVED | 2026-09-01 | n/a |
| LLM-MODEL | Provider decided; Petko implementing | DECISION | Petko | — | RESOLVED | 2026-09-01 | n/a |
| KRUG-TEASER | Free users keep the teaser as the locked state | DECISION | Toni | — | RESOLVED | 2026-09-01 | n/a |
| LLM-MODEL-SWAP | LLM-MODEL (decision) is RESOLVED and the implementation HAS landed — production now calls Gemini (`gemini-3.7-flash`, falling back to `gemini-3.6-flash`; see SYSTEM-MAP §4), not Llama. Stays OPEN: three consecutive full Gate 9 runs on `gemini/rebased-onto-injection` (2026-09-03, after the sentinel-example rewrite) produced **0 of 10 successful generations each** (30/30 calls `GENERATION_THREW` — free-tier quota exhausted on both the primary and the fallback model; see GEMINI-API-TIER). A clean read on output quality (phrase repetition, gender agreement, word band) requires a Gate 9 run on an unthrottled key; until then this row cannot be closed on the strength of a quality argument, because no quality data was collectable this session | CODE | Petko | Launch | OPEN | | apps/web/lib/ai/client.ts |
| GEMINI-API-TIER | Gemini free-tier quota caused 7/10 and 9/10 transient (fallback-then-fail) failures in an earlier Gate 9 run, and on 2026-09-03 three further full runs (this session, post sentinel-example rewrite) each hit 0/10 successful generations — every one of 30 attempted calls across primary + fallback returned `generativelanguage.googleapis.com/generate_content_free_tier_requests` quota-exceeded (`limit: 20`). At these limits, real user traffic sees the same failure rate the validator's regenerate-once-then-fail-visibly path is not designed to absorb at this frequency. Blocks both Launch and any further Gate 9 quality measurement | CONFIG | Toni | Launch | OPEN | | n/a |
| ORACLE-WORD-BAND | Oracle's post-generation word-count band was widened from the Llama-era 300-800 words to 100-250, based on Gate 9 measuring live Gemini output at 126-164 words across 11 live samples (6 in the run documented at `apps/web/app/api/oracle/generate/route.ts`'s WORD-COUNT BAND comment, plus 5 more from a prior session) — see that comment for the derivation. Re-verify against a larger Gate 9 sample once GEMINI-API-TIER is resolved and a full 10-for-10 run is possible; 11 samples is not enough to trust the band long-term | CODE | CC | Launch quality bar | OPEN | | apps/web/app/api/oracle/generate/route.ts |
| GATE9-PHRASE-REPETITION | Llama-era baseline (last full run): "твоят [planet] на" as a stock opening in 6-8 of 10 readings, with Слънце's grammatical gender wrong ("твоят Слънце" instead of neuter "твоето Слънце") in most of those. On Gemini, a prior session's partial run saw the related "твоята/твоето [planet] на" construction in 4-6 of 10 readings — close enough to the SENTINEL MARKERS example in `prompts.ts` (which opened its example sentence with "Твоето [planet:sun]Слънце[/planet] на …") to suspect the model was copying the example's sentence-opening shape rather than following the instruction, the same failure the three removed example phrases caused. 2026-09-03 (this session): both oracle and horoscope prompt files' sentinel examples were rewritten to demonstrate the token syntax mid-clause instead of as a reusable sentence opener (see `apps/web/lib/oracle/prompts.ts` and `apps/web/lib/horoscope/prompts.ts`). The hypothesis is UNTESTED, not confirmed or refuted: three follow-up Gate 9 runs against the rewritten prompts each returned 0 of 10 successful generations (GEMINI-API-TIER quota exhaustion), so there is no post-rewrite output to check for the phrase. Confirmed model-only either way — no static Bulgarian string in the codebase has the wrong-gender form (`packages/astrology/src/constants.ts` already encodes `PLANETS_BG_GENDER.sun = 'neut'` correctly; it just is not consulted by the prompt) | CODE | Petko | Launch quality bar | OPEN | | — |
| CHART-CALC-BACKFILL | `6b1a25d` (2026-09-02) made `calculateNatalChart` use the stated birth-time window's midpoint for unknown-time charts instead of always assuming noon, but existing `chart_calculations` rows computed before that commit still hold the old 12:00 estimate — those users see a chart calculated at the wrong assumed time until the row is invalidated/recalculated. No backfill script exists yet | CODE | CC | Data accuracy for existing accounts | OPEN | | — |

---

## CODE entries with no enforceable location

These are CODE-type entries where no single code line carries a placeholder
value or stub — they describe the **absence** of something (a file, a CI
job, a route, a disclosure). The gate cannot check them (rule (c) is
skipped for `Location = —`). They must be tracked by reading this list.
(DOC-DRIFT was retyped CODE→DECISION 2026-09-01 and moved out of this
list — its "locations" were all docs, matching EN-LOCALE's shape.)

| ID | Why there is no marker |
|---|---|
| MIGRATIONS | Repo/ledger state. The one concrete site (a `DROP COLUMN` in `supabase/migrations/20260413141504_schema_hardening.sql`) is an already-applied historical migration — editing it, even a comment, risks migration-tool checksum drift. |
| SCHEMA-UNTRACKED | Repo state. `20260826150000_capture_untracked_tables.sql` already back-fills `CREATE TABLE` for the 16 tables; what remains ("unreproducible from repo") is a ledger-reconciliation task, not a line of code. |
| CORE-TESTS | The gap is `packages/core/package.json` having no `test`/`lint` script and the package having zero test files. JSON holds no comments; there is no code file to mark. |
| SECRET-SCAN | Absence of a CI job / pre-commit hook. `.github/workflows/` has `ci.yml` + `astrology.yml` only; no `.husky/`. |
| DEP-AUDIT | Absence of a CI job (no `pnpm audit` step, no Dependabot/`osv-scanner`). |
| SMOKE-TEST | Absence of a post-deploy script. No `scripts/*smoke*`, no workflow step. |
| BUILD-SHA | Absence of a version marker in HTTP responses / build metadata. No middleware header, no `/api/version` route — nothing to mark. |
| ANR | Android runtime symptom, not a code line. Investigation item. |
| GATE9-PHRASE-REPETITION | Model-output symptom (a stock phrase and a grammar error the model produces), not a line of code — the prompt already models correct gender by example and there is no per-planet gender lookup to wire in without prompt-engineering a placeholder model, which this file's header ruling says not to do. |
| CHART-CALC-BACKFILL | The gap is a backfill script that doesn't exist yet — nothing in the repo to mark until one is written. |

**Finding:** 8 of the OPEN CODE entries have no code location (was 9 before
2026-09-03: COOKIE-CONSENT resolved with a real marker-free Location
citation, removing it from this list; GATE9-PHRASE-REPETITION and
CHART-CALC-BACKFILL added to it the same day, net -1; GEMINI-API-TIER is
CONFIG-type, not CODE, so it does not affect this count). Historical count
chain (see prior entries in this file's git history for the full
derivation) ended at 9 of 27 after TIER-ITEM-4/5 resolved 2026-09-01; this
is the next link.

---

## Launch checklist — OPEN entries that block Launch or Store submission

The gate **cannot enforce** CONFIG / DECISION / EXTERNAL rows — they live
in dashboards, contracts, and people's heads. Read this section manually
before any launch or submission.

### Blocks: Launch

| ID | Type | Owner | Enforced by gate? |
|---|---|---|---|
| LLM-GUARDRAILS | CODE | Toni | yes (marker present) |
| 2FA-BUG | CODE | CC | yes |
| ENTITY-NAME | CODE | Toni | yes (marker present — placeholder footer values, 2026-09-01) |
| PROD-CREDS | CONFIG | Toni | **no — manual** |
| SUPABASE-PLAN | CONFIG | Toni | **no — manual** |
| MOON-PARITY | DECISION | Toni | **no — manual** |
| PRIVACY-REVIEW | EXTERNAL | Lawyer | **no — manual** |
| DPA-CONTRACTS | EXTERNAL | Toni | **no — manual** |
| LLM-MODEL-SWAP | CODE | Petko | yes (marker present) |
| GEMINI-API-TIER | CONFIG | Toni | **no — manual** |
| ORACLE-WORD-BAND | CODE | CC | yes (marker present) |
| GATE9-PHRASE-REPETITION | CODE | Petko | **no — no code location, symptom only** |
| CHART-CALC-BACKFILL | CODE | CC | **no — no code location, script not written** |

### Blocks: Store submission

| ID | Type | Owner | Enforced by gate? |
|---|---|---|---|
| PAYWALL-MOBILE | CODE | CC | yes |
| SIWA-BG-LABEL | CODE | CC | yes |
| TERMS | CODE | Lawyer | yes (marker present — placeholder route, 2026-09-01) |
| DESIGN-ASSETS | EXTERNAL | Designer | **no — manual** |

### Other blocking values (context)

`AI-ACT-COPY` Blocks = "Already overdue" (live law since 2026-08-02);
`ENTITY-NAME` also Blocks "DSA trader"; `TERMS` / `OAUTH-COPY-GOOGLE` /
`PAYWALL-MOBILE` / `SIWA-BG-LABEL` / `DESIGN-ASSETS` gate Store submission
as listed. None of the CONFIG/DECISION/EXTERNAL rows are machine-checkable.

---

## Gate numbering — the scheme (adopted 2026-09-01)

**The problem it fixed.** Two separate "gate #N" namespaces existed and
overlapped numerically:

1. **`check:all` CI steps** — `package.json`'s `check:all` is a bare `&&`
   chain. Nothing in the repo numbered the steps; a "gate #9" for the new
   `check:placeholders` step would have been an ad-hoc count.
2. **`PRE_LAUNCH_PREREQS.md` "Gate list"** — a table of *product-readiness*
   items numbered 1–11 (row 9 = licensing audit, row 11 = Sign in with
   Apple). It already owned the labels #9, #10, #11, so a CI "gate #9"
   would have made any bare "gate #9" ambiguous. That table also had a
   pre-existing defect: row 11 was physically listed before row 10.

**The scheme, now in force:**

| Namespace | Rule |
|---|---|
| `check:all` CI steps | **Never numbered in prose.** Refer to a gate by its script name only (`check:placeholders`, `check:bg-strings`, …). Position in the `&&` chain is the only identity, and it is not stable — adding or removing a gate renumbers every later one. |
| Pre-launch readiness items | Prefixed **`PLP-1` … `PLP-11`** (plus `PLP-5a`). |

**Applied 2026-09-01:** `PRE_LAUNCH_PREREQS.md` "Gate list" `#` column
prefixed to `PLP-*`; the PLP-10 (VAPID) / PLP-11 (SIWA) rows put back in
numeric order (SIWA stays PLP-11 — cross-references depend on it);
present-tense cross-references in that doc updated to `PLP-*`; dated
status-change-log entries left as historical record. `SYSTEM-MAP.md` §8's
numbered gate list converted to bullets. No CI step carries a number
anywhere.

---

## Reconcile — source of truth per overlapping item (adopted 2026-09-01)

Every item below is described in **two or more** of: this register,
`COMPLETION-TRACKER.md`, `PRE_LAUNCH_PREREQS.md`, `SYSTEM-MAP.md`,
`TIER-DEFINITION-2026-09-01.md`. The **source of truth (SoT)** column is
now in force: the SoT doc owns that item; the others carry a one-line
`placeholder status: see .planning/PLACEHOLDERS.md <ID>` pointer and do
**not** restate its status. Restated status text in the four docs was
deleted on adoption (dated log entries, ruling narrative, and evidence
tables excluded).

| Item(s) | Also documented in | Source of truth | Rationale |
|---|---|---|---|
| PAYWALL-MOBILE, PROD-CREDS, RC-WEBHOOK-SECRET, APP-URL-MOBILE | COMPLETION-TRACKER "Halt-required register" + "blocked-externally"; SYSTEM-MAP §10 | **COMPLETION-TRACKER** (halt-required register) for the *narrative / ruling*; this register for the *one-line status + marker*. | The tracker already holds ratification history and founder rulings; duplicating that here would rot. This register should carry the ID, one line, and the marker location, and link to the tracker section. |
| SIWA-BG-LABEL, OAUTH-COPY-GOOGLE, APPLE-ERROR-CODES, PAYWALL-MOBILE (store side) | PRE_LAUNCH_PREREQS PLP-11; COMPLETION-TRACKER "SUBMISSION BLOCKER"; APPLE-REVIEW-REQUIREMENTS-2026-08-27 §1 | **PRE_LAUNCH_PREREQS PLP-11** for "is SIWA submittable"; this register for the code-level sub-items. | Submission-readiness is a launch-gate question; the prereq doc is the canonical launch-gate list. |
| ASTRO-TIMEZONE, ASTRO-INJECT | SYSTEM-MAP §5; PRE_LAUNCH_PREREQS PLP-6 (ephemeris validation, `[done]` for the *ephemeris*, silent on BG birth locations) | **SYSTEM-MAP §5** for the technical description; this register for "unverified, blocks launch". PLP-6 carries a scope-note pointer to this register. | PLP-6 is marked `[done]` and could be misread as "astrology is validated"; the scope gap needs a pointer. |
| LLM-GUARDRAILS, LLM-FAILOVER, LLM-RETENTION, LLM-MODEL, PRICE-BASIS | SYSTEM-MAP §4; PRE_LAUNCH_PREREQS PLP-5 / PLP-5a; `LLM-PROVIDER-DECISION-*` / `AI_PROVIDER_DECISION.md`; CLAUDE.md header | **SYSTEM-MAP §4** for current AI truth; PLP-5a for the failover *decision*; this register for status lines. CLAUDE.md's AI header block should be trimmed to a pointer at SYSTEM-MAP §4. | Four docs restate the "Llama placeholder" fact; one drifts (`PRICE-BASIS` €9.99 vs €6.99 is exactly this kind of drift). |
| MIGRATIONS, SCHEMA-UNTRACKED | SYSTEM-MAP §3; `SCHEMA_DRIFT_AUDIT.md`; COMPLETION-TRACKER §0.6 area | **`SCHEMA_DRIFT_AUDIT.md`** (or SYSTEM-MAP §3 if that audit is stale) for the full picture; this register for the one-line status. | Schema state needs a table-by-table ledger, which belongs in the audit doc, not a status row. |
| TIER-ITEM-4, TIER-ITEM-5, KRUG-TEASER, FREE-TIER, PRICE-ANNUAL | **TIER-DEFINITION-2026-09-01.md** §11 (items 4 & 5 scoped), §12, "Implementation status" table | **TIER-DEFINITION-2026-09-01.md** — unambiguously. | It is the frozen definition + implementation log. This register should carry only the ID + "see TIER-DEFINITION item N". |
| NEVER-EXPIRES-SENTINEL | TIER-DEFINITION §12 (the restore SQL); `apps/web/lib/oracle/expiry.ts` (the constant) | **the code** (`NEVER_EXPIRES_AT` in lib/oracle/expiry.ts) is SoT for the *value*; TIER-DEFINITION §12 must be updated whenever it changes. This register tracks the duplication risk. | A literal duplicated between code and a SQL snippet has no doc SoT — only a "these must match" note, which is what the marker is for. |
| LINT-BASELINE-1800 | `scripts/i18n/check-bg-lint-baseline.mjs` header log; `feedback_epistemic_tagging` / handoff §2 | **the script header** (`check-bg-lint-baseline.mjs`) — it already logs every raise with justification. | The raise log lives with the number it governs. This register just points at it. |
| COOKIE-CONSENT, ANALYTICS-VENDOR, PRIVACY-REVIEW, DPA-CONTRACTS, TERMS, WITHDRAWAL-COPY, AI-ACT-COPY, ENTITY-NAME | PRE_LAUNCH_PREREQS PLP-7; SYSTEM-MAP §11; `.planning/legal/*` (`processor-dpa-audit.md`, `privacy-draft.md`) | **PRE_LAUNCH_PREREQS PLP-7** for the launch-gate rollup; `.planning/legal/*` for the working drafts; this register for per-item status + owner. | Compliance has a natural home (PLP-7 + the legal folder); this register adds machine-visible IDs and owners those lack. |
| SE-LICENCE | PRE_LAUNCH_PREREQS "Founder watch item"; `docs/licensing.md § Revisit triggers`; `POST_LAUNCH_UPGRADES.md` item 1; trigger code in `stripe/subscription.ts` + `revenuecat/webhook-events.ts` | **`docs/licensing.md`** for the reasoning + trigger list; this register for "undocumented deferral reasoning" (the actual gap). | The licence decision is documented in three places; the *gap* this row names is that the deferral rationale isn't written down — fixing that means editing `docs/licensing.md`, then this row can point there. |

**Cross-cutting rule (in force):** SYSTEM-MAP.md already states (line 3)
that the placeholder register wins over it on conflict. The same now holds
for all four docs: this register owns **ID + one-line status + owner +
marker location**; the other docs own **narrative, rulings, dated history,
evidence, and technical depth**. Where a doc restated a status this
register owns, that text was deleted and replaced with a
`placeholder status: see .planning/PLACEHOLDERS.md <ID>` pointer.
Excluded from deletion by design: dated log entries (batch ledger,
status-change log, §12 live-data check), TIER-DEFINITION's
"Implementation status" table (carries VERIFIED/INFERRED tags + test
names), and PRE_LAUNCH `PLP-7`'s body (the compliance rollup this table
names as SoT for that cluster).

---

## The gate

`scripts/check-placeholders.mjs`, wired into `check:all` after `test`.
Zero cost: reads this file + greps `apps/`, `packages/`, `scripts/`. No
network, no API calls.

It **fails the build** when:

- **(a)** a `STELLAEUM_PLACEHOLDER: <ID>` token appears in code with an
  `<ID>` not in this table.
- **(b)** a row with **Status = RESOLVED** still has tokens in code.
- **(c)** a row with **Status = OPEN**, **Type = CODE**, and a real
  **Location** (not `—`) has **zero** tokens in code.
- **(d)** any row is missing **Owner** or **Blocks** (`—` counts as
  present; blank/whitespace does not).

Rows with `Location = —` (absence findings) and non-CODE rows
(`Location = n/a`) are exempt from (c). The gate does **not** verify that
CONFIG / DECISION / EXTERNAL items are actually resolved — it cannot.
