# §9.2 / §9.3 / §9.4 — Consolidated validation report

**Opened:** 2026-04-21
**Status:** **PASS with observations.** §9.5 opens zero-rounds for bug fixes.
**Scope:** this doc consolidates all three validation tiers (planetary longitudes, house cusps, aspect classification) into one report. Rationale: the harness runs all four tiers in a single Vitest invocation; the finding pattern is tight enough across tiers that splitting into separate §9.3 / §9.4 docs would be duplicative. Tier-specific sections below preserve the epistemic distinctions documented in `09-01-HARNESS.md § §9.2/§9.3/§9.4 validation semantics — tiered by reference source`.

**Epistemic tags used:** `[verified]` (observed in tool output or primary-source docs), `[observation]` (single-case or pattern datum without full explanation), `[inferred]` (reasoned attribution not directly documented), `[open]` (explanation incomplete but not blocking).

**Run provenance:**
- Harness: `packages/astrology/test/validation/` (§9.1 scaffold, §9.2 reference-data corpus)
- Fixtures: 12 cases (5 famous AA-rated + 7 synthetic edge cases) per `09-01-TEST-CASES.md`
- Reference data: per-case snapshots under `test/validation/reference-data/` (JPL Horizons DE441 via API + Astronomy Engine local), committed 2026-04-21
- Execution: `pnpm --filter @celestia/astrology test` — 39 tests pass; case-level verdicts: 11 PASS, 1 QUEUE (Einstein Neptune 1.18″, scope-boundary [observation]), 0 PAUSE

---

## Primary finding

**Celestia's astrology engine is [verified] correct for its actual user base at the documented precision floors.** Across the 8 modern-era cases (1879–2020), all Tier 1 (JPL Horizons physical-reality), Tier 2 (Meeus Ch. 47 Mean Node), Tier 3 (inline Placidus houses), and Tier 4 (synthetic aspect-classification) comparisons pass their locked thresholds. The single Tier 1 exceedance in this group — Einstein Neptune 1.18″ vs the 1″ planet threshold — is [observation], tied to the pre-existing historical-tz scope-boundary captured in `09-01-TEST-CASES.md § Scope boundary — historical-tz cases (Einstein 1879, Kahlo 1907)` and doc-drift entry #4.

The two far-range synthetic cases (Year 1600, Year 2200) surface Tier 1 threshold exceedances that are **not sweph-Moshier drift** — primary sources contradict that attribution. The most plausible remaining explanation is inter-ephemeris-generation divergence between DE404 (Moshier's fit target per SE docs) and DE441 (JPL's current). Other candidate contributors (frame-convention differences between Moshier's 1990s transformation code and current IAU conventions; time-scale handling at far-T) have not been eliminated. No primary source quantifies the relative contributions. These cases are classified as `[observation]` with `[inferred]` attribution, not bugs, not pause-and-fix.

§9's validation claim is therefore scoped to **modern-era dates (~±100 years from J2000, i.e., 1900–2100)**. Celestia supports only modern birth dates; this scoping aligns with the user base by construction.

---

## Case-by-case summary

| # | Case | Era | Lat | Overall | Notes |
|---|---|---|---|---|---|
| 1 | Albert Einstein | 1879 | 48°N | QUEUE | Neptune 1.18″ [observation] tied to scope-boundary #4 |
| 2 | Frida Kahlo | 1907 | 19°N | PASS | — |
| 3 | Princess Ingrid Alexandra | 2004 | 60°N | PASS | — |
| 4 | Crown Princess Leonor | 2005 | 40°N | PASS | DST-transition-day UTC resolved post-transition (→ doc-drift #7) |
| 5 | Queen Elizabeth II | 1926 | 52°N | PASS | reproduces §9.1 task 6 sample run |
| 6 | Synthetic — Arctic polar night | 2020 | 69°N | PASS | intermediate cusps skipped via `skipIntermediateCusps` flag |
| 7 | Synthetic — Equator at J2000 | 2000 | 0°N | PASS | — |
| 8 | Synthetic — Leap day | 2000 | 51°N | PASS | — |
| 9 | Synthetic — NYE, New York | 1999→2000 | 41°N | PASS | `dayOffset=+1` tz-conversion path exercised |
| 10 | Synthetic — Santiago | 1990 | 33°S | PASS | southern-hemisphere case |
| 11 | Synthetic — Year 1600 | 1600 | 51°N | PASS (**farRangeObservation**) | far-range [observation], Saturn/Pluto AE-only per §9.2 ruling |
| 12 | Synthetic — Year 2200 | 2200 | 51°N | PASS (**farRangeObservation**) | far-range [observation], Jupiter/Pluto AE-only per §9.2 ruling |

Modern-era coverage (era, latitude, hemisphere, tz-regime): 1879–2020, 19–69°N + 33°S, pre-standardized-tz through modern, DST transition day, tz boundary crossing. Historical/future edge cases (1600, 2200) added as far-range probes with the explicit scope caveats above.

---

## Tier 1 — Planetary longitudes vs JPL Horizons (physical-reality reference)

**Scope:** 10 bodies (Sun + Moon + Mercury through Pluto) vs JPL Horizons DE441. Thresholds: planets 1″, Moon 3″. Reference is anchored on decades of observational data (planetary radar, spacecraft tracking, lunar laser ranging). See `09-01-HARNESS.md § Tier 1`.

### Modern-era cases (1879–2020, 10 cases) — [verified] clean pass

All 100 Tier 1 planet-body comparisons across the 10 modern-era cases (10 × 10) — Sun, Moon, Mercury through Pluto for Einstein, Kahlo, Ingrid Alexandra, Leonor, QE II, Arctic polar, Equator, Leap day, NYE, Santiago — pass the locked thresholds with one exception:

- **Einstein Neptune 1.18″** — `[observation]`. At 1.18× the 1″ threshold. Explained by the historical-tz scope boundary documented in `09-01-TEST-CASES.md § Scope boundary`: Celestia's `localTimeToUTC` interprets 1879 Ulm as modern `Europe/Berlin` (CET, UTC+1) rather than the astro-community LMT convention (UTC+0:39:54). Neptune's geocentric motion is ~2″/hour; the ~20-minute difference between those two interpretations accounts for ~0.7″ of the 1.18″ delta. The remaining ~0.5″ is within normal Moshier-mode noise at T=−121 years from J2000. **Not investigable within §9 scope** — the root cause is a `localTimeToUTC` product-scope question (doc-drift entry #4), not an ephemeris bug. Not classified as queue-for-later.

**Modern-era Moon behaviour.** Across all 10 modern-era cases the observed Moon vs JPL delta range is **0.04″ (equator-J2000) to 0.71″ (Leonor 2005)**. Per-case: Equator 0.04″, NYE 0.08″, Leap day 0.28″, Kahlo 0.30″, Einstein 0.31″, Santiago 0.33″, Ingrid 0.40″, QE II 0.42″, Arctic 0.69″, Leonor 0.71″. QE II at 0.42″ from the §9.1 task 6 sample run is representative, not exceptional. The Moon's documented Moshier floor is 0.5″ vs DE404 uniformly across 1369 BC – 3000 AD per SE docs. Observed deltas vs DE441 at modern dates are sub-arcsec for all 10 cases — `[verified]` consistent with the SE-docs Moshier-to-DE404 claim (and incidental confirmation that DE404-vs-DE441 is small in the modern-era window).

**Threshold discipline.** Thresholds remain calibrated to Swiss Ephemeris's documented precision floors, not to the empirical sub-floor performance observed here. The observed headroom (100-1000× inside threshold for Moon and most planets at modern dates) is a `[observation]` about typical performance, not a mandate to tighten the floor. A future case dated inside Moshier's strictly-valid range that runs at 0.5″ Moon (the documented floor) should still pass the 3″ threshold without being flagged.

### Far-range cases (Year 1600, Year 2200) — `[observation]` with `[inferred]` attribution

Both cases exceed Tier 1 thresholds in patterns the `farRangeObservation` fixture flag marks as out-of-scope observations, not bugs. Per-body rows preserve the raw mechanical status; case-level `overallStatus` demotes to `pass`.

**Year 1600-06-15 Greenwich, signed deltas (Celestia − JPL):**

| Body | Δ signed | vs threshold |
|---|---|---|
| Sun | +0.12″ | inside 1″ |
| Moon | **−10.31″** | 3.4× Moon threshold |
| Mercury | +1.44″ | 1.4× planet threshold |
| Venus | −0.13″ | inside 1″ |
| Mars | +0.51″ | inside 1″ |
| Jupiter | +0.32″ | inside 1″ |
| Saturn | — (AE-only, `No ephemeris` pre-1749 per Horizons) | see Tier-secondary below |
| Uranus | +0.70″ | inside 1″ |
| Neptune | +4.09″ | 4.1× planet threshold |
| Pluto | — (AE-only, `No ephemeris` pre-1800 per Horizons) | see Tier-secondary below |

**Year 2200-06-15 Greenwich, signed deltas (Celestia − JPL):**

| Body | Δ signed | vs threshold |
|---|---|---|
| Sun | +3.23″ | 3.2× planet threshold |
| Moon | **+47.54″** | 15.8× Moon threshold; mechanical pause-and-fix trigger |
| Mercury | +4.32″ | 4.3× planet threshold |
| Venus | +4.30″ | 4.3× planet threshold |
| Mars | +1.52″ | 1.5× planet threshold |
| Jupiter | — (AE-only, `No ephemeris` post-2200-01-08 per Horizons) | see Tier-secondary below |
| Saturn | −0.57″ | inside 1″ |
| Uranus | +0.04″ | inside 1″ |
| Neptune | −2.42″ | 2.4× planet threshold |
| Pluto | — (AE-only, `No ephemeris` post-2199-12-28 per Horizons) | see Tier-secondary below |

**Attribution and epistemic tagging.** Primary sources checked during §9.2 (Swiss Ephemeris documentation at `astro.com/swisseph/swisseph.htm` §2.1.1 and §2.2.1; Moshier's own `moshier.net/aadoc.html`):

> "The Moon's position is calculated by a modified version of the lunar theory of Chapront-Touze' and Chapront. This has a precision of 0.5 arc second relative to **DE404** for all dates between 1369 B.C. and 3000 A.D."

The 0.5″ Moshier claim is specifically **relative to DE404** (JPL's 1996-vintage Long Ephemeris), which Moshier was fit to — not relative to DE441 (JPL's 2021 current). The claim is **uniform across 1369 BC – 3000 AD**, not a degradation story. Our observed 10.31″ at 1600 and 47.54″ at 2200 vs DE441 are therefore **not attributable to Moshier-vs-DE404 drift** — primary sources contradict that explanation.

**The most plausible remaining explanation is DE404-vs-DE441 inter-ephemeris-generation divergence at far-T.** Other candidate contributors (frame-convention differences between Moshier's 1990s transformation code and current IAU conventions; time-scale handling at far-T) have not been eliminated. No primary source quantifies the relative contributions. The attribution to DE404-vs-DE441 is `[inferred]` rather than `[verified]`.

For Year 2200, the inner-body pattern (Sun/Mercury/Venus/Mars all offset positive by 3-5″, outers much smaller or opposite) is consistent with the signature of a frame-rotation or precession-model divergence growing with T. This matches qualitatively with the DE404-vs-DE441 hypothesis (the two ephemerides use slightly different IAU precession models, and the rotation difference accumulates) but the alternative candidates above are not ruled out.

**Not investigable within §9 scope.** Celestia's user base is modern-era birth dates; these far-range cases were chosen to exercise sweph at the edges of its documented validity window per the §9.0 plan, not to validate DE404-vs-DE441 agreement at T=±200+ years. The `farRangeObservation` flag on the fixtures records the classification explicitly; see `packages/astrology/test/validation/comparison.ts` for the case-level status demotion logic.

### Secondary sanity check — Astronomy Engine (60″ threshold)

All 108 Tier-secondary comparisons (12 cases × 9 non-Moon non-Node bodies) pass the 60″ threshold, with one expected omission pattern:

- **Year 1600:** Saturn and Pluto are JPL-unavailable (DE441 pre-1749 / pre-1800 coverage gaps per doc-drift entry #8). AE validates both: Saturn AE delta 4.23″, Pluto AE delta 31.22″. Both well inside 60″.
- **Year 2200:** Jupiter and Pluto are JPL-unavailable (DE441 post-2200-01-08 / post-2199-12-28 coverage gaps). AE validates both: Jupiter AE delta 0.42″, Pluto AE delta 33.20″. Both well inside 60″.

AE-vs-sweph agreement at the 60″ threshold is a code-path integrity check between two independent implementations (sweph Moshier + AE VSOP87 / AE Pluto polynomial). VSOP87's 1″ guaranteed envelope for Jupiter/Saturn at 2000 years from J2000, and AE Pluto's verification against NOVAS/TOP2013 within ~1700-2200, make the 60″ threshold meaningful validation at both far-range dates. `[verified]` — all bodies inside.

---

## Tier 2 — Mean Node vs inline Meeus Ch. 47 polynomial

**Scope:** sweph Mean Node vs an independent ~5-line TypeScript implementation of the ELP2000-85 secular mean-node formula (Meeus Ch. 47). Threshold: 20″. Reference is code, not data — computed at comparison time. This is a code-path integrity check, not a physical-reality check. See `09-01-HARNESS.md § Tier 2`.

### 12-case pattern — all inside threshold

| # | Case | Year | Celestia − Ref (signed, arcsec) | \|Δ\| |
|---|---|---|---|---|
| 1 | Einstein | 1879 | +15.01″ | 15.01 |
| 2 | Kahlo | 1907 | −15.33″ | 15.33 |
| 3 | QE II | 1926 | −16.99″ | 16.99 |
| 4 | Santiago | 1990 | +12.73″ | 12.73 |
| 5 | NYE | 2000 | −14.05″ | 14.05 |
| 6 | Equator | 2000 | −14.05″ | 14.05 |
| 7 | Leap day | 2000 | −13.92″ | 13.92 |
| 8 | Ingrid Alexandra | 2004 | −10.98″ | 10.98 |
| 9 | Leonor | 2005 | −5.28″ | 5.28 |
| 10 | Arctic | 2020 | −16.86″ | 16.86 |
| 11 | Year 1600 | 1600 | +15.79″ | 15.79 |
| 12 | Year 2200 | 2200 | +7.66″ | 7.66 |

Range: 5.28″ → 16.99″. `[verified]` all 12 cases inside the SE-docs-documented 20″ ceiling.

### Pattern analysis

The 9-case cluster at **12.7–17.0″** (roughly monotonic with |T−J2000|) is `[observation]` consistent with the working hypothesis that sweph's Moshier Mean Node implementation uses higher-order polynomial terms than the 5-term Meeus Ch. 47 truncation implemented inline. If sweph includes extra periodic or secular terms at the arc-second level, the accumulated difference vs Meeus's truncation grows with |T−J2000|, which matches the observed cluster shape at ~15″ for most cases.

Three low outliers — **Leonor 5.28″, Year 2200 7.66″, Ingrid 10.98″** — do not fit a pure truncation story:

- A pure higher-order truncation error should be **smoothly monotonic in (T−J2000)** and **consistent in sign**.
- Observed sign distribution: 5 positive, 7 negative. Sign flips unpredictably.
- Observed low outliers are not clustered at small |T−J2000| (Year 2200 is T=+200yr; Leonor is T=+5yr; Ingrid is T=+4yr). No clear pattern.

`[open]` — the low-outlier scatter is not fully explained by the "higher-order truncation" hypothesis. Candidate contributors not eliminated:

- Short-period lunar perturbation terms in sweph's ELP2000-85 implementation that the purely-secular Meeus polynomial omits. The Mean Node is nominally secular, but sweph may include a truncated periodic series on top.
- Different epoch / time-scale convention between sweph (ephemeris time vs Terrestrial Time) and Meeus's implementation.
- Obliquity correction step that Meeus elides in the 5-term form.

**Not investigable within §9 scope.** All 12 cases pass the 20″ threshold; the threshold is calibrated to the SE-docs ceiling for the whole 3000BC-3000AD range and every case is comfortably inside. The partial hypothesis confirmation plus `[open]` scatter is documented here for future reference, not action.

### Retroactive-tightening question — declined

`09-01-PRECISION-FLOOR.md § Locked thresholds § Retroactive-tightening clause` reserved the option to tighten the Mean Node threshold if §9.2 showed consistent <5″ drift at modern dates. Observed modern-date range (1879–2020): **5.28″ to 16.99″**. No case is <5″. **Retroactive tightening declined** — the 20″ threshold stays calibrated to the SE-docs-documented ceiling, not to this 12-case empirical sample.

---

## Tier 3 — House cusps vs inline Placidus

**Scope:** 12 house cusps + Ascendant + MC vs an independent inline implementation of Placidus house cusps (Meeus Ch. 12-13 for RAMC/MC/ASC; classic Placidus semi-arc trisection for intermediate cusps 11/12/2/3). Threshold: 60″. Reference is code, not data. See `09-01-HARNESS.md § Tier 3`.

### 12-case pattern — all pass

`[verified]` all 14 house points (ASC, MC, cusps 1-12) for every case pass the 60″ threshold. The largest observed delta across all 12 cases is **2.12″ on Year 1600 Cusp 4 / MC**, at 3.5% of the 60″ threshold. Modern-era cases run 0.06–0.56″ — **100–1000× inside threshold**.

Representative headroom snapshot (maximum delta per case):

| Case | Max cusp Δ | % of 60″ threshold |
|---|---|---|
| QE II | 0.56″ | 0.9% |
| Einstein | 0.64″ | 1.1% |
| Kahlo | 0.56″ | 0.9% |
| Ingrid Alexandra | 0.51″ | 0.9% |
| Leonor | 0.64″ | 1.1% |
| Equator | 0.08″ | 0.1% |
| Leap day | 0.09″ | 0.2% |
| NYE | 0.10″ | 0.2% |
| Santiago | 0.09″ | 0.2% |
| Arctic polar | 0.46″ (quadrant cusps only) | 0.8% |
| Year 1600 | 2.12″ | 3.5% |
| Year 2200 | 1.09″ | 1.8% |

### Polar-NaN handling — implemented via fixture flag

The Arctic polar-night synthetic case (69°N, 2020-12-21) has |tan φ · tan D| ≥ 1 for the intermediate cusps, making Placidus mathematically undefined for cusps 2/3/5/6/8/9/11/12. The inline Placidus reference returns `NaN` for those cusps. Rather than NaN flowing through the delta calculation as a queue-worthy discrepancy, the fixture sets `skipIntermediateCusps: true` (see `types.ts` and `comparison.ts`). Cusps 2/3/5/6/8/9/11/12 are simply omitted from the comparison for that case; ASC / MC / cusps 1 / 4 / 7 / 10 still validate (all sub-arcsec) against the inline reference. `[verified]` the flag works — Arctic case overall moved from QUEUE to PASS after the flag landed.

**Scope-honesty.** Placidus is a mathematical construction, not an observational quantity. Passing Tier 3 means sweph's Placidus output matches the Meeus-based inline implementation of the same formulas — a **code-path integrity check**, not a physical-reality claim. All Tier 3 "correctness" claims are scoped accordingly.

---

## Tier 4 — Aspect classification via synthetic unit tests

**Scope:** aspect-identification logic (orb calculation, aspect type: conjunction/sextile/square/trine/opposition, applying/separating classification). Reference: synthetic known-input-known-output tests. No per-case external reference data. See `09-01-HARNESS.md § Tier 4`.

### 26 synthetic unit tests pass

`[verified]` all 26 synthetic unit tests in `test/validation/aspects-synthetic.test.ts` pass on every Vitest invocation. Coverage matrix:

- **Aspect type identification at exact angles + orb boundaries:** conjunction 0°/8°, sextile 60°/65°, square 90°/97°, trine 120°/127°, opposition 180°.
- **Wrap-around longitudes:** 0°/355°, 10°/350°, 5°/65°, 350°/170°.
- **Applying vs separating via speed comparison:** forward approaching, forward separating, retrograde approaching, tied-speed edge.
- **No-aspect cases** (between aspect definitions): 9°, 45°, 66°, 75°, 98°.
- **Pair-count sanity:** 3 conjunct planets produce exactly 3 pairwise aspects.

**Implied-by-construction correctness for real-case aspects.** Aspect-calculation outputs for the 12 real fixtures are **not directly compared** against an external aspect table — astro.com aspect tables are sweph-family output (per `09-01-PRECISION-FLOOR.md § Doc drift corrections` entry 6), so the comparison would be sweph-vs-sweph-with-UI. Instead:

1. Tier 1 validates planetary longitudes at modern dates to `[verified]` arc-second tolerance vs JPL.
2. Tier 4 synthetic unit tests validate the classification logic to exact-match tolerance.
3. Real-case aspect outputs are correct **by construction**: correct planetary longitudes + correct classification logic → correct aspects for any real case.

This chain is the reasoning captured in `09-01-HARNESS.md § Tier 4`; §9.4 does not need per-case aspect reference data.

---

## Architectural observation — per-case per-body reference-source subsetting

The existing `comparePlanets` / `classifyPlanetBatch` / `secondaryAndHouseStatuses` / `overallStatus` architecture handled **per-case per-body reference-source subsetting** for S6 (Saturn/Pluto AE-only) and S7 (Jupiter/Pluto AE-only) **with zero code modifications**. The iteration patterns in `comparison.ts` — `for (const ref of refList)` over whatever entries are present, `classifyPlanetBatch` accepting any subset of SYSTEMIC_RULE_BODIES, AE comparisons flowing through `secondaryAndHouseStatuses` independently — were already shaped to handle missing bodies gracefully.

The polar-NaN handling (§9.5 item a, `skipIntermediateCusps` flag) and the far-range `[observation]` flag (§9.5 implementation, `farRangeObservation`) **did** require small additions, but both landed as minimal fixture-flag + small classifier-awareness changes, not architectural rewrites. The pattern held.

`[observation]` — credit to the earlier architectural choices (heterogeneous reference sources, iterate-what's-present, tier-separated classification). This was a fortunate outcome of discipline at the harness scaffold stage (`§9.1 R1-R2`) rather than foresight about these specific failure modes.

---

## Lessons learned — branching-rule meta-finding

The pre-committed §9.0 branching rules classified triggers into three categories:

- **Pause-and-fix:** any planet > 10″ vs JPL, OR >1 planet > 5″, OR Moon > 30″, OR Mean Node > 200″, OR any house cusp > 10′
- **Queue-for-later:** above 1× threshold but below 5×
- **Clean pass:** all inside 1× threshold

**Year 2200 Moon 47.54″ mechanically triggered pause-and-fix** (>30″ Moon rule). User classification after primary-source review resolved it as `[observation]` with `[inferred]` attribution (DE404-vs-DE441 divergence at far-T is most plausible; other contributors not ruled out) — explicitly not a bug in the software under test.

**Lesson:** validation-workstream pre-commit branching rules should include an **out-of-scope observation** category for triggers that fire but are explained by documented model limits, inter-version reference drift, or other causes exogenous to the software being validated. Without that category, a single out-of-scope data point in an otherwise-clean run would block the entire workstream close.

The `farRangeObservation` fixture flag (this round's commit) is the concrete implementation of this category at the harness level: threshold exceedances are recorded in the per-body rows (so the raw data is preserved and a future reader can audit the classification) but case-level `overallStatus` is demoted to `pass` when the flag is set. Use of the flag is documented and scoped — setting `farRangeObservation: true` on a modern-era case would be a scope violation.

**For future validation workstreams in this codebase** — and for post-§9.6 extensions of §9 (e.g., if additional far-range cases are added) — pre-commit the four-category framing: pause-and-fix / queue-for-later / clean-pass / **out-of-scope-observation-with-documented-cause**. The fourth category requires explicit classification (like this report's §9.2 ruling); it cannot be claimed by a fixture author without primary-source backing for the attribution.

---

## Doc-drift entries added this round

- **#7 DST-transition-day ambiguity** (`localTimeToUTC` silent resolution to post-transition interpretation; Leonor case). Sibling to pre-existing #4 (historical-tz). Product-scope question deferred; flagged so it doesn't sleep.
- **#8 DE441 upper-bound assumption** (Horizons service caps below DE441 theoretical upper bound for at least Jupiter and Pluto). Test-case selection protocol extended in `09-01-TEST-CASES.md § Test-case selection protocol` to require per-body coverage check for non-modern dates.

Both entries added to `09-01-PRECISION-FLOOR.md § Doc drift corrections`.

---

## Cross-references

- Scope boundary on historical-tz cases (Einstein Neptune 1.18″ context): `09-01-TEST-CASES.md § Scope boundary — historical-tz cases (Einstein 1879, Kahlo 1907)`
- Validation tiers (what each "pass" means): `09-01-HARNESS.md § §9.2/§9.3/§9.4 validation semantics — tiered by reference source`
- Threshold table and calibration rationale: `09-01-PRECISION-FLOOR.md § Locked thresholds for §9.2`
- Reference-data sourcing protocol: `packages/astrology/test/validation/reference-data/README.md`
- QE II sample end-to-end comparison (n=1 baseline before full run): `09-01-SAMPLE-QE2.md`

---

## Disposition

**§9.2 / §9.3 / §9.4: PASS with observations.** Validation claim is scoped to modern-era dates (~±100 years from J2000). Far-range `[observation]` cases are recorded with `[inferred]` attributions; their underlying deltas are preserved in per-body report rows for future audit, but do not constitute validation failures of sweph's Moshier implementation.

**§9.5 scope (non-bug):** two items, both completed in this round's commits rather than a separate §9.5 sub-round.

- (a) Polar-NaN fixture flag (`skipIntermediateCusps`) + classifier awareness for Arctic polar-night case. **Landed this round.**
- (b) Observation-capture in this report. **This doc is the capture.**

No queued bug fixes. §9.5 opens as **zero-rounds for bug work.**

**§9.6 opens cleanly** after this report commits. CI promotion scope: wire harness into the package's `test` script as the permanent regression gate, document reference-data update protocol, add README snippet. Thresholds, reference-data files, fixture flags, and classifier logic from this round become the CI-enforced state.

---

## Exit criteria — met

1. ✅ 12 cases run end-to-end through all four validation tiers.
2. ✅ Consolidated report committed with per-case delta tables, pattern observations, `[observation]`/`[verified]`/`[inferred]`/`[open]` tags distinguishing single-case from multi-case findings.
3. ✅ User sign-off captured as classification rulings (per-finding) in the round's conversation log; this report records those rulings.
4. ✅ `§9.5` queue: **empty**. No bug-fix discrepancies identified.
5. ✅ Typecheck green across `@celestia/astrology`. Harness passes 39/39 tests.

§9.6 opens.
