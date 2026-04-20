# §9 Context Handoff

**Created:** 2026-04-20

**Reason for handoff:** Thread length after §8.0 + ephemeris pivot + §9.0 planning rounds. Breaking at the §9.0/§9.1 boundary before investigation depth compounds context pressure. Planned per §9.0 plan doc's handoff protocol.

**Previous thread state:** Clean. §9.0 shipped (SHA f8ef762), branch mobile-parallel-test, typecheck green.

**Entry point for fresh thread:** §9.1 — reference-data sourcing, test-case selection, one end-to-end comparison for user review before batch runs.

---

## What's shipped in the current branch state

**§7 (closed):** Three UI bugs in the natal chart aspects panel (tab clipping regression-framing, northNode translation leak, background planet bleed-through) resolved across eight commits. Four adjacent findings from Bug 2's repro also shipped (stacked validation errors, evening-range label fix, julian-day defense-in-depth comment, BirthDataWizard error-detail discard filed as M5 predecessor). §7 closed at commit 1bc6742.

**§8.0 (closed, workstream paused):** Two planning docs shipped at commit 230317b:

- `.planning/research/DIARY_PRODUCT_DECISIONS.md` — six decisions from audit (A-F) + three implementation decisions (localStorage abandonment, cycle-based variant rotation, skill-generated authoring with verification gate).
- `.planning/phases/08-diary-persistence/00-PLAN.md` — 9 sub-rounds for server-persistence migration workstream.

§8 workstream paused after §8.0. Plan doc has Status: PAUSED and Pause rationale section explaining why. All §8.1-§8.9 scope preserved verbatim. Will resume after §9 closes.

**§9.0 (closed, current workstream opening):** Three doc edits at commit f8ef762:

- `.planning/phases/08-diary-persistence/00-PLAN.md` — pause status markers.
- `.planning/PRE_LAUNCH_PREREQS.md` — ephemeris moved to [in progress], diary moved to [deferred post-ephemeris], status-change log entry, new [deferred post-ephemeris] tag in legend.
- `.planning/phases/09-ephemeris-validation/00-PLAN.md` — new workstream plan with six sub-rounds, test-case candidate set, proposed precision thresholds, risk register, context-handoff protocol.

---

## Durable context the fresh thread should read before starting §9.1

Read these files in this order:

1. `.planning/phases/09-ephemeris-validation/00-PLAN.md` — the workstream's north star. Defines scope, sub-round structure, test-case candidates, precision thresholds, risks.
2. `.planning/PRE_LAUNCH_PREREQS.md` — the full pre-launch readiness list. Contextualizes why ephemeris validation matters and what comes after.
3. `.planning/research/feedback_epistemic_tagging.md` — the epistemic-tagging discipline. [verified] / [inferred] / [planned] / [assumed] / [open] / [blocker] applied consistently throughout planning docs. Sub-claims inherit parent tag only at same epistemic level. Keep applying this.
4. `.planning/research/DIARY_AUDIT.md` and `DIARY_PRODUCT_DECISIONS.md` — context for what's paused. Not needed to start §9.1, but useful background if questions about §8 come up.

Optional deeper context (only if something surfaces that requires it):

- `.planning/research/DRIZZLE_DECISION.md` — reversal trail from the Drizzle removal work. Same reversal-documentation discipline applies to any ephemeris decisions that get reversed.
- `.planning/research/AI_PROVIDER_DECISION.md` — another reversal trail, same pattern.
- `.planning/research/SCHEMA_DRIFT_AUDIT.md` — outcome of the Bug-1 schema audit, shows the audit-then-decide pattern.

---

## Disciplines established in this thread that must carry over

1. **Epistemic tagging on all claims.** Every statement in planning docs and investigation reports tagged as [verified]/[inferred]/[planned]/[assumed]/[open]/[blocker]. Sub-claims inherit parent tag only when same epistemic level. Test: "would this still be true if parent tag were removed?"
2. **Classify before fix.** Investigate, report findings, wait for user sign-off, then fix. Don't jump to fixes based on plain-language reports.
3. **Extend-don't-substitute.** When given a list of test inputs to use, add more if useful, but don't silently substitute. Flag additions explicitly.
4. **Verify before document.** User's memory of .env or other live state is not ground truth. Verify by reading code/DB/config before writing docs that claim reality.
5. **Investigation-before-implementation on reversals.** When asked to reverse a previous decision, verify with evidence before accepting the reversal. User's current framing might not match prior reasoning.
6. **Reversal trails preserved.** When a planning decision is reversed, update the relevant doc with a dated reversal note explaining the reasoning. Don't silently rewrite.
7. **Bulgarian copy approval cadence.** Draft → user reviews → approve or iterate → ship. One sample before batching. Same cadence applied to ERR-BD-NNN, noon-chart disclaimer, terminology audit. Will apply to any user-facing Bulgarian copy that surfaces in §9 (unlikely but possible if validation errors need UI surfacing).
8. **Disambiguation before repro for UI bugs.** Screenshots > verbal descriptions. This rule is §7-specific but carries over if any UI surfaces come up during §9.
9. **Sparring-partner mode.** User preferences explicit: blunt, critical, find weak spots, don't default to agreeing, verify uncertain claims with web search. This is not optional, applies throughout.

---

## What §9.1 will do

From the §9 plan doc:

1. **Test-case selection.** Claude Code proposes the test-case list (4 famous figures + 7 synthetic edge cases from the §9.0 plan, or refinements), user approves.
2. **Reference-data sourcing.** JPL Horizons via API for planetary positions. astro.com for full natal chart comparison — may require manual transcription since astro.com doesn't have an obvious public API.
3. **Precision thresholds.** User approves proposed 1 arc-minute threshold across longitudes/houses/aspects, or adjusts.
4. **Harness scaffold.** Build a comparison harness that can run one test case end-to-end and surface the output for user review.
5. **Sample run.** One test case through the harness, compared against reference data, surface the output for user review. If the sample shape is right, §9.2 opens for batch runs.

**Deliverable from §9.1:** user-approved test-case list, user-approved precision thresholds, working harness, one end-to-end sample comparison output for review. No bug fixes in §9.1 — validation only.

---

## Open questions for the fresh thread to resolve with user

None at the moment. §9.0 plan captured all pre-decision questions. §9.1 opens cleanly with a proposal-then-approve pattern for test cases, reference data, and thresholds.

If questions surface during reference-data sourcing (e.g., astro.com transcription is painful, JPL Horizons API behaves unexpectedly, swisseph-wasm output format differs from what's expected), surface them to the user before proceeding.

---

## Branch state and tempo

- Branch: mobile-parallel-test
- Last commit: f8ef762 (§9.0 planning docs)
- Typecheck: clean
- No uncommitted local state (per Claude Code's §9.0 ship report)
- Push cadence: every commit to mobile-parallel-test, no merges to develop, per user's standing instruction
- Anthropic user-preferences applied: sparring-partner mode, critical analysis, uncertainty-acknowledged, web-search for verification

---

## User's standing preferences (for fresh thread to inherit)

- Solo founder of Celestia, Bulgarian-audience astrology product.
- Works with two Claude instances: one for planning/review (the one reading this), one for actual coding (Claude Code in terminal). Review instance drafts messages for user to paste to Claude Code.
- Native Bulgarian speaker; user has final authority on any Bulgarian copy.
- Uses Option B data-fetching architecture (business logic in packages/core/, Server Components import directly, route handlers thin-wrap for HTTP consumers, Zod schemas as contract).
- Epistemic discipline, reversal trails, investigation-before-fix patterns all established and wanted continued.

---

## Ready for fresh thread

When user opens a fresh thread, they should include this doc's path in their opening message. A reasonable bootstrap message:

> "Resuming Celestia pre-launch work. Read `.planning/phases/09-ephemeris-validation/CONTEXT_HANDOFF.md` and the docs it references. Continue from §9.1 — test-case selection, reference-data sourcing, sample harness comparison for my review. Same discipline as the prior thread: epistemic tags, classify-before-fix, verify-before-document, Bulgarian-copy approval cadence, sparring-partner mode."
