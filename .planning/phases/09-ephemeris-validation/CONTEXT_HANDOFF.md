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

> **Note on `feedback_epistemic_tagging.md` path:** the file is not in `.planning/research/` — it lives in the user's cross-session memory system at `~/.claude/projects/<project>/memory/feedback_epistemic_tagging.md`. The path in the reading list above points to where the fresh thread might expect it; the verbatim content is embedded below regardless of its real location. If the fresh thread has access to the memory system, it will see this content surface automatically.

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

---
---

# Embedded documents — verbatim copies of the files referenced above

The sections below are verbatim copies (as of 2026-04-20) of the Markdown files referenced in the "Durable context" list above. A fresh thread with only this handoff doc in hand has the full context needed to bootstrap without repo access. If the repo is accessible, prefer reading the original files — they stay current; the embeds below are a point-in-time snapshot.

Each embedded file is delimited by a `## Embedded: <path>` heading and a trailing horizontal rule. Heading levels inside embedded content are preserved from the source (so a source `# Title` renders as an H1 inside the embed section — semantically a bit loose, verbatim-faithful by design).

---

## Embedded: `.planning/phases/09-ephemeris-validation/00-PLAN.md`

# §9 Ephemeris Validation Workstream — Plan

**Opened:** 2026-04-20 (§9.0)
**Status:** planning-only; no code written yet.
**Source decisions:** this conversation's sequencing pivot (2026-04-20); `PRE_LAUNCH_PREREQS.md` item 6 (`[in progress]` post-pivot); `PRE_LAUNCH_PREREQS.md` status-change log.
**Related paused workstream:** `.planning/phases/08-diary-persistence/00-PLAN.md` — resumes when §9 closes.
**Rough estimate:** 6 sub-round baseline (§9.0 plan → §9.6 CI promotion) + N additional rounds for §9.5 discrepancy fixes. Total 6-10 elapsed rounds depending on what §9.2-§9.4 surface.

**Epistemic tags used throughout this doc:**
- `[user-decision]` — authority is the user's direct call.
- `[verified]` — traceable in source, in a referenced artefact, or via executed tool output.
- `[inferred]` — reasoning from planning context; not directly observed.
- `[reference-dependent]` — relies on third-party reference data (JPL Horizons, astro.com); quality of the conclusion depends on that reference's accuracy.

---

## Workstream overview

The audit that opened round 1 of this project flagged a blunt truth: *"if the astrology math is wrong, the whole product is wrong."* `PRE_LAUNCH_PREREQS.md` item 6 has tracked this as a pre-launch gate since the prerequisites doc was created, but no validation code has ever been written. `@celestia/astrology` is built on `swisseph-wasm`, which wraps the Swiss Ephemeris — a library trusted by the professional astrology software industry for decades. That trust is **reputational**, not empirical in this codebase.

This workstream closes the gap. The outcome is binary-ish:
1. **Math verified correct** — ship with confidence. Permanent golden-file test suite catches future regressions.
2. **Discrepancies found** — diagnose, fix, retest. Additional rounds (§9.5) scoped by what the investigation surfaces.

This is a **validation workstream, not a fix workstream.** The baseline plan (§9.0-§9.4 + §9.6) assumes the math is correct. §9.5 is reserved for fixes contingent on findings. If every test case passes in §9.2-§9.4, §9.5 is a zero-round sub-round.

## Scope bounds

**In scope for §9:**
- Validation of `@celestia/astrology` outputs for planetary longitudes, house cusps, and aspect calculations.
- Reference data from both **JPL Horizons** (raw astronomical positions, API-accessible) and **astro.com** (full natal chart comparison including houses and aspects).
- Synthetic test cases and famous-figure test cases only — **no user data, no founder's own birth data**. `[user-decision]` — privacy-preserving approach.
- Precision-threshold definition for each comparison class (planetary longitude, house cusps, aspect orbs), user-approved in §9.1 before §9.2 runs.
- Permanent golden-file test suite that runs on every future change to the astrology engine (§9.6 wires into CI).
- Diagnosis and fix of any discrepancies found (§9.5, scope contingent on §9.2-§9.4 findings).

**Out of scope for §9:**
- Any astrology-engine changes not caused by validation findings. If the audit passes clean, no refactoring happens here.
- Mobile parity for the astrology engine (M5 concern).
- Performance optimization of astrology calculations (orthogonal workstream if needed).
- Adding new astrological features (asteroids, fixed stars, additional house systems beyond Placidus, progressions, solar arcs). Validation is scoped to what the engine already does.
- Changes to the user-facing chart UI. §9 validates math; UI presentation is §8 and later rounds.

---

## Sub-round structure

| # | Round | Goal | Scope | Rough size |
|---|---|---|---|---|
| §9.0 | planning | This plan doc + the three pivot edits | 3 file changes | 1 round (this) |
| §9.1 | reference-data sourcing + harness setup | Pick test cases, source reference data, build comparison harness scaffold, user sign-off on test-case list + precision thresholds | Harness + 1-case proof-of-comparison | 1-2 rounds |
| §9.2 | planetary longitude validation | Run all test cases through planet-position calc, compare against JPL Horizons, report discrepancies | Per-planet-per-case comparison report | 1 round |
| §9.3 | house cusp validation | Run all test cases through house calc, compare against astro.com (JPL doesn't do houses), watch for polar-circle edge cases | Per-house-per-case comparison report | 1 round |
| §9.4 | aspect calculation validation | Run aspect-pair calcs, compare against astro.com, verify orb + type + applying/separating | Per-aspect comparison report | 1 round |
| §9.5 | fix any discrepancies surfaced in §9.2-§9.4 | Scope unknown until §9.2-§9.4 close; could be 0 rounds if everything passes | Fix rounds per bug, atomic commits | 0-N rounds |
| §9.6 | promote harness to permanent golden-file test suite | Wire into CI so future astrology-engine changes auto-run against reference data; document precision thresholds + reference-data update protocol | CI config + doc | 1 round |

**Baseline total:** 6 sub-rounds.
**With discrepancies:** 6 + N sub-rounds.
**`[inferred]` elapsed rounds:** 6-10 total, depending on §9.5 scope.

Dependencies between sub-rounds: §9.1 blocks everything downstream (harness must exist before validation runs). §9.2 / §9.3 / §9.4 are independent of each other — could run in parallel but sequential is easier to review. §9.5 waits on whatever §9.2/§9.3/§9.4 surface. §9.6 is last; it assumes the comparison harness is production-ready and all findings are resolved.

---

## Sub-round details

### §9.1 — Reference-data sourcing + harness setup

**Goal:** Pick the test-case set, acquire reference data for all cases, build the comparison harness scaffold, prove one test case end-to-end so the user can sign off on the full list before §9.2 runs.

**Scope:**

**Test-case selection (initial candidate set — user approves or adjusts in §9.1):**

Famous figures with published charts:
- **Albert Einstein** — 14 March 1879, 11:30 LMT, Ulm, Germany. Widely published chart, solid reference data across multiple astrology reference sources.
- **Carl Jung** — 26 July 1875, ~19:26, Kesswil, Switzerland. Classical astrology literature references him often.
- **Queen Elizabeth II** — 21 April 1926, 02:40 GMT, London. High-profile, multiple charts available for cross-reference.
- **Martin Luther King Jr.** — 15 January 1929, 12:00 CST, Atlanta. Noon-local case (exact time disputed); tests the unknown-time `DEFAULT_UNKNOWN_TIME` pathway.

Synthetic edge cases:
- **Noon UTC at 0°N 0°E** on a known date. Simplest possible case, catches basic coordinate-system errors.
- **Birth at Arctic Circle** (e.g., 70°N) on a date during polar night. Tests house-system edge cases — Placidus breaks above the polar circle.
- **Birth at southern hemisphere** (e.g., 34°S Santiago, Chile). Tests hemisphere-symmetric math.
- **Birth on New Year's Eve crossing midnight at a timezone boundary.** Tests UTC/local conversion.
- **Birth during leap day (February 29).** Tests calendar edge cases.
- **Birth in year 1600.** Tests historical date handling pre-Julian-Gregorian transition boundary (if applicable — verify in §9.1 which calendar the engine defaults to for this era).
- **Birth in year 2200.** Tests future-date handling (Swiss Ephemeris Moshier file range covers this easily, but confirmation is the point).

Target: **10-20 test cases total.** Real number settles in §9.1 based on reference-data availability and user preference. `[user-decision]` — don't lock the count prematurely.

**Reference-data sourcing:**
- **JPL Horizons** — planetary positions via the Horizons API (`https://ssd.jpl.nasa.gov/api/horizons.api`). Returns ecliptic longitudes for requested bodies at requested instants. Format parsing required; harness writes a small adapter. `[reference-dependent]` accuracy.
- **astro.com** — full natal charts including houses and aspects. Likely **no public API**; reference data may require manual scraping from the free natal-chart form or transcription from account-backed outputs. `[runtime-check-needed]` until §9.1 actually attempts retrieval. If manual transcription is required, budget additional time in §9.1.
- **Cross-reference** where possible. Famous-figure charts can have published errors of their own; treat single-source claims skeptically. Where JPL and astro.com both cover a data point (planetary longitudes), agreement between them strengthens confidence.

**Precision-threshold proposal (user-approves in §9.1):**
- **Planetary longitudes:** within **1 arc-minute** (≈ 0.0167°) compared to JPL Horizons. Justification: Celestia's UI displays positions to degrees or degrees-minutes, so precision below arc-minute doesn't affect user-visible output.
- **House cusps:** within **1 arc-minute** compared to astro.com.
- **Aspects:** correct aspect type (conjunction/square/trine/sextile/opposition), orb within **1 arc-minute** of reference, correct applying/separating classification.
- Any tighter thresholds for internal calculations that feed derived outputs (e.g., aspect orbs depend on longitude precision, so a 1-arc-minute longitude threshold and 1-arc-minute aspect-orb threshold aren't independent) to be flagged in §9.1 and user-approved.

**Harness scaffold:**
- New directory: `packages/astrology/validation/` (or similar — decided in §9.1). Contains:
  - Test-case fixtures (one per case, YAML or TS constants).
  - Reference-data files (committed alongside — reproducible over time).
  - Comparison runner (loads fixtures, runs `calculateNatalChart`, compares against reference).
  - Threshold config (centralized, so §9.2-§9.4 read from one source of truth).
- Harness must produce human-readable comparison output (case-by-case, planet-by-planet or house-by-house) that the user can review without running the code themselves.

**Exit criteria:**
- Test-case list user-approved.
- Precision thresholds user-approved.
- Harness runs one test case end-to-end (e.g., Einstein's chart) and surfaces a comparison report for user review.
- User signs off: "proceed to §9.2."

**Artefact:** `.planning/phases/09-ephemeris-validation/09-01-HARNESS.md` documenting the harness architecture, reference-data sources, and user-approved thresholds.

---

### §9.2 — Planetary longitude validation

**Goal:** Run every approved test case through `@celestia/astrology`'s planet-position calculations. Compare ecliptic longitudes against JPL Horizons data. Report all discrepancies.

**Scope:**
- For each test case × each of the 10 classical planets + northNode, compute Celestia's longitude and the JPL reference, compute the delta in arc-minutes, flag any delta exceeding the threshold.
- Report per-planet: max discrepancy across cases, mean, median. Flags outlier cases (e.g., if Pluto is off by 5 arc-minutes only in the 1600 case, that's a date-range issue with that planet).
- User reviews report before any fix work. No fixes in §9.2 itself — findings only.

**Exit criteria:** comparison report committed; user has reviewed; decision on "clean pass → proceed to §9.3" vs. "discrepancies found → queue for §9.5" recorded.

**Artefact:** `.planning/phases/09-ephemeris-validation/09-02-LONGITUDE-REPORT.md`.

---

### §9.3 — House cusp validation

**Goal:** Run every test case through the house-calculation code (`sweph.houses` with Placidus). Compare the 12 cusp longitudes, Ascendant, and MC against astro.com. Watch for polar-circle cases where Placidus is mathematically undefined — the engine should either skip house calculation or return a defined-behaviour fallback; either is acceptable, but the behaviour must be deterministic and documented.

**Scope:**
- For each test case, compute Celestia's 12 house cusps + ASC + MC, compare against astro.com reference, flag discrepancies exceeding threshold.
- Polar-circle edge cases (Arctic Circle test case from §9.1) get special attention — the expected behaviour is defined by the code under test, not by reference data (astro.com may itself return nothing or a warning for these latitudes).
- Report per-cusp discrepancies; high-latitude cases reported separately.

**Exit criteria:** report committed; user has reviewed; clean-pass-or-discrepancy decision recorded.

**Artefact:** `.planning/phases/09-ephemeris-validation/09-03-HOUSES-REPORT.md`.

---

### §9.4 — Aspect calculation validation

**Goal:** Run aspect-pair calculations for every test case. Compare aspect type, orb, and applying/separating classification against astro.com.

**Scope:**
- For each test case, compute Celestia's aspect list via `calculateAspects` (`packages/astrology/src/utils/aspects.ts`). Compare against astro.com's aspect table for the same chart.
- Verify three dimensions per aspect:
  1. **Aspect type** — correct identification (conjunction, sextile, square, trine, opposition).
  2. **Orb** — absolute difference in degrees within threshold.
  3. **Applying/separating** — correct classification. `[verified]` the engine computes this via speed comparison; verify the semantic matches astro.com's convention.
- Report per-aspect comparisons; flag any aspect present in Celestia's output but absent in astro.com's (or vice versa).

**Exit criteria:** report committed; user has reviewed; clean-pass-or-discrepancy decision recorded.

**Artefact:** `.planning/phases/09-ephemeris-validation/09-04-ASPECTS-REPORT.md`.

---

### §9.5 — Fix any surfaced discrepancies

**Goal:** Resolve every discrepancy queued from §9.2-§9.4.

**Scope:** unknown until findings land. Could be:
- **Zero rounds** if everything passes cleanly.
- **One round** per localized bug (e.g., a flag bit wrong in `sweph.calc_ut` parameters, an off-by-one in coordinate rotation).
- **Multi-round workstream** if the findings reveal a systemic issue (wrong coordinate system, wrong ephemeris data loaded, timezone logic broken across a boundary).

Each fix lands as its own commit with a reference to the specific discrepancy in the relevant §9.X report.

**Exit criteria:** all discrepancies from §9.2-§9.4 either fixed and re-verified, OR explicitly accepted as "within tolerance" with user sign-off and rationale captured.

---

### §9.6 — Promote harness to permanent golden-file test suite

**Goal:** The comparison harness becomes a CI-enforced test suite. Future changes to `@celestia/astrology` run against reference data automatically; regressions fail CI.

**Scope:**
- Wire the harness into the existing test infrastructure (Vitest per `packages/astrology/`). Test cases become fixtures; reference data lives in-repo for reproducibility.
- Threshold config lives in a single file — updating thresholds is a deliberate act, not scattered across tests.
- Document the reference-data update protocol: JPL Horizons values don't drift for past dates (astronomical reality is stable), but astro.com could change its algorithms; re-fetch protocol + when to update reference data.
- CI config addition to run these tests on every PR touching `packages/astrology/**`.
- README snippet in `packages/astrology/` explaining the validation layer.

**Exit criteria:** CI green on `mobile-parallel-test` with the golden-file suite running; documentation committed; §9 marked complete.

**Artefact:** `.planning/phases/09-ephemeris-validation/09-06-CI-INTEGRATION.md`.

---

## Risk register

- **`[reference-dependent]` Reference-data availability.** JPL Horizons API is stable but response-format parsing is non-trivial. astro.com may not have a public API; reference data for selected charts may need manual scraping or transcription. If manual effort is required, §9.1 absorbs the time rather than letting it bleed into §9.3. `[runtime-check-needed]` until §9.1 actually attempts retrieval.
- **`[inferred]` Discovery risk in §9.5.** If §9.2-§9.4 surface deep bugs (wrong coordinate system, wrong ephemeris data files loaded, timezone bugs crossing boundary years), fixing them could take longer than the entire baseline workstream. **Accept this risk.** If the math is wrong, fixing it is the work that launch requires — there's no alternative to "do the audit properly." The workstream sequencing pivot in `PRE_LAUNCH_PREREQS.md` is predicated on exactly this possibility.
- **`[inferred]` `swisseph-wasm` vs. native `swisseph` divergence.** The wasm wrapper may have subtle differences from native Swiss Ephemeris output (e.g., precision truncation, different default flags). If discrepancies surface and wasm-vs-native is the cause, a deeper library decision emerges. **Flag for user decision if this happens** — don't silently swap libraries.
- **`[reference-dependent]` Test-case selection bias.** Famous-figure charts may have published errors themselves — astrology literature is not always rigorous about source data. Cross-reference multiple sources where possible; treat single-source claims skeptically.
- **`[user-decision]` Precision threshold calibration.** Thresholds are a product/UX call, not purely technical. Too tight and the harness chases numerical noise; too loose and real errors slip through. User approves thresholds in §9.1 *after seeing sample comparison output* so the choice is informed by real delta magnitudes rather than a priori intuition.
- **`[inferred]` astro.com algorithmic stability.** Unlike JPL Horizons (which reflects astronomical reality), astro.com uses its own computation pipeline. If astro.com updates its algorithms, reference data could drift from a previously-validated state. §9.6's CI integration needs a reference-data update protocol to handle this.

---

## Context-handoff protocol

This workstream may span 6-10 elapsed rounds. If thread context saturates mid-workstream, break to a fresh thread deliberately rather than reacting to degradation.

**Break signals** (mirrors §8.0's list):
- Responses start missing scope items explicit in earlier rounds.
- User notices repeated re-explanation of decisions already captured in the plan.
- Claude Code second-guesses patterns that are durable-by-now (e.g., report-then-fix sequencing).
- Context-management competing with work-quality for attention.

**Break protocol:**
1. Create `.planning/phases/09-ephemeris-validation/CONTEXT_HANDOFF.md` summarizing:
   - Sub-rounds completed (SHAs + one-line summaries).
   - User-approved thresholds + test-case list (from §9.1).
   - Reference data status per source (retrieved, pending, blocked).
   - Reports committed so far (`09-02-LONGITUDE-REPORT.md`, etc.).
   - Outstanding discrepancies queued for §9.5 (with severity and current understanding).
   - Last known good state (typecheck clean at SHA X).
2. Commit the handoff doc.
3. Fresh thread bootstraps from three files:
   - `.planning/phases/09-ephemeris-validation/00-PLAN.md` (this doc).
   - Whatever report docs have been committed (`09-01-HARNESS.md`, `09-02-LONGITUDE-REPORT.md`, etc.).
   - `.planning/phases/09-ephemeris-validation/CONTEXT_HANDOFF.md` (if created).
4. Continue from the next sub-round or next queued discrepancy.

Break at sub-round boundaries, not mid-commit.

---

## Relationship to paused §8

§8 (diary persistence) paused after §8.0 pending §9 completion. See `.planning/phases/08-diary-persistence/00-PLAN.md` header status + Pause rationale section. All §8.1-§8.9 content is preserved; sub-round structure intact; decisions in `.planning/research/DIARY_PRODUCT_DECISIONS.md` stay durable regardless of pause length.

**§8 resumes at §8.1 when:**
- §9 closes (all sub-rounds through §9.6 complete, or explicit "§9 close with accepted residual" sign-off).
- User confirms "re-open §8."

The re-open confirmation is explicit, not automatic — the user may want to reassess §8 scope after §9 results land (e.g., if §9 reveals a systemic issue that shifts priorities further).

---

## Closing

§9.0 is exactly three doc changes: this plan, the §8 plan pause note, and the `PRE_LAUNCH_PREREQS.md` status updates. No code changes. After user review, §9.1 opens for reference-data sourcing and test-case selection.

The workstream answers one question: *is the astrology math correct?* The answer is either "yes, locked in with CI" or "no, here's the discrepancy, here's the fix." Either answer is better than the current state of "assumed correct, never measured."

---

## Embedded: `.planning/PRE_LAUNCH_PREREQS.md`

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

---

## Embedded: `feedback_epistemic_tagging.md` (user memory file)

> Verbatim content of the user memory file `~/.claude/projects/<project>/memory/feedback_epistemic_tagging.md`. This file is not in the repo; it lives in the cross-session memory system. Embedding here so a fresh thread without memory-system access still inherits the discipline.

---
name: Tag epistemic status in stack/planning docs
description: When writing stack/status/planning docs, tag every claim with [verified]/[inferred]/[planned]/[assumed]; label numbers from internal docs as SLO vs architecture target vs placeholder
type: feedback
originSessionId: bede6d97-cf29-484b-929f-ca975dfe0206
---
When producing stack summaries, status reports, or planning documents, tag **every item** with its epistemic status. Don't write declarative prose that mixes tiers:

- **[verified]** — read directly from a file in this codebase during this session
- **[inferred]** — reasonable deduction from files I've read (e.g., "X uses Y because X imports Y")
- **[planned]** — future work not yet implemented; intentions from planning docs
- **[assumed]** — anything else (conventional wisdom, training-data priors, guesses)
- **[open]** — question not yet answered, action required before the claim can be tagged otherwise

**Sub-claim rule (added 2026-04-18):** A sub-bullet or sub-claim inherits its parent section's tag *only if* it makes the same kind of claim at the same epistemic level. If the sub-claim makes a different, stronger, or weaker claim, it needs its own tag.

Concrete test: "Would this sub-claim still be true if the parent's tag were removed?" If yes, it's a distinct claim — tag it. If no, inheritance is fine.

Failure case (2026-04-18, `LOAD_TEST_PLAN.md §4`): parent was `[verified — per Celestia_AI_Reference.md §3 and §5]`. Sub-claim stated Oracle FAB caps as "Free tier 3 queries/month, Premium tier 20 queries/day." Those caps came from `MOBILE_UX_RESEARCH.md §11.7` as *proposals*, not from the reference doc. They were `[planned]`, not `[verified]`. Silent inheritance of the parent's `[verified]` made a proposal read as a confirmed fact.

**Why:** On 2026-04-18 I wrote a "current stack" summary in flat declarative voice that mixed all four tiers. It claimed Solito shares API routes (false — Solito shares navigation/screens only), referenced "dhttp" as a webhook tool (doesn't exist — real tools are webhook.site, Hookdeck, Svix Play, ngrok, Cloudflare Tunnel), and treated "500 concurrent" from `Celestia_AI_Reference.md §3` as a fact when it was actually an architecture target. Mixing planned additions with current reality made hallucinations indistinguishable from facts.

**Also when citing numbers from internal docs** (e.g., "500 concurrent per X.md"), label the number: is it a measured SLO, an architecture target, or a placeholder? Don't treat numbers in planning docs as facts just because they're written down.

**How to apply:**
- In-chat replies that summarize the stack or status: tag every bullet
- Planning markdown files I author or edit: tag every claim
- Quick asides and single-sentence mentions: tag inline if the claim is load-bearing, skip if trivially verifiable (e.g., "file X exists" after a Read)

**Specific factual corrections from the 2026-04-18 session:**
- Solito = navigation + screen components between Next.js and React Native. Not API routes. API-route sharing with mobile is just HTTP. Cross-surface contract sharing uses Zod schemas or tRPC/oRPC — not Solito.
- Load-testing an LLM streaming endpoint requires custom k6 metrics for time-to-first-token (TTFT) and inter-token latency as separate measurements; default `http_req_duration` collapses TTFT and generation into one useless number. Test cold-cache and warm-cache separately. Mock the upstream before hitting real BgGPT — otherwise the test measures INSAIT's infra, not ours.

---

## Embedded: `.planning/research/DIARY_AUDIT.md`

# Diary Feature End-to-End Audit

**Written:** 2026-04-20
**Scope:** Full audit of the lunar diary feature across routes, components, data model, prompt library, and premium-gate status. Opened at the start of §8 as a read-only investigation before any product-direction decisions.
**Epistemic tags:** `[verified]` — read from source; `[inferred]` — deduced from code but not directly executed; `[missing]` — explicitly not present in code; `[runtime-check-needed]` — cannot determine from static reading alone.

> **Audit method `[verified]`:** Grep + Glob + direct file reads across `apps/web/app/(protected)/rhythm/`, `apps/web/components/manifest/`, `apps/web/hooks/useManifestEntries.ts`, `apps/web/lib/manifest/`, `apps/web/lib/moon-phase.ts`, middleware, PREMIUM_MATRIX.md, next.config.js. Entry point: every file matched by `grep -rn "diary\|journal\|manifest\|useManifestEntries"` under `apps/web/`.

---

## 1. Routes & surfaces

### 1.1 Live routes `[verified]`

| Route | Page file | What renders |
|---|---|---|
| `/rhythm/journal` | `apps/web/app/(protected)/rhythm/journal/page.tsx` | **Canonical diary surface.** Directly mounts `<ManifestDiaryContent />`. This is the full diary — prompt, form, history, delete. |
| `/rhythm` | `apps/web/app/(protected)/rhythm/page.tsx` | `<LunarPhaseCard />` (lunar phase + meteor showers + manifesting guidance — not the diary form) + a separate CTA card titled *"Лунен дневник"* with the copy *"Три реда на ден..."* and a button *"Отвори дневника"* linking to `/rhythm/journal`. `<TransitOverviewCard />` below. **Does NOT embed `<ManifestDiaryContent />` inline** — that was removed 2026-04-20 per the inline comment at `rhythm/page.tsx:59-62`. |
| `/you` | `apps/web/app/(protected)/you/page.tsx` + `YouHub.tsx` | Hub page with four rows. Row 2 labelled *"Дневник"* with hint *"лунен дневник — по три реда"* links to `/rhythm/journal` (`YouHub.tsx:8`). |

### 1.2 Navigation and deep-link inventory `[verified]`

| Surface | Link label | Target href | Lands on |
|---|---|---|---|
| Protected nav (ProtectedNav.tsx:17) | "Ритъм" | `/rhythm` | CTA page, not diary |
| Protected nav (ProtectedNav.tsx:18) | "Ти" | `/you` | Hub, not diary |
| Dashboard LunarTile (LunarTile.tsx:51) | Lunar tile | `/rhythm` | CTA page, not diary |
| Dashboard TransitTile | Transit tile | `/rhythm` | CTA page, not diary |
| /rhythm page (rhythm/page.tsx:72) | "Отвори дневника" | `/rhythm/journal` | **Diary** |
| /you YouHub (YouHub.tsx:8) | "Дневник" | `/rhythm/journal` | **Diary** |
| /rhythm/journal footer (ManifestDiaryContent.tsx:169) | "Ръководството" | `/astrology-guide` | Guide, not diary |

**Two distinct entry points land on the diary:** `/you → Дневник → /rhythm/journal` is a direct link; `/rhythm` (from the "Ритъм" nav tab or either dashboard tile) requires one extra click through the *"Отвори дневника"* CTA. This is the likely source of the user's "/you then diary shows different page" UAT finding — not a broken link, but different visual experiences at the first hop.

### 1.3 Historical route state `[verified]`

- `/manifest` and `/manifest/:path*` are registered as 307 temporary redirects to `/rhythm/journal` and `/rhythm/journal/:path*` in `apps/web/next.config.js:29-30`. The old URL still works and cleanly forwards. **No orphan `/manifest` page exists.**
- `/rhythm` previously embedded `<ManifestDiaryContent />` inline — removed 2026-04-20 per the comment at `rhythm/page.tsx:59-62` (the comment is the only authoritative trace; git archaeology confirms the inline mount was replaced with the CTA card in the same round).
- **Stale comment `[verified]`:** `apps/web/components/dashboard/DashboardContent.tsx:247` claims *"Lunar → /rhythm (full lunar card + meteor + transits + diary)"* — the *"+ diary"* tail is comment-rot from before the 2026-04-20 consolidation. `/rhythm` now has a CTA link, not the diary itself. Documentation, not behavior.

### 1.4 Route map

```
 /rhythm/journal   ──────────────────────────►  <ManifestDiaryContent />  (CANONICAL)
                                                      │
                                                      ├─ uses hook:   useManifestEntries
                                                      ├─ mounts:      <ManifestEntryForm />
                                                      ├─ mounts:      <ManifestHistory />
                                                      └─ prompt src:  lib/manifest/prompts.ts

 /rhythm           ──────►  <LunarPhaseCard />       + CTA: "Отвори дневника" → /rhythm/journal
 /you              ──────►  <YouHub />               + link: "Дневник"         → /rhythm/journal
 /dashboard        ──────►  <LunarTile /> + tiles    + link: Lunar tile        → /rhythm   (one hop short of diary)
 /manifest         ──────►  307 redirect             → /rhythm/journal
```

---

## 2. UI components

### 2.1 Component inventory `[verified]`

| File | Role | Reads from | Mounted by |
|---|---|---|---|
| `apps/web/components/manifest/ManifestDiaryContent.tsx` | Top-level diary surface | `useManifestEntries`, `getLunarPhase`, header copy hardcoded in-component | `/rhythm/journal/page.tsx` |
| `apps/web/components/manifest/ManifestEntryForm.tsx` | 3-field textarea form + submit | `getManifestPrompt(phase.id)` from `lib/manifest/prompts.ts` | `ManifestDiaryContent` |
| `apps/web/components/manifest/ManifestHistory.tsx` | Expandable list of past entries with delete-with-confirm | Entries passed as prop (no direct data access) | `ManifestDiaryContent` |
| `apps/web/hooks/useManifestEntries.ts` | localStorage CRUD — read, upsert-by-date, delete | `window.localStorage` key `celestia.manifest.entries.v1` | `ManifestDiaryContent` |
| `apps/web/lib/manifest/prompts.ts` | Prompt library (8 phases × `{ heading, lead, fieldLabels[3], placeholders[3] }`) | Hardcoded Bulgarian copy | `ManifestEntryForm` |
| `apps/web/lib/manifest/types.ts` | `ManifestEntry`, `ManifestDraft` types | — | Hook + components |

### 2.2 Dashboard / adjacent components that touch diary-adjacent content `[verified]`

| File | What it renders | Diary connection |
|---|---|---|
| `apps/web/components/dashboard/LunarPhaseCard.tsx` | Full lunar phase card on `/rhythm` — moon disc, phase name, illumination, manifesting guidance, ritual, affirmation, crystal. Has a field labelled *"Въпрос за дневника"* showing `phase.journalPrompt` (line 164-167). | **Indirect** — shows a single-line journal question sourced from `lib/moon-phase`, NOT from `lib/manifest/prompts`. Two parallel prompt systems (see §4.3). |
| `apps/web/components/dashboard/tiles/LunarTile.tsx` | Compact dashboard bento tile (phase + countdown + meteor). | Links to `/rhythm`, not diary. |
| `apps/web/components/you/YouHub.tsx` | Hub page with 4 section rows | Row 2 links to `/rhythm/journal`. |

### 2.3 Prompt copy locality `[verified]`

- Structured 3-field prompts (one per phase): **single source** in `apps/web/lib/manifest/prompts.ts`. Consumed only by `ManifestEntryForm`. No duplication, no hardcoding in components.
- Heading copy on the diary page (*"Три реда, един цикъл"*, the *"Стара практика, пренаписана..."* lead, the *"Предишни страници"* section label): **hardcoded inline** in `ManifestDiaryContent.tsx:92-101, 142` — not in a content file. That's fine for a single-consumer page but flagged for i18n awareness.

---

## 3. Data model

### 3.1 localStorage persistence `[verified]`

- **Key:** `celestia.manifest.entries.v1` (the `.v1` suffix is versioning — future breaking schema changes can bump to `.v2` without colliding; current code does not read any prior-version key).
- **Value shape:** JSON-encoded `ManifestEntry[]` array.
- **Entry schema** (`lib/manifest/types.ts:10-18`):

```ts
interface ManifestEntry {
  id: string               // "mf_${ISO_timestamp}_${6-char-random}"
  date: string             // "YYYY-MM-DD" local-formatted in Europe/Sofia via isoDate()
  phaseId: LunarPhaseId    // snapshot of phase at time of save
  phaseName: string        // snapshot of Bulgarian phase name at time of save
  intentions: [string, string, string]   // three slots, tuple-typed
  createdAt: string        // ISO timestamp
  updatedAt: string        // ISO timestamp
}
```

- **Identity / upsert key:** the `date` field (`useManifestEntries.ts:51` — `entries.find(e => e.date === input.date)`). One entry per calendar date; same-date save updates existing. The `id` field is not the lookup key — it exists for DOM `key` stability in the history list.
- **Moon phase snapshot `[verified]`:** **YES, preserved at write time.** Entry stores `phaseId` + `phaseName` as the phase was at the moment of save (ManifestDiaryContent.tsx:58-64 → hook saveEntry). If moon-phase calculation ever changes, historical entries keep their original phase labels. Reads do **not** re-compute phase from the entry date.
- **Autosave / drafts:** `[missing]` — explicit submit only; form state lives in component `useState` and is lost on navigation before save (ManifestEntryForm.tsx:23-25).
- **Server-side persistence:** `[missing]` — no Supabase table, no API route. The hook's docstring (line 9-15) explicitly frames itself as *"Backend-swap boundary. Today: localStorage. Tomorrow: Supabase."* — the hook's return shape is designed to swap underlying storage without changing consumer code.
- **Export / backup capability:** `[missing]` — no export UI, no JSON-download, no print view. Clearing browser data → full entry loss. `[runtime-check-needed]` whether browser-level incognito mode also loses entries on session end (expected yes, not verified).

### 3.2 localStorage hygiene observations `[inferred]`

- Quota exceeded → silent catch at `useManifestEntries.ts:38-40` — UI state still updates, disk state diverges from memory. User can write entries that disappear on reload without error feedback.
- Corrupted storage (invalid JSON) → silent catch at line 28-30, resets to empty array. Same silent-failure category.
- No cross-tab sync — writing in one tab doesn't update another tab's state until reload. `[runtime-check-needed]` whether this surfaces as confusion.

---

## 4. Prompt library

### 4.1 Coverage `[verified]`

**All 8 moon phases have complete prompts** in `apps/web/lib/manifest/prompts.ts`. The user's framing-note guess that only one example might exist (Waxing Crescent "Three First Steps") was wrong — the full library is present.

| Phase ID | Heading | Tradition |
|---|---|---|
| `new` | Три намерения | Waxing: sow intentions |
| `waxing_crescent` | Три първи стъпки | Waxing: first steps |
| `first_quarter` | Три решения | Waxing: decisions |
| `waxing_gibbous` | Три настройки | Waxing: adjustments before fullness |
| `full` | Три благодарности | Full: gratitude for the cycle |
| `waning_gibbous` | Три урока | Waning: lessons learned |
| `last_quarter` | Три освобождавания | Waning: release |
| `waning_crescent` | Три акта на грижа | Waning: restoration before new |

Each phase has: a heading (2-3 words), a lead paragraph (1-2 sentences explaining the phase framing), three `fieldLabels` (short action-verb slots), and three `placeholders` (sentence-starters to prime the writer).

### 4.2 Structure / variability `[verified]`

- **Exactly one prompt per phase.** No rotation, no variants, no A/B branches.
- **No cycle-day variability.** Waxing Crescent on day 1 gets the same prompt as Waxing Crescent on day 3.
- **No illumination-%-based variability.** The prompt is keyed purely on `phaseId` (the discrete 8-phase bucket).
- **No calendar-date variability.** Same phase on January 1 and December 31 shows identical copy.
- **Bulgarian copy completeness `[verified]`:** all 8 phases have full copy — no placeholders, no `TODO` strings, no English bleed-through. Register reads consistent with the app's traditional-voice aesthetic (commit `7c7ffa5`).

### 4.3 Adjacent finding: dual prompt systems `[verified]`

Two parallel journaling-prompt surfaces exist and they are **not** linked:

1. **`lib/manifest/prompts.ts`** — structured 3-field diary prompts per phase. Consumed by `ManifestEntryForm` at `/rhythm/journal`. What the user writes against.
2. **`lib/moon-phase` → `phase.journalPrompt`** `[inferred, not directly read]` — a single-line journal question exposed per-phase, rendered at `LunarPhaseCard.tsx:164-167` under the header *"Въпрос за дневника"*. Shown on `/rhythm` inside the expandable lunar-phase card.

Both surface "a thing to write about given the current moon." They are separate systems with separate content. No cross-linking. A future consolidation pass might either merge them or explicitly frame them as different kinds of prompt (the manifest one is a structured exercise, the `journalPrompt` is a reflection cue). Flagged, not fixed.

### 4.4 Minor Bulgarian-copy issue (flagged, not changing per deferral pattern)

- `apps/web/lib/manifest/prompts.ts:8` — doc comment contains the fragment *"pълнолуние"* with a Latin lowercase `p` prefixing Cyrillic *"ълнолуние"*. Internal doc comment, not user-facing, likely encoding/paste drift. Noted for a future Bulgarian-register cleanup pass per the deferral pattern; not in-scope for this audit round.

---

## 5. Premium-gate timing

### 5.1 Code reality `[verified]`

- **Middleware** (`apps/web/middleware.ts:15-25`) lists `/rhythm`, `/rhythm/journal`, `/you` as auth-protected — signed-in users only, but no tier distinction.
- **No `subscription_tier` / `isPremium` / Clerk-role checks** in any of the diary code paths: `ManifestDiaryContent.tsx`, `ManifestEntryForm.tsx`, `ManifestHistory.tsx`, `useManifestEntries.ts`, `app/(protected)/rhythm/journal/page.tsx`, `app/(protected)/rhythm/page.tsx` — all clean. Grep confirmed zero matches.
- **No feature-flag guards** around diary UI.
- **No `<PremiumGate />` wrapper** on the diary surface. (Compare: `/you/crystals` wraps `<CrystalCollectionContent />` in `<PremiumGate />` — that's the expected shape if a gate were present. Diary has none.)

### 5.2 Product intent vs. code `[verified]`

`PREMIUM_MATRIX.md` row 13 audits diary as:

- **Current gate:** "none / any authed user"
- **Correct gate:** "premium — but only after server-side persistence ships (M4/M5 predecessor)"
- **Fix needed:** "deferred" — product decision 3 on that doc (line 70-74) resolved 2026-04-20: *"no UI-only gate now. Cosmetic gates train power users to bypass and are worse than no gate."*

**Code matches intent.** No accidental premium enforcement; no cosmetic premium UI that misleads free users. This line up with round 109's decision.

### 5.3 `[runtime-check-needed]`

One thing I cannot verify from code alone: whether any out-of-band element (dashboard banner, upsell modal, "Premium" badge on a nav item) incidentally implies diary is premium. Grep for `premium` near diary-related files turned up clean, but an upstream-mounted upsell component could still render text that talks about diary as premium. Worth a human eyecheck on `/rhythm/journal` + `/you` + `/pricing` for stray copy that contradicts 3b.

---

## Summary & Open Questions

### Is the feature functionally complete for all 8 phases?

**Yes `[verified]`.** All 8 lunar phases have complete structured prompts in Bulgarian. The form writes, upserts, and deletes entries. Phase is snapshotted per entry. History renders with expand + delete-with-confirm. The `useManifestEntries` hook is explicitly architected as a backend-swap boundary so server-side persistence can slot in without changing the consumer surface.

**The feature is not a skeleton.** It is a complete localStorage-backed implementation with intentional forward architecture for server migration.

### Product decisions now unblocked

1. **Server-side persistence timing.** Architecture is ready (hook docstring lines 9-15, PREMIUM_MATRIX row 13, DATA_FETCHING_INVENTORY §3.3 + §7.2). Decisions needed:
   - When to ship the endpoint (blocks the premium-gate activation per 3b resolution).
   - Schema: Supabase table mirror of `ManifestEntry` interface? Or normalized (entry header + intentions-per-row)?
   - Migration strategy: on first sign-in post-endpoint, sync localStorage → server? Or drop localStorage entries silently?

2. **Prompt variability.** Currently one prompt per phase. Decisions unblocked:
   - Keep one-prompt-per-phase (consistent framing, users know what to expect) — **recommended unless variety is an explicit product goal**.
   - Add variants rotating by cycle day, illumination %, or random selection (more variety but risks feeling random; also fragments the mental model).
   - Neither decision blocks anything — defer until user signal appears.

3. **Historical-phase-snapshot semantics.** Already implemented — entry captures `phaseId`/`phaseName` at save time, read-back uses the snapshot. No decision required unless you want to change the semantic (e.g., show a "recalculated phase" for historical entries if the calculation ever improves). Recommend leaving as-is — snapshot matches how users remember what they wrote under.

4. **"Clicking 'Дневник' from /you vs. navigating via Ритъм tab."** Explained above in §1.2 — not a broken link, but different visual experiences at the first hop. Decisions unblocked:
   - Accept the two-step via Ритъм as intentional (the Ритъм tab is the *"small's-world overview"* surface — phase, transits, diary *entry*); users wanting the diary click once more.
   - OR: add a direct diary tab / shortcut from the dashboard that bypasses `/rhythm`.
   - OR: surface the diary form inline on `/rhythm` itself (reverts the 2026-04-20 consolidation).

5. **Export / backup.** No export exists. Pre-server-migration, a simple "download entries as JSON" button would let a power user preserve data across devices or browsers. Decision: ship before server migration (user-facing backup feature), after server migration (data portability), or skip (trust server sync).

6. **localStorage quota & corruption silent-failure.** Both are caught silently today. Decision: surface a toast/banner on quota-exceeded so users don't think entries are saving when they aren't — or leave silent and trust the quota limit (~5MB = thousands of diary entries).

### Adjacent findings surfaced during audit

1. **Dual prompt systems `[verified]`** (§4.3) — `lib/manifest/prompts.ts` (3-field structured) and `phase.journalPrompt` from `lib/moon-phase` (single-line question shown on LunarPhaseCard). Both thematically overlap. Not a bug; worth confirming they're intentionally separate, or marking them for a future consolidation.

2. **Stale comment** (§1.3) — `DashboardContent.tsx:247` claims *"Lunar → /rhythm (full lunar card + meteor + transits + diary)"*. The *"+ diary"* tail is comment-rot from before the 2026-04-20 consolidation. One-line cleanup, non-blocking.

3. **Silent localStorage failures `[inferred]`** (§3.2) — quota exceeded and corrupted JSON both caught silently. Not diary-specific; also present in `useDailyHoroscope.ts` and `useStoryList.ts` per the grep. Product-level decision on whether client-side storage failures deserve any UI feedback.

4. **No cross-tab sync `[runtime-check-needed]`** (§3.2) — two tabs writing to `celestia.manifest.entries.v1` will overwrite each other on save. Not blocking but worth noting if mobile-web + desktop-web simultaneous use is a scenario.

5. **Bulgarian-register typo in doc comment** (§4.4) — `lib/manifest/prompts.ts:8` — *"pълнолуние"* mixed-alphabet artefact. Internal, not user-facing. Defer per the existing pattern.

6. **localStorage keys inventory `[inferred]`**: the app uses at least three localStorage keys (`celestia.manifest.entries.v1`, the horoscope cache in `useDailyHoroscope.ts`, the story list in `useStoryList.ts`). No centralized inventory of keys or size-budget tracking. Flag for a future localStorage-hygiene pass; not diary-specific.

---

## What's NOT in this audit

Per §8 scope bounds:
- Moon-phase calculation correctness — astrology-engine concern, out of scope.
- Rhythm-feature audit beyond diary — `/rhythm` itself is settled per 2026-04-20 consolidation; not re-litigated.
- Mobile parity — M5 workstream, separate.

These exclusions are intentional; if future findings suggest diary is entangled with one of them, the audit can be extended then.

---

## Embedded: `.planning/research/DIARY_PRODUCT_DECISIONS.md`

# Diary Product Decisions

**Written:** 2026-04-20
**Trigger:** §8.0 opens the diary-persistence workstream. This doc captures every product decision made in the review of `DIARY_AUDIT.md` so future rounds (and future Claude Code sessions) can reconstruct rationale without re-asking.
**Workstream plan:** `.planning/phases/08-diary-persistence/00-PLAN.md`
**Source audit:** `.planning/research/DIARY_AUDIT.md`

**Epistemic tags:**
- `[user-decision]` — direct product call by the user; authority is the user, not the codebase.
- `[verified]` — traceable in code or in the source audit doc.
- `[inferred]` — reasoning from planning context; not directly executed.
- `[skill-dependent]` — relies on the Bulgarian astrology skill's output quality.

---

## Decisions A–F (from audit review)

### Decision A — Server persistence: ship before launch `[user-decision]`

**Context:** The audit (§3.1) confirmed the diary is localStorage-only today. The hook `useManifestEntries` was architected as a backend-swap boundary from the start (docstring at `hooks/useManifestEntries.ts:9-15` explicitly frames it as *"Today: localStorage. Tomorrow: Supabase."*). `PREMIUM_MATRIX.md` row 13 treats server-side persistence as an M4/M5 predecessor gating the diary's premium-gate activation. Question: is server persistence a launch blocker, or can it slip to post-launch?

**Options considered:**
1. **Defer to post-launch.** Ship with localStorage; migrate later. Cheap now, but users lose entries on device change or browser clear, and premium gating stays stalled.
2. **Ship before launch as a full workstream.** Schema + RLS + endpoint + hook swap + export + GDPR. Higher up-front cost; unblocks premium gating and gives users cross-device diary from day one.
3. **Partial — ship server persistence but defer export.** Compromise, but splits the user-facing backup capability from the underlying migration.

**Decision:** option 2 — ship before launch. Full workstream. `[user-decision]`

**Rationale:** The diary is an identity-carrying feature (users write personal intentions over multi-week lunar cycles). Losing that data to a browser-clear event during the first months of use is a retention disaster and a reputational one. Premium gating is also blocked until the enforcement surface exists server-side. Neither problem is negotiable at launch.

**Implementation impact:**
- New Supabase table (§8.2 designs schema).
- New `/api/diary/*` endpoints (§8.4).
- Hook swap (§8.5) — the boundary the hook's docstring already anticipates.
- Export capability (§8.6) ships in the same workstream (per Decision E).
- GDPR deletion (§8.7) ships in the same workstream (required for EU audience).
- Ten-to-fourteen elapsed rounds for the full workstream — real cost, offset by the retention and premium-gating value.

---

### Decision B — Prompt variability: 3+ variants per phase, minimum 24 total `[user-decision]`

**Context:** Audit §4.2 confirmed the prompt library has exactly one prompt per phase (8 total). No rotation, no cycle-day variation, no illumination-% variation. A user writing across multiple lunar cycles sees the same prompt for every Waxing Crescent — plausible to feel repetitive after 2-3 cycles.

**Options considered:**
1. **Keep one-per-phase.** Consistent framing; users know what to expect. Risk: repetition fatigue.
2. **Add variants rotating by cycle day.** Different prompt on day 1 vs day 3 of Waxing Crescent. More variety; larger authoring cost; risks fragmenting the mental model.
3. **Add variants rotating by illumination %.** Finer granularity than cycle day; same authoring cost trade-off.
4. **Add variants selected by per-user entry count for that phase (cycle-based rotation).** User who has written 0 Waxing Crescent entries sees variant 0; 1st entry shows variant 1 on next Waxing Crescent; wraps modulo variant-count.
5. **Random selection.** Cheapest to implement, most variety, no predictability — risks feeling arbitrary.

**Decision:** option 4 — 3+ variants per phase, cycle-based rotation computed from entry count. `[user-decision]`

**Minimum library size: 24 prompts (8 phases × 3 variants). New content needed: 16+ (8 phases × 2 additional variants — existing 8 prompts become variant 0 of their phase).** `[user-decision]`

**Rationale:** Cycle-based per-user rotation (option 4) gives variety *and* predictability. A returning user sees their 2nd Waxing Crescent cycle with a different prompt than their 1st, so the practice feels fresh. But the progression is deterministic — on a given cycle, a given user always sees the same prompt, so shared or recalled prompts don't randomize on them. Three variants per phase is enough to feel varied across 2-3 lunar cycles (roughly 2-3 months) while keeping the authoring budget reasonable. User can extend beyond 3 later if the first rotation feels thin.

Option 5 (random) was rejected because lunar practice intentionally has a rhythm — the prompt should follow the user's journey, not randomize on them. Options 2 and 3 (cycle-day / illumination-%) were rejected because they fragment the mental model within a single phase window (a user on day 2 of Waxing Crescent seeing a different prompt than on day 1 breaks the "this week's work" coherence).

**Implementation impact:**
- §8.8 ships the 16+ new prompts. Authored via the Bulgarian astrology skill (see Implementation Decision 3).
- Variant selection logic: `variantIndex = userEntriesForThisPhase % variantCount`. Entries count, page views do not (Implementation Decision 2).
- `lib/manifest/prompts.ts` schema change: single prompt per phase → array of prompts per phase. Breaking-change migration for the prompt library file; backward-compatible for stored entries (entries snapshot `phaseId` + `phaseName`, not the specific variant used).
- First-variant verification step (§8.8 — see the Bulgarian-skill protocol in 00-PLAN.md).

---

### Decision C — Phase-snapshot semantics: confirmed correct as implemented `[user-decision]`

**Context:** Audit §3.1 verified that `ManifestEntry.phaseId` + `phaseName` are snapshotted at save time, not recomputed on read. Historical accuracy is preserved: if the moon-phase calculation ever improves, old entries keep their original phase labels. Question: is that intended, or should reads recompute from the date?

**Options considered:**
1. **Keep snapshot** — as implemented. Historical accuracy preserved; calc updates don't retroactively rewrite user history.
2. **Recompute on read from entry date** — benefits from calc improvements but rewrites past entries' phase labels if the phase boundaries ever shift.

**Decision:** option 1 — keep snapshot semantics as implemented. `[user-decision]`

**Rationale:** Users remember their entries by how they wrote them. If a future fix to moon-phase calculation shifts a boundary slightly, the Waxing Crescent entry the user wrote two months ago shouldn't silently become Waxing Gibbous in their history view. The snapshot captures the user's experience of the phase, which is the right frame for a personal diary.

**Implementation impact:** none — already correct in code. Server schema (§8.2) must preserve these fields as stored columns, not computed ones. Flagged to prevent accidental "compute from date" refactoring in §8.3/§8.4.

---

### Decision D — `/rhythm` hop cost: keep intermediate CTA page `[user-decision]`

**Context:** Audit §1.2 explained the "`/you → Дневник` vs `Ритъм tab → /rhythm → Отвори дневника`" split. Two entry points, different first-hop experiences. User's early UAT finding ("different page") was the perception of this split.

**Options considered:**
1. **Keep current design.** `/rhythm` is the lunar+transits overview; diary is one click from there. Maintains the 2026-04-20 consolidation (diary not embedded inline).
2. **Add a direct diary shortcut from dashboard.** Bypasses `/rhythm`. Flattens the navigation but duplicates an entry point.
3. **Revert 2026-04-20 consolidation, embed diary inline on `/rhythm`.** Reverts a prior design decision; un-simplifies.

**Decision:** option 1 — keep current design. `[user-decision]`

**Rationale:** The `/rhythm` page's role is the "current celestial weather" surface — lunar phase, meteor showers, transits. The diary is a separate ritual, one click deeper. That's intentional separation, not friction. Users who want the diary daily will navigate via `/you → Дневник` (single click); users browsing "what's up in the sky today" stop on `/rhythm` without being forced into the diary.

**Implementation impact:** none — no code change. Decision is recorded here so a future UX round doesn't re-litigate the split.

---

### Decision E — Export / backup: ship now, wired to server data `[user-decision]`

**Context:** Audit §3.1 flagged no export capability. Pre-server-migration, a power user has no way to preserve entries across devices or browsers. Post-server-migration, data portability remains a valuable feature (user-owned data principle; also GDPR-relevant).

**Options considered:**
1. **Skip export.** Trust server sync post-migration. Cheapest but fails data-portability and GDPR Article 20 "right to data portability."
2. **Ship localStorage export now (pre-migration).** Users get backup immediately. Duplicated work — the export path needs rebuilding when server persistence lands.
3. **Ship export after server migration.** Single build path; waits until §8.6 for users to have any export capability.

**Decision:** option 3 — ship export wired to server data in §8.6, after §8.5 migration. `[user-decision]`

**Rationale:** Since the full workstream ships before launch (Decision A), deferring export by a few sub-rounds doesn't expose users to data loss — the server migration solves the primary "clearing browser loses diary" problem. Post-migration, export from server data is the right single code path. Skipping is not an option given the EU audience and GDPR.

**Implementation impact:**
- §8.6 scope: markdown download of all entries for the logged-in user, generated client-side from a `GET /api/diary/entries` response. Format: `YYYY-MM-DD, Фаза, intention 1, intention 2, intention 3` sections. Bulgarian filename (`celestia-дневник-YYYY-MM-DD.md` or similar).
- Format decision deferred to §8.6 sub-round — markdown is a provisional default; JSON is also viable for machine-readable backup. User picks in §8.6.
- No pre-migration export ships in §8.1 or earlier.

---

### Decision F — Silent-failure UX: ship ERR-DI-NNN now `[user-decision]`

**Context:** Audit §3.2 flagged silent catches in `useManifestEntries.ts`: quota exceeded (line 38-40) and corrupted JSON (line 28-30) both fail silently. Users can write entries that disappear without feedback. The audit also noted this pattern is shared with `useDailyHoroscope.ts` and `useStoryList.ts`.

**Options considered:**
1. **Keep silent.** Trust quota limits. Users rarely hit quota with diary entries (~5MB = thousands of entries).
2. **Surface errors immediately with ERR-DI-NNN domain error codes** — same pattern as ERR-BD-NNN for birth-data introduced in commit `c9e4672`. Errors get a Bulgarian message and a durable ID for log triage.
3. **Ship with server migration** — defer until §8.5. Problem: §8.1 (immediate fixes) is the right time to address the silent-failure class.

**Decision:** option 2 — ship now in §8.1 with ERR-DI-NNN IDs. `[user-decision]`

**Rationale:** Silent failures are bugs masquerading as success. Even if quota-exceeded is rare, the user's trust in "the app saved what I wrote" is load-bearing for diary adoption. The fix is cheap, domain-modelled (ERR-DI-NNN mirrors the established ERR-BD-NNN pattern), and independent of the persistence migration — ships now rather than waiting.

**Implementation impact:**
- §8.1 introduces the ERR-DI-NNN namespace. Initial codes:
  - `ERR-DI-001` — localStorage write failed (quota or disabled storage).
  - `ERR-DI-002` — localStorage read corruption (invalid JSON).
  - More codes added in §8.4 and §8.5 as server-side error surfaces emerge (`ERR-DI-003` DB insert failed, `ERR-DI-004` list-entries failed, etc.).
- Bulgarian error copy: same register as ERR-BD-NNN. User-facing phrasing drafted in §8.1 commit, user approves same as the ERR-BD round.
- Error IDs logged to `console.error` today, ready to swap to Sentry per PRE_LAUNCH_PREREQS.md item 2 when monitoring ships.
- Same fix class in `useDailyHoroscope.ts` and `useStoryList.ts` flagged in §8.1 but not fixed there — extending to those hooks is out of diary scope; surfaced for a separate round.

---

## Implementation decisions

### Decision 1 — Existing localStorage entries: abandon on migration `[user-decision]`

**Context:** Decision A ships server persistence. Question: what happens to data in `celestia.manifest.entries.v1` on the first post-migration login?

**Options considered:**
1. **Migrate on first login.** Read localStorage, POST each entry to the server, clear localStorage on success. Preserves existing writes but complicates the hook swap (§8.5 needs a one-time migration path).
2. **Abandon on migration.** Server starts fresh. Users with existing entries lose them on the first post-migration sign-in.
3. **Surface a migration prompt.** "We detected local entries — import them?" User confirms. Migration path still needed but user-opt-in.

**Decision:** option 2 — abandon. Server starts fresh. `[user-decision]`

**Rationale:** The diary is pre-launch. The user population with existing localStorage entries is small (developers, internal testers, early access) and their entries are test data, not treasured records. Carrying migration code costs engineering time for value that won't exist at launch scale. Abandonment keeps §8.5 focused on the clean swap.

**Implementation impact:**
- §8.5 hook swap: no migration path. The new server-backed hook simply reads from `/api/diary/entries` and never touches localStorage.
- Old localStorage key `celestia.manifest.entries.v1` left untouched — not cleared, not read. Browser data stays user-owned; if they ever want to recover, they can inspect DevTools. Post-launch, a localStorage-hygiene pass can delete the stale key (out of scope here).
- Pre-launch communication: user-facing note if any early-access tester has entries they want to preserve — they can screenshot or DevTools-export before we ship §8.5. Low-urgency given small population.

---

### Decision 2 — Variant rotation: cycle-based per-user, entry-count modulo `[user-decision]`

**Context:** Decision B adopted cycle-based rotation (option 4 in that decision's options list). Question: which user actions advance the variant counter?

**Options considered:**
1. **Page view counts.** Every time the user loads the diary surface, variant advances. Simple but decouples variant from actual writing practice.
2. **Entry writes count.** Only `POST /api/diary/entries` advances. Variant stays stable across page loads until the user actually writes something.
3. **Hybrid — entry writes + deliberate "skip" action.** User can manually advance the variant if they don't want to write today.

**Decision:** option 2 — only writes count. `[user-decision]`

**Rationale:** The rotation's purpose is variety across the user's actual practice. Someone who opens the diary 10 times in a cycle but writes once has practiced once — their next cycle should see the next variant, not the variant 10 hops ahead. Page views shouldn't dilute the signal. Skip actions (option 3) add UX surface without clear product benefit; users who don't write aren't asking for a different prompt, they're asking to not write today.

**Implementation impact:**
- Variant selection formula: `variantIndex = entriesWrittenForThisPhase % variants.length` — computed server-side at prompt-fetch time, or client-side if entries list is already in memory. `[inferred]` server-side is cleaner because it aligns with eventual premium-gate enforcement point.
- Entry count is per-user per-phase, not per-user-total. Writing a Full Moon entry doesn't advance the Waxing Crescent variant.
- No variant-skip UI. Keeps the surface minimal.
- Stored entries don't need a `variantIndex` column — the variant is deterministic given (user, phase, entry count), re-derivable on read. Schema stays lean.

---

### Decision 3 — Variant content authoring: Bulgarian astrology skill, with user approval gate `[user-decision] [skill-dependent]`

**Context:** Decision B requires 16+ new Bulgarian prompts to fill out the 8 phases × 3 variants minimum. Authoring options:
- Write manually (user or Claude Code without skill assistance).
- Use the Bulgarian astrology skill in Claude Code's environment. Skill description mentions grammar, orthography, punctuation, style, and natural expression for Bulgarian.
- Third-party translation/astrology contributor (outside engineering scope).

**Options considered:**
1. **Manual authorship (user).** Highest quality baseline, slowest turnaround. User is the product expert.
2. **Skill-generated, user-approved in one shot.** Fastest; all 16+ prompts generated in one batch, user approves or rejects whole batch.
3. **Skill-generated, user-approved in batches with first-variant verification step.** Generate one variant for one phase as a sample, user reviews voice/register/cadence against existing 8 prompts, then batches of ~4-8 proceed with per-batch approval.

**Decision:** option 3 — skill-generated, batched approval, first-variant verification gate. `[user-decision] [skill-dependent]`

**Rationale:** User has confirmed trust in the skill's output quality from prior experience. Rather than inherit that trust blind, §8.8 verifies on a one-variant sample first — matches the voice-consistency discipline applied to every Bulgarian copy round in this thread (ERR-BD-NNN, noon-chart disclaimer, terminology audit). The skill produces a draft; the user is final copy authority. Batch size ≤ 8 per approval keeps feedback loops tight — if voice drifts partway, user can redirect before the drift propagates.

**Implementation impact:**
- §8.8 protocol:
  1. **Sample round.** Skill generates one variant (variant 1) for one phase (likely New or Waxing Crescent — the most-used entry phases). User reviews: register matches existing prompts, traditional-terminology aligned, sentence-starter cadence consistent, placeholders fit the 3-field structure.
  2. **Sign-off or iterate.** If sample passes → proceed. If not → user specifies the adjustment, skill regenerates with corrected framing, re-review.
  3. **Batched generation.** Remaining 15+ prompts in batches of ~4-8 per batch. Each batch committed independently; user approves the batch before the batch ships.
  4. **Final copy authority is the user's.** Skill proposes; user confirms.
- `[skill-dependent]` tag on anything downstream of the skill's output — if skill quality regresses or the specific invocation produces lower-register copy, flag and iterate rather than ship.

---

## Legend

- **[user-decision]:** the authority for this claim is the user's direct call in the 2026-04-20 §8.0 review. Not derivable from code.
- **[verified]:** claim is traceable in source files or in `DIARY_AUDIT.md`. Anyone can reconstruct by reading the cited file at the cited line.
- **[inferred]:** reasoning from planning context; the claim is one the author believes correct but hasn't executed or directly observed.
- **[skill-dependent]:** claim relies on the Bulgarian astrology skill's output quality — which the user has confirmed is trusted in general, but which is verified per-batch in §8.8 (Decision 3 protocol).

Any sub-round doc authored later in this workstream should continue using these four tags when making claims, so the epistemic chain stays legible.

---

## Embedded: `.planning/research/DRIZZLE_DECISION.md` (optional deeper context)

# Drizzle vs Supabase Client — Decision Analysis

**Written:** 2026-04-18
**Status:** **REVERSED 2026-04-20** — see §9 at end of this file. Drizzle is being removed from the stack; Supabase CLI adopted for migrations going forward.
**Original status line (preserved for trail):** Decision proposed; not executed. Prerequisite to Option-B migration (`DATA_FETCHING_INVENTORY.md §5.4`).
**Epistemic tags:** `[verified]` / `[inferred]` / `[planned]` / `[assumed]` / `[open]`. Sub-claims get their own tag when they make a different claim than parent.

---

## 1. Why this decision exists

`[verified]` `packages/db/` contains complete Drizzle schemas for every table (users, charts, crystals, audit_logs, ai_readings, daily_horoscopes, push_subscriptions, webhook_events, and more — 18 schema files) plus 10 applied migrations in `packages/db/drizzle/0000..0009_*.sql`. `[verified]` Zero files in `apps/web/` import from `@celestia/db` or use Drizzle for queries. All 103 `.from(table).select(...)` query sites in `apps/web/` use `@supabase/supabase-js` fluent builder.

`[inferred]` Someone set up Drizzle schemas and migrations, then chose the Supabase client over Drizzle for querying. Before reversing that choice for Option B, the reasoning needs to be surfaced or it gets re-made and re-reversed.

---

## 2. The evidence for why Supabase client was picked over Drizzle for queries

### 2.1 Hand-maintained ChartRow type — the smoking gun

`[verified — apps/web/lib/types/chart.ts]` A file-level doc comment explicitly states:

> *"Supabase returns snake_case column names, unlike the Drizzle schema (`@celestia/db/schema`) which uses camelCase. This type is the single source of truth for the Supabase response shape across the web app. If the Drizzle `charts` schema changes, update this type to match."*

The type itself is a hand-maintained `interface ChartRow` with snake_case fields (`birth_date`, `birth_time`, `city_name`, etc.).

`[inferred]` This tells the story directly. Someone:
1. Set up Drizzle with idiomatic camelCase TS property names (Drizzle's default)
2. Wrote queries against Supabase REST which returns snake_case columns
3. Hit the impedance mismatch
4. Chose to hand-maintain a snake_case type (ChartRow) rather than either (a) configure Drizzle to use snake_case in TypeScript or (b) adopt Drizzle's query layer to get camelCase consistency
5. Left a note for future-them to keep the two in sync manually

This is a **workaround to a naming-convention conflict**, not a deliberate preference for Supabase client over Drizzle. The choice was "keep both and bridge manually" not "Supabase client is better."

### 2.2 Supabase RLS + Clerk JWT integration as a secondary pressure

`[inferred]` `apps/web/lib/supabase/server.ts` goes to significant lengths to obtain the Clerk-issued Supabase JWT via a named template (`session.getToken({ template: 'supabase' })`) and pass it as the Authorization header on the Supabase client. Drizzle can do the same by passing a session config to `postgres-js`, but the pattern is less documented and probably required its own research spike. Path of least resistance was to use the Supabase client, which Clerk has first-class integration guides for.

`[assumed]` This is a secondary pressure, not a blocker. Drizzle can work with Supabase Postgres including RLS — `drizzle.config.ts` already has `entities: { roles: { provider: 'supabase' } }` configured. But "can work" with RLS is different from "has documented Clerk template integration like the Supabase client does."

### 2.3 Simplicity of the query patterns

`[verified]` 103 `.from(table).select(...)` call sites in `apps/web/`. `[verified]` Zero use backtick-template nested selects (Supabase's join syntax, e.g. ``.select(`*, charts ( * )`)``). Spot-checked GDPR export — even when the handler reads 4 tables, it's 4 sequential `.from().select('*').eq()` calls with client-side merging, not a join.

`[inferred]` For single-table CRUD without joins, the Supabase fluent builder is a fine match. Drizzle's relational query benefits only show up when you need type-safe joins. We don't.

---

## 3. Answering the user's three specific questions

### 3.1 (a) Do @supabase/supabase-js's generated types already give us most of the type safety we'd get from Drizzle?

`[verified]` **Today: no, because we haven't generated them.** Searching the repo for `database.types.ts` or any file matching `*supabase*types*` returns nothing. The repo has no `supabase/` folder at all — no Supabase CLI config, no migrations there, no generated types. All Supabase client calls today return `data: any` typed through the generic `SupabaseClient` without a schema generic parameter.

`[inferred]` **Tomorrow, if we run the CLI: yes, mostly.** `supabase gen types typescript --linked` (or `--project-id`) produces a `Database` type that can be passed as a generic to `createClient<Database>()`, after which every `.from('charts').select(...)` becomes fully typed with the exact snake_case shape of the Postgres schema. Select narrowing (`.select('id, name')`) correctly narrows the return type. Insert/update payloads become type-checked. This covers approximately 80-90% of what Drizzle's query types provide for simple single-table operations.

`[verified]` **What Drizzle provides that Supabase generated types do not:**
- Typed joins (only beneficial when joins exist — we have zero)
- Typed aggregate helpers (sum, count, group_by) — Supabase builder has `.select('count')` but less ergonomic
- `InferSelectModel<T>` / `InferInsertModel<T>` type helpers for reuse (Supabase gives you `Tables<'charts'>` from the generated file, equivalent in practice)
- camelCase property access (Drizzle default) — though Supabase types give you the honest snake_case which matches the wire format

### 3.2 (b) How often do current queries need joins the Supabase builder can't handle cleanly?

`[verified]` **Zero.** Grep of `apps/web/` for backtick-template nested selects returned no matches. Every multi-table read in the codebase is sequential `.from().select()` calls. `[inferred]` This isn't a limitation of the Supabase builder — it supports FK-following nested selects — but a reflection of how simple our access patterns are. If that changes (e.g., Кръг needs `user_relationships` joined with `users` joined with `charts`), the Supabase builder handles it fine via the nested-select syntax. The ceiling doesn't come into play for months, probably not at all.

### 3.3 (c) Who owns migrations today — Supabase dashboard or drizzle-kit — and which do we keep?

`[verified]` **drizzle-kit owns migrations.** `packages/db/drizzle/` contains 10 applied migrations (`0000_slow_invaders.sql` through `0009_late_starjammers.sql`). `packages/db/package.json` has `db:generate`, `db:push`, `db:studio` scripts wired to drizzle-kit. No `supabase/` folder exists at repo root or anywhere else — Supabase CLI is not in the migration flow. The Supabase Dashboard might have been used for initial setup but current state is drizzle-kit-driven.

`[planned]` **Keep drizzle-kit for migrations.** The current setup works, migrations are versioned in git, and 10 migrations have successfully applied. Rebuilding this on Supabase CLI would be pure churn. Drizzle's typed schemas are also the canonical record of what columns exist — deleting them leaves no checked-in schema source.

---

## 4. The decision

`[planned]` **Keep Drizzle for migrations only. Generate Supabase types for query type safety. Delete the hand-maintained `ChartRow` type.**

Three concrete actions:

**Action 1** — Generate Supabase types via CLI:
```bash
pnpm dlx supabase gen types typescript --project-id <id> > apps/web/lib/types/database.generated.ts
```
Run this as a post-migration step. Add `db:types` script to `packages/db/package.json` that runs after `db:push`:
```json
"db:types": "supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > ../../apps/web/lib/types/database.generated.ts",
"db:sync": "pnpm db:push && pnpm db:types"
```

**Action 2** — Type all `createServiceSupabaseClient()` (and its siblings) with the generated Database type:
```ts
import type { Database } from '@/lib/types/database.generated'
return createClient<Database>(url, key, { ... })
```
This makes every `.from(table).select(...)` fully typed without touching a single call site.

**Action 3** — Delete `apps/web/lib/types/chart.ts` and replace imports of `ChartRow` with the generated `Tables<'charts'>` from `database.generated.ts`. One-file type swap; mechanical.

### 4.1 What this decision explicitly rejects

**Rejected: migrate the query layer to Drizzle.**

Cost: rewriting 103 query sites in `apps/web/`, plus the ones that will be added in `packages/core/` during Option-B migration. Benefits: camelCase property access, typed joins we don't need.

`[inferred]` The cost/benefit is wrong by a wide margin. Joins are zero today; camelCase-consistency is a taste preference worth no-more-than-a-day of refactor, not weeks; type safety is achievable without Drizzle via the Supabase CLI path above.

### 4.2 What this decision explicitly rejects, part 2

**Rejected: delete Drizzle entirely and move migrations to Supabase CLI.**

Cost: rebuilding migration history, retooling scripts, losing the schemas as canonical source. Benefits: one fewer tool in the stack.

`[inferred]` The cost is real and the benefit is marginal. Drizzle migrations work today. The schemas serve as documentation. Keep the tool that's paying rent.

---

## 5. Consequences for Option-B migration

`[planned]` Given this decision:

- `packages/core/` data-access functions import `Database` from `@/lib/types/database.generated` — NO, can't, that's an `apps/web`-internal path. Move the generated file to `packages/db/src/database.generated.ts` and re-export from `@celestia/db`. That's where it belongs anyway (it's a description of what's in the DB, which is `packages/db`'s job).
- `packages/core/` constructs its own typed Supabase client via the factory in `packages/db/src/client.ts`. Signature becomes: `createSupabaseClient(accessToken: () => Promise<string | null>): SupabaseClient<Database>`.
- Hand-maintained `ChartRow` → `Tables<'charts'>` swap is a pre-Phase-M1 chore. Do it before scaffolding `packages/core/` so the first shared function lands with proper types from day one.
- Drizzle remains `packages/db/src/schema/**` + `packages/db/drizzle/**` + drizzle-kit scripts. `@celestia/db`'s exported surface stays minimal (client factory, generated types, nothing else).

`[open]` One question this decision does not resolve: `packages/db/src/schema/` camelCase TypeScript types are now redundant with `Tables<'charts'>` (snake_case). Keep both? Delete the schema-derived types from the exported surface? `[planned]` Recommend keeping the Drizzle schemas (they're the canonical column definitions) but not re-exporting their inferred types. Query code uses `Tables<>` from generated types; migration code uses the Drizzle schemas directly.

---

## 6. Migration unblock — strict ordering

`[planned]` Ordering matters. Without CI enforcement of type regeneration, deleting `ChartRow` creates a window where the first schema change creates TS errors, and the fastest "fix" under a deadline is re-creating a hand-maintained bridge — the exact failure mode this decision is supposed to eliminate. Execute in order:

### Step 1 — Add Supabase CLI to the toolchain

Either of two shapes, decision point not work:
- **Option A:** install as dev dep at workspace root: `pnpm add -Dw supabase`. Fixes the version across team machines, survives CI.
- **Option B:** document `pnpm dlx supabase` as the canonical invocation, no dep added. Cheaper but depends on registry availability during CI.

`[planned]` Recommend A — pinned version, offline-capable builds.

### Step 2 — Add `db:types` script

`packages/db/package.json`:
```json
"scripts": {
  "db:types": "supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > src/database.generated.ts",
  "db:sync":  "pnpm db:push && pnpm db:types"
}
```

Script writes to `packages/db/src/database.generated.ts` (inside the package — belongs with the rest of the DB source). `[planned]` Re-export from `packages/db/src/index.ts` so consumers import via `@celestia/db`.

### Step 3 — Run `pnpm db:types` once, commit the output

First run establishes the generated file at a known-good state against the current migration 0009. Committed verbatim.

### Step 4 — Add CI drift check [GATE before Step 5]

This is the critical step. Goal: CI fails if someone changes the Drizzle schema, runs `db:push`, and forgets to `db:types`.

Mechanism — Turbo task in `turbo.json`:
```json
"db:types:check": {
  "outputs": [],
  "dependsOn": []
}
```

With a matching script in `packages/db/package.json`:
```json
"db:types:check": "pnpm db:types && git diff --exit-code src/database.generated.ts"
```

The script regenerates types and fails if the generated file differs from what's committed. CI runs `pnpm db:types:check` as part of the standard build/verify step. A PR that changes `packages/db/src/schema/**` without also committing regenerated `database.generated.ts` fails CI.

`[planned]` Alternatively, a pre-commit hook via husky / lefthook that runs the same check. Equivalent enforcement at a different point in the loop.

**Do not advance to Step 5 until this check exists and has failed and passed at least once in CI.** If this step is skipped, the window where someone rebuilds the bridge is open.

### Step 5 — Update `createServiceSupabaseClient()` and siblings to use the `Database` generic

```ts
import type { Database } from '@celestia/db'
// ...
return createClient<Database>(url, key, { ... })
```

Four files to update in `apps/web/lib/supabase/`: `service.ts`, `server.ts`, `public.ts`, `client.ts`. Plus `packages/db/src/client.ts`. Five mechanical edits. No query call sites change — the types flow through.

### Step 6 — Migrate `ChartRow` imports to `Tables<'charts'>`

```ts
import type { Tables } from '@celestia/db'
type ChartRow = Tables<'charts'>  // local alias, optional, can be inlined
```

`[inferred]` Grep-and-replace. Preserve the local alias name (`ChartRow`) if existing call sites reference it heavily; pure type alias has zero runtime cost. Or inline `Tables<'charts'>` at every site if the alias indirection is unnecessary.

### Step 7 — Delete `apps/web/lib/types/chart.ts`

Only after Step 6 confirms zero remaining imports of the old `ChartRow`. Run `pnpm typecheck` across the workspace; if it passes, delete the file. If it doesn't, some consumer was missed in Step 6.

---

## 7. What if CI drift check catches real drift during M1-M3?

`[planned]` Expected behavior, not a problem:
- Engineer changes `packages/db/src/schema/charts.ts` to add a column
- Runs `pnpm db:generate` (produces new migration file)
- Runs `pnpm db:push` (applies migration to DB)
- Forgets `pnpm db:types`
- Commits, opens PR
- CI runs `pnpm db:types:check`, regenerates types, sees diff, fails
- Engineer runs `pnpm db:sync` locally (shorthand for both), commits regenerated types
- CI passes

If someone wants to bypass (hypothetically), they have to actively delete the CI check or skip it with `--no-verify`. Much harder than "silently re-add a hand-maintained bridge."

---

## 8. Removed open question on SUPABASE_PROJECT_ID

`[owner: user]` Who has the project ID is a user question, not an open research question. Removed from the "flag" list below. Assume it will be supplied when Step 1 executes.

---

## 9. 2026-04-20 update — decision reversed

`[verified]` A schema-drift audit on 2026-04-20 revealed the Drizzle migrations misrepresent production Postgres schema in **13 columns across 5 tables** (full output: `SCHEMA_DRIFT_AUDIT.md`). Summary:

| table | drift count |
|---|---|
| `charts` | 5 (birth_date, birth_time, approximate_time_range, latitude, longitude) |
| `bulgarian_cities` | 3 (latitude, longitude, population) |
| `users` | 3 (subscription_tier + 2 extra DB columns not declared) |
| `daily_horoscopes` | 1 (date) |
| `daily_transits` | 1 (date) |

The most severe was `charts.approximate_time_range` — Drizzle declared `text`, production is `tstzrange`. Every birth-data form submission with `birthTimeKnown: false` has been failing at the Postgres layer since whenever that column was altered, with the raw error bubbling into the Bulgarian UI copy. Zero non-null rows in production — no user has ever successfully persisted through this path.

### Why this invalidates the 2026-04-18 rationale

The original decision rested on §4.2:

> **Rejected: delete Drizzle entirely and move migrations to Supabase CLI.**
> Cost: rebuilding migration history, retooling scripts, losing the schemas as canonical source. Benefits: one fewer tool in the stack.
> `[inferred]` The cost is real and the benefit is marginal. Drizzle migrations work today. The schemas serve as documentation. Keep the tool that's paying rent.

Two claims in that paragraph are wrong given the drift audit:

1. **"Drizzle migrations work today"** — no. Whatever applied the tstzrange type to `charts.approximate_time_range` bypassed the Drizzle migration system, and the 10 committed migrations collectively do not produce the production schema state. The migrations document a schema that doesn't exist.
2. **"The schemas serve as documentation"** — they document a fiction in 13 places. Worse than no documentation, because they mislead. The chart type file `apps/web/lib/types/chart.ts` with its hand-maintained `ChartRow` exists precisely because someone had to work around this mismatch.

The "sunk investment of 10 migrations" argument collapses when the migrations don't represent reality. There is no sunk asset to preserve.

### New decision

**Remove Drizzle entirely.** Nothing queries through it at runtime (`[verified]` 0 consumers of `@celestia/db` across `apps/` and `packages/`, per 2026-04-20 grep). The schemas are stranded fiction. The migrations are unreliable.

**Adopt Supabase CLI for migrations going forward.** Pairs naturally with `supabase gen types typescript` for the type-generation path that §6 Step 2 of this doc already planned. One tool for two jobs (migrations + types), whereas Drizzle currently does only the first.

The `Database`-typed Supabase client + `Tables<'charts'>`-derived types from §6 Step 5/6 still apply. Only the migration-tooling half of this doc is replaced; the type-generation half survives.

### What about `packages/db/src/client.ts`?

`[verified]` `createSupabaseClient(accessToken)` has zero runtime consumers across the workspace. Planning docs (`CACHE_WRAP_CONVENTION.md`, `DATA_FETCHING_INVENTORY.md §4.1`, `07-RESEARCH.md`) reference it as a `[planned]` future path; that future path belongs to the original decision which is now reversed. No reason to preserve the factory. The entire `packages/db/` package goes.

### What stays

- `apps/web/lib/types/chart.ts` hand-maintained `ChartRow` — updated/retyped against Supabase-generated types in a follow-up, NOT blocked on this reversal.
- `supabase/migrations/` — new canonical migration directory.
- `packages/db/src/seed/data/*.json` reference data — moved to `supabase/seed/` (or deleted if unused; data is already in prod).

### Trail

- Audit: `.planning/research/SCHEMA_DRIFT_AUDIT.md`
- Tooling: `apps/web/scripts/diagnostics/audit-schema-drift.mjs` (kept as CI drift check for the post-Drizzle world)
- Migration tooling doc: `packages/db/MIGRATION_TOOLING.md` (will be written into the new canonical location before `packages/db/` is deleted; may move to repo root or `supabase/README.md` in a follow-up)

---

## Embedded: `.planning/research/AI_PROVIDER_DECISION.md` (optional deeper context)

# AI Provider — Decision Trail

**Written:** 2026-04-20
**Status:** Current reality documented. BgGPT deferral confirmed. Reversal story told honestly because the planning doc, recent memory, and actual code had been out of sync for long enough that documenting the mismatch is part of the point.
**Epistemic tags:** `[verified]` / `[inferred]` / `[planned]` / `[assumed]` / `[open]`. Sub-claims get their own tag when they make a different claim than parent.

---

## 1. Why this doc exists

`[verified]` During the 2026-04-20 §7 Bug 1 investigation, a side question arose: what AI provider is actually running in production? Three separate descriptions of it existed in the repo and in conversation:

| Source | Claim |
|---|---|
| Round-1 stack snapshot (`Celestia_AI_Reference.md`) | "BgGPT primary (INSAIT), Claude/GPT-4o fallback via AI SDK" |
| 2026-04-20 conversation (pre-audit) | "Google Gemini only (in .env)" |
| Actual code + `.env.local` (verified) | OpenRouter (`meta-llama/llama-3.3-70b-instruct`), no fallback |

Three different stories for the same thing. The planning doc was aspirational and never matched reality; a recent mental model added a second layer of drift by remembering "Gemini" when nothing Gemini-shaped was ever wired. This doc pins the ground truth so the next reader doesn't add a fourth layer.

This is the same pattern as `DRIZZLE_DECISION.md §9` — document decisions and reversals at the level of honesty that keeps future readers from re-deriving the history. Not the same pattern as a code fix; this commit changes no runtime behavior.

---

## 2. Original plan (aspirational, never wired)

`[verified — Celestia_AI_Reference.md round-1 snapshot]` The initial stack claim:

- **Primary:** BgGPT (INSAIT Institute's Bulgarian-optimized LLM) — chosen for native-Bulgarian quality advantage over English-primary models
- **Fallback:** Claude or GPT-4o via Vercel AI SDK's multi-provider support — chosen so a BgGPT outage didn't stop the product

`[inferred]` This plan was written during early architecture scoping, before implementation. The team installed `@ai-sdk/google` (and by package-lock history, at various points probably `@ai-sdk/openai` and `@ai-sdk/anthropic` too) against the aspiration. **None of the BgGPT integration was ever actually wired up** — no BgGPT client, no BgGPT env key, no BgGPT request code in any route handler.

---

## 3. Current reality (verified 2026-04-20)

### 3.1 What's actually running

`[verified]` The three AI-streaming / AI-generating endpoints all share the same setup:

```ts
// apps/web/app/api/oracle/generate/route.ts
// apps/web/app/api/oracle/teaser/route.ts
// apps/web/app/api/horoscope/generate/route.ts

import { createOpenAI } from '@ai-sdk/openai'

const LLAMA_MODEL = 'meta-llama/llama-3.3-70b-instruct'

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
})
```

- **Provider:** OpenRouter (OpenAI-API-compatible aggregator, hosts many models)
- **Model:** `meta-llama/llama-3.3-70b-instruct` (Meta's Llama 3.3, 70B parameter instruct-tuned)
- **SDK client:** Vercel AI SDK's `@ai-sdk/openai` — used as a generic OpenAI-compatible client, NOT actually pointed at OpenAI. The import name is slightly misleading.
- **Streaming path:** `streamText({ model: openrouter(LLAMA_MODEL), … })` from the `ai` package
- **Non-streaming path:** `generateText({ model: openrouter(LLAMA_MODEL), … })` for cached teaser/horoscope generation

### 3.2 `.env.local` AI keys (2026-04-20)

```
OPENROUTER_API_KEY=***
```

That's the full set. No `GEMINI_API_KEY`, no `GOOGLE_GENERATIVE_AI_API_KEY`, no `OPENAI_API_KEY`, no `ANTHROPIC_API_KEY`, no `BGGPT_*` — never were, per git history spot-checks.

### 3.3 Fallback behavior

`[verified]` **None configured.** If OpenRouter returns 429/5xx mid-stream:

- The AI SDK's `streamText` / `generateText` throws
- The route handler's outermost try/catch returns a 500 with a generic Bulgarian error ("Грешка при генериране на четенето" or variant)
- No retry, no backoff, no alternate-provider failover

Single provider, single model, single failure mode. Flagged as a pre-launch decision in `PRE_LAUNCH_PREREQS.md` (separate row for fallback strategy).

### 3.4 Leftover scaffolding

`[verified]` Two artifacts from the aspirational-plan era that don't match current reality:

- `apps/web/package.json` declares `@ai-sdk/google@^3.0.29` as a dependency. **Zero imports across the workspace.** Dead dep.
- `apps/web/app/api/oracle/generate/route.ts:218` has the comment `// 9. Stream via Gemini gemini-2.5-flash` directly above the `openrouter(LLAMA_MODEL)` call. Fossilized — code has been OpenRouter/Llama since before git history I can spot-check.

Both are being cleaned up in a dedicated chore commit at the tail of this docs block. Neither changed runtime behavior.

---

## 4. Three-way mismatch, recorded explicitly

`[verified]` For the trail:

1. **Planning doc said BgGPT primary** (Celestia_AI_Reference.md, round 1) — aspirational; was never wired.
2. **Recent conversation memory said Gemini primary** — that was my incorrect recollection in the 2026-04-20 thread. Gemini was also never wired; the `@ai-sdk/google` dep in package.json may have contributed to the mis-memory. Apologies for the confusion.
3. **Actual code always used OpenRouter/Llama** — verified by reading the three generating endpoints + `.env.local` + package.json imports.

The correct reading going forward: **OpenRouter/Llama is and has been the primary AI provider.** There is no migration story to tell. There is an aspiration-to-reality gap story to tell, which is §2 vs §3.

---

## 5. BgGPT status — deferred, not cancelled

`[planned]` BgGPT stays on the roadmap as **[deferred / post-launch]**. The original rationale (native-Bulgarian quality advantage) remains a plausible future value, just not one worth integrating during the current refactor / pre-launch window. The minimum viable product ships on OpenRouter/Llama's Bulgarian output, which is acceptable-not-native-first.

### Revisit conditions

Reopen the BgGPT decision if one or more of the following holds:

- **Bulgarian-language quality advantage demonstrated over Llama 3.3 70B.** Requires a controlled eval — same prompts, same chart, same topic, human-rated output comparison. Not a vibe check. BgGPT is smaller (7B / 27B depending on variant) than Llama 3.3 70B, so "more Bulgarian-specialized" has to beat "more parameters" on relevant tasks for the switch to be worth it.
- **Cost pressure from OpenRouter.** Current OpenRouter pricing for `meta-llama/llama-3.3-70b-instruct` is public; if production traffic scales past where BgGPT's (presumably lower) inference cost matters more than its quality, revisit.
- **Data-residency requirement surfaces.** If legal or enterprise-customer constraints require Bulgarian / EU data residency that OpenRouter (US-hosted) can't satisfy and BgGPT (INSAIT, Bulgarian-hosted) can, the switch becomes a compliance gate rather than a quality/cost one.

None of these hold today. All three are plausible futures.

### What a BgGPT revisit would need to do

- Re-validate the streaming-placement decision per `LOAD_TEST_PLAN.md §5.3` — BgGPT's latency characteristics may differ from Llama's enough to shift the Edge / Serverless / dedicated-service choice for the streaming endpoints.
- Re-run `LOAD_TEST_PLAN.md` Scenarios B (warm-cache) and C (cold-cache) against BgGPT, since TTFT and throughput numbers gathered against Llama don't transfer.
- Integration code: add BgGPT client (likely via REST, not via Vercel AI SDK unless INSAIT ships a provider plug-in), wire as primary with Llama/OpenRouter as fallback, update the prompt layer if needed for BgGPT's tokenizer / context window.

---

## 6. Consequences for the current docs

`[verified]` Three planning docs need updating as a result of pinning this reality:

- `Celestia_AI_Reference.md` — replace "BgGPT primary, Claude/GPT-4o fallback" with the OpenRouter/Llama reality. Preserve BgGPT references where they describe the deferred future.
- `LOAD_TEST_PLAN.md` — provider under test in §5.2 is OpenRouter/Llama, not BgGPT. Predecessor chain entry about "BgGPT API access" becomes "OpenRouter API access." Add §5.3 forward-looking note about the BgGPT revisit requiring re-validation.
- `PRE_LAUNCH_PREREQS.md` — the AI-provider verification row becomes OpenRouter-specific. Add a separate row for fallback-strategy decision.

Shipping as a trio of commits right after this doc, so each source of truth points at the same current reality.

---

## 7. Trail

- Earlier aspirational plan: `.planning/research/Celestia_AI_Reference.md` round-1 snapshot (pre-update)
- Current provider code: `apps/web/app/api/oracle/generate/route.ts`, `oracle/teaser/route.ts`, `horoscope/generate/route.ts`
- Env: `apps/web/.env.local` (OPENROUTER_API_KEY only)
- Cleanup of leftover scaffolding: dedicated chore commit at the tail of the 2026-04-20 docs block
- Related pattern (reality vs planning doc mismatch surfacing during unrelated bug investigation): `DRIZZLE_DECISION.md §9` + `SCHEMA_DRIFT_AUDIT.md`

---

## Embedded: `.planning/research/SCHEMA_DRIFT_AUDIT.md` (optional deeper context)

# Schema Drift Audit — 2026-04-20

**Tool:** `apps/web/scripts/diagnostics/audit-schema-drift.mjs`
**Drizzle source of truth:** `packages/db/drizzle/meta/0009_snapshot.json` (latest committed)
**DB source of truth:** live Supabase Postgres via `DATABASE_URL`, `information_schema.columns`
**Outcome:** 13 columns drifted across 5 tables. Drizzle migrations do not represent production schema.

**Consequence:** triggers the reversal of `DRIZZLE_DECISION.md` round-11 — see §9 of that file. Strategy C (kill Drizzle, adopt Supabase CLI) adopted 2026-04-20.

---

## Raw audit output

```
Drizzle snapshot: packages/db/drizzle/meta/0009_snapshot.json
DB: postgresql://…@aws-1-eu-west-2.pooler.supabase.com:6543/postgres

[DRIFT]   charts.birth_date                drizzle=timestamp with time zone   db=date
[DRIFT]   charts.birth_time                drizzle=text                       db=time without time zone
[DRIFT]   charts.approximate_time_range    drizzle=text                       db=tstzrange
[DRIFT]   charts.latitude                  drizzle=real                       db=double precision
[DRIFT]   charts.longitude                 drizzle=real                       db=double precision
[DRIFT]   bulgarian_cities.latitude        drizzle=real                       db=double precision
[DRIFT]   bulgarian_cities.longitude       drizzle=real                       db=double precision
[DRIFT]   bulgarian_cities.population      drizzle=real                       db=integer
[DRIFT]   daily_horoscopes.date            drizzle=text                       db=date
[DRIFT]   daily_transits.date              drizzle=text                       db=date
[DRIFT]   users.subscription_tier          drizzle=text                       db=subscription_tier (PG enum)
[EXTRA IN DB]  users.subscription_status   drizzle=(not declared)             db=present in live DB
[EXTRA IN DB]  users.trial_claimed_at      drizzle=(not declared)             db=present in live DB

── per-table summary ──
  ai_readings                        10 scanned,  0 drifted  [ok]
  audit_logs                          5 scanned,  0 drifted  [ok]
  chart_calculations                  9 scanned,  0 drifted  [ok]
  charts                             13 scanned,  5 drifted  [DRIFT]
  bulgarian_cities                    9 scanned,  3 drifted  [DRIFT]
  crystal_listings                   14 scanned,  0 drifted  [ok]
  crystal_recommendations            12 scanned,  0 drifted  [ok]
  crystal_vendors                    10 scanned,  0 drifted  [ok]
  crystals                           23 scanned,  0 drifted  [ok]
  daily_horoscopes                    7 scanned,  1 drifted  [DRIFT]
  daily_transits                      4 scanned,  1 drifted  [DRIFT]
  processed_webhook_events            4 scanned,  0 drifted  [ok]
  push_subscriptions                  6 scanned,  0 drifted  [ok]
  user_crystals                       6 scanned,  0 drifted  [ok]
  user_daily_crystals                 5 scanned,  0 drifted  [ok]
  users                              10 scanned,  3 drifted  [DRIFT]

TOTAL: 13 drifted across 16 tables (147 columns scanned)
```

## Categorization

### Severe — causing runtime errors or latent data loss

1. **`charts.approximate_time_range`** — drizzle=text, db=tstzrange. Every birth-data submit with `birthTimeKnown: false` errors with Postgres `22P02 malformed range literal`. The raw Postgres error bubbles into the Bulgarian UI copy via `apps/web/app/api/birth-data/route.ts`. Zero non-null rows in production — no user has ever successfully saved through this path. Fix shipping via `supabase/migrations/` after Drizzle removal.

2. **`charts.birth_date`** — drizzle=`timestamp with time zone`, db=`date`. Writes of full ISO timestamps get silently truncated to date part. Works today because we only care about the calendar date, but a future reader expecting time-of-day info will be surprised.

3. **`charts.birth_time`** — drizzle=text, db=`time without time zone`. Writes of `"HH:MM"` strings parse cleanly by the PG time type. Reads return a Postgres-formatted time value. Works but semantically mismatched.

### Medium — precision or range mismatch, working but latent

4–7. **`charts.latitude/longitude` + `bulgarian_cities.latitude/longitude`** — drizzle=real (32-bit), db=double precision (64-bit). DB upcasts on write. No user-visible issue. If the Drizzle schema were ever the source for a regeneration, lat/lon would silently downgrade to 32-bit precision. Astrology calculations are sensitive to precision here.

8. **`bulgarian_cities.population`** — drizzle=real, db=integer. Fractional populations would truncate silently.

### Low — semantic equivalence, works today

9–10. **`daily_horoscopes.date` + `daily_transits.date`** — drizzle=text, db=date. `"YYYY-MM-DD"` strings cast cleanly. Works.

### Enum drift — schema philosophy

11. **`users.subscription_tier`** — drizzle=text, db=`subscription_tier` (Postgres enum). Writes of `"free"` / `"premium"` work via PG's string-to-enum coercion. Drizzle loses type-level enforcement but nothing uses Drizzle at runtime.

### Extra columns in DB

12. **`users.subscription_status`** — present in DB, not declared in Drizzle. Likely added by a Stripe/webhook change that bypassed the Drizzle generator.
13. **`users.trial_claimed_at`** — present in DB, not declared in Drizzle. Same pattern.

## Reproducing this audit

```bash
pnpm --filter @celestia/web run diag:drift
# or
node --env-file=apps/web/.env.example.local \
     apps/web/scripts/diagnostics/audit-schema-drift.mjs
```

Post-Drizzle, the audit script still works against any tracked source of truth — if `supabase/migrations/` becomes the canonical schema record, the script should be retargeted to compare `supabase/migrations/**.sql` DDL against `information_schema.columns`. For now, pointing at the last committed Drizzle snapshot still surfaces drift until Drizzle is removed.
