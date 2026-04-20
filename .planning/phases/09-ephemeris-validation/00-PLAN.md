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
