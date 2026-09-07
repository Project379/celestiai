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

56 OPEN rows + 18 RESOLVED rows = 74 total, per `check-placeholders`'s own
count (re-run after every merge below rather than hand-added, since three
branches landing in one session made manual arithmetic the thing most
likely to drift). SECRET-LEAK-2026-04-05 added RESOLVED 2026-09-07 (the
2026-04-05 `apps/web/.env` leak — both unbounded keys revoked, history
deliberately not rewritten; see the row and the reconciled SECRET-SCAN row).
RECOMMENDATION-CONTENT-LICENSING added OPEN 2026-09-08 (Launch blocker —
`RECOMMENDATION_RIGHTS_MODE=development` serves unlicensed TMDB/Open Library
content to paying subscribers). BULGARIAN-SKILL-UPDATE added 2026-09-06 (pre-launch
task — skill-file lessons found during the drift sweep; see the row for
detail). LLM-MODEL-SWAP, GATE9-PHRASE-REPETITION and
CHART-CALC-BACKFILL added 2026-09-03 (PostHog hardening pass);
COOKIE-CONSENT and ANALYTICS-VENDOR flipped OPEN → RESOLVED the same day.
GEMINI-API-TIER and ORACLE-WORD-BAND added 2026-09-03 (sentinel-example /
Gate 9 follow-up, `gemini/rebased-onto-injection`). STRIPE-TOS-URL added
independently on both `gemini/rebased-onto-injection` (2026-09-03) and the
compliance batch (2026-09-04) with different wording/Location — merged
2026-09-05 into one row (see below). OAUTH-COPY-GOOGLE flipped OPEN →
RESOLVED 2026-09-03 (OAuth de-Googling pass). LLM-RETENTION-EEA,
GEMINI-EU-REGION, GEMINI-MODEL-AGE and THINKING-TOKEN-COST added
2026-09-03 (Gemini cost/rate-limit report follow-up). REGEN-QUOTA-EXEMPT
added 2026-09-04 (regenerate-exemption follow-up — ratified, kept as-is,
documented for visibility). DEVICE-SUPPORT-FLOOR added RESOLVED and
DEVICE-PASS-STALE added OPEN the same day (minimum device support
policy). 2026-09-04 (Gate 9 paid-tier follow-up): THINKING-TOKEN-COST
flipped OPEN → RESOLVED with a real measured figure; LLM-RETENTION-EEA
updated in place; SAFETY-FILTER-UNTESTED and THINKING-BUDGET-SPIKE added
OPEN. COMPLIANCE-AUDIT-RERUN added 2026-09-04 (compliance batch).
**2026-09-05: three branches merged to main in sequence —
`gemini/rebased-onto-injection`, `compliance/eu-ai-act-stripe-legal`, and
`recommendations/gated`.** DPA-CONTRACTS updated (OpenRouter drops out,
Google is the confirmed processor now the swap is live on main, not a
conditional). LLM-MODEL-SWAP updated (the swap itself has landed on main;
stays OPEN on the three quality follow-ups it already tracked). Five new
Oracle rows added from the compliance branch: ORACLE-QA-ART9 (updated),
CRISIS-LINE-VERIFICATION (superseded, not reversed), ORACLE-INPUT-
STRUCTURED, CRISIS-COPY-VERIFICATION, and THROUGHLINE-INTEGRATION (new).

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
| CORE-TESTS | UPDATED 2026-09-06: the "no lint script" half of this row was already stale before this session touched it — `packages/core/package.json` already had `"lint": "eslint src"` and a working `eslint.config.mjs`; confirmed by running it (73 pre-existing warnings, 0 errors, unrelated to this change). The real gap was the missing `test` script and zero test files. Added: `vitest.config.ts` + `tsconfig.test.json` (mirrors `packages/astrology`'s existing pattern) + `"test": "vitest run"` script + `vitest` devDependency; first suite covers `subscription/tier.ts` (5 tests: premium/free/corrupted-value/missing-row/DB-error paths) and `diary/prompts.ts` (7 tests: every phase has variants, last_quarter's deliberate 2-variant exception, rotation modulo including a large-N wraparound). `quota.ts` lives in `apps/web`, not `packages/core` — its 17-test suite is at `apps/web/test/subscriptions/quota.test.ts` instead (tier-limit selection, the Bulgarian pluralization boundary at n=1, the premium safety-net 503-with-no-number shape, the PREMIUM_ALERT_THRESHOLD Sentry.captureMessage firing/not-firing/swallowed-failure paths, refund audit-logging on both failure modes). All 12 + 17 tests pass; `packages/core` typecheck (incl. the new `tsconfig.test.json`) and `apps/web` typecheck both clean. **Deliberately left untested:** `getManifestPrompt`'s zero-variants throw branch — the tuple type `[ManifestPrompt, ...ManifestPrompt[]]` makes constructing an empty array a type error, so hitting it would mean bypassing the type system rather than testing real behavior. This is a first suite over three modules, not full coverage of either package — `packages/core` has ~30 other exported modules with no tests yet. | CODE | CC | — | OPEN | | packages/core/vitest.config.ts |
| SECRET-SCAN | **UPDATED 2026-09-07 — the 2026-04-05 historical-leak finding is RESOLVED (see the `SECRET-LEAK-2026-04-05` row); this row stays OPEN only on the still-missing pre-commit hook.** CI scanning shipped: `.github/workflows/ci.yml` job `secret-scan` (gitleaks CLI, not the marketplace Action — avoids that Action's private-repo licensing question) runs on every push/PR, scoped to the commit range being pushed (`git log`-range diff, not full history — see rationale below), `fetch-depth: 0` (a shallow clone would silently scan nothing forever). `.gitleaks.toml` allowlists only confirmed non-secret false positives (an AsyncStorage key string, `.env.example` placeholder values, a SHA-256 checksum manifest, the literal string "YOUR_CRON_SECRET") — verified by re-running gitleaks with the config and confirming exactly those drop out. **First full-history run (`gitleaks detect --source . --log-opts="--all"`) found 11 findings, 5 false positives (as above), 6 real, all in one deleted-but-still-in-history file, `apps/web/.env`, committed in `1b85a38f` (2026-04-05) and removed in `ca462ca6` the same day — but git history retains it regardless of later deletion.** Of the 6: Clerk `sk_test_`/`pk_test_` and Stripe `sk_test_` are test-mode (bounded blast radius); the Supabase anon/publishable key is public-by-design. **The other two are not bounded: a `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS — full read/write on every table, doesn't expire until ~2036) and a `GOOGLE_GENERATIVE_AI_API_KEY` (`AIza...`, a live-format Gemini key, not a test/live-scoped credential).** The Supabase project ref in that historical file (`zsypmpswqrhkfvlnowcp`) matches `apps/web/.env.local`'s current `NEXT_PUBLIC_SUPABASE_URL` **right now** — this is very likely still the live project. **The discovering session did not rotate anything or rewrite git history — reporting only.** **RESOLVED 2026-09-07 for the leak itself (see the `SECRET-LEAK-2026-04-05` row):** the Supabase legacy service-role key and the Gemini key are both revoked [founder-asserted, not independently verified this session], Supabase issued a new-format `sb_secret_…` key on revocation (that migration is tracked separately), and the decision *not* to rewrite history is recorded with its reasoning — private repo, exactly two people with access, no external clones, both unbounded keys now dead, so a BFG/`git filter-repo` rewrite (which invalidates every clone/branch/PR ref) buys nothing against a live threat. CI scanning is scoped to the pushed-commit range only, deliberately: a full-history gate would fail permanently on this very finding — the dead keys stay in history by decision, so the gate would be born red and have to be allowlisted anyway. See the "Recheck cadence" note in `.github/workflows/ci.yml`'s `secret-scan` job comment. **Still open:** no pre-commit hook (`.husky/` still doesn't exist) — CI catches a leak after push, not before. | CODE | Toni | Real traffic | OPEN | | — |
| SECRET-LEAK-2026-04-05 | Added RESOLVED 2026-09-07. `apps/web/.env` was committed in `1b85a38f` (2026-04-05) and deleted the same day in `ca462ca6`; git history retained the blob and the first full-history gitleaks run (2026-09-06, see `SECRET-SCAN`) surfaced it. **Six secrets** in that file: Clerk `sk_test_`/`pk_test_` and Stripe `sk_test_` (test-mode, bounded blast radius), the Supabase anon/publishable key (public by design), and the two with real blast radius — the **Supabase legacy service-role key** (bypasses RLS, full read/write on every table, ~2036 expiry) and a **Google Gemini API key** (`AIza…`, live format). **Both unbounded keys are revoked** [founder-asserted — Toni confirmed both are dead; not independently verified this session]. Supabase's new-key model replaced the revoked service-role key with a `sb_secret_…` secret key (different format, not a rename) — that swap is tracked as separate migration work, not by this row. **Decision: git history was NOT rewritten.** Reasoning: the repo is private, exactly two people have access, and there are no external clones — so the leaked values never left a controlled boundary — and the only two credentials with real blast radius are now revoked. A `git filter-repo`/BFG rewrite invalidates every existing clone, branch ref and open-PR base for no gain against a live threat; the dead keys remaining in history is acceptable. **Revisit trigger:** repo goes public, access materially widens, or evidence emerges that a leaked value was used before revocation. | DECISION | Toni | — | RESOLVED | 2026-09-07 | — |
| DEP-AUDIT | UPDATED 2026-09-06: CI step shipped — `.github/workflows/ci.yml` job `dep-audit` runs `pnpm audit --prod`, `continue-on-error: true` (advisory, does not fail the build — the transitive tree, especially React Native/Expo/Solana-wallet-adapter chains pulled in by `@clerk/expo`, has dependency-graph noise no one here controls; a hard-failing gate on all of it would just get routed around). **First run: 84 findings (4 low, 29 moderate, 47 high, 4 critical) before any fix.** Actioned the two `apps/web`-affecting criticals: `@clerk/nextjs@6.36.9` and its transitive `@clerk/shared` (via `@clerk/localizations`/`@clerk/themes`) were in the vulnerable range for **GHSA-vqx2-fgx2-5wq9, a Clerk middleware-based route-protection bypass** — bumped `@clerk/nextjs` to `6.39.6`, `@clerk/localizations` to `3.37.8`, `@clerk/themes` to `2.4.63` (all in-range for their existing `^` semver constraints, no `package.json` major-version change; `apps/web` typecheck + lint + full test suite (281 tests) all pass post-bump). **Result: 77 findings (4 low, 28 moderate, 43 high, 2 critical) — the 2 remaining criticals (shell-quote, node-tar) are `apps/mobile`-only, deep in Expo/Solana-wallet-adapter dev-toolchain transitive paths, not runtime request-path code.** Not actioned: 7 `apps/web` highs (`fast-uri`, via `@sentry/nextjs` → `webpack` → `schema-utils` → `ajv`, a build-time-only tool chain, not runtime) and 2 moderate + 1 low — all would need a workspace-wide `pnpm.overrides` pin, a more invasive change than a same-file in-range bump; flagged for founder/engineering follow-up, not fixed this session. Dependabot not enabled (a `pnpm audit` CI step was the simpler of the two options named in the row; Dependabot can still be added later for automated PRs). | CODE | Toni | Real traffic | OPEN | | — |
| CAUGHT-500S | UPDATED 2026-09-06: swept every `apps/web/app/api/**` route for a literal `{ status: 500 }` (67 raw hits). 15 were already covered — `logServerError` (`apps/web/lib/monitoring/log-server-error.ts`) already calls `Sentry.captureException` internally, and the 4 birth-data/diary routes that use it had 1:1 coverage on every 500 site (verified by reading each, not assumed). Of the remaining 52 (later found to be 50 once applied — the difference is comment-grouping, not a missed site): **33 files, 50 sites fixed.** Two mechanisms, chosen per site: (a) a genuine caught exception in a file that already imports `toErrorResponse` for other branches → converted to `return toErrorResponse(error, '<same message>')` (identical response shape, one capture path, no new import needed) — used at ~13 sites; (b) a mid-function DB-result check or a `result.error` discriminated-union branch (not a caught exception — `Sentry.captureMessage`, not `captureException`, for these) → a direct `Sentry.captureException`/`captureMessage` call added inline, `import * as Sentry from '@sentry/nextjs'` added where missing. The two payment webhooks (`webhooks/stripe`, `webhooks/revenuecat`) got the same treatment on all their 500 sites, including the "secret not configured" fail-closed branch (now `Sentry.captureMessage(..., {level: 'fatal'})` — a payment webhook rejecting every event silently was exactly this project's own documented VAPID-key near-miss, see COMPLETION-TRACKER.md). **Deliberately left unmarked with the STELLAEUM_PLACEHOLDER token**: all 50 new comments read `// CAUGHT-500S (historical) — ...` rather than the tokenized form, per this file's own "one marker per ID, at the single most load-bearing site" convention (line ~30) — the canonical marker stays solely at `apps/web/lib/auth/guards.ts`; the other 50 are plain, grep-findable comments, not gate-tracked markers. **Not touched, found in passing:** routes that `throw error` (not construct a `{status:500}`) for an uncaught exception in `apps/web/app/api/crystals/{collect,route,daily/collect}.ts` — these are already correctly captured via `apps/web/instrumentation.ts`'s `onRequestError = Sentry.captureRequestError`, confirmed by reading it, so left alone; and `circle/relationships/[relationshipId]/archive/route.ts`'s non-fatal member-archive-cascade failure, which logs via `console.error` but returns 200 anyway (a genuine data-integrity split with zero Sentry visibility) — out of scope since it doesn't return a 500, flagged for a follow-up row if the founder wants one. Verified: full `apps/web` typecheck clean, lint clean (0 new warnings), all 281 tests pass including the existing `webhooks/revenuecat-route.test.ts` suite that exercises the exact code path modified. | CODE | CC | Real traffic | OPEN | | apps/web/lib/auth/guards.ts |
| SMOKE-TEST | No post-deploy smoke test; crons fail silently | CODE | CC | Real traffic | OPEN | | — |
| BUILD-SHA | UPDATED 2026-09-06: `apps/web/middleware.ts` now sets an `X-Deploy-SHA` response header from `process.env.VERCEL_GIT_COMMIT_SHA` (Vercel's own auto-populated env var, no manual config), read at REQUEST time inside the middleware handler — not baked in at build time, so it cannot become a turbo build-cache key. `VERCEL_GIT_COMMIT_SHA` added to `turbo.json`'s `globalPassThroughEnv` (not `build.env`) with a comment explaining why the distinction matters (a build-input env var busts the cache on every commit; this one must reach the request process without polluting the cache key, same reasoning as the existing `DATABASE_URL`/`EXPO_PUBLIC_API_BASE` entries there). Applies to every route the middleware matcher covers, including all `/api/*` routes. Verified locally: `pnpm dev` with `VERCEL_GIT_COMMIT_SHA` set, `curl -I localhost:3000/` and `curl -I localhost:3000/api/user` both returned `x-deploy-sha: <the set value>`; falls back to the literal string `local` when the env var is unset (local dev, no deployment). **To read it in production:** `curl -I https://<domain>/` (or any route) and check the `x-deploy-sha` header — matches the deployed commit SHA, so "did the fix deploy" is a header check, not dashboard archaeology. Still open: BUILD-SHA existing doesn't itself turn SKEW-PROTECT on (that's still a separate founder/CONFIG decision, SKEW-PROTECT row) — this row only removes the blocker this row itself named. **Found in passing:** `turbo.json`'s `build.env` list had `OPENROUTER_API_KEY` and no `GEMINI_API_KEY` — a live staleness bug (the Gemini swap has been live since 2026-09-05, see LLM-MODEL-SWAP). **Fixed in `b9951ba` (2026-09-07)** along with the new `check:env-consistency` gate that would have caught it. | CODE | CC | Real traffic | OPEN | | apps/web/middleware.ts |
| LLM-FAILOVER | Single provider, no retry — a 5xx becomes a 502 | CODE | CC | Real traffic | OPEN | | apps/web/lib/ai/client.ts |
| RECOMMENDATION-CONTENT-LICENSING | `RECOMMENDATION_RIGHTS_MODE=development` disables a guard that exists because TMDB and Open Library content is **not commercially licensed for redistribution**, and we are a paid subscription app. Added 2026-09-08. **Mechanism (deliberate, not a bug):** `packages/core/src/recommendations/import.ts` *throws* if rights mode is `commercial` while the dev providers (TMDB / Open Library) are the import source; `packages/core/src/recommendations/service.ts` filters the catalog served to users to rows scoped `commercial` or `both`. So the guard's two effects are (a) the monthly dev-catalog cron cannot run in `commercial` mode and (b) users in `commercial` mode only ever see rows explicitly marked commercial-safe. Setting the mode to `development` (done 2026-09-07 so production recommendations return anything at all — see `turbo.json` globalPassThroughEnv + `apps/web/.env.example`) turns both off: the app then serves TMDB/Open Library-sourced rows to paying subscribers. **Resolves when** the catalog's commercial-licensing position is confirmed — either the content is licensed for this use, or a mode ships that serves only rows we are cleared to redistribute. | DECISION | Toni | Launch | OPEN | | — |
| PUSH-ORPHAN | Web push control imported by nothing; mobile has no settings toggle | CODE | CC | — | OPEN | | apps/web/components/horoscope/PushNotificationBanner.tsx |
| NEVER-EXPIRES-SENTINEL | `'2999-12-31T00:00:00.000Z'` duplicated between lib/oracle/expiry.ts and the restore SQL in TIER-DEFINITION-2026-09-01.md §12; drift silently expires lifetime readings | CODE | CC | — | OPEN | | apps/web/lib/oracle/expiry.ts |
| LINT-BASELINE-1800 | Ratchet has moved 1778→1800→1784→1785/1703 (diverged on two branches, 2026-09-01 through 2026-09-05)→1704 (reconciled on merge to main, measured against the actual merged tree, not computed); each move logged with justification in the script header. ID keeps its "-1800" suffix as a stable handle; current value 1704 | CODE | CC | — | OPEN | | scripts/i18n/check-bg-lint-baseline.mjs |
| SIWA-BG-LABEL | Apple button may render English on bg-locale devices; unverifiable until a device build (twin at `apps/mobile/app/(public)/sign-up.tsx`) | CODE | CC | Store submission | OPEN | | apps/mobile/app/(public)/sign-in.tsx |
| APPLE-ERROR-CODES | Real oauth_token_apple codes unmappable until a device sign-in; revisit from Sentry after Phase B | CODE | CC | — | OPEN | | apps/mobile/lib/clerk/errorMessages.ts |
| OAUTH-COPY-GOOGLE | RESOLVED 2026-09-03: form_param_missing / oauth_access_denied / external_account_exists rewritten provider-neutral (wording approved by Toni) — no longer say "Google". `oauth_email_domain_reserved_by_saml` was already neutral and untouched | CODE | Toni | Store submission | RESOLVED | 2026-09-03 | apps/mobile/lib/clerk/errorMessages.ts |
| ANR | Android ANR, no usable main-thread data; emulator device class is the leading suspect | CODE | CC | — | OPEN | | — |
| DOC-DRIFT | CLAUDE.md "Realtime" line; stale COMPETITOR_ANALYSIS and FEATURES docs. Retyped CODE→DECISION 2026-09-01: all three locations are docs and the work is "decide the current truth, then write it" — same shape as EN-LOCALE | DECISION | CC | — | OPEN | | n/a |
| COOKIE-CONSENT | RESOLVED 2026-09-03: PostHog (the analytics that made this row live, see ANALYTICS-VENDOR) is configured cookieless — `persistence: 'memory'` at `apps/web/components/analytics/PostHogProvider.tsx:71` and `apps/mobile/lib/analytics/posthog.ts:31` means neither platform ever writes a cookie/localStorage/AsyncStorage-persisted analytics identity. This is CONFIG-verified (the option is posthog-js's own documented storage-mode enum, not a workaround) but NOT live-browser-verified — the claude-in-chrome extension was unavailable in the session that made this change, so `document.cookie` / Application > Storage were never inspected empirically in a running app. Do that check before treating this as fully closed; re-open this row if it turns up a cookie. If persistence is ever changed off `'memory'` on either file, re-open regardless | CODE | CC | EU traffic | RESOLVED | 2026-09-03 | apps/web/components/analytics/PostHogProvider.tsx |
| TERMS | `/terms` route exists as a placeholder only (compliance batch 2026-09-01) — body is not lawyer-reviewed; linked from checkout + pricing + footer | CODE | Lawyer | Store submission | OPEN | | apps/web/app/terms/page.tsx |
| WITHDRAWAL-COPY | CRD immediate-performance / 14-day-withdrawal consent wording now shipped at Stripe Checkout (`custom_text`), still not lawyer-reviewed (compliance batch 2026-09-01) | CODE | Lawyer | Web payments | OPEN | | apps/web/lib/legal/compliance-copy.ts |
| STRIPE-TOS-URL | MERGED 2026-09-05 from two independently-added rows (`gemini/rebased-onto-injection`, 2026-09-03; compliance batch, 2026-09-04). `consent_collection.terms_of_service: 'required'` in the Stripe Checkout call is rejected by Stripe unless a Terms-of-Service URL is set in Dashboard → Settings → Public details — a founder dashboard step, not code. Stripe is sandbox-only until the company registers, so this whole checkout path is untestable against a real session until then. **Resolves when the live account has the URL set and one real checkout has completed** | CONFIG | Toni | Real traffic, Company registration | OPEN | | apps/web/app/api/stripe/checkout/route.ts |
| COMPLIANCE-AUDIT-RERUN | The compliance picture has not been independently re-verified since the 2026-09-01 batch (`de3a91a`) shipped. Everything believed about AI-Act disclosure, checkout consent copy, pricing-page disclosures, footer trader-ID, and CSP has come from the implementing session's own report — including this row's own session (2026-09-04 follow-up). Nobody has checked this work except the thing that did it. Resolves when an independent pass (different session, ideally different reviewer) re-verifies the claims in `.planning/SYSTEM-MAP.md` §11 against the running app | DECISION | Toni | Launch | OPEN | | n/a |
| AI-ACT-COPY | Article 50 disclosure now shown on Oracle (web+mobile), daily horoscope (web+mobile) and pricing (compliance batch 2026-09-01); wording not lawyer-reviewed; other AI surfaces still unaudited | CODE | Lawyer | Already overdue | OPEN | | apps/web/lib/legal/compliance-copy.ts |
| ENTITY-NAME | Legal entity name, ЕИК, address, VAT rendered in the site footer as bracketed placeholder values (compliance batch 2026-09-01); founder must supply real values | CODE | Toni | Launch, DSA trader | OPEN | | apps/web/lib/legal/compliance-copy.ts |
| TIER-ITEM-4 | Recommendations gating built (2026-09-01) — free sees the daily pick; the monthly arc renders identity + teaser with detail behind PremiumLock, web + mobile (`StoriesContent` takes `isPremium`) | CODE | CC | Launch | RESOLVED | 2026-09-01 | n/a |
| TIER-ITEM-5 | Shared `PremiumLock` / `LockBadge` primitive built and applied on both platforms: Oracle (`CapReachedNotice` folded in), recommendations (monthly arc), crystals (grid returns `locked` state; collect + collection tabs gated), and Кръг (2nd saved profile, connection invite, connection report — locked affordances before the attempt; server 403s carry `code: 'PREMIUM_REQUIRED'`). Saved-profile compatibility teaser left as the ruled locked state | CODE | CC | Launch | RESOLVED | 2026-09-01 | n/a |
| PROD-CREDS | Clerk/Stripe/RevenueCat on test keys; Clerk is a separate instance — orphans users, needs DNS + mobile rebuild | CONFIG | Toni | Launch | OPEN | | n/a |
| RC-WEBHOOK-SECRET | Placeholder signing secret; webhook dead | CONFIG | Toni | Revenue | OPEN | | n/a |
| SKEW-PROTECT | Vercel Skew Protection off — while off, a browser can mix JS chunks / API routes across deployments mid-session. Target state: ON before real traffic, **paired with** BUILD-SHA — ON on its own makes a session pinned to a stale deployment indistinguishable from an undeployed fix | CONFIG | Toni | Real traffic | OPEN | | n/a |
| SUPABASE-PLAN | Free tier pauses on inactivity | CONFIG | Toni | Launch | OPEN | | n/a |
| EAS-SENTRY-DSN | EAS env var carrying the mobile Sentry DSN unconfirmed | CONFIG | Toni | — | OPEN | | n/a |
| MOON-PARITY | Moon detail is mobile-only; violates the parity ruling | DECISION | Toni | Launch | OPEN | | n/a |
| PRICE-BASIS | €9.99 in the LLM decision doc vs €6.99 on the live pricing page | DECISION | Toni | Paywall | OPEN | | n/a |
| ANALYTICS-VENDOR | PostHog Cloud EU chosen 2026-09-03 — cookieless (memory persistence), five events only (signup completed, birth data submitted, chart first viewed, free Oracle reading generated, subscription started), no autocapture/session replay/heatmaps/surveys/feature flags/experiments. This resolves the cookie-consent question this row existed to answer — see COOKIE-CONSENT | DECISION | Toni | Launch | RESOLVED | 2026-09-03 | n/a |
| EN-LOCALE | English deferred; FEATURES.md still claims BG+EN | DECISION | Toni | — | OPEN | | n/a |
| LLM-RETENTION | Zero-data-retention status on the chosen provider unknown | EXTERNAL | Petko | Privacy policy | OPEN | | n/a |
| LLM-RETENTION-EEA | Sub-item of LLM-RETENTION, added 2026-09-03 against the free tier: Google's Gemini API Additional Terms of Service granted EEA/Switzerland/UK users the Paid-Services "no training on your data" terms even while unbilled, but that protection depended on caller region and the app has no location-gating. UPDATED 2026-09-04 (Gemini key moved to paid tier): now moot — on the **paid** tier, Google's "no training on your data, no human review" guarantee applies to every caller **unconditionally**, regardless of region (`ai.google.dev/gemini-api/terms`; cross-checked against the Google AI Developer forum's clarification thread). The location-gating caveat this row was written against **drops entirely** — there is no region-dependent carve-out left to structurally guarantee. Two caveats still stand, unchanged by the tier change: (1) this is Google's own claim, not lawyer-reviewed; (2) a 55-day abuse-monitoring log retention applies regardless of tier or region (`ai.google.dev/gemini-api/docs/usage-policies`: "For Paid Services, Google logs prompts and responses for a limited period of time solely for detecting violations of the Prohibited Use Policy"). Lawyer question, now a stronger position to hand them | EXTERNAL | Lawyer | Privacy policy | OPEN | | n/a |
| PRIVACY-REVIEW | Privacy policy content is a placeholder, not lawyer-reviewed | EXTERNAL | Lawyer | Launch | OPEN | | n/a |
| ORACLE-QA-ART9 | UPDATED 2026-09-05 per `.planning/ORACLE-QUESTIONS-SPEC.md`: the crisis enum option described below has been removed from the design entirely (no topic has a crisis option — see spec §0), and the Health topic's struggling-tier option was reworded from a direct health-condition disclosure ("здравословен проблем — мой или на близък — тежи върху мен") to a mood statement ("не се чувствам на себе си напоследък" — spec §2). The second question was also redesigned away from topic-authored circumstance text to a chart-derived, house-keyed question (spec §3) whose ~26 templates reference no illness, caregiving, or third-party health data. Net effect: as specced, none of the four topics' questions solicit health or other special-category data — this looks closable, but that determination is being recorded as a recommendation, not an autonomous close, since it's a founder/lawyer call on a compliance-tagged branch. Recommend: close once the spec's copy ships as written, pending founder/lawyer confirmation the redesign is sufficient. Original row text, for history: "structured topic-question Oracle personalization: answers include a shared 'crisis' enum option per topic (self-harm/hopelessness-adjacent) plus general emotional/health-state options, stored against the user for month-over-month personalization. Plausibly Art. 9 special-category data... this is the app *soliciting* the data, not a user volunteering it in free text... That mitigating language becomes false for this feature and must be redrafted, not just extended, if built." | DECISION | Lawyer | Privacy policy, PLP-7 | OPEN | | .planning/ORACLE-QUESTIONS-SPEC.md |
| CRISIS-LINE-VERIFICATION | SUPERSEDED 2026-09-05 by the finished support screen design in `.planning/ORACLE-QUESTIONS-SPEC.md` §8 — this row's original ask (a second, human-verified Bulgarian resource beyond 112) is now answered with a 4-entry screen (112, BRC 0800 114 66, Animus 0800 1 8676, Single Step chat) sourced from ThroughLine's directory (findahelpline.com), each entry `verified: true` with a recent `last_verified_at` in ThroughLine's own data, cross-checked against the operating organisations' own sites for BRC and Animus. Earlier rejections stand and are superseded, not reversed: 116 111 (child-helpline-scoped), 116 123 (reserved, unstaffed), БЧК's third-party-cited numbers (never found on БЧК's own site), and — new this round — Demetra's two numbers (`verified: false` in ThroughLine's own data), Kabinet.bg (booked named-consultant relationship, not a helpline, per ThroughLine's own criteria), Столична РЗИ (Sofia-only, narrow windows, not catalogued). Still blocked on email verification of the 3 non-112 numbers before ship — see CRISIS-COPY-VERIFICATION | DECISION | founder | Oracle crisis routing | RESOLVED | 2026-09-05 | .planning/ORACLE-QUESTIONS-SPEC.md |
| ORACLE-INPUT-STRUCTURED | Oracle pre-reading answers (`.planning/ORACLE-QUESTIONS-SPEC.md`) are enum-only by design, permanently — not a v1 shortcut. Free text is a separate feature requiring prompt-injection defence, Bulgarian crisis-language detection, validator rework, and legal review. Do not add a text field to either Oracle question without reopening this decision explicitly | DECISION | founder | Oracle questions | RESOLVED | 2026-09-05 | .planning/ORACLE-QUESTIONS-SPEC.md |
| CRISIS-COPY-VERIFICATION | VERIFIED 2026-09-06 by founder: direct confirmation obtained from all three non-112 operators (БЧК, Animus, Single Step) — this closes the email-first verification the rule (rewritten 2026-09-05) called for. Hours/scope as currently listed stand as confirmed unless the founder supplies updated figures separately; do not assume they match ThroughLine's record without that follow-up. RULE (2026-09-05): email-first, not phone-first. Bulgarian helplines are small and largely volunteer-run; a verification call takes a live slot from someone who needs one, for a confirmation that doesn't need a live human. Verify by email/web contact form before shipping; call only if there's no reply and the entry is critical enough that shipping unconfirmed is worse than the cost of a call. Recheck cadence: every 6 months from 2026-09-06, by email, against ThroughLine's `last_verified_at` and the organisation's own site — next recheck due ~2027-03-06. Original phone-first rule and precedent for history: Smiling Mind (AU meditation app) shipped an Australian crisis number to international users, a documented public failure; this project nearly made the same class of error twice in one session with 116 111 (child helpline) and 116 123 (reserved, unstaffed) — see CRISIS-LINE-VERIFICATION. SOURCING LESSON (2026-09-05, still binding): findahelpline.com blocks direct fetching (403); a first attempt read it via search-engine summaries and got a wrong answer — Animus mislabelled as LGBTQ+-scoped and separately as a children's line, both conflated from other entries on the same directory page. Only pulling the page's embedded structured data (`__NEXT_DATA__` JSON) directly and reading ThroughLine's actual per-entry fields caught this. Any future re-verification of this list must read structured data or the organisation's own site — never a search-engine summary of a multi-entry directory page | DECISION | founder | Oracle crisis routing | RESOLVED | 2026-09-06 | .planning/ORACLE-QUESTIONS-SPEC.md |
| THROUGHLINE-INTEGRATION | ThroughLine's API/widget (throughlinecare.com) covers 1,500+ verified helpline services across 170+ countries, maintained daily — meaningfully better than a static in-app list once there's a user base to justify the integration cost. The Oracle support screen (`.planning/ORACLE-QUESTIONS-SPEC.md` §8) ships as a static, hand-verified 4-entry list for launch; this is the post-launch upgrade path, not a launch blocker | DECISION | founder | Oracle crisis routing | OPEN | | .planning/ORACLE-QUESTIONS-SPEC.md |
| DPA-CONTRACTS | MERGED 2026-09-05 from two independently-updated rows (main's post-Gemini-merge version and the compliance branch's pre-merge version, which still listed OpenRouter). Processor DPAs unsigned: Clerk, Supabase, Stripe, Google, Sentry, PostHog. OpenRouter drops out of this list as of 2026-09-05 — the Gemini swap is now merged into main (see LLM-MODEL-SWAP), and production calls `generativelanguage.googleapis.com` directly (`@ai-sdk/google`, no `baseURL` override), never through OpenRouter. This is no longer conditional on a branch merging; it's the current state of main | EXTERNAL | Toni | Launch | OPEN | | n/a |
| SE-LICENCE | CHF 700 Swiss Ephemeris Professional; triggers on first paying subscriber; deferral reasoning undocumented | EXTERNAL | Toni | First subscriber | OPEN | | n/a |
| DESIGN-ASSETS | Placeholder icon/logo; IP assignment email sent, reply pending | EXTERNAL | Designer | Store submission | OPEN | | n/a |
| FREE-TIER | Frozen 2026-09-01 | DECISION | Toni | — | RESOLVED | 2026-09-01 | n/a |
| PRICE-ANNUAL | €59.99/yr | DECISION | Toni | — | RESOLVED | 2026-09-01 | n/a |
| VERCEL-PLAN | Confirmed not Hobby | CONFIG | Toni | — | RESOLVED | 2026-09-01 | n/a |
| LLM-MODEL | Provider decided; Petko implementing | DECISION | Petko | — | RESOLVED | 2026-09-01 | n/a |
| KRUG-TEASER | Free users keep the teaser as the locked state | DECISION | Toni | — | RESOLVED | 2026-09-01 | n/a |
| LLM-MODEL-SWAP | LLM-MODEL (decision) is RESOLVED and the implementation HAS landed — production now calls Gemini (`gemini-3.7-flash`, falling back to `gemini-3.6-flash`; see SYSTEM-MAP §4), not Llama. **UPDATED 2026-09-05: the swap is live on main** — `gemini/rebased-onto-injection` merged 2026-09-05 (commit `d08bd03`), `check:all` including a forced non-cached `check:build` passed clean post-merge. The branch-unmerged reason this row previously stayed open for no longer applies. UPDATED 2026-09-04: the paid-tier key cleared GEMINI-API-TIER's quota blocker — four full Gate 9 runs total (20 + 20 calls across two fix iterations) generated overwhelmingly cleanly. Gender agreement: clean in the first two runs (0/20), but a `"твоят Меркурий"` violation surfaced in a third run — 1 error in 37 successful generations to date (~2.7%), far below the Llama-era 8-9/10 rate but not literally zero; treat as "much improved, not perfect." **Stays OPEN on what's left (all pre-existing, none new from the merge):** (1) phrase repetition is not resolved — the sentinel-example rewrite cleared the specific opening construction it targeted, and a stoplist (2026-09-04) now correctly exempts ordinary connectives, but the same two content templates ("твоята луна в", "твоето слънце в") fail every run they've been checked, confirming genuine templating (threshold ruling pending — see GATE9-PHRASE-REPETITION); (2) THINKING-BUDGET-SPIKE is not resolved — the fix (aspect trimming + raised output ceiling) shipped and verified 0/20 across two post-fix Gate 9 runs, but 20 generations is a small sample against a base rate measured at 20-45% depending on condition, so it stays OPEN pending a larger-sample re-verification, not because the fix is doubted; (3) SAFETY-FILTER-UNTESTED — narrows, doesn't close: today's Oracle input (bare topic enum, no free text — see ORACLE-INPUT-STRUCTURED) is exactly what the 21 probes tested, so this doesn't block current launch, but it becomes live again the day the parked Oracle-questions feature (`.planning/ORACLE-QUESTIONS-SPEC.md`) ships richer, mood/circumstance-scoped prompt content that was never tested against Google's safety policy | CODE | Petko | Launch | OPEN | | apps/web/lib/ai/client.ts |
| GEMINI-API-TIER | Gemini free-tier quota caused 7/10 and 9/10 transient (fallback-then-fail) failures in an earlier Gate 9 run, and on 2026-09-03 three further full runs (this session, post sentinel-example rewrite) each hit 0/10 successful generations — every one of 30 attempted calls across primary + fallback returned `generativelanguage.googleapis.com/generate_content_free_tier_requests` quota-exceeded (`limit: 20`). RESOLVED-BY-CONTEXT 2026-09-04: the key moved to the paid tier and two full Gate 9 runs (20 calls) both cleared quota entirely — 0 quota failures, 0 fallback-model calls triggered. Left OPEN, not flipped RESOLVED, because this row describes a tier/billing state (CONFIG), not a code fix — it re-opens instantly if the key or project ever reverts to free tier | CONFIG | Toni | Launch | OPEN | | n/a |
| SAFETY-FILTER-UNTESTED | 21 real Gemini API calls this session (2 full Gate 9 runs = 20 calls, + 1 isolated diagnostic retry) produced zero refusals and zero non-null `safetyRatings`/`promptFeedback` — but the Gate 9 fixture is 10 generic natal-chart requests (birth data only, no life-event framing). Astrology content that touches health, death, or relationship-crisis framing — which real user prompts and the Oracle's free-text topic will eventually produce — has never been run against Google's content policy. An unexpected safety block on that content in production has no designed handling path (see THINKING-BUDGET-SPIKE's trace of the adjacent AI_NoOutputGeneratedError gap — a policy block would likely hit the same uncaught path) | CODE | Toni | Launch | OPEN | | — |
| THINKING-BUDGET-SPIKE | Gate 9 (2026-09-04, paid tier): 1 of 20 calls (5%) spent 867 thinking tokens against the `maxOutputTokens: 900` ceiling, leaving 18 tokens for the actual answer, and threw `AI_NoOutputGeneratedError`. Two fixes applied 2026-09-04: (1) `thinkingConfig.thinkingBudget: 300` — NOTE the Gemini API rejects setting both `thinkingLevel` and `thinkingBudget` together, so `thinkingLevel: 'low'` was removed, not kept alongside it; (2) `isTransientAIError` now recognizes `AI_NoOutputGeneratedError` by name, AND (the actual bug, found live) `generateFinalText`'s `callModel` now forces the lazy `.output` getter to throw *inside* the try/catch — it previously threw after, where neither classifier was ever consulted and the fallback never fired regardless of (2) alone. **UPDATED 2026-09-05, root cause found and logging gap fixed:** (a) **logAiUsage gap fixed** — it now runs inside `callModel` immediately after `generateText()` resolves, before the lazy `.output` getter is forced, so a failing call's usage is captured too (previously only a successful return logged anything). (b) **Root cause isolated via live ablation, 25 calls against Burgas (chart id 6) and one truncated variant:** the full Burgas prompt produced non-zero thinking spend in 5/15 trials (3 genuine spikes >400 tokens — 862, 860, 707 — one throwing `AI_NoOutputGeneratedError`; the rest logged `thoughtsTokenCount: null`, i.e. negligible). A variant with the `АСПЕКТИ:` section stripped entirely (identical planet/house/sign/retrograde data, zero aspect lines) logged `thoughtsTokenCount: null` on **10/10** trials — no non-zero measurement at all. Two other single-element ablations (removing the two 29th-degree/anaretic planets; moving the Ascendant off its 0.42°-from-Sun near-conjunction) each ran 0/5 spikes too, but at Burgas's ~20% base rate that is not distinguishable from chance at n=5 — the aspects-section ablation is the only one with a clean, non-chance-explainable signal (0/10 non-null vs. 5/15 non-null on the full prompt). Burgas's 14 aspects are not unusual in COUNT (mid-range of the 10-chart fixture, 12-27) but form an unusually interconnected cluster — Sun, Moon, Mercury, Venus, Mars, Saturn and the North Node are ALL mutually aspected to each other via that list, which plausibly costs the model more reasoning to synthesize into one narrative than a chart whose aspects fall into smaller disjoint chains. (c) **This is a launch blocker, not a fixture curiosity:** every real natal chart produces an aspects section of comparable size (the fixture's own range is 12-27), and a Sun-Mercury-Venus-adjacent cluster is structurally common (Mercury is always within ~28° of the Sun, Venus within ~48°) — dense mutual-aspect clusters like Burgas's are an ordinary occurrence, not a rare stellium. The ~20% live spike rate measured on this one chart should be read as a floor on how often real user charts will hit this, not a ceiling. (d) **thinkingBudget is confirmed NOT a hard cap** — see THINKING-BUDGET-NOT-A-CAP below; the 300 configured value was overflowed by as much as 187% (862 vs. 300) in these same trials, so the "cap" language throughout this entry's history was wrong and is corrected here. Stays OPEN: usage visibility is fixed and the root cause (aspect-cluster density driving reasoning cost, not model non-determinism alone) is now understood, but nothing in this branch structurally prevents the overflow — the retryable-fallback path is a mitigation for the catastrophic case, not a fix for the underlying cost/latency variance on dense charts. **UPDATE 2026-09-05, candidate fix chosen and shipped, empirically not by reasoning:** three candidates tested live against Burgas, N=10-20 each (primary model only, no fallback, so failures are visible per-condition). **(A) thinkingBudget: 0** — REJECTED. The API silently accepts the value (no error) but does not honor it: across 20 trials, 9 still failed with `AI_NoOutputGeneratedError` (45%, if anything worse than baseline's 35% over the same 20), and the failures spent 702-866 thinking tokens — indistinguishable from baseline's 841-867. Thinking cannot be disabled this way on this model under load. **(B) maxOutputTokens 900->2000** — WORKS: 0/20 failures, thinking spend up to 1317 when uncapped (higher than any prior measurement, since starvation no longer truncates it). Free in the normal case — maxOutputTokens is a ceiling on billed usage, not a floor; candidatesTokenCount stayed 311-439 regardless of the ceiling. Not a structural guarantee: a spike bigger than 2000 minus normal candidate spend would still starve output. **(C) aspects trimmed to orb<=4.0 in the prompt only** — WORKS: 0/20 failures, thinking spend logged `null` (negligible) on all 20 trials, not just reduced. Addresses the isolated root cause directly rather than tolerating it. Sample readings reviewed for coherence: indistinguishable in structure/register from baseline, and cost nothing in practice — even baseline readings only ever cited 1-3 of the 14 available aspects per ~150-200-word reading, so halving the input list did not reduce what actually made it into any reading. **Shipped: B and C together** (chart-to-prompt.ts's new `significantAspects()`; apps/web/app/api/oracle/generate/route.ts's maxOutputTokens raised to 2000) — C as the primary fix since it's cheaper (fewer prompt tokens, zero residual thinking spend vs. B's tolerated-but-present spikes) and addresses the established cause; B as a free safety margin against some other real chart shape hitting the same failure mode through a mechanism this investigation didn't test. Verified with 2 full Gate 9 runs post-fix (20 generations total, all 10 charts including Burgas, both runs): **0/20 AI_NoOutputGeneratedError throws** (was 1/20 in the original Gate 9 measurement, and reproduced live in this investigation's own ablation trials). Remaining Gate 9 failures in both post-fix runs (phrase-repetition template, one sentinel-key typo, one gender-agreement slip) are the separate, already-tracked GATE9-PHRASE-REPETITION / LLM-MODEL-SWAP issues, unrelated to this fix. Downgrading to RESOLVED is not yet warranted — 2 runs (20 generations) is a small sample against a phenomenon whose live base rate was itself measured at 20-45% depending on condition; re-verify at a larger sample before trusting long-term, same caveat as ORACLE-WORD-BAND | CODE | Petko | Launch quality bar | OPEN | | apps/web/lib/ai/generate-final-text.ts |
| THINKING-BUDGET-NOT-A-CAP | `thinkingConfig.thinkingBudget` is a soft target, not a hard limit. Google's own docs for this exact field (`ai.google.dev/gemini-api/docs/generate-content/thinking`, thinkingBudget section): "Depending on the prompt, the model might overflow or underflow the token budget." Confirmed empirically on `gemini-3.7-flash` (not one of the doc page's own listed 2.5-series models, but the same `thinkingConfig.thinkingBudget` field/mechanism): 15 live trials against the Burgas chart (THINKING-BUDGET-SPIKE) with `thinkingBudget: 300` configured produced thinking-token spends of 153, 212, 348, 707, and 862 — the last two overflowing the configured budget by 136% and 187% respectively. Every prior reference in this file and in generate-final-text.ts's comments to the 300 value as a "cap" or "ceiling" is corrected by this entry: it is the number Google's own docs say the model is free to exceed depending on the prompt, and it did, repeatedly, in this codebase's own measurements | CODE | Toni | Launch quality bar | OPEN | | apps/web/lib/ai/generate-final-text.ts |
| GEMINI-EU-REGION | Added 2026-09-03: no EU-region pinning exists on the Gemini call — `generativelanguage.googleapis.com` is Google's global endpoint, and `lib/ai/client.ts`'s `createGoogleGenerativeAI` call has no region/location parameter to mark. `LLM-PROVIDER-DECISION-2026-08-27.md` criterion 5 treats "single direct provider" and "EU-hosted" as two separate questions; this branch answers the first (Google, one entity) but not the second — the privacy policy's third-country-transfer (Chapter V) analysis still applies | CODE | Toni | Privacy policy | OPEN | | — |
| GEMINI-MODEL-AGE | Added 2026-09-03: `gemini-3.7-flash` (released 2026-08-13) and `gemini-3.6-flash` (released 2026-07-21) were 3-6 weeks old at the time of the model swap, per `ai.google.dev/gemini-api/docs/deprecations` — neither has an announced shutdown date, and `gemini-3.7-flash` appears under a "Stable" (not `-latest` rolling-alias) listing, which is good for reproducibility, but both models carry very little production track record anywhere. A quality/stability risk independent of cost or quota | DECISION | Petko | Launch quality bar | OPEN | | n/a |
| REGEN-QUOTA-EXEMPT | Ratified, not a defect — founder-confirmed 2026-09-04. `oracle/generate` step 8 exempts regenerations of an existing cached reading from `PREMIUM_MONTHLY_LIMIT`, gated only by the 10/min burst limiter and the 24h-per-chart-topic cooldown at step 7 (B.0f-2-fix-1, 2026-05-10; reaffirmed as the frozen tier spec in TIER-DEFINITION-2026-09-01.md). Ceiling: 4 topics x 20 charts (MAX_CHARTS_PER_USER) = up to 80 quota-free regenerations/premium-user/day, never touching the 300 cap or its Sentry alert at 200. Cost: a single day at the full 80-slot ceiling ≈ €0.18, ≈3.6% of a subscriber's entire month of €4.95 net revenue — rising to ≈7% once Gemini's list price doubles 2027-01-01 (see the Gemini cost report). Logged here so this is read as an accepted, sized cost surface rather than rediscovered as a surprise | CODE | Toni | — | OPEN | | apps/web/lib/subscriptions/quota.ts |
| DEVICE-SUPPORT-FLOOR | RESOLVED 2026-09-04: written policy at `.planning/DEVICE-SUPPORT-POLICY.md` — install floor iOS 17 / Android 11 (API 30), set via `expo-build-properties` in `apps/mobile/app.json`; separate design floor 360x780 CSS px (not iPhone SE). Bulgaria-verified via Statcounter (Android 75.85% / iOS 24.14%, Aug 2026): excludes ≈0% of iOS, ≈5.5% of the total Bulgarian mobile market on Android (the "10 and below" bucket). The 360x780 design floor and the "SE is under 1-2% of this market" figure are proxy inference from global reporting, not Bulgaria-verified — flagged as such in the doc. Supersedes the iPhone SE reference used in the 2026-09-03 layout measurement | DECISION | Toni | — | RESOLVED | 2026-09-04 | apps/mobile/app.json |
| DEVICE-PASS-STALE | `DEVICE-PASS-2026-08.md` tested a Pixel 8 emulator and an iPhone 12 Pro Max — both predate DEVICE-SUPPORT-FLOOR and sit nowhere near the 360x780 design floor it establishes. Needs re-running against a 360x780-class device (or simulator/emulator set to those dimensions) before launch, to catch layout issues the large-device pass couldn't surface. Not re-run as part of this session — explicitly deferred | CODE | CC | Launch | OPEN | | — |
| ORACLE-WORD-BAND | Oracle's post-generation word-count band was widened from the Llama-era 300-800 words to 100-250, based on Gate 9 measuring live Gemini output at 126-164 words across 11 live samples (6 in the run documented at `apps/web/app/api/oracle/generate/route.ts`'s WORD-COUNT BAND comment, plus 5 more from a prior session) — see that comment for the derivation. Re-verify against a larger Gate 9 sample once GEMINI-API-TIER is resolved and a full 10-for-10 run is possible; 11 samples is not enough to trust the band long-term | CODE | CC | Launch quality bar | OPEN | | apps/web/app/api/oracle/generate/route.ts |
| GATE9-PHRASE-REPETITION | Llama-era baseline (last full run): "твоят [planet] на" as a stock opening in 6-8 of 10 readings, with Слънце's grammatical gender wrong ("твоят Слънце" instead of neuter "твоето Слънце") in most of those. On Gemini, a prior session's partial run saw the related "твоята/твоето [planet] на" construction in 4-6 of 10 readings — close enough to the SENTINEL MARKERS example in `prompts.ts` (which opened its example sentence with "Твоето [planet:sun]Слънце[/planet] на …") to suspect the model was copying the example's sentence-opening shape rather than following the instruction, the same failure the three removed example phrases caused. 2026-09-03 (this session): both oracle and horoscope prompt files' sentinel examples were rewritten to demonstrate the token syntax mid-clause instead of as a reusable sentence opener (see `apps/web/lib/oracle/prompts.ts` and `apps/web/lib/horoscope/prompts.ts`). The hypothesis is UNTESTED, not confirmed or refuted: three follow-up Gate 9 runs against the rewritten prompts each returned 0 of 10 successful generations (GEMINI-API-TIER quota exhaustion), so there is no post-rewrite output to check for the phrase. Confirmed model-only either way — no static Bulgarian string in the codebase has the wrong-gender form (`packages/astrology/src/constants.ts` already encodes `PLANETS_BG_GENDER.sun = 'neut'` correctly; it just is not consulted by the prompt) | CODE | Petko | Launch quality bar | OPEN | | — |
| CHART-CALC-BACKFILL | `6b1a25d` (2026-09-02) made `calculateNatalChart` use the stated birth-time window's midpoint for unknown-time charts instead of always assuming noon, but existing `chart_calculations` rows computed before that commit still hold the old 12:00 estimate — those users see a chart calculated at the wrong assumed time until the row is invalidated/recalculated. No backfill script exists yet | CODE | CC | Data accuracy for existing accounts | OPEN | | — |
| THINKING-TOKEN-COST | Added 2026-09-03: `thinkingLevel: 'low'` in `generate-final-text.ts` still bills thinking tokens as output (Google's pricing page: output price includes thinking tokens), and `generateFinalText()` never read `result.usage` before this branch, so real per-call cost was unmeasured — the €0.0022/call estimate in the Gemini cost report excluded it entirely. Instrumented: `logAiUsage()` logs the raw `{promptTokenCount, candidatesTokenCount, thoughtsTokenCount, totalTokenCount}` (no prompt/response content, no userId) to `console.log('[AI usage]', ...)` on every generation, readable via Vercel Runtime Logs. RESOLVED 2026-09-04: real figure measured — 20 Gate 9 calls (two full 10-chart runs, paid tier), token counts read from the `[AI usage]` log lines, costed at Gemini 3.7 Flash's introductory list pricing ($0.75/M input, $3.75/M output incl. thinking — `ai.google.dev/gemini-api/docs/pricing`), USD→EUR at ≈0.93 (same conversion basis as `LLM-PROVIDER-DECISION-2026-08-27.md`). Result: **€0.00265/call average, ~20% above the €0.0022 estimate** — 19/20 calls logged `thoughtsTokenCount: null` (near-zero, consistent with `thinkingLevel: 'low'`), one spent 867 thinking tokens and cost 65% more than the normal-call average (see THINKING-BUDGET-SPIKE). This is a lab measurement against the Gate 9 fixture, not a production-traffic average — a wider gap is possible under real usage patterns | CODE | Toni | Cost visibility | RESOLVED | 2026-09-04 | apps/web/lib/ai/generate-final-text.ts |
| BULGARIAN-SKILL-UPDATE | `.claude/skills/bulgarian-skill/references/*.md` has been the authority behind this project's Bulgarian copy (caught the "сърдечно състояние"→"любовен живот" and "Какво тежи ти"→"Какво ти тежи" errors — see `.planning/ORACLE-QUESTIONS-SPEC.md` §2). A 2026-09-06 review found three project-surfaced lessons the skill files do not yet capture: (1) **possessive-adjective agreement with a personified noun** — `astrology.md`'s planet-gender table correctly lists Слънце as neuter, but nothing connects that to possessive-adjective agreement or flags it as error-prone; `grammar.md` §4 (Adjectives) covers gender agreement for a regular adjective but has no entry for possessive adjectives (мой/твой/негов/неин/наш/ваш/техен) at all, and §12 (Common Grammar Mistakes) has no "personified/mythologically-masculine noun defaults to masculine article despite grammatically neuter/feminine gender" entry — this is the exact shape of the Llama-era "твоят Слънце" error (8-9/10 readings), fixed only by the model swap, not by a prompt or content correction, per GATE9-PHRASE-REPETITION; (2) **fleeting-vowel gender pairs** — the Oracle-questions ruling (spelled-out gender pairs everywhere, no compact "/а", because fleeting-vowel adjectives like "доволен"/"несигурен" don't compact evenly to "доволен/на") has no home in `orthography.md` (§4 "Променливо я" is a different alternation) or `grammar.md`; (3) **clitic second-position placement** — `grammar.md` §9's clitic-ordering note covers only cluster-internal order (dative before accusative), not the clause-level rule that a clitic attaches after the first stressed/focused constituent, not the verb — the exact rule behind the caught "Какво тежи ти" error. Scope is reporting only; the skill files were not edited — see the 2026-09-06 session report for the full writeup of what to add and where | DECISION | CC | Launch quality bar | OPEN | | n/a |

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
| SECRET-SCAN | Absence of a pre-commit hook (`.husky/` still doesn't exist); the CI job itself lives in `.github/workflows/ci.yml`, which the gate's grep scope (`apps/`, `packages/`, `scripts/`) does not cover. |
| DEP-AUDIT | Absence of a stricter gate — the CI job (`.github/workflows/ci.yml`) is `continue-on-error: true` by design (advisory), and `.github/` is outside the gate's grep scope regardless. |
| SMOKE-TEST | Absence of a post-deploy script. No `scripts/*smoke*`, no workflow step. |
| ANR | Android runtime symptom, not a code line. Investigation item. |
| GATE9-PHRASE-REPETITION | Model-output symptom (a stock phrase and a grammar error the model produces), not a line of code — the prompt already models correct gender by example and there is no per-planet gender lookup to wire in without prompt-engineering a placeholder model, which this file's header ruling says not to do. |
| CHART-CALC-BACKFILL | The gap is a backfill script that doesn't exist yet — nothing in the repo to mark until one is written. |
| GEMINI-EU-REGION | Absence finding — no region parameter exists in `createGoogleGenerativeAI({ apiKey })`; there is no line to comment on the lack of a parameter that was never there. |
| DEVICE-PASS-STALE | Process/testing gap, not a line of code — the device pass is a manual QA session logged in a doc, not something a code comment can mark. |
| SAFETY-FILTER-UNTESTED | Testing gap, not a code defect — no prompt in the Gate 9 fixture or the codebase deliberately exercises health/death/relationship-crisis framing against Google's safety policy; there is no line to mark for a test that was never written. |

**Finding:** 9 of the OPEN CODE entries have no code location (was 11
before 2026-09-06: CORE-TESTS and BUILD-SHA both gained real, marked
Locations this session — `packages/core/vitest.config.ts` and
`apps/web/middleware.ts` respectively — and left this list, net -2.
SECRET-SCAN and DEP-AUDIT stay on it despite both shipping real CI work
this session: the code lives in `.github/workflows/ci.yml`, outside the
gate's grep scope (`apps/`, `packages/`, `scripts/`), so a marker there
would never be found regardless. Before that: was 9 before 2026-09-03:
COOKIE-CONSENT resolved with a real marker-free Location citation,
removing it from this list; GATE9-PHRASE-REPETITION and
CHART-CALC-BACKFILL added to it the same day, net -1; GEMINI-API-TIER
and GEMINI-MODEL-AGE are CONFIG/DECISION-type, not CODE, so they do not
affect this count; GEMINI-EU-REGION added the same follow-up session,
net +1; DEVICE-PASS-STALE added 2026-09-04, net +1; SAFETY-FILTER-UNTESTED
added 2026-09-04 (Gate 9 paid-tier follow-up), net +1). Historical count
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
| DEVICE-PASS-STALE | CODE | CC | **no — no code location, manual QA gap** |
| BULGARIAN-SKILL-UPDATE | DECISION | CC | **no — manual, skill-file content** |

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

## Reconcile — source of truth per overlapping item (adopted 2026-09-01, scope extended 2026-09-06)

Every item below is described in **two or more** of: this register,
`COMPLETION-TRACKER.md`, `PRE_LAUNCH_PREREQS.md`, `SYSTEM-MAP.md`,
`TIER-DEFINITION-2026-09-01.md`, `STATE.md`,
`legal/processor-dpa-audit.md`, `legal/pending-review/privacy-draft.md`.
The **source of truth (SoT)** column is now in force: the SoT doc owns
that item; the others carry a one-line
`placeholder status: see .planning/PLACEHOLDERS.md <ID>` pointer and do
**not** restate its status. Restated status text in the bound docs was
deleted on adoption (dated log entries, ruling narrative, and evidence
tables excluded).

**2026-09-06 scope extension — why these three joined the other five.**
The 2026-09-05 branch merges left four documents describing pre-merge
state; three of them — `STATE.md` and the two `legal/*` files — were
never bound by this rule at all, so their drift wasn't a rule failure,
it was an absence of a rule:
- **`STATE.md`** plays the same "what's currently true" role as
  `SYSTEM-MAP.md` and is a document a future session is likely to read
  first — it held the single most stale line found in the 2026-09-06
  sweep (claimed the LLM provider swap was "recommended not decided"
  after it had shipped). Bound into the LLM cluster below.
- **`legal/processor-dpa-audit.md`** and
  **`legal/pending-review/privacy-draft.md`** were already *mentioned*
  in the COOKIE-CONSENT/DPA-CONTRACTS cluster's "also documented in"
  column, but only as "working drafts" with no SoT discipline applied to
  them — nothing pointed the AI-provider identity fact (DPA-CONTRACTS,
  LLM-MODEL-SWAP) at these two files specifically, which is exactly why
  `privacy-draft.md` — the one document in this repo that leaves it for
  a lawyer to read — still named OpenRouter/Llama as the AI processor.
  Bound into a new DPA-CONTRACTS cluster below.

Files intentionally **left out of scope**: `COMPLETION-TRACKER.md`'s own
dated narrative log, `archive/*`, `phases/*/HANDOFF-*` /
`*-SUMMARY.md`, and `research/AI_PROVIDER_DECISION.md` are historical
records by design — reconciling them against current state would falsify
the history they exist to preserve.

| Item(s) | Also documented in | Source of truth | Rationale |
|---|---|---|---|
| PAYWALL-MOBILE, PROD-CREDS, RC-WEBHOOK-SECRET, APP-URL-MOBILE | COMPLETION-TRACKER "Halt-required register" + "blocked-externally"; SYSTEM-MAP §10 | **COMPLETION-TRACKER** (halt-required register) for the *narrative / ruling*; this register for the *one-line status + marker*. | The tracker already holds ratification history and founder rulings; duplicating that here would rot. This register should carry the ID, one line, and the marker location, and link to the tracker section. |
| SIWA-BG-LABEL, OAUTH-COPY-GOOGLE, APPLE-ERROR-CODES, PAYWALL-MOBILE (store side) | PRE_LAUNCH_PREREQS PLP-11; COMPLETION-TRACKER "SUBMISSION BLOCKER"; APPLE-REVIEW-REQUIREMENTS-2026-08-27 §1 | **PRE_LAUNCH_PREREQS PLP-11** for "is SIWA submittable"; this register for the code-level sub-items. | Submission-readiness is a launch-gate question; the prereq doc is the canonical launch-gate list. |
| ASTRO-TIMEZONE, ASTRO-INJECT | SYSTEM-MAP §5; PRE_LAUNCH_PREREQS PLP-6 (ephemeris validation, `[done]` for the *ephemeris*, silent on BG birth locations) | **SYSTEM-MAP §5** for the technical description; this register for "unverified, blocks launch". PLP-6 carries a scope-note pointer to this register. | PLP-6 is marked `[done]` and could be misread as "astrology is validated"; the scope gap needs a pointer. |
| LLM-GUARDRAILS, LLM-FAILOVER, LLM-RETENTION, LLM-MODEL, PRICE-BASIS | SYSTEM-MAP §4; PRE_LAUNCH_PREREQS PLP-5 / PLP-5a; `STATE.md` Phase 5 Completion Summary; `LLM-PROVIDER-DECISION-*` / `AI_PROVIDER_DECISION.md`; CLAUDE.md header | **SYSTEM-MAP §4** for current AI truth; PLP-5a for the failover *decision*; this register for status lines. `STATE.md` and CLAUDE.md's AI header block should be trimmed to a pointer at SYSTEM-MAP §4, not restate the provider. | Now five docs restate the "current model/provider" fact instead of pointing at one; `STATE.md` was the one that drifted worst (2026-09-06 sweep). |
| MIGRATIONS, SCHEMA-UNTRACKED | SYSTEM-MAP §3; `SCHEMA_DRIFT_AUDIT.md`; COMPLETION-TRACKER §0.6 area | **`SCHEMA_DRIFT_AUDIT.md`** (or SYSTEM-MAP §3 if that audit is stale) for the full picture; this register for the one-line status. | Schema state needs a table-by-table ledger, which belongs in the audit doc, not a status row. |
| TIER-ITEM-4, TIER-ITEM-5, KRUG-TEASER, FREE-TIER, PRICE-ANNUAL | **TIER-DEFINITION-2026-09-01.md** "The frozen definition" (policy tables); §11/§12/"Implementation status" (historical build log, frozen) | **Split, 2026-09-06:** **TIER-DEFINITION-2026-09-01.md "The frozen definition"** section (the FREE/PREMIUM tables) for what is free vs. premium — permanent, does not change when code ships. **This register** for current implementation status of each item. TIER-DEFINITION's "Implementation status" table and §1-§12 are historical as of 2026-09-01/2026-09-05 — read for reasoning and original scoping, not current state. | Naming TIER-DEFINITION as sole SoT for *status*, with nothing that re-triggers an edit to it when code ships elsewhere, is exactly what let it still read "NOT DONE" after recommendations gating merged 2026-09-05. The policy-vs-narrative split removes the incentive to hand-edit a frozen narrative doc every time a tracked item's status changes — this register's rows already get touched on every merge, by construction. |
| NEVER-EXPIRES-SENTINEL | TIER-DEFINITION §12 (the restore SQL); `apps/web/lib/oracle/expiry.ts` (the constant) | **the code** (`NEVER_EXPIRES_AT` in lib/oracle/expiry.ts) is SoT for the *value*; TIER-DEFINITION §12 must be updated whenever it changes. This register tracks the duplication risk. | A literal duplicated between code and a SQL snippet has no doc SoT — only a "these must match" note, which is what the marker is for. |
| LINT-BASELINE-1800 | `scripts/i18n/check-bg-lint-baseline.mjs` header log; `feedback_epistemic_tagging` / handoff §2 | **the script header** (`check-bg-lint-baseline.mjs`) — it already logs every raise with justification. | The raise log lives with the number it governs. This register just points at it. |
| COOKIE-CONSENT, ANALYTICS-VENDOR, PRIVACY-REVIEW, TERMS, WITHDRAWAL-COPY, AI-ACT-COPY, ENTITY-NAME | PRE_LAUNCH_PREREQS PLP-7; SYSTEM-MAP §11; `.planning/legal/*` (`processor-dpa-audit.md`, `privacy-draft.md`) | **PRE_LAUNCH_PREREQS PLP-7** for the launch-gate rollup; `.planning/legal/*` for the working drafts; this register for per-item status + owner. | Compliance has a natural home (PLP-7 + the legal folder); this register adds machine-visible IDs and owners those lack. |
| DPA-CONTRACTS | `legal/processor-dpa-audit.md` §4 (per-processor detail); `legal/pending-review/privacy-draft.md` §III / §X / §XI (lawyer-facing disclosure text) | **This register (DPA-CONTRACTS row)** for *which processor is live* (currently: Google, not OpenRouter). The two `legal/*` files own the full disclosure language and DPA-status tracking, but must match this row's processor identity — they do not get to independently decide who the AI processor is. | This is the cluster that drifted worst: `privacy-draft.md` named OpenRouter/Llama as the AI processor for a document meant to leave the repo and reach a lawyer, weeks after the register itself had already recorded the Google swap. Naming the processor identity as this register's job, with the legal docs required to match it, is the fix. |
| SE-LICENCE | PRE_LAUNCH_PREREQS "Founder watch item"; `docs/licensing.md § Revisit triggers`; `POST_LAUNCH_UPGRADES.md` item 1; trigger code in `stripe/subscription.ts` + `revenuecat/webhook-events.ts` | **`docs/licensing.md`** for the reasoning + trigger list; this register for "undocumented deferral reasoning" (the actual gap). | The licence decision is documented in three places; the *gap* this row names is that the deferral rationale isn't written down — fixing that means editing `docs/licensing.md`, then this row can point there. |

**Cross-cutting rule (in force):** SYSTEM-MAP.md already states (line 3)
that the placeholder register wins over it on conflict. The same now holds
for all bound docs: this register owns **ID + one-line status + owner +
marker location**; the other docs own **narrative, rulings, dated history,
evidence, and technical depth** — except TIER-DEFINITION's policy tables,
which this register does not own (see the split above). Where a doc
restated a status this register owns, that text was deleted and replaced
with a `placeholder status: see .planning/PLACEHOLDERS.md <ID>` pointer.
Excluded from deletion by design: dated log entries (batch ledger,
status-change log, §12 live-data check), TIER-DEFINITION's frozen policy
tables and its "Implementation status" historical log (carries
VERIFIED/INFERRED tags + test names — kept as a build-log record, not as
current status), and PRE_LAUNCH `PLP-7`'s body (the compliance rollup this
table names as SoT for that cluster).

**Granularity gap (identified 2026-09-06) and the rule adopted to close
it.** This table reconciles *named clusters* — specific IDs, pointed at
specific sections — not full document text. That is why the 2026-09-05
drift wasn't limited to the cells this table names: `SYSTEM-MAP.md`'s §2
overview prose, its "blocks scale" task list, and `PRE_LAUNCH_PREREQS.md`
PLP-9's provider-TOS list all named OpenRouter without being part of any
reconciled cluster cell. A calendar-based periodic full-text sweep was
considered and rejected — there is no CI job or scheduled session in this
project to run it, so a "recheck every N weeks" rule would silently lapse
the same way the reconcile pass itself did between 2026-09-01 and
2026-09-06. **Adopted instead: a full-text grep trigger, tied to the event
that already reliably happens — a register status change.** Whenever a
row belonging to a reconciled cluster in this table changes Status (e.g.
DPA-CONTRACTS or LLM-MODEL-SWAP moving between values, or a new dated
update appended to one), the session making that edit must
`grep -ri` the term that changed (the old provider name, the old status
adjective, etc.) across **every** doc bound by this section — not just the
cells this table names for that cluster — and fix every hit. This is
cheap (one grep, run at a moment that already requires touching this
file) and catches prose outside named cells, which a narrower "update the
named cluster cells only" rule does not.

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
