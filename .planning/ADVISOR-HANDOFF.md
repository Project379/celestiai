---
title: Advisor handoff (for a repo-less Claude chat)
created: 2026-10-01
audience: a model with NO repo access; pair with the founder's behaviour document
tags: VERIFIED = checked/ran this session (2026-10-01). INFERRED = from docs/memory, not re-checked.
---

# 0. Provenance and limits
- This file was written by a FRESH Claude Code session (no prior conversation). VERIFIED.
- "In flight" and "decisions" below are reconstructed from the working tree, the register and memory files, not from remembered conversation. Treat as INFERRED unless tagged.
- The founder's behaviour document was NOT included in the request (only the placeholder text "[paste the full text of STELLAEUM-CLAUDE-HANDOFF.md here]"). No such file exists in the repo. VERIFIED. Section 9 is therefore NOT performed.
- Founder = Toni (git user Tonev1). Use they/them for anyone whose pronouns are unstated.
- Repo: github Project379/celestiai (dir name sub-project). Product: Stellaeum AI, Bulgarian astrology subscription app. Monorepo (Turborepo, pnpm scripts), Next.js 15 web + Expo mobile, Clerk, Supabase Postgres, Drizzle, Stripe (web) + RevenueCat (mobile), native `sweph`, Gemini for AI text. VERIFIED.

# 1. CURRENT STATE (2026-10-01)

## 1.1 Git
- Branch main only (single active branch by founder rule). Local == origin/main == 605f51a. `git fetch` run; HEAD and origin/main hashes identical. VERIFIED.
- Last 10 commits, newest first. VERIFIED:
  1. 605f51a fix(gdpr): stop leaking Clerk userId into Sentry, delete Stripe customer at 30-day hard-delete (2026-09-29)
  2. 8a4d899 feat(recommendations): disable media recommendations pending content-licensing resolution
  3. 4a87f39 fix(gdpr): cancel Stripe subscription on account-deletion request, not at 30-day hard delete
  4. ca27bef docs: Android display + Play Store submission research; fix CLAUDE.md SDK drift; add standalone account-deletion URL
  5. 4e13054 fix(analytics): bound captureServerEvent's fetch with a 2.5s timeout
  6. 13a8f2f fix(analytics): move subscription started server-side into both webhooks
  7. d93de09 fix(mobile): defer PostHog init to Clerk isLoaded; wire subscription started
  8. cf96c47 ci: CSP connect-src smoke check, pin Ubuntu 24.04, bump actions for Node 24
  9. 9a9fa1f fix(analytics): stop the redundant $identify firing on every dashboard load
  10. f6d830f fix(analytics): add PostHog host to CSP connect-src; bootstrap distinct ID
- Unpushed commits: none. VERIFIED.

## 1.2 Uncommitted / untracked (all VERIFIED present)
Modified:
- `.planning/PLACEHOLDERS.md` (PROCESSOR-ERASURE-GAPS row: PostHog + RevenueCat marked RESOLVED-in-code, row still OPEN)
- `apps/web/app/api/cron/cleanup-deleted-accounts/route.ts` (calls the new processor-erasure helpers)
- `apps/web/test/gdpr/cleanup-cron.test.ts` (+35 lines)
- `apps/web/.env.example` (+4 var names, Production-only comment)
- `turbo.json` (+4 names in globalPassThroughEnv)
- `apps/mobile/lib/purchases/RevenueCatProvider.tsx` (+14 lines: a "TEMP DIAGNOSTIC" console.log of key length/head(8)/tail(4)/__DEV__; must be removed; it prints parts of an API key to device logs)
Untracked:
- `apps/web/lib/gdpr/processor-erasure.ts` (new helpers `deletePostHogPerson`, `deleteRevenueCatCustomer`)
- `apps/web/test/gdpr/processor-erasure.test.ts`
- `.planning/design/mockups/oracle-loading-progress-v1.html` (mockup; founder is sole judge of design — do not touch)
- `apps/mobile/rc.txt` (21 KB UTF-16 Android logcat dump from 2026-09-28; junk; contains no `sk_`/`phx_`/`AIza`/"secret" strings by grep; not gitignored; should be deleted or ignored, NOT committed)
- Test run: `vitest run test/gdpr` = 4 files, 41 tests, all pass (this session). VERIFIED. Typecheck/lint/check:all NOT run on this tree.
- This handoff file will be committed alone; the above stays uncommitted.

## 1.3 Production and smoke
- Production = https://www.stellaeum.com. Latest Production deployment: sha 605f51a, 2026-09-28T21:13Z, state success. `X-Deploy-Sha` header on `/` returns 605f51a583f0… (matches HEAD). VERIFIED.
- Uncommitted work above is NOT deployed. VERIFIED (deploy sha == HEAD, tree dirty).
- CI (`ci.yml`) on 605f51a: success. VERIFIED.
- SMOKE IS RED. Post-deploy smoke (`smoke.yml`, on deployment_status) has FAILED on every deploy since cf96c47 (2026-09-21 07:35Z); last success was f6d830f (2026-09-21). Latest runs 2026-10-01T07:16Z and 07:33Z failed. VERIFIED.
  - Cause VERIFIED from the run log: `[smoke] missing env: SMOKE_BASE_URL, SMOKE_SECRET, CRON_SECRET and NEXT_PUBLIC_POSTHOG_HOST are all required`. The step env showed `NEXT_PUBLIC_POSTHOG_HOST:` empty. GitHub repo has variable SMOKE_BASE_URL and secrets SMOKE_SECRET, CRON_SECRET; there is NO repo variable NEXT_PUBLIC_POSTHOG_HOST. The CSP check added in cf96c47 requires it.
  - Implication: the smoke gate has not validated any production build since 2026-09-21, including the three GDPR deploys of 2026-09-28. The register row SMOKE-TEST says RESOLVED 2026-09-09; that is true of the script's existence, not of the gate being green. INFERRED fix: `gh variable set NEXT_PUBLIC_POSTHOG_HOST` to the EU ingest host (`.env.example` value is https://eu.i.posthog.com). Not done; founder-visible CI config, not a secret.

## 1.4 Placeholder register (`.planning/PLACEHOLDERS.md`)
- `node scripts/check-placeholders.mjs` this session: "83 register rows (58 OPEN, 25 RESOLVED); 21 OPEN CODE rows expect a marker; 22 distinct IDs found in code. PASS". VERIFIED.
- The register's own prose header still says "57 OPEN + 18 RESOLVED = 75" — stale (DOC-DRIFT). Trust the script.
- Status column semantics: OPEN/RESOLVED only. Nothing is deleted; resolved rows stay.
- OPEN rows whose Blocks column contains "Launch" (one line each). VERIFIED against register text:
  - LLM-GUARDRAILS (Toni): no content-safety layer on Oracle/horoscope output.
  - COMPLIANCE-AUDIT-RERUN (Toni): compliance batch of 2026-09-01 never independently re-verified.
  - ENTITY-NAME (Toni): footer shows bracketed placeholders for entity name, ЕИК, address, VAT (also blocks DSA trader ID).
  - PROD-CREDS (Toni): Clerk/Stripe/RevenueCat on test keys; production Clerk is a separate instance (orphans users; needs DNS + mobile rebuild).
  - SUPABASE-PLAN (Toni): free tier pauses on inactivity.
  - MOON-PARITY (Toni): Moon detail mobile-only, violates the parity ruling.
  - PRIVACY-REVIEW (Lawyer): privacy policy is a placeholder, not lawyer-reviewed.
  - DPA-CONTRACTS (Toni): processor DPAs unsigned (Clerk, Supabase, Stripe, Google, Sentry, PostHog).
  - LLM-MODEL-SWAP (Petko): decision resolved and Gemini live; row stays open for remaining follow-ups.
  - GEMINI-API-TIER (Toni): free-tier quota caused Gate 9 failures; paid tier needed.
  - SAFETY-FILTER-UNTESTED (Toni): zero refusals observed, but fixture had no life-event framing.
  - DEVICE-PASS-STALE (CC): device pass used Pixel 8 emulator and iPhone 12 Pro Max, not the 360x780 floor.
  - LAWYER-REVIEW-DELETION-FORFEITURE (Lawyer): forfeiting unused Stripe-paid time on account deletion needs Bulgarian consumer-law confirmation.
  - AI-ACT-COPY (Lawyer): Blocks = "Already overdue"; Art. 50 wording not lawyer-reviewed.
- OPEN rows that block other gates (not "Launch"): Store submission: PAYWALL-MOBILE, SIWA-BG-LABEL, TERMS, REVENUECAT-PLATFORM-KEYS, DESIGN-ASSETS. Revenue: APP-URL-MOBILE, RC-WEBHOOK-SECRET. Real traffic: SECRET-SCAN, DEP-AUDIT, CAUGHT-500S, BUILD-SHA, LLM-FAILOVER, STRIPE-TOS-URL, SKEW-PROTECT. Web payments: WITHDRAWAL-COPY. Privacy policy: LLM-RETENTION, LLM-RETENTION-EEA, ORACLE-QA-ART9, GEMINI-EU-REGION. First subscriber: SE-LICENCE. GDPR completeness: STREAM-K-ORPHAN-DATA, PROCESSOR-ERASURE-GAPS. Launch quality bar: THINKING-BUDGET-SPIKE, THINKING-BUDGET-NOT-A-CAP, GEMINI-MODEL-AGE, ORACLE-WORD-BAND, GATE9-PHRASE-REPETITION, BULGARIAN-SKILL-UPDATE.
- Note: BUILD-SHA and SECRET-SCAN appear OPEN though the `X-Deploy-Sha` header works in production (smoke.mjs depends on it); I did not read those rows. INFERRED that they are partially stale. Check before citing.
- RECOMMENDATION-CONTENT-LICENSING: Blocks text now reads "Re-enabling the feature (no longer Launch)" — media recommendations were disabled in 8a4d899, so it left the launch list.

# 2. IN FLIGHT (reconstructed, INFERRED)
Workstream A: processor erasure at the 30-day hard-delete cron (row PROCESSOR-ERASURE-GAPS).
- Done in tree, uncommitted: PostHog person delete and RevenueCat v2 customer delete helpers; cron wiring; tests (41 pass).
- Helper behaviour (from register text): never throw; log + Sentry on failure; 404/no-person = success; keys absent = skip with log line; run after Clerk delete and before users-row delete; non-blocking, so a failure is alerted but NOT retried.
- Remaining: (1) run typecheck + lint + `check:all` on the tree (not run). (2) Commit (suggest one commit: lib/gdpr, cron route, tests, env.example, turbo.json, PLACEHOLDERS row). (3) Founder creates PostHog personal API key (project-scoped, Person: Write) and RevenueCat v2 secret key (customer-delete only), and adds four vars to Vercel Production: REVENUECAT_SECRET_API_KEY, REVENUECAT_PROJECT_ID, POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID. (4) Verify on first real cron run that Person: Write also permits the lookup GET (register says INFERRED). (5) Row stays OPEN until the vars exist.
- Open question inside it: STREAM-K-ORPHAN-DATA — 9 rows across 3 legacy tables owned by 2 real accounts, unreachable by account deletion. Founder ruled "if real user rows, STOP, do not drop". Needs founder decision: backfill a deletion path vs. accept and document.

Workstream B: mobile RevenueCat `InvalidCredentialsError` investigation.
- Uncommitted TEMP DIAGNOSTIC in RevenueCatProvider.tsx; `apps/mobile/rc.txt` is the logcat capture from it (2026-09-28).
- Context (register REVENUECAT-PLATFORM-KEYS): no `appl_`/`goog_` keys exist (no store apps configured in RevenueCat; needs Apple and Google developer accounts). Correct current state is one `test_…` Test Store key on BOTH platform vars; the identical-keys guard (ERR-MOB-RC-006) was amended to allow equal `test_…` keys.
- Remaining: decide root cause from the log (I did not analyse rc.txt), remove the diagnostic, delete rc.txt. Do not print key fragments again.

Workstream C: oracle-loading-progress mockup (untracked). Founder-only design judgement. Leave it.

# 3. REPORTS / DECISIONS PENDING FOUNDER APPROVAL (INFERRED from register; I stopped on nothing this session)
1. Smoke gate red since 2026-09-21. Recommendation: set repo variable NEXT_PUBLIC_POSTHOG_HOST, re-trigger smoke against 605f51a, and only then treat deploys as validated. Founder to approve because it is CI config on their GitHub repo.
2. STREAM-K-ORPHAN-DATA: backfill deletion vs accept the gap. Recommendation: backfill a deletion path for the three tables (two real users hold data deletion cannot remove; GDPR exposure outweighs the cost of one more cron sweep), but founder decides.
3. Commit the processor-erasure work once checks pass (see 2A). Recommendation: yes, after `check:all`.
4. LAWYER-REVIEW-DELETION-FORFEITURE: founder framing is "disclosure makes yes more likely", not a self-ruling. Needs lawyer.
5. `rc.txt`: recommend delete, add `*.txt` logcat pattern or just remove.

# 4. ENVIRONMENT FACTS (names only, never values)
I cannot read Vercel or EAS from here (no `.vercel` link, no login checked). Anything about Vercel/EAS contents is INFERRED from docs; verify with the founder.

## 4.1 Local `apps/web/.env.local` (VERIFIED names, values not read)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, NEXT_PUBLIC_CLERK_SIGN_IN_URL, NEXT_PUBLIC_CLERK_SIGN_UP_URL, NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL, NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, DATABASE_URL, GEMINI_API_KEY, RECOMMENDATION_RIGHTS_MODE, TMDB_API_READ_TOKEN, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_MONTHLY, STRIPE_PRICE_ANNUAL, NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_POSTHOG_KEY, NEXT_PUBLIC_POSTHOG_HOST, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, CRON_SECRET, NEXT_PUBLIC_SENTRY_DSN, SENTRY_DSN, SENTRY_ORG, SENTRY_PROJECT, SENTRY_AUTH_TOKEN, REVENUECAT_WEBHOOK_SECRET, EXPO_PUBLIC_API_BASE, SENTRY_READ_TOKEN.
- NOT present locally, by design: REVENUECAT_SECRET_API_KEY, REVENUECAT_PROJECT_ID, POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID. VERIFIED absent from the list above.

## 4.2 Production-only keys and why
- The four processor-erasure vars above. Reason (from `.env.example`): local dev and Preview point at the PRODUCTION database; these keys delete real users' processor records; absence makes the cron skip that processor with a log line. VERIFIED (comment text), policy INFERRED as founder-ruled.
- INFERRED: GEMINI_API_KEY on paid tier is needed in Production (GEMINI-API-TIER open).

## 4.3 Mobile (`apps/mobile/.env.example` names, VERIFIED)
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY, EXPO_PUBLIC_API_BASE, EXPO_PUBLIC_SENTRY_DSN, EXPO_PUBLIC_REVENUECAT_IOS_API_KEY, EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY, EXPO_PUBLIC_WEB_APP_URL, EXPO_PUBLIC_POSTHOG_KEY, EXPO_PUBLIC_POSTHOG_HOST. `apps/mobile/eas.json` itself only declares EXPO_PUBLIC_APP_VARIANT; the rest live in EAS env (`eas env:list <env>`; run eas-cli from `apps/mobile`). EAS never validates values: a green build can ship a placeholder key (first APK crashed on launch this way). Which EAS environments hold which names: UNKNOWN to me.
- Known open mobile env gaps: EXPO_PUBLIC_WEB_APP_URL unfilled (APP-URL-MOBILE); EAS Sentry DSN (EAS-SENTRY-DSN); `appl_`/`goog_` keys do not exist.

## 4.4 GitHub Actions
- Secrets: SMOKE_SECRET, CRON_SECRET. Variables: SMOKE_BASE_URL (=production URL). Missing: NEXT_PUBLIC_POSTHOG_HOST (see 1.3). SMOKE_SKIP_AI variable unset. VERIFIED via `gh`.
- Workflows: ci.yml, smoke.yml, astrology.yml. Runner pinned ubuntu-24.04.

## 4.5 Supabase ledger
- Register MIGRATIONS row: RESOLVED 2026-09-08, ledger reconciled to 21 rows, zero orphans, `supabase db push --dry-run` said "Remote database is up to date", Local and Remote align 1:1. INFERRED from the register (I did not query the DB this session).
- Repo has 21 files in `supabase/migrations`, latest `20260908150236_fix_headline_score_precision.sql`. VERIFIED count; matches 21 ledger rows if no migration was added since 09-08.
- CLI notes (memory): use `npx supabase`; swap DATABASE_URL port 6543→5432 for migration commands; `db dump` / `gen types --db-url` need Docker (unavailable); `gen types --linked` works.
- `CC-SESSION-HANDOFF.md` §3 still says "NEVER db push, ledger has 6 rows, 13 unrecorded". That is STALE after 2026-09-08. The caution (read schema, never push blind) is still sensible; the counts are wrong.

## 4.6 Scripts and gates (root `package.json`; package manager is pnpm)
- `check:all` = check:strictness, check:bg-strings, check:copy-lock, check:bg-lint-baseline, check:error-codes, check:env-consistency, typecheck, lint, test, check:placeholders, check:build (`turbo run build`, so green means the Next build passes). VERIFIED from package.json.
- Catches: strictness = core TS strictness; bg-strings = hard-coded Bulgarian strings outside copy files; copy-lock = locked UI copy unchanged; bg-lint-baseline = Bulgarian lint count does not grow (LINT-BASELINE-1800 open); error-codes = no ERR-* collisions; env-consistency = env names agree across code, turbo.json, .env.example; placeholders = register vs `STELLAEUM_PLACEHOLDER:` markers in code; build = route-export validity that `tsc --noEmit` misses.
- `pnpm test` (turbo → vitest), `typecheck`, `lint`. `test:oracle-gate9` = real Gemini calls (costs money, needs paid-tier key; 10-chart fixture).
- `scripts/smoke.mjs` = post-deploy assertions on response BODIES, asserts `X-Deploy-SHA` equals the deployed sha, CSP connect-src check. Currently red (1.3).
- What no gate does (VERIFICATION-SURFACE-GAPS.md): load a page in a real browser (PLAYWRIGHT-CSP-CHECK deferred; no Playwright in repo), secret scanning (SECRET-SCAN), dependency audit (DEP-AUDIT).

# 5. KNOWN TRAPS
1. CLAUDE.md drift. It has been wrong repeatedly (Expo SDK wrong three times; now says ~54.0.36, matches `apps/mobile/package.json`, fixed in ca27bef). Still stale: its DB schema lists 4 tables, reality is 25+ with Stream K tables; build commands say `npm` while scripts are pnpm; it says AI status lives in SYSTEM-MAP §4. Rule: code and register win; read `package.json` directly for versions. The memory note "CLAUDE.md says SDK 52" is itself stale. VERIFIED.
2. Local dev and Preview hit the PRODUCTION database. Any local run of the cron or deletion code can delete real users. Production-only keys are the guard.
3. Fork subagents: used for read-only investigation only; a fork has previously ignored read-only instructions and written files. Never fork where two writers could touch the same files; never fork work overlapping the parent's. INFERRED from memory (feedback_fork_scope_discipline).
4. Secrets never printed: not in chat, logs or commits. The RevenueCat TEMP DIAGNOSTIC violates the spirit (logs key head/tail); remove it. A real leak happened 2026-04-05 (`apps/web/.env`; keys revoked; git history deliberately NOT rewritten; register SECRET-LEAK-2026-04-05 RESOLVED).
5. `git checkout -- package.json` after `expo prebuild` discards real pending edits; `git diff` first.
6. Concurrent sessions can silently mask each other's fixes. If files appear modified that this session did not touch (as now: the tree is dirty at session start), stop and ask before committing them. Commit only your own paths.
7. Ungated checks hide problems: a never-run gate is not evidence of clean (six-for-six on first runs). Smoke being red for 9 days unnoticed is another instance.
8. A check can run and still verify the wrong surface (VERIFICATION-SURFACE-GAPS.md).
9. Prove a new test fails against the pre-fix code before trusting it (security/correctness fixes).
10. Read the migration/schema before stating a DB fact; label verified vs inferred.
11. Never `supabase db push` blind (see 4.5). Use `migration repair` only after reading the schema.
12. `pnpm add` for expo packages is wrong; use `npx expo install`. pnpm can silently no-op if node_modules exists.
13. AI output is a known-weak placeholder: do not add prompt workarounds or post-processing. Production uses Gemini (`gemini-3.7-flash`, fallback `gemini-3.6-flash`, via `@ai-sdk/google`); the Llama-era "твоят Слънце" error was fixed only by the model swap.
14. Windows host, PowerShell/Git Bash: CRLF warnings on commit are noise. Bash `cd` persists between calls; use absolute paths.
15. Stripe `customers.del()` is a plain delete, not PII redaction (Redaction Jobs API not in SDK types). Caveat is on the register.
16. Do UI work only if asked (founder is sole judge of design and Bulgarian register/grammar).

# 6. SOURCE-OF-TRUTH MAP
- Code and DB schema: win on any FACT.
- `.planning/PLACEHOLDERS.md`: every placeholder/stub/deferred decision; status. Count via `scripts/check-placeholders.mjs`, not the prose header.
- `.planning/SYSTEM-MAP.md`: narrative per area; §4 = AI truth (model, provider, unchecked output); §15 = developer tasks by blocker class; living doc, last-reconciled 2026-09-04 per header, so may lag.
- `.planning/CC-SESSION-HANDOFF.md`: how to work in the repo; traps. Partly stale (4.5).
- `.planning/COMPLETION-TRACKER.md`: where we are and what is left; read first for status.
- `.planning/VERIFICATION-SURFACE-GAPS.md`: gates that verify the wrong surface.
- `.planning/PROJECT-HISTORY.md`, `STATE.md`, `ROADMAP.md`: history and GSD state.
- `.planning/SECURITY-MODEL.md`, `TIER-DEFINITION-2026-09-01.md`, `LLM-PROVIDER-DECISION-2026-08-27.md`, `ORACLE-QUESTIONS-SPEC.md`, `DEVICE-SUPPORT-POLICY.md`: area specs/decisions.
- `.planning/PLAY-STORE-REQUIREMENTS-2026-09-28.md`, `ANDROID-DISPLAY-COMPATIBILITY-2026-09-28.md`, `APPLE-REVIEW-REQUIREMENTS-2026-08-27.md`: store research.
- GitHub Actions run list: truth for CI and smoke. `X-Deploy-Sha` header: truth for what is live.
- Memory (`~/.claude/projects/.../memory/MEMORY.md`): founder working preferences. Do not treat as repo fact.
- Founder preferences that shape advice (INFERRED, memory): explain in paragraphs after substantive work; tag claims verified/inferred/planned/assumed; decide-and-proceed on small/precedented work, halt only for security, scope, architecture, production, real ambiguity; report uncommitted AND unpushed work at every pause; surface budget overruns and let founder pick the split; no background-agent triage; conservative third-party SDK defaults pre-launch.

# 7. THINGS KNOWN NOWHERE ELSE
- Smoke has been red since 2026-09-21 with a one-variable cause (section 1.3). Nobody had acted on it as of this session. VERIFIED.
- Register prose header count is stale; script count is 83/58/25. VERIFIED.
- The working tree was already dirty when this session started; those changes are another session's work. This session changed only `.planning/ADVISOR-HANDOFF.md`.
- Rejected approach (from register): delete Stripe customer at deletion REQUEST. Rejected because a plain delete cancels the subscription and defeats the 30-day grace period; done at day 30 instead, with a pre-confirmation disclosure in `DataAccountPage.tsx` (stripe, active status only, future period end).
- Rejected approach: dropping Stream K tables. Blocked by founder instruction when real-user rows were found.
- Rejected approach: Vercel cron for smoke. GitHub Action chosen because it can assert the deployed sha.
- Half-finished ideas: Playwright CSP check (deferred); Stripe Redaction Jobs API (needs newer SDK types); RevenueCat/PostHog failures are alert-only, no retry queue.
- Gemini cost measured 2026-09-04: about €0.00265 per call (lab figure, Gate 9 fixture, not production traffic).
- Bulgarian copy rules in force: spelled-out gender pairs, no compact "/а"; clitic after first stressed constituent ("Какво ти тежи"). Bulgarian text goes through the bulgarian-skill.

# 8. FACTS I COULD NOT VERIFY (do not assert these)
- Contents of Vercel Production/Preview env and EAS env.
- Live Supabase ledger row count today.
- Whether Stripe, Clerk and RevenueCat in Production are still on test keys (register says yes, PROD-CREDS).
- Why `rc.txt` was captured and what it shows.
- Whether SECRET-SCAN and BUILD-SHA rows are stale.

# 9. CORRECTIONS TO THE BEHAVIOUR DOCUMENT
NOT PERFORMED. The document was not supplied (placeholder text only) and no copy exists in the repo. Ask the founder to re-run this request with the document pasted. Claims in such a document most likely to be wrong, based on what I found:
- "Smoke is green / deploys are validated": false since 2026-09-21 (1.3).
- Register totals: use 83 rows, 58 OPEN, 25 RESOLVED (script), not 75/57/18.
- "CLAUDE.md says Expo SDK 52": stale; it says ~54.0.36 since ca27bef.
- "Ledger has 6 rows / 13 unrecorded": stale; reconciled to 21 on 2026-09-08.
- "Local matches origin": true now (605f51a), but the working tree is dirty.
- "Media recommendations are a launch blocker": no longer; disabled in 8a4d899.
- "PostHog/RevenueCat erasure is a gap": code is written but uncommitted and not deployed; keys and project IDs do not exist in Vercel yet (INFERRED).
- Any "Llama/OpenRouter" statement: stale; Gemini via `@ai-sdk/google` since 2026-09-05.

# FIRST REPLY SHOULD BE
Open by stating the verified baseline without questions: main == origin/main at 605f51a, live in production, CI green, but the post-deploy smoke gate has been red on every deploy since 2026-09-21 because the GitHub variable NEXT_PUBLIC_POSTHOG_HOST is missing, so nothing deployed since then has been smoke-validated. Then say the register is 83 rows (58 open, 25 resolved) with 14 rows blocking launch, mostly founder/lawyer items (entity details, production credentials, privacy review, DPAs, Gemini paid tier, safety-filter testing, device pass, deletion-forfeiture review). Then name the three things the founder can act on now: set the smoke variable and re-run, finish and commit the uncommitted processor-erasure work after `check:all`, and remove the RevenueCat TEMP DIAGNOSTIC plus the junk `rc.txt`. State plainly that the working tree holds another session's uncommitted work, that this handoff could not reconcile the behaviour document because it was never pasted, and ask for it as the single request. Keep the opening to a short paragraph per topic.
