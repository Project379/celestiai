---
title: Ground-truth inventory — 2026-08-31
status: point-in-time audit, not a living document — re-run rather than edit if state has moved on
created: 2026-08-31
---

# Ground-truth inventory — 2026-08-31

Full report-only audit, no code changed. Every claim tagged VERIFIED or
INFERRED at the point of writing. Method: sections 1-5 gathered by parallel
read-only research passes, cross-checked; sections 6, 7, and 8 run and
verified directly (live production curl, a live Postgres query against the
migration ledger, and 10 real OpenRouter generations).

---

## 1. Surface inventory

**Web — 19 pages, all VERIFIED implemented** (opened each file; no stubs, no
TODO/coming-soon markers — one grep false-positive was a Tailwind
`placeholder:` class, not content):

`/`, `/sign-in`, `/sign-up`, `/birth-data`, `/chart`, `/circle`, `/dashboard`,
`/rhythm`, `/rhythm/journal`, `/subscription/success`, `/you`,
`/you/crystals`, `/you/crystals/guide`, `/you/guide`,
`/you/recommendations`, `/connect/[token]`, `/pricing`, `/privacy`,
`/support`.

**Not found: `/terms`** — no file anywhere. **Not found: `/settings`** —
deliberately removed, lives only in Clerk's popover.

39 API `route.ts` files exist under `apps/web/app/api/**`. VERIFIED
implemented in depth for `oracle/generate` (read this session). INFERRED
implemented for the other 38 (file exists, non-trivial size) — not
individually opened.

**Mobile — 27 real screens + 4 layouts + 1 dev-only preview harness, all
VERIFIED implemented** (zero real TODO/stub markers; every earlier grep hit
was a `TextInput` `placeholder` prop, not a content stub): tabs
(Днес/Chart/Circle/Rhythm/You), Circle new/new-connection, Moon detail,
Oracle, Rhythm journal, 4 wizard screens, 4 You/crystals-guide-premium-
recommendations screens, 4 Settings screens, 5 auth screens
(sign-in/sign-up/sso-callback/two-factor/verify). `_stage2-preview.tsx` is a
dev-only mockup harness, excluded from the real count.

**Platform-only gaps, flagged:**
1. **Moon detail — mobile only, no web equivalent at all.** VERIFIED
   (grepped `apps/web/app` and `apps/web/components`, zero moon-related
   files). Real, unflagged, one-platform feature.
2. Oracle and the birth-data wizard are **architecturally divergent, not
   gaps** — Oracle is a full screen on mobile vs. a panel inside `/chart` on
   web; the wizard is 4 routed screens on mobile vs. one stepped component
   on web. Same feature, different IA — don't misread a URL diff as
   missing.
3. `/connect/[token]` is intentionally web-only (shared-link invite
   landing, pre-app-install by design).
4. **Settings and Auth are exempt from parity by standing ruling**, not
   gaps — listed for completeness, not as findings.
5. `/terms` is missing on both platforms — not a parity gap (nothing to be
   at parity with), a standalone missing-content item, already gated on the
   lawyer engagement.

---

## 2. Gates

**CI — VERIFIED, exists and actually gates.** `.github/workflows/ci.yml`
runs on every PR and every push to `main`: install → a hand-written
sweph-license-pin grep (fails the build if the lockfile resolves `sweph` to
anything but `2.10.0-11`) → `pnpm run check:all`. A second workflow,
`astrology.yml`, path-filtered to `packages/astrology/**`, runs that
package's typecheck + 39-test validation harness separately.

**The 8 `check:all` gates:**

| # | Command | What it actually catches |
|---|---|---|
| 1 | `check:strictness` → `scripts/check-core-strictness.mjs` | `packages/core/tsconfig.json` has `noUncheckedIndexedAccess: true`, or a `STRICTNESS_DEFERRED` marker. Nothing else. |
| 2 | `check:bg-strings` → `scripts/check-bg-static-strings.mjs` | Spell-checks every static Cyrillic literal against `dictionary-bg`. Typos/garbled text only — not register, not calques. |
| 3 | `check:copy-lock` → `scripts/i18n/check-copy-lock.mjs` | Diffs current Cyrillic literals against the committed `copy-lock.json` snapshot. Pure drift detector — any unreviewed copy change fails it. |
| 4 | `check:bg-lint-baseline` → `scripts/i18n/check-bg-lint-baseline.mjs` | Ratchets the `no-new-bg-strings` ESLint rule count against a baseline (1778). Existing debt grandfathered; only growth fails. |
| 5 | `check:error-codes` → `scripts/check-error-code-collisions.mjs` | Same `ERR-*` code string reused across two different files. Doesn't check same-file repeats. |
| 6 | `typecheck` → `turbo run typecheck` | `tsc --noEmit` per workspace. |
| 7 | `lint` → `turbo run lint` | `next lint` (web) / `expo lint` (mobile) / `eslint src` (packages/core only). **`packages/ui` and `packages/astrology` have no `lint` script — turbo silently no-ops them.** VERIFIED. |
| 8 | `test` → `turbo run test` | `vitest run` in web/mobile/astrology. **`packages/core` and `packages/ui` have no `test` script — silently skipped.** VERIFIED. |

**The flag worth raising on its own:** `packages/core` is this repo's most
load-bearing package — its own README states the whole architectural
contract — and it has **neither a lint nor a test script**. It doesn't fail
the gate; it's invisible to the gate. Confirmed empty (§3): it has zero
test files, not just an unwired script.

**The 9 additional checks — explicit yes/no, VERIFIED absent unless noted:**

| Check | Have it? | Cost to add |
|---|---|---|
| Dependency vulnerabilities (`pnpm audit`/Dependabot) | **NO** — no script, no config, zero hits anywhere | Trivial. `pnpm audit --prod` as a CI step, or flip on GitHub's native Dependabot alerts. <30 min. |
| Secret scanning | **NO** — no gitleaks/trufflehog, **no pre-commit hooks of any kind exist** (`.husky` absent) | Low-moderate. Gitleaks as a CI step ~30 min; a pre-commit hook needs `.husky` from scratch, ~1-2 hrs. |
| Automated license compatibility | **NO**, beyond one hand-written grep for `sweph` specifically | Trivial-low. `license-checker --summary` as a CI step ~30 min. |
| Bundle size regression | **NO** | Low for a one-off look; moderate for a real regression gate, ~half a day. |
| Unused deps / dead exports | **NO** — no knip/depcheck/ts-prune anywhere | Low-moderate, ~half a day for a clean baseline. |
| Accessibility | **PARTIAL** — web gets static `jsx-a11y` linting for free via `next/core-web-vitals`; **zero** axe-core runtime testing, zero contrast checking, zero touch-target checking, and **mobile has no a11y linting layer at all** | Moderate-high, multi-day. |
| DB migration drift (repo vs. deployed) | **Script exists (`audit-schema-drift.mjs`), NOT gated anywhere** | Moderate to wire — needs live DB creds in CI, and given the live migration-ledger state (§8a), turning it on today would fail immediately. |
| API contract/schema validation | **NO, not systematic.** Only 4 of 40 routes import `zod` at all (all four in Circle). Every other route does hand-rolled `body as {...}` casting. | Moderate-high for full coverage; low to start with one shared helper. |
| i18n key completeness | **N/A, not a gap this repo has** — no key-based i18n system exists at all; inline Cyrillic literals, governed by gates #2-4. | — |

---

## 3. Tests

**VERIFIED — actually ran `vitest run` per workspace:**

| Workspace | Files | Cases | Result |
|---|---|---|---|
| `apps/web` | 34 | 209 | 209 pass, 0 fail |
| `apps/mobile` | 1 | 5 | 5 pass, 0 fail |
| `packages/astrology` | 2 | 39 | 39 pass, 0 fail |
| `packages/core` | 0 | 0 | **no test script, no test files at all** |

Total: 37 files / 253 cases, all green.

**Money-path coverage — VERIFIED by grep + reading the actual test files:**

| Concern | Coverage |
|---|---|
| Paywall gating | Covered — `test/oracle/quota.test.ts`, `test/horoscope/generate-quota-gate.test.ts`, `test/oracle/generate-quota-bypass.test.ts` |
| Entitlement resolution | Covered — `test/webhooks/revenuecat-webhook-events.test.ts` (9 cases) |
| Stripe webhook handler | Covered — `test/webhooks/stripe-route.test.ts` + `stripe-subscription.test.ts` (17 cases), imports the real route |
| RevenueCat webhook handler | Covered — `test/webhooks/revenuecat-route.test.ts` + `revenuecat-webhook-events.test.ts` (20 cases), imports the real handler |
| Subscription state transitions | Covered — same webhook test files + `test/gdpr/delete-account-route.test.ts` |
| Quota/cap enforcement | Covered — `test/oracle/quota.test.ts`, `test/circle/profiles-create-quota.test.ts`, `test/charts/birth-data.test.ts` |

None of the six money-path concerns is at zero — the gap is elsewhere:
`packages/core`'s own `quota.ts` logic is only exercised indirectly through
the API-route layer's tests, never directly. **Mobile-side money-path UI
has zero coverage** — mobile's entire test suite is 5 cases on
`displayName`.

---

## 4. The lint ratchet

Ran ESLint directly across web/mobile/core: 1020 + 698 + 73 = **1791
warnings, 0 errors**, everywhere.

| Rule | Count | Risk |
|---|---|---|
| `no-restricted-syntax` (bg-lint-baseline rule) | 1778 | Already separately gated (§2 gate #4) — not a new finding |
| `react-hooks/exhaustive-deps` | 5 | **Correctness risk.** `CelestialCanvas.tsx:943`, `NatalWheel.tsx:485` (web), `ManifestEntryForm.tsx:34`, `useD3.ts:31` (also has a non-static dep array), one on mobile |
| unused-eslint-disable-directive | 2 | Stale disables (`useOracleReading.ts:181`, `AmbientBackground.tsx:79`) |
| `@typescript-eslint/array-type` | 2 | Cosmetic |
| `@typescript-eslint/no-unused-vars` | 2 | Mild — dead imports |
| `jsx-a11y/role-supports-aria-props` | 1 | Correctness-adjacent — `CitySearch.tsx:147` |
| `import/no-anonymous-default-export` | 1 | Cosmetic |

---

## 5. Backend quality audit ("slop")

VERIFIED by direct grep + file reads.

- **`any` types: 1 total** — `apps/web/tailwind.config.ts:13`, config-file cast.
- **`@ts-ignore`/`@ts-expect-error`: 1 total** — `tailwind.config.ts:3`, documented.
- **`eslint-disable`: 9 real instances**, 8 suppressing `react-hooks/exhaustive-deps`. Two are now stale.
- **TODO/FIXME/HACK: 1 total, in the whole repo** — a design note in `layout.tsx:50`.
- **Duplicated logic:** `verify.tsx`/`two-factor.tsx` (mobile) never migrated onto the shared `resolveClerkError` helper. Web/mobile `useManifestEntries.ts` overlap, plausibly platform-justified (INFERRED).
- **Files over 500 lines: 11.** Two legitimately large content files (not smell). Real logic: `CelestialCanvas.tsx` (952), mobile `index.tsx` (944), `CircleHub.tsx` (936, 15 hooks), `transit-analysis.ts` (760), both `NatalWheel.tsx` (673/649), `circle/service.ts` (633), `compatibility.ts` (548), `SavedProfileForm.tsx` (514).
- **Dead code:** none found in a targeted pass (INFERRED-absence, no real tool exists to confirm exhaustively).

**Three files I'd least want to defend in review:**
1. `apps/web/components/CelestialCanvas.tsx` (952 lines) — largest file, and it has a live missing-dependency warning on canvas/scroll animation logic.
2. `apps/mobile/app/(authed)/(tabs)/index.tsx` (944 lines) — highest-traffic screen, 22 function-like blocks, 10 hooks, one God-component.
3. `apps/web/components/circle/CircleHub.tsx` (936 lines, 15 hooks) — highest hook density in the repo, in a feature already flagged elsewhere as error-prone.

---

## 6. Oracle output safety — HIGH PRIORITY

**a. Full path** (traced from `apps/web/app/api/oracle/generate/route.ts`,
read in full): auth → burst rate-limit → body validate → ownership check →
cache check → quota claim → load computed chart data (`chart_calculations`
table, never user-typed) → `buildSystemPrompt` + `chartToPromptText` →
`generateText`/`streamText` → `stripSentinels` (formatting only) →
`checkAndLogGeneration` (fire-and-forget spell-check, docstring: *"Does NOT
block, retry, or rewrite anything"*) → upsert → return.

**Validation/filter/guardrail on model output before the user sees it:
none.** No safety check of any kind exists between generation and display.

**b. System prompts, verbatim** — see full text in the chat transcript this
audit was delivered in; summarized: Oracle's prompt sets voice/format/
sentinel-marker rules and 4 topic suffixes; horoscope's prompt sets a
3-line, 400-550-character format. **Neither prompt contains any safety,
sensitive-topic, or disclaimer language.**

**c. Self-harm/suicide/medical/pregnancy/death/financial/legal handling:
NO.** Confirmed absent from both prompts, the route code, and
`checkAndLogGeneration` — no keyword filter, no classifier, no post-hoc
content check for these categories anywhere.

**d. Can user-supplied text reach the model prompt? NO — confirmed
clean.** Only `chartId` (a UUID, DB lookup only) and server-computed
astronomical data reach either prompt. Diary entries, chart names, and
journal content never reach any LLM anywhere in the codebase (only two
`generateText`/`streamText` call sites exist total). **Prompt injection is
not a live attack surface on this feature** — there's no free-text channel
into the prompt, a real (if incidental) mitigation.

**e. Output length cap, format validation, retry:** `maxOutputTokens` set
(2000 Oracle / 1500 horoscope) — generation-time cap only, not a post-hoc
length check. No format validation. **No retry on malformed output**,
deliberate per the standing "no retries/correction maps" ruling — meaning a
garbled or truncated response reaches the user exactly as often as the
model produces one.

**Bottom line: zero content-safety layer, on a model the project's own
docs call "known-weak," reaching users in emotionally serious territory
(per the project's own market research), with nothing between raw model
output and the screen.**

---

## 7. Oracle output variety — the slop test

Generated 10 real readings via a standalone script reproducing production's
exact system prompt, chart serialization, and generation parameters
(`temperature: 0.85`, `maxOutputTokens: 2000`,
`meta-llama/llama-3.3-70b-instruct` via OpenRouter — the real production
model/endpoint) against 10 genuinely distinct synthetic charts (Sun, Moon,
Ascendant, element/modality all varied). All 10 succeeded. Not committed to
the repo.

- **Average word count: 503.6** (range 398-660).
- **Distinct opening sentences: effectively 2, not 10.** 6 of 10 share the
  construction *"Твоят космически път е изтъкан от звездите са
  изтъкали..."* — which is **grammatically broken Bulgarian**, mashing the
  prompt's own two suggested example phrases into one ungrammatical clause.
- **Phrases in 5+ of 10:** "звездите са изтъкали" in 8/10; "космически път"
  in **10/10** — every single reading. Both are lifted near-verbatim from
  the system prompt's own example vocabulary.
- **Most concrete finding — fabricated precision:** every reading cites
  degrees repeatedly (5-12 citations) formatted precisely (e.g. "14°49'"),
  but **within each individual reading, every citation is the exact same
  degree value, reused across every different planet** — the Sun, Moon,
  Mercury, Ascendant, and Venus in one reading were all cited at "14°49'."
  This held across all 10 readings with zero exceptions, despite the input
  chart data specifying a distinct degree per planet. **The precision is
  theater — it looks like it's reading the specific chart, and it
  demonstrably isn't.** Houses fared better (genuinely varies 0-11 distinct
  values per reading); degrees did not, at all.

Full sample texts are in the chat transcript this audit was delivered in
(3 complete readings, ~500 words each).

**Verdict:** genuinely slop-shaped output — fluent, confident Bulgarian
that repeats the same 1-2 openings and vocabulary in 80-100% of samples,
and fabricates its most convincing specificity signal by copying one
number to every planet instead of reading its own input data. Matches
CLAUDE.md's "known-weak placeholder" framing exactly — now measured, not
asserted.

---

## 8. Unresolved items

**a. Migration reconciliation — read live via `DATABASE_URL`, not
inferred.**
- Live ledger row count (`supabase_migrations.schema_migrations`): **8**.
- Repo migration file count: **18**.
- 5 repo files recorded in the ledger; **13 repo files NOT recorded**
  (includes `20260413141504_schema_hardening.sql`, containing `DROP COLUMN
  subscription_tier` on a live column). **3 ledger rows have no
  corresponding repo file** (`create_relationship_profiles`,
  `create_saved_people_profiles`, `create_connection_spaces`).
- Matches a prior sweep's documented count almost exactly, **except** the
  two most recent migrations (`user_crystals_fk`,
  `capture_untracked_tables`) — previously documented as "prepared but NOT
  applied" — **now show as applied in the live ledger.** Either run via
  `supabase migration repair` in the intervening days, or a doc claiming
  otherwise is now stale. Live data wins.

**b. 2FA backup-code bug — still open, one concrete lead found this
session.** Not documented anywhere in `.planning/` — exists only in
conversation record. `apps/mobile/app/(public)/sign-in.tsx` explicitly
branches on `'needs_second_factor'`/`'complete'`, with a visible error for
anything else — no silent fallthrough there. But
`apps/mobile/app/(public)/two-factor.tsx:44-54` picks TOTP → SMS →
**`backup_code` as the unconditional fallback** if
`supportedSecondFactors` contains neither. If `needs_second_factor` ever
fires for an account Clerk reports has no usable second factor, the screen
defaults straight to demanding a backup code the user never generated.
**Not reproduced or confirmed as the cause — a specific, checkable
mechanism, not a guess.**

**c. Android ANR — still open.** The Sentry event's thread dump (82
threads, full frames) has no thread named `main`, none flagged `crashed`,
and the exception entry's `stacktrace`/`threadId` are both null — a real
limitation of Sentry Android's `AppExitInfo`-based reconstruction on this
emulator/OS, not a "look harder" gap. Needs either a fresh event with a
populated main thread, or reproduction on a higher-spec device.

**d. Sentry mobile — VERIFIED wired and receiving real events, NOT freshly
triggered by this session.** `stellaeum-mobile` project (id
`4511981481885776`, confirmed separately-platformed `react-native`
project) has 4 real issues, most recently updated same-day. Solid evidence
the pipeline works end-to-end. Fresh-trigger-and-confirm specifically
**UNVERIFIED** — needs a running device/emulator session this text-based
session doesn't have.

**e. Vercel Skew Protection — OFF right now.** Fresh `curl` against
`https://www.stellaeum.com/`: zero `?dpl=` occurrences anywhere. VERIFIED
live, matches the standing pre-launch recommendation — remember to
re-enable before real traffic.

---

## 9. Things nobody asked about

1. **The Oracle/horoscope safety gap (§6) collides directly with the
   project's own market research** — Bulgarians turn to astrology
   explicitly for "psychological comfort" during hard times, and the
   generation pipeline has zero awareness of grief/crisis, with no resource
   signpost anywhere in the app. Input is safely closed (§6d); output isn't
   — worth a product decision, even a static disclaimer line is cheap.
2. **Zero secret scanning and zero pre-commit hooks**, on a repo whose own
   history includes an already-realized near-miss (`OPENROUTER_API_KEY`
   was "screenshot-exposed" at one point per the tracker).
3. **Only 4 of 40 API routes have real input-schema validation** — the same
   shape of bug (untyped bodies) this project has already been bitten by
   once (`ERR-BD-005` collision, body-parsing gaps).
4. **No dependency-vulnerability scanning on a monorepo processing real
   payments.**
5. **`packages/core` — the architecturally most load-bearing package — has
   no tests and no lint gate**, confirmed zero test files, not just an
   unwired script.
