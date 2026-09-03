---
title: Handoff to Petko — LLM swap validation, branch workflow, overlap rules
created: 2026-08-28
author: founder (via Claude Code)
status: active handoff. Petko owns the LLM swap, the recommendations engine, and support@stellaeum.com.
---

# Handoff: validating the LLM swap, and how to branch without repeating 3 August

## 0. The one thing that matters most — land the swap DARK

**Feature-flag the model behind an env var so the swap merges to `main`
before it is validated, not after.**

Right now `AI_MODEL` is a hardcoded constant in `apps/web/lib/ai/client.ts`.
Make it read from the environment (`AI_MODEL` / `AI_MODEL_FALLBACK`, with
the current Llama string as the default so nothing changes until an env
var is set). That is the whole code change on the model-selection side —
`LLM-PROVIDER-DECISION-2026-08-27.md` §"Integration scoping" already
verified the provider wiring is a ~3–20 line change in that one file, and
the two consumers (`oracle/generate`, `horoscope/generate`) go through the
provider-agnostic Vercel AI SDK and do not change.

Why this is the headline and not a footnote: the swap is the riskiest and
potentially longest of your three workstreams (Bulgarian quality is a
judgement call, not a green/red test). If it can only merge once it is
*proven good*, the branch lives for weeks and we are back in a long
parallel line — the exact shape of the 3 August near-disaster. If it
merges dark in a day or two, validation runs against `main` by flipping
`AI_MODEL` in a preview environment, and the branch is closed while the
evaluation continues safely.

Recommended default from your research: `google/gemini-3.7-flash`;
quality fallback `openai/gpt-5.4-mini`. Neither is decided in code yet and
the privacy policy placeholders stay unfilled until one actually ships
(see `PRIVACY-POLICY-LAWYER-BRIEF-2026-08-27.md` §4).

## 1. Branch workflow (founder-approved 2026-08-28)

The 3 August failure was not "a branch existed." It was unbounded,
invisible accumulation — a parallel line that drifted for months until
merging it risked discarding real work. These rules bound and surface
drift; they are not a "merge often when you feel like it" norm.

- **One branch per workstream, not one for all three.** LLM swap,
  recommendations engine, support@ are independently shippable. A shared
  branch makes the slowest gate hold the other two hostage.
- **3-day / 400-changed-line ceiling, whichever comes first.** At the
  ceiling the branch either merges to `main` or — if the work is not
  done — **rebases onto `main` anyway**. `main` never waits on a branch;
  a branch is never more than a few days of drift from `main`.
- **The number the founder watches**, folded into the unpushed-work
  report already given at every pause:
  `git log --oneline origin/<branch>..origin/main | wc -l` — commits the
  branch is *behind* `main`. That number is what hit 548+ in August.
  **Over ~30 without a merge or rebase is the intervene signal.**
- Short-lived branches merging within days are fine. Another months-long
  parallel line is not, and "I'll merge when it's done" past one ceiling
  interval is how the last one happened.

## 2. Overlap rule — `lib/ai/client.ts` was hardened on 2026-08-28

Your swap touches `apps/web/lib/ai/client.ts`. The founder shipped
hardening into that same file and its callers earlier the same day. When
your swap branch merges, **verify these three survived the merge** (a
two-minute grep, and exactly the silent-revert risk that has bitten us
before):

1. `isUpstreamAiError(err)` in `lib/ai/client.ts` — the upstream-vs-ours
   error classifier.
2. The **502 `AI_UPSTREAM_FAILED`** classification + quota refund in the
   `catch` blocks of both `oracle/generate` and `horoscope/generate`
   (an upstream provider returning garbage must be a 502 with a quota
   refund, not an opaque 500 that also burns the user's quota claim).
3. `readJsonBody(req)` in `lib/auth/guards.ts` — used by 8 routes; a
   malformed/absent request body must be a `400 INVALID_BODY`, not an
   unhandled 500 that pages Sentry at High.

If your provider swap changes the shape of the errors the AI SDK throws,
`isUpstreamAiError` may need a new branch — that is fine, but it must stay
*present* and keep classifying.

## 3. Validating the swap — the tooling is ours, here is how to use it

Do not eyeball a few outputs. Run a real comparison:

- **Inputs:** real natal charts (3–5, spread across chart shapes — with
  and without a known birth time), each run through **all four Oracle
  topics**, plus a daily-horoscope generation. Use the actual prompt
  builders: `lib/oracle/prompts.ts` + `lib/oracle/chart-to-prompt.ts` and
  `lib/horoscope/prompts.ts` — do not hand-write prompts.
- **Objective non-word count:** pipe every generated output through
  `scripts/i18n/bg-speller.mjs` (the same checker `check:bg-strings`
  uses). It gives a hard number. Llama's qualitative baseline — the
  `съсредоточ-` stem garbling, `сеiyan` / `интUITIВNA` script collapse,
  Russian drift — is in `.planning/i18n/MODEL_CAPABILITY_LOG.md`, now with
  the EuroEval Bulgarian benchmark table alongside it (Llama reading-comp
  **22.35** vs Gemini **65.83** / GPT-5.4-mini **70.53**). The swap should
  move the `bg_generation_flags` production rate measurably down — record
  the before/after, don't assume it from the rank.
- **Register:** read the outputs for tone. The bar is coherent, idiomatic
  Bulgarian, correct пълен/кратък член and agreement, no invented words,
  no script drift.
- **Sentinel compliance — this matters most, and is the easiest to
  regress.** The prompts require the model to wrap every planet mention as
  `[planet:KEY]Българско_Наименование[/planet]` (see
  `lib/oracle/prompts.ts:78-85`) **and** to state exact degrees (e.g.
  "Слънце на 15 градуса Лъв"). A new model may follow this instruction
  less reliably. Check: (a) every planet mention is wrapped, (b) no
  sentinels on "Асцендент" / "MC" / house numbers / aspect names, (c)
  degrees are present and correct. Note the render split — **mobile
  renders sentinel chunks in colour** (`apps/mobile/lib/oracle/renderSentinelChunks.tsx`),
  **web's Oracle strips them** (`ReadingStream.tsx` → `stripSentinels`);
  web's Днес *does* colour them (`HoroscopeStream.tsx`). Malformed
  sentinels look fine on web-Oracle and broken on mobile — test against
  mobile, or at minimum parse the raw output.

## 4. Two things you may not know

- **All Bulgarian text goes through a lint gate.** `pnpm run check:all`
  runs `check:bg-strings` (static non-word scan), `check:copy-lock`
  (`scripts/i18n/check-copy-lock.mjs` — a locked snapshot of every
  user-facing Bulgarian string; if you add or change copy you must run
  `pnpm run i18n:update-copy-lock` and commit the regenerated lock), and
  `check:bg-lint-baseline` (a ratcheting baseline count — new Cyrillic
  lint hits fail CI). A recommendations engine that ships editorial copy
  will hit all three. Budget for the copy-lock regen in every commit that
  touches strings.
- **`crystal_listings` and `crystal_vendors` are empty in production** —
  0 rows each, re-checked 2026-08-26 (`COMPLETION-TRACKER.md` §0 Tier 3
  #19). This is a content/business-development gap, not a code defect; it
  may be exactly what the recommendations / data-sourcing work is meant
  to fill. Confirm with the founder whether populating those tables is in
  your scope or separate.

## 5. Paywall — your `/pricing` redesign has a spec now

Under the 2026-08-28 visual-parity ruling
(`COMPLETION-TRACKER.md` §3, Batch 8), the mobile paywall is being
designed from scratch against `DESIGN-LANGUAGE-REFERENCE.md`, without
opening web's `/pricing`. `DESIGN-RESEARCH-2026-08-27.md` flagged
`/pricing` and `you/premium.tsx` as the two surfaces carrying every
vibe-coded tell (pills, gradient orbs, shimmer CTA, diamond bullets,
Cinzel-on-Cyrillic, Roman numerals).

**The mobile paywall mockup, once approved, is the design spec your
`/pricing` rebuild follows** — do not design `/pricing` independently, or
we end up with two paywalls that don't match. Wait for the mobile mockup;
it comes first in Batch 8. Settings and Auth are *exempt* from visual
parity (Clerk hosted UI) — `/pricing` is not.
