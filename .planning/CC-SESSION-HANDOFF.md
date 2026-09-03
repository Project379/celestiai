---
title: Session Handoff — how to work on this repo
status: living document — read this before touching anything
created: 2026-08-31
---

# Stellaeum session handoff

This document answers one question: **how do you work on this repo without
repaying mistakes that have already been paid for once.** It is not a status
report — for "where are we and what is left," read
`.planning/COMPLETION-TRACKER.md` first, then `.planning/VERIFICATION-SURFACE-GAPS.md`,
then `.planning/PROJECT-HISTORY.md`. This document exists alongside those,
not instead of them, and does not repeat their content. Where anything below
appears to conflict with the code, **the code wins** — that has happened
nine times, and every one of them was a doc that had gone stale, never the
code.

---

## 1. The repo

**Stellaeum AI** is a subscription astrology app for the Bulgarian market —
Swiss Ephemeris astronomical calculation plus AI-generated readings, served
to Web, iOS, and Android from one codebase. Turborepo monorepo, pnpm
workspaces, two apps and four packages.

```
apps/
  web/       Next.js 15 — the primary surface, most features ship here first
  mobile/    Expo SDK 54 — React Native, ~90% code-shared with web via Solito
packages/
  core/      Framework-agnostic business logic and data access
  astrology/ Swiss Ephemeris wrapper (native sweph binding)
  ui/        Shared primitives (currently tiny — GlassCard, Text)
  config/    Shared ESLint + TypeScript configs
```

**`packages/core`** is the load-bearing one. Its own README states the
contract precisely: plain async TypeScript functions over Supabase, Zod
schemas for shapes, pure computation shared across both apps — and,
enforced via ESLint `no-restricted-imports`, **no** React/React
Native/Next.js/Expo/Clerk imports, **no** caching (callers cache), **no**
auth-context extraction (functions take `userId: string | null` as an
argument; the caller pulls it from Clerk first). If you're about to import
anything framework-specific into `packages/core`, you're about to violate a
gated rule, not a style preference — `check:strictness` and the lint config
will catch some of this, but read the README's "what does NOT live here"
section before assuming a change belongs there.

**`packages/astrology`** wraps `sweph` (a native N-API binding, GPL-2.0
licensed — see §7). Runs in Moshier ephemeris mode (`SEFLG_MOSEPH`, no
external data files). Heavy WASM/native calculation happens **server-side
only**, via web's API routes — never in the mobile bundle. Mobile calls
web's compute endpoints over HTTP; it does not link `sweph` itself.

**`turbo.json`** controls exactly two things: task dependency graphs
(`build` depends on `^build`, `typecheck` depends on `^typecheck`) and,
critically, an **env-var allowlist** for the `build` task. Turborepo 2.x
defaults to strict env mode — a task only receives env vars actually
declared in `turbo.json`'s `env` array, regardless of what's set on Vercel's
project settings. This is not advisory; it silently strips vars and the
build fails at the exact line that reads the missing one. See trap #8
below — this is not hypothetical, it took down the first production deploy
entirely. `turbo.json` does **not** control per-app scripts (those live in
each app's own `package.json`), does not control Vercel's build command, and
`NEXT_PUBLIC_*` vars bypass the allowlist automatically via Next.js
framework inference — don't add those to the list, only server-only
secrets.

One piece of harmless debris you may notice: an empty, untracked directory
tree at `apps/web/apps/web/app/api/verify-rate-limit-tmp/` — dead scaffolding
from an earlier verification pass, contains no files, git doesn't track it
because it's empty. Safe to ignore or delete; not part of the real structure.

---

## 2. The gates

`pnpm run check:all` runs eight gates in sequence, in this order — the order
matters, cheap/fast gates run before slow ones (typecheck, lint, test):

1. **`check:strictness`** — `packages/core/tsconfig.json` must have
   `noUncheckedIndexedAccess: true`, or carry an explicit
   `// STRICTNESS_DEFERRED: <url>` marker pointing to a tracking issue.
   Exists to stop silent re-relaxation of that flag. If this fails, someone
   turned the flag off without filing the marker — don't just add the
   marker to make it pass; find out why it was turned off.

2. **`check:bg-strings`** — spell-checks every hardcoded Cyrillic string
   literal across the whole tree against `dictionary-bg`. Catches real
   non-words (typos, garbled text) in **static** strings only — it cannot
   catch register, gender agreement, or calque-y phrasing that reads as
   translated (see §8, the Bulgarian workstream, for what does catch those).

3. **`check:copy-lock`** — compares every Cyrillic literal in the tree
   against `scripts/i18n/copy-lock.json` (currently 3,025 unique
   entries), which is the "approved copy" snapshot. **Fails on any drift —
   added, removed, or changed Bulgarian text that hasn't been re-approved.**
   This is the one to internalize: a failure here on a genuinely new
   Bulgarian string is **correct behaviour, not a bug in the gate.** The fix
   is always the same two steps — (a) actually read the new string and
   confirm it's correct Bulgarian, informal-ти register, real phrasing not
   invented — then (b) regenerate the lock via
   `pnpm run i18n:update-copy-lock` so the diff is exactly the reviewed
   change. Never weaken this gate, never bypass it, never regenerate
   without reading first.

4. **`check:bg-lint-baseline`** — a *ratcheting* baseline on top of the
   ESLint rule `no-new-bg-strings` (in `packages/config/eslint/`), which
   flags a Cyrillic literal sitting outside a designated "content home"
   file. Baseline is currently **1,778** (started at 1,336 on 2026-07-30;
   existing debt is grandfathered, new instances beyond the baseline fail).
   Rises only when a reviewed batch of new user-facing strings lands
   outside a content-home file — check the script's own header comment for
   the running log of what raised it and why, and don't raise it casually.

5. **`check:error-codes`** — every `ERR-*` code string used anywhere in the
   codebase must be unique to one file. Exists because a Tier-1 sweep once
   accidentally reused `ERR-BD-005` across two unrelated conditions in
   different files, and nothing else would have caught it (the type union in
   `log-server-error.ts` only validates codes that actually flow through
   `logServerError` — a bare string literal in a `Response.json()` call
   skips that check entirely). What it deliberately does **not** flag: the
   same code repeated multiple times *within* one file (the normal,
   intentional shared-fallback-message case).

6. **`typecheck`** — `tsc --noEmit` per workspace, `packages/core`'s runs
   first per the turbo dependency graph.

7. **`lint`** — `next lint` (web) / `expo lint` (mobile), plus the shared
   ESLint config from `packages/config`.

8. **`test`** — `vitest run` per workspace. Web currently ~200+ tests,
   astrology ~39, mobile's suite is new (5 cases, shipped alongside Google
   sign-in — mobile had **zero** automated tests before that).

A failure in any of 1–5 almost always means exactly what it says — read the
script's own header comment (they're all deliberately well-commented, written
to explain *why* the gate exists, not just what it checks) before assuming
it's wrong. Baseline numbers (1,778 / 3,025 unique entries) are the tripwire
for drift — if you find yourself needing to raise either one, that's a
decide-and-proceed-with-report item per §6, not a silent edit.

---

## 3. The traps

Everything below has cost real time once. Read this before you hit any of
them a second time.

**NEVER `supabase db push`.** Production's migration ledger
(`supabase_migrations.schema_migrations`) holds 6 rows; the repo holds 16
migration files — 13 are unrecorded in the ledger, and separately, 16
production tables from the Drizzle era have no `CREATE TABLE` in any tracked
migration at all (the old `packages/db/drizzle` directory was deleted with
no SQL record left behind). A blind `db push` would try to replay all 13
unrecorded migrations against a database where most of that work is already
done — including `20260413141504_schema_hardening.sql`'s
`ALTER TABLE public.users DROP COLUMN subscription_tier`, which is a live
column today. That is not a no-op, it is data loss. **Safe pattern:**
`supabase migration repair --status applied <version>`, one migration file
at a time, only after independently confirming that specific migration's
effect already exists in production (read the schema, don't assume). Never
push blind.

**EAS never validates env values.** A build can go fully green while
shipping a literal placeholder string as `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
or `EXPO_PUBLIC_SENTRY_DSN` — this happened on the very first APK ever
produced, which crashed instantly on launch (`@clerk/clerk-js` threw before
`RootLayout` could even render). EAS has no mechanism to catch a
syntactically-valid-but-wrong value. Tell: instant crash with no UI ever
rendering, especially right after any EAS env change. Before trusting a
build, `eas env:list <environment>` and eyeball every value.

**`eas-cli` must run from `apps/mobile`, not the repo root.** `eas.json`
lives at `apps/mobile/eas.json` — there is no root-level one. Commands run
from the wrong directory silently fail to find the linked project.

**`expo prebuild` rewrites tracked files, not just the gitignored
`android/`/`ios/` trees.** It has twice rewritten `apps/mobile/package.json`'s
`android`/`ios` npm scripts in place (from `expo start --android` to
`expo run:android`). The trap inside the trap: a blanket
`git checkout -- package.json` to revert that rewrite discards *everything*
else uncommitted in that file too — it once silently reverted an unrelated,
legitimate fix that happened to be sitting in the same file at the time.
**Always `git diff package.json` after any `expo prebuild` run** and revert
only the specific rewritten lines, or commit unrelated changes first so a
revert has nothing else to clobber.

**Use `npx expo install <package>`, never `pnpm add`, for any
`expo-*`/`@expo/*` package.** `pnpm add` resolves to "whatever's newest on
the registry"; `expo install` resolves to the version this project's actual
Expo SDK line (54) expects. A `pnpm add -D expo-dev-client` once resolved to
a version from a different SDK line entirely — one of the three phantom-
dependency incidents below.

**`pnpm add` can silently no-op when `node_modules` already exists.** It can
report "resolved N, reused 0, downloaded 0, added 0" with a warning, and
place nothing on disk, while `package.json` and `pnpm-lock.yaml` both look
correctly updated. Nothing surfaces the gap except a subsequent full
`pnpm install` or manually checking the package is reachable under
`node_modules`. If an install doesn't clearly say packages were
*downloaded*, don't trust it.

**Local `expo prebuild` is not faithful to EAS Build and cannot catch
phantom dependencies — this has bitten three separate times.** (1)
`@babel/plugin-transform-react-jsx`, a real phantom dependency found only
during an actual Gradle build, never locally. (2) `expo-dev-client` at the
wrong SDK version, from the `pnpm add` mistake above — again invisible
locally. (3) `@expo/config-plugins` — a local config plugin resolving an
import through a package never actually declared as a dependency; worked
locally only because pnpm's shared store is more permissive than a fresh EAS
install. A fourth, related shape hit the asset pipeline: with no splash
image configured, local prebuild silently generated a real (if placeholder)
`splashscreen_logo.png`, while EAS Build given the identical config produced
no fallback and failed outright. **A green local prebuild proves nothing
about dependency resolution or asset resolution — only a real, watched EAS
build does.**

**Turborepo filters env vars through `turbo.json`'s `env` allowlist** — see
§1 above. This took down the *entire* first Vercel deploy (all 40 routes,
not just the Stripe ones that happened to throw first): `STRIPE_SECRET_KEY`
was set on the Vercel project but absent from `turbo.json`, so `next build`
ran with it undefined and a module-scope `new Stripe(...)` call threw during
page-data collection. Vercel's own build log names exactly which vars it
withheld — that line is the diagnostic, read it before guessing.

**Vercel env changes need a redeploy — and even a correctly-declared var is
build-time only unless it's also set as a runtime env var.** A change in
the dashboard does not retroactively reach an already-running deployment's
functions. This project has repeatedly conflated "I changed it in the
dashboard" with "it's live." Concretely: `SENTRY_DSN` sitting in
`turbo.json build.env` puts it in the *build*, not the Lambda's *runtime*
environment — those are different things, and a var needed at runtime
(most of them) must separately be set under Vercel → Project Settings →
Environment Variables → Production, then redeployed. Treat any env change
as inert until a fresh deployment has gone out and actually been probed.

**Build-time constant inlining freezes a bundled module's runtime file
paths to the build machine — this is the third, most dangerous failure
class, because it is the only one where the file being present proves
nothing.** Distinct from (a) a genuinely missing file and (b) a
`new URL(import.meta.url)` resolution gap. Here: a module computed a file
path via `import.meta.url` at module scope; webpack replaced that with a
**hard-coded absolute `file://` path of the build machine** baked directly
into the compiled chunk. At runtime on Vercel's Linux Lambda the code tried
to read a Windows path that obviously doesn't exist there — ENOENT, even
though `outputFileTracingIncludes` had correctly copied the actual file into
the function. The fix is not "trace harder" — tracing was never the
problem. The only real fix is eliminating the runtime file read entirely
(convert the data to a bundled `.mjs` module, imported normally — no `fs`,
no `import.meta.url`, no tracing dependency at all).

**Vercel Skew Protection pins a browser to whatever deployment served its
HTML**, for a configured window (12h was observed). Every subsequent
`fetch()` from that tab — even to the same domain, even after a fix has
shipped and gone Ready — gets routed to the OLD deployment's functions. "I
deployed the fix and it's still failing" and "the fix isn't being served to
me yet" are indistinguishable from the response alone. The only way to tell
them apart: a genuinely fresh, unpinned request — a brand-new
incognito/private tab, or a fresh `curl`, or hitting the deployment's own
unique `*.vercel.app` URL directly. Recommendation currently in force: Skew
Protection is **OFF** for the rest of pre-launch (with the founder as the
only "user," it only corrupts probes) — **re-enable it before real traffic.**

**The Android emulator and a physical device cannot share one API base-URL
value.** `10.0.2.2` is the emulator's documented alias for the host
machine's loopback, and it's the *only* domain whitelisted for cleartext
HTTP in this app's manifest (a scoped `network-security-config` config
plugin, `apps/mobile/plugins/withEmulatorLoopbackCleartext.js`, matches that
exact literal — not a blanket cleartext-allowed flag). A physical device has
no such alias; it needs the machine's real LAN IP over the same WiFi — and a
LAN IP is **not** on the cleartext whitelist, so plain HTTP to it gets
blocked by Android's default policy. To test both at once: run two Metro
instances on two ports, one with `EXPO_PUBLIC_API_BASE=http://10.0.2.2:3000`
for the emulator, a second with the LAN-IP value for a physical device. Tell:
`CLEARTEXT communication ... not permitted` in `adb logcat` means exactly
this domain/whitelist mismatch, not a backend bug.

---

## 4. The discipline

Every rule below exists because of a specific, named incident — not because
it sounded prudent in the abstract.

**Prove a test fails against pre-fix code before trusting it green.** Stated
plainly and followed literally throughout this project's history: stash the
fix, run the new test, confirm it fails for the right reason, restore the
fix, confirm it passes. A test that was never run red proves nothing about
whether it actually exercises the bug. Applied consistently — the mobile
test suite's first-ever case (the displayName relay guard) was proved red
against pre-fix code before being trusted, same as every server-side fix in
the technical sweep.

**State VERIFIED vs. INFERRED, always, on any factual claim about the
system's state.** Not decoration — it's the difference between "I read the
schema" and "I assume the schema still says what a six-month-old doc says it
does." Docs decay; the code and the live schema don't lie. Read the
migration or query the live table before stating a database fact as
settled.

**Grep for every instance of a pattern you just fixed — and don't trust
even that grep completely.** The cautionary example: a fix for a
check-then-act version race across two report-insert routes (`report.ts`'s
two standalone routes) explicitly found and fixed **two** call sites of that
exact bug shape. A third call site — the same insert pattern, inside the
invite-accept group-space branch — was missed by that same sweep and only
caught later, in a separate batch. The lesson isn't "grep harder," it's
"treat a grep-based sweep as good but not infallible, and stay alert for the
same shape resurfacing somewhere the grep didn't reach."

**Two failed fix attempts means instrumentation, not a third hypothesis.**
The founder's own words, from the incident that produced this rule: "two
failed attempts — instrument, do not hypothesise a third fix." The concrete
case: an Android splash-screen build failure was diagnosed correctly on the
first pass, but the chosen fix was wrong and unverified; a second build
failed identically, which should have been the trigger to stop guessing. The
actual second attempt still guessed. Only after explicitly instrumenting the
generated native tree — grepping the real output instead of reasoning from
source — did the correct fix (and the second wiring path the first pass had
missed entirely) surface. If you're about to try a second unverified fix for
the same symptom, stop and instrument first.

**Never report something as verified from source inspection alone when it
is directly observable.** Screenshot it, measure it, run it — reading the
code and reasoning about what it should do is not the same claim as having
watched it do that. This surfaced most recently investigating the mobile
ANR (§ COMPLETION-TRACKER §7.9): static code reading ruled out several
obvious candidates by inspection, but that never became "the ANR is
explained" — it stayed "these candidates are ruled out" until the actual
Sentry thread dump could be pulled and inspected directly, which then turned
up a different problem (the dump itself has no usable main-thread frames) that
source reading alone could never have surfaced.

**One session at a time.** A second concurrent session doesn't just create
merge conflicts — it can silently mask another session's fix (both editing
overlapping surface, one session's read stale, changes appearing to not
"take"). If you find files changed that you didn't touch, stop and figure
out why before continuing.

**Forks are read-only investigation only.** A fork inherits the parent's
full conversation context — including ambient ruling, halt state, and
instructions that were never meant to travel with it into a subtask that
should stay narrowly scoped. Never spawn a fork to do writing work that
overlaps what the parent session is already doing, and never where two
writers could touch the same files.

**Report uncommitted AND unpushed work unprompted, at every natural pause —
not just at session end.** Extended deliberately beyond "uncommitted" to
"unpushed," because a commit sitting locally is just as invisible to anyone
else (including a fresh Claude Code session) as an uncommitted change.

---

## 5. The through-line

`.planning/VERIFICATION-SURFACE-GAPS.md` opens with the line that governs
everything above: **every observation has a scope, and the scope is usually
narrower than it appears.** A check tells you something true — but only
about the exact thing it exercised, which is almost always less than what
gets read into a green result. Three named, distinct shapes this takes in
this codebase:

- **A probe tests only the code it runs.** A 200 on a static page, or a 401
  from an auth gate, proves that page loads or that the gate ran — it says
  nothing about the handler body or compute path behind it. (This is
  literally how the first production deploy was declared healthy while
  every real compute route was 500ing on a missing native dependency.)
- **A monitor sees only the errors that reach it.** A route that catches an
  error and returns a `500` `Response` is a normal return value, not a
  thrown error — Sentry's own error-boundary hooks never fire. "The
  dashboard is clean" is not "production is healthy," it's "nothing that
  reaches Sentry's instrumented surface has failed."
- **A probe tests only the deployment you're routed to.** With Skew
  Protection on, a browser tab can keep hitting a stale deployment's
  functions for hours after a fix ships — "deployed the fix, still fails"
  and "the fix isn't being served" are indistinguishable from the outside.

The corollary, stated separately but the same underlying shape: **a gate
that has never been run is not evidence of a clean codebase — it's an
unknown, and should be assumed to be hiding something until proven
otherwise.** This has held every time it's actually been tested in this
project — every time a real check, monitor, or gate got turned on for the
first time, it found something immediately. Never once has flipping on a
previously-off gate come back clean. Treat that as the prior, not the
exception, the next time you're deciding whether an unwired check is worth
wiring up before launch.

Before trusting any green result — a passing test, a 200 response, a clean
dashboard — name out loud what it actually exercised, and treat everything
outside that named scope as still unverified.

---

## 6. The workflow

**The batch pattern.** Investigate a whole domain in one pass, surface every
finding together, halt **once** with a consolidated decision list, get one
ruling from the founder, then build against that ruling and report once at
the end — not a round-trip per finding. The clean example is the 2026-08-26
technical sweep: one investigation pass covered DB/RLS, secrets, auth, cost,
data integrity, scale, Vercel, and RevenueCat; every finding surfaced
together; the founder ruled fix-order same day into two tiers; Tier 1 and
Tier 2 fixes then shipped in sequence, each proven against pre-fix code
before landing, with one final report.

**What halts vs. what is decide-and-proceed** (ruling dated 2026-08-03,
narrowed from an earlier, wider halt posture — "too many round-trips were
being spent on decisions the founder would have approved anyway"):

Halt only for: security or privacy tradeoffs; anything that changes
user-visible behaviour or product scope; design/architecture on a screen or
system with no precedent; scope exceeding roughly 500 lines or needing a
split; genuine ambiguity that can't be resolved from source; anything
requiring the founder's own device, credentials, or a production migration.

Decide and proceed — then report what was chosen and why — for everything
else: implementation approach where a codebase precedent already exists;
naming, file placement, function decomposition; doc corrections, comment
freshening, tracking-note filing; anything under ~50 LOC that doesn't change
behaviour; choice of test/verification method. Batch small items into one
message rather than one message per fix.

**Batch 8 (the screen-by-screen UI pass) is the deliberate exception to
"batch a whole domain."** It runs screen by screen, with the founder's
approval gate at every single screen, not batched. The rule, confirmed with
the founder and explicitly "do not deviate": a mockup is designed **from
scratch as a complete object** — never opening the existing screen's code
while designing it, never framed as a diff or edit against what's already
there. Only after the founder approves the from-scratch mockup does the
build read exact values from the committed mockup file. This exists because
every earlier attempt at proposing a redesign as an edit against the old
screen came back looking like the old screen with edits — a diff-shaped
proposal cannot escape the gravity of what it's diffing against, even when
the intent is a genuinely new design. Batch 8 also carries its own visual-
parity ruling (§7) and mockup-currency checks — a mood-reference file like
`krug-v4.html` is explicitly *not* a spec, confirmed the hard way once
already.

**The branch workflow, now that Petko owns three independent workstreams**
(the LLM swap, the recommendations engine, and `support@stellaeum.com`, all
on his own branches): the governing lesson comes from the 2026-08-04
incident that ended the prior two-trunk arrangement (`main` and
`mobile-parallel-test`, each treated as "the real branch" by a different
person, with no integration point for months — full record in
`.planning/phases/phase-b-mobile-parity/HANDOFF-2026-05-09.md`'s "Branch
strategy" section; `mobile-parallel-test` was archived+frozen and `develop`
deleted outright as part of the recovery). `main` is now the single active
branch. A workstream branch carries a **3-day / ~400-changed-line ceiling,
whichever comes first** — at that ceiling it either merges to `main`, or, if
genuinely unfinished, rebases onto `main` anyway. `main` never waits on a
branch. The number to watch is commits the branch is *behind* `main`
(`git log --oneline origin/<branch>..origin/main | wc -l`) — this is what
silently climbed to **548+** in August before anyone caught it; anything
past roughly 30 without a merge or rebase is the intervene signal. The
**dark-launch rule**: a risky or slow-to-validate change (the LLM swap is
the live example) merges to `main` **behind a feature flag before it's
validated**, not after — e.g. the AI model should read from an env var
defaulting to the current placeholder, so merging the swap code changes
nothing in production until the var is deliberately flipped. A branch that
can only merge once "proven good" lives for weeks and recreates the exact
divergence that caused the August incident.

---

## 7. Standing rulings — do not re-litigate

- **Parity is feature AND visual, both platforms, same launch — with
  Settings and Auth exempt.** Ruled 2026-08-28. Exempt because Clerk's
  hosted UI is a hard boundary this app doesn't control the pixels of; every
  other screen gets the same design pass on both platforms.
- **Hard delete stays — not a soft-disable.** A design that only nulls
  fields and keeps the row would read to an App Store reviewer as
  deactivation, which Apple Guideline 5.1.1(v) explicitly rejects. The
  existing cron + FK-cascade hard-delete already satisfies both the App
  Store requirement and GDPR's "right to erasure" with one mechanism.
- **The rate limiter fails closed only on the three money-spending routes**
  (`oracle/generate`, `horoscope/generate`, `birth-data` create) via an
  opt-in flag — **everywhere else it stays fail-open**, deliberately, so a
  rate-limiter bug can't turn into a full outage on a route that was never
  spending money in the first place.
- **Premium's monthly cap is invisible by design.** Hitting it returns a
  generic 503 with no `CAP_REACHED` code and no number in the payload —
  indistinguishable from a real outage. It's a safety net, not a surfaced
  product feature; free tier's 429 (with a real number) stays a genuine,
  visible product limit, on purpose — the two are not meant to look alike.
- **No retries, no correction maps, no prompt workarounds for the current
  LLM.** `meta-llama/llama-3.3-70b-instruct` via OpenRouter is an explicit
  placeholder with known-weak Bulgarian output — building workarounds around
  a model everyone already intends to replace is wasted work. The swap
  decision lives in `.planning/LLM-PROVIDER-DECISION-2026-08-27.md` and is
  Petko's to close.
- **Oracle streaming is permanently won't-do — do not reopen.** Ruled
  2026-08-13. Web itself dropped SSE/`useCompletion` for a manual
  `fetch` + `ReadableStream` reader; React Native's `fetch` has no
  `ReadableStream`-body support and no polyfill is installed. A fragile
  streaming layer on the app's most-used AI surface was judged worse than
  JSON-only. Would need a fundamentally different constraint to reopen, not
  just "it'd be nice."
- **`sweph` stays pinned to the GPL-2.0 path** (`2.10.0-11`, enforced via a
  workspace-wide pnpm override), reconfirmed 2026-08-05 against the live
  license contract. The override exists because `packages/core` once
  drifted onto an AGPL-licensed `sweph` build by default semver resolution
  before the override was added — the pin now force-resolves any future
  `sweph` specifier anywhere in the workspace, so that can't silently
  recur. The Professional License purchase is deliberately deferred to the
  first real paying subscriber, not skipped.
- **Кръг's plural address (`вас`/`ви`, plural verb conjugations) is
  grammatically correct and must not be "fixed" to singular ти.** A
  compatibility report describes two people jointly — Bulgarian has no way
  to write "the two of you move through X" with a singular verb. This is
  ordinary subject-verb agreement with a plural subject, a different axis
  entirely from the ти/Вие formality rule, and it was checked and
  deliberately left alone once already (a sibling instance addressing a
  single invitee elsewhere in Circle *was* correctly fixed to singular
  informal — confirming the distinction is intentional, not a missed spot).

---

## 8. The Bulgarian workstream

There is no single "grammar engine" file — it's a layered system, code plus
audit documentation, because some of what it guards against only manifests
at the point strings get *assembled*, not in any single fragment.

The code layer: `packages/core/src/i18n/bg-grammar.ts` holds shared helpers
— preposition elision (в→във, с→със before в/ф- and с/з-initial words),
adjective/pronoun gender agreement, ordinal formatting — consolidated after
an audit found the same logic copy-pasted and drifting per call site. Any
new composed string that inserts a planet, aspect, or sign name into a
sentence is supposed to route through this rather than hand-rolling the
rule again. Layered on top, three of the eight `check:all` gates exist
specifically for Bulgarian quality (§2): the speller catches non-words in
static strings, the copy-lock catches any unreviewed drift in approved
copy, the lint baseline catches new Cyrillic literals landing outside a
designated content-home file.

**Why it exists:** this is a Bulgarian-market product, and Bulgarian is
held to a real fluency bar — the same tier of engineering discipline as
correctness or security, not a translation afterthought.

**The gender-agreement bug it fixed:** `packages/core/src/horoscope/transit-
analysis.ts`'s `houseTheme()`/`aspectMeaning()` functions were left in
formal register during an unrelated ти/Вие conversion pass, while the
functions that interpolate their output had already gone informal earlier,
during a separate fix. Each fragment was internally correct Bulgarian in
isolation — the *assembled* sentence mixed formal and informal register in
one line, on live transit cards. The lesson documented alongside the fix:
no per-fragment or per-file check can catch this class of bug; it only
shows up once fragments are composed, which is exactly why `bg-grammar.ts`
exists as a shared composition layer rather than leaving each call site to
get gender agreement right on its own.

**The register rule:** informal **ти**, everywhere, by default — stated and
re-confirmed repeatedly across the i18n audit docs as the app's baseline.

**The one surface where plural is correct:** Кръг (Circle) — see §7. It's
not an exception to the ти/Вие register rule at all; it's a different
grammatical axis (subject-verb number agreement for a jointly-addressed
pair) that happens to look similar on the surface. Don't conflate the two
when reviewing Circle copy.

---

## 9. Who owns what

**Toni** (founder) owns mobile + infra. **Petko** (co-founder) owns web,
specifically the LLM provider swap, the recommendations engine, and
`support@stellaeum.com`, working on his own short-lived branches per the
workflow in §6.

**Blocked externally** — nobody in this repo can move these faster:
Apple Developer Program enrolment (payment + application step, gates SIWA
Phase B and therefore App Store submission — see the submission-blocker
note at the top of `COMPLETION-TRACKER.md`); the LLM provider swap decision
(Petko's call, still open); the Swiss Ephemeris Professional License
purchase (deliberately deferred to the first real paying subscriber, a
cash-flow decision, not a blocker being missed); designer assets (brief is
written and ready, nobody's been commissioned yet); the Bulgarian
data-protection lawyer engagement for `/privacy` and `/terms` (their
turnaround is the long pole, not ours).

**Blocked only on someone doing it** — no external dependency, just
undone: the RevenueCat webhook's real signing secret (dashboard-only
action); two prepared-but-unapplied Supabase migrations, both explicitly
scoped to use `supabase migration repair --status applied`, never `db
push` (§3); a couple of environment values that just need setting in
`.env.local` plus the EAS/Vercel dashboards; confirming the Sentry EAS
environment variable actually carries the right DSN (local `.env.local` is
confirmed correct as of 2026-08-31, the EAS dashboard value is not yet
independently confirmed). None of these need anyone's permission or
payment — they're sitting open because nobody has done the five-minute
dashboard action yet, not because they're actually hard.

---

## 10. How the founder works

He's sharp but not deeply technical — plain-language explanations aren't a
courtesy, they're how he actually verifies whether an explanation makes
sense, and a request for one should be taken seriously, not compressed back
into jargon. He wants a blunt, unhedged assessment, not agreement — if
something is a bad idea, say so plainly rather than finding a way to agree
with a softened version of it. He rules on decisions; the right posture is
to investigate, lay out the real tradeoffs, and halt for his ruling (per the
halt boundary in §6) — not to make product or architecture calls
unilaterally and report them as done.

When he asserts something that turns out to contradict the code, **the code
wins, and say so directly** rather than quietly complying with the wrong
premise. This has already prevented real damage more than once — a claimed
auth-status fact and a claimed branch-topology fact were both corrected this
way before they became a wrong action taken on a wrong premise.
