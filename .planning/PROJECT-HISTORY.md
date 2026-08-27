---
title: Project History — Stellaeum
created: 2026-08-27
method: derived from git log (761 commits, 2026-01-18 → 2026-08-27), commit dates
  and messages, when directories/packages first appeared, the dated handoffs and
  checkpoints in .planning/, and REVISIT-TRIGGERS' own timeline. Where a planning
  doc's summary conflicted with the commit history, the history was taken as
  authoritative — that has happened repeatedly on this project.
audience: someone who has never seen the repo.
---

# Stellaeum — a plain-language history

## The shape of it

The project started **18 January 2026** (not November 2025 — that guess was
off by two months). As of today it has **761 commits over 7 months**, but
the work was not evenly spread: **March and June 2026 have zero commits
each** — two full months of stall — and **April alone has 258 commits**,
nearly a third of the entire history.

The rough arc:

| When | What was happening |
|---|---|
| **Jan 2026** | Project setup, monorepo, auth, birth-data wizard started |
| **Feb 2026** | The web app's engine and features — charts, AI readings, horoscope, GDPR, landing page |
| **Mar 2026** | *(nothing — stalled)* |
| **Apr 2026** | Restart. The mobile app is born. LLM swapped. Diary, ephemeris validation. The biggest month by far. |
| **May 2026** | Building the mobile app out toward feature-parity with web |
| **Jun 2026** | *(nothing — stalled again)* |
| **Jul 2026** | The mobile redesign (third attempt), and the Bulgarian-language toolchain |
| **Aug 2026** | A branch-merge disaster, a week of failed builds, eight "batches" of fixes, two security sweeps, and finally a real production deploy |

---

## 1. The phases, in order

### Phase 0 — Setup (18–21 Jan)
Initialised the repo with a structured planning system ("GSD"), wrote the
first requirements (54 of them) and an 8-phase roadmap, and stood up a
**Turborepo monorepo**: a Next.js 15 web app, a shared UI package, a
database package. The product was called **"Celestia AI"** at this point
(renamed to Stellaeum later). "Done" meant: the skeleton compiles and the
plan exists.

### Phase 1 — Foundation (21–31 Jan)
The web app's bones: a glassmorphism visual theme, security headers with a
strict Content-Security-Policy, a responsive home page. "Done" meant a
styled landing page that passed its own security checklist.

### Phase 2 — Authentication (22–25 Jan)
Clerk integrated for sign-in/sign-up, protected route groups, a session-
expiry modal, a user menu. "Done" meant you could create an account and be
kept out of protected pages without one.

### Phase 3 — Birth-data wizard (25–31 Jan)
The multi-step form that collects birth date, time and place — the input
every reading depends on. This is where the first stall began; the phase
was left with "pending human test" todos and not fully closed before the
gap.

### The March gap
No commits for roughly six weeks (19 Feb → 2 Apr on the calendar, but the
February work below was done in a burst).

### Phase 4 — Astrology engine (early Feb)
The `packages/astrology` package appeared on **1 February**, wrapping the
**Swiss Ephemeris** (`sweph`, a compiled native library) to compute real
natal charts — planet positions, houses, aspects. No mock data path; it
was the real astronomical calculation from the start. "Done" meant a chart
you could trust.

### Phase 5 — AI Oracle (mid Feb)
The Vercel AI SDK was installed and a streaming "generate" route built.
**The first LLM was Google Gemini** — this changed later. "Done" meant the
Oracle streamed a reading back.

### Phase 6 — Daily horoscope (mid Feb)
Per-request generation of a daily reading, tied to the current sky.

### Phase 7 & 8 — Landing, GDPR, audit logging (mid-to-late Feb)
The marketing page, GDPR export/delete flows, and an audit log. By
**19 February the web app was substantially a working product** — sign up,
enter birth data, get a real chart, get an AI reading, subscribe, export
or delete your data. This is the "web reference" everything after was
measured against.

### The April restart (2–17 Apr)
Work resumed on a `develop` branch with a feature-branch-and-PR workflow
(pull requests #1–#5). Highlights: a v1.0 feature roadmap, **the LLM
switched from Gemini to Llama 3.3 70B via OpenRouter** (PR #3, 7 April),
Stripe trial periods, a Bulgarian crystal guide.

### Phase A — Mobile scaffold (18 Apr onward) — *the pivot*
**18 April is the single most consequential day in the history.** On that
one day: the `apps/mobile` Expo app was created, and `packages/core` was
created to hold logic shared between web and mobile. The first mobile
screens went in ("Днес" dashboard, Oracle button, chart chips). From here
on, the project is a **two-app monorepo**, and the goal becomes "make
mobile match web."

April closed with 258 commits — mobile auth screens, the wizard rebuilt
with a form library, plus parallel work on the web side: a diary/journal
feature, and an **ephemeris-validation test harness with a CI gate**
(genuinely rigorous — it checks the chart math against reference data on
every push).

### Phase B — Mobile parity (May)
136 commits building mobile out screen by screen against web: Oracle,
diary, crystals, "stories"/recommendations, a monthly usage-quota system,
sign-up name fields. On **9 May** a key decision was ratified: the
soft-launch bar is **"full web parity, minus Friends groups"** — mobile
has to do everything web does. "Done" for each screen meant it called the
same real API as web, verified by reading the code.

### The June gap
Another full month with no commits.

### The July redesign (21–30 Jul)
Mobile screens existed but didn't feel like a designed product. This month
was **the third attempt at a mobile visual language** (the spec is
literally named "MOBILE-ALPHA-REDESIGN **v3**"; v1 and v2 were rejected).
v3 ("familiarity-first") was accepted for two screens — **Днес and Карта**
were rebuilt and promoted to live — then a "warm/cool" colour amendment
was layered on (bronze for "the app speaking," cool tones for "reading
data"), then a device-pass round of corrections.

Also in July, born out of necessity: the **Bulgarian-language toolchain** —
a shared grammar module, gendered noun data, and a spell-check gate
(`scripts/i18n/`, 28–30 Jul) that flags non-Bulgarian or misspelled words
in the app's text.

### August — consolidation, incident, and launch push

- **3–4 Aug — the branch incident.** Petko had been building the Кръг
  (relationship-compatibility) backend independently on his own branch;
  the founder had been working on `mobile-parallel-test`. Neither had been
  merging into `main` for months. When Petko's work landed on `main`, it
  was nearly discarded during a branch cleanup because no one had been
  watching `main`. Recovery took hours and three rounds of manual merging.
  Outcome: **one branch only (`main`) from now on**, `develop` deleted,
  `mobile-parallel-test` frozen.
- **4 Aug — the reality-check checkpoint.** A hard look at the actual state
  found: no automated tests anywhere except the astrology engine; the
  broader lint was failing and nothing caught it; several planning docs
  were months out of date; Кръг on mobile was still a 70-line placeholder;
  the payments SDK was running on a fake key; there was no way to send a
  transactional email.
- **5–11 Aug — Android build hell.** Four-plus failed cloud builds, each
  failing one step later than the last (Sentry upload → duplicate React →
  splash-screen resources → a file collision from Clerk's Android SDK),
  plus a Windows-only bug in the build tooling that needed an upstream
  patch.
- **13–16 Aug — Batches 1–8.** A numbered series of fix-and-port passes:
  stability, Oracle polish, the first real test coverage, the **Кръг
  mobile port** (Batch 4 — which is why the "70-line placeholder" claim
  became false on 14 Aug, though a planning doc kept repeating it until
  today), the premium/subscription screen port (Batch 5), a full backend
  **security sweep** (Batch 5.5), the amber→bronze colour migration
  (Batch 6), rate-limiting seven exposed routes (Batch 7), and the scoping
  of Batch 8 (the remaining UI redesign work — still not started).
- **26 Aug — the second security sweep.** Found and fixed real holes: a
  payments-webhook secret that was identical to a key shipped inside the
  mobile app (anyone could have forged a "you're premium" message); AI
  routes with no usage cap that a free account could have looped to run
  thousands of paid generations a day; a cleanup job that silently ignored
  failed deletions.
- **27 Aug (today) — the deploy.** After **18 failed Vercel attempts**
  across the project's life, the first successful production deployment —
  fixed by declaring the environment variables the build tool was silently
  filtering out, plus a Next.js version bump. Then the new error monitoring
  immediately caught that production **was never actually working**: the
  Swiss Ephemeris library wasn't being packaged into the server, so every
  chart calculation was failing. Fixing that revealed a second failure
  (a file path frozen to the build machine), and fixing *that* revealed a
  third (the AI provider returning an empty response). Each was invisible
  until the one before it was cleared.

---

## 2. The decisions that shaped everything after

**Monorepo with shared code between web and mobile (Jan).** *Why:* write
the hard logic once — chart math, compatibility scoring, quota rules — and
use it on both platforms. *Verdict:* **mostly paid off.** The shared
packages are real and genuinely used. But the infrastructure tax was
underestimated: the native astrology library not packaging correctly into
the serverless deploy, a near-miss CI break from two branches holding
different dependency locks, and Windows-specific build-path bugs all trace
back to the monorepo shape. Net positive, but it cost more plumbing time
than expected.

**Web first, mobile second, "web is the reference" (Jan–Feb).** *Why:*
build one complete thing, then match it. *Verdict:* **sound.** The web app
is genuinely finished and served as a living spec. The cost came from the
*next* decision.

**"Mobile must reach full parity with web" (ratified 9 May).** *Why:* a
consistent product on both platforms for the soft launch. *Verdict:*
**this is where scope ballooned.** It turned "ship a good mobile app" into
"re-implement every web feature on mobile, exactly." Кръг, the diary,
crystals, stories, the subscription screens — all had to be ported rather
than reconsidered for mobile. Months of work that a "mobile does the core
journey well, web does the long tail" decision would have avoided.

**Gemini → Llama 3.3 70B via OpenRouter (Apr).** *Why:* cost, and an
explicit "placeholder until we research this properly." *Verdict:*
**the deferral has cost us.** The code itself says the model's Bulgarian
is weak and that no one should paper over it. Seven months later the
provider decision is still open, it now blocks the privacy policy, and
Bulgarian output quality has no safety net. A decision that was cheap to
postpone in April is expensive to still be postponing in August.

**Bulgarian-only product (from the start).** *Why:* a focused launch in
one market. *Verdict:* **right call, unbudgeted cost.** Doing Bulgarian
*well* required building a grammar module and a spell-check gate and a
copy-lock system — an ongoing tax on every piece of text in the app that a
generic English product never pays.

**Two people, split by platform: founder on mobile + infrastructure,
co-founder on web.** *Verdict:* **caused the one real disaster.** Each
person treated their own branch as canonical, there was no integration
point for months, and a whole feature backend nearly got deleted. Fixed
afterwards by collapsing to a single branch — but the fix was reactive,
after hours of lost time and a genuine scare.

**Structured planning docs (GSD, from day one).** *Verdict:* **double-
edged.** It made the project resumable across long gaps (which mattered,
given two dead months). But it also produced dozens of documents, several
of which drifted out of sync with the code and then actively misled —
the current master status file exists *specifically because* four older
status docs sat frozen at "0% progress" for three months while real work
shipped.

---

## 3. The course corrections

**Gemini → Llama (Apr).** Trigger: cost / "not a considered choice yet."
Cost: low at the time; the unpaid bill is that it's still not resolved.

**Three mobile redesigns (through July).** Trigger: the parity-ported
screens worked but didn't read as a designed product. v1 and v2 were
rejected; v3 landed for two screens, then needed a colour-system amendment
on top, then device corrections. Cost: most of July. Lesson, now baked
into the process: design each screen from scratch as its own object, never
with the old screen's code open — the framing of "improve this" kept
producing rejects.

**The branch divergence (discovered 4 Aug).** Trigger: `main` and
`mobile-parallel-test` treated as separate truths for months. Cost: hours
of manual tree reconciliation, near-loss of the Кръг backend, a latent CI
failure that had been possible the whole time. Fix: single branch, CI runs
on every push.

**Five design docs → one reference (16 Aug).** Trigger: a colour value was
wrong in one doc and right in another, and the wrong one got used. Cost:
small, but it was the second time doc-sprawl caused a concrete mistake.

**Four stale status docs → one tracker (13 Aug).** Trigger: the discovery
that the official status said "0% progress" while Phases 3–8 had shipped.

**18 failed Vercel deploys → root-caused (27 Aug).** Trigger: it never
worked and no one had sat down to fully diagnose why until month seven.

**"Production is live" → "production was never working" (27 Aug, same
day).** Trigger: error monitoring going live for the first time and
immediately catching what page-level checks couldn't see.

---

## 4. Where the time actually went

By commit volume and what those commits contain, roughly:

- **~50% — features.** The web MVP (Jan–Feb) and then the long mobile
  parity port (Apr–May, and the Кръг/subscription ports in August).
- **~15% — getting a build and a deploy to work.** 18 failed Vercel
  attempts, a week of failed Android builds, the native-library packaging
  fixes, the environment-variable and Next.js-version fixes. This is
  almost certainly *more* than it feels like — it was spread thin across
  the whole timeline as background friction, not concentrated.
- **~15% — security.** Two full sweeps (Batch 5.5 and 26 Aug), rate
  limiting, GDPR flows, audit-log de-identification, RLS.
- **~12% — the redesign.** Three attempts at the mobile visual language,
  plus the warm/cool colour system and device passes.
- **~8% — Bulgarian-language correctness.** The grammar module, the
  spell-check gate, the copy-lock system, allowlist review.

Two things that distort the felt sense of it: **the two dead months**
(March, June) mean the *calendar* is 7 months but the *work* is closer to
5, and **August is deceptively dense** — 143 commits, but they carry two
security sweeps, a build crisis, a branch crisis, and a deploy crisis, so
it "feels" like more than a fifth of the project.

---

## 5. What to keep doing, and what to stop

### Keep

- **The web app as a real reference.** It has no fake data paths anywhere;
  every feature is wired end to end. That's a genuine asset and it's why
  the mobile port had a solid target.
- **Real astronomical precision with a CI gate.** The chart math is
  validated against reference data on every push. Most apps in this space
  don't bother.
- **The security instinct that emerged in August.** Proving a test fails
  against the pre-fix code before trusting it; grepping for *every*
  instance of a bad pattern, not just the one you found; tagging claims as
  verified-by-running vs. read-from-source. This caught real money-losing
  bugs.
- **Diagnosing from evidence, not inference.** Reading the actual deployed
  bundle to find a build-machine path frozen into it, instead of guessing.
- **Conservative pre-launch defaults.** No analytics, no extra vendors, no
  premature richness. Fewer things to break.
- **The Batch 8 process (design the mockup first, from scratch, approve
  before building).** Learned the hard way in July; it's the right rule.

### Stop

- **Long silent gaps.** Two months lost twice. Whatever caused them
  (funding, motivation, life), the project loses more than the calendar
  time — it loses the thread, which is exactly why this document was
  needed.
- **"Parity with web" as the mobile bar.** It converted a focused mobile
  launch into a port-everything project. For anything still unbuilt, ask
  "does mobile need this to launch" before "does web have it."
- **Deferring the model-provider decision.** It has been the oldest open
  item for four months and is now on the critical path. Decide it.
- **Planning-doc sprawl.** Every new doc is a thing that can go stale and
  mislead. The tracker and this file should be the load-bearing ones;
  resist adding more.
- **Trusting a deploy you haven't exercised.** "It's green" meant nothing
  three times this month. A deploy isn't real until a real request through
  the real path succeeds.
- **Testing everything from one long-lived browser session.** Vercel's
  skew protection can pin that session to an old deployment for hours —
  which is the live confusion as of today.
- **Shipping with near-zero tests on mobile.** The astrology engine is
  well tested; the app around it, especially mobile, is not.

---

## 6. The sixty-second version

Stellaeum is a subscription astrology app for the Bulgarian market, built
since January 2026 by one founder plus a part-time co-founder, on a shared
codebase that powers both a web app and a mobile app. The web version —
real Swiss Ephemeris birth charts, AI-written Bulgarian readings, a
relationship-compatibility feature, Stripe payments, full GDPR — was
essentially finished by February and has been the reference ever since.
Most of the work since has been re-building all of that on mobile at full
parity (a scope that grew once "match web exactly" became the goal), plus
a three-try mobile redesign, a purpose-built Bulgarian-language quality
toolchain, two rounds of security hardening that closed real money-losing
holes, and a long grind to make the thing build and deploy at all — 18
failed web deploys, a week of failed mobile builds, and a "successful"
first production launch that monitoring immediately proved had never
actually worked. As of late August the app is feature-complete on both
platforms, the production deploy is finally real, and what stands between
here and launch is a visual polish pass, the Apple and Google store
enrolment clock, a privacy policy from a Bulgarian lawyer, and one
long-postponed decision about which AI model to actually ship.
