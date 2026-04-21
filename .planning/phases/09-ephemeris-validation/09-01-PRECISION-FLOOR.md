# §9.1 — Precision-floor investigation and locked thresholds

**Opened:** 2026-04-20
**Status:** user-approved 2026-04-20. Thresholds locked. Unblocks §9.1 harness scaffold + test-case list + sample comparison.
**Scope:** the "first action in §9.1" from the opening planning message — verify the ephemeris backend actually in use, report the library's precision floor, lock §9.2 thresholds that are defensible given that floor.

**Epistemic tags used:** `[verified]` (observed in code or quoted from primary doc), `[inferred]` (reasoning from observations), `[user-decision]` (authority is the user's direct call).

---

## Doc drift corrections (2026-04-20, same class as DRIZZLE_DECISION.md §9 reversal)

1. **Planning docs repo-wide reference "swisseph-wasm"** — shipped dep is `sweph` (native N-API).
2. **`COMPETITOR_ANALYSIS.md:501` claims topocentric Moon as a Celestia precision feature** — removed from code at `calculator.ts:42-45`, caused ~27′ parallax shift.
3. **`COMPETITOR_ANALYSIS.md:211, 501, 531` position True Node as a precision differentiator** — per §9.1 decision, Celestia switched to Mean Node because True Node under Moshier (~70″) is ~14× less precise than Mean Node at modern dates (<5″ empirical, 20″ worst-case ceiling per Swiss Ephemeris docs).
4. **`localTimeToUTC` handles pre-standardized-tz historical birth dates via modern civil-zone interpretation**, which produces incorrect UTC for any birth date predating the region's timezone standardization. Discovered 2026-04-20 during §9.1 test-case fixture commit (Einstein 1879 Ulm + Kahlo 1907 Coyoacán). **Scope of impact:** any user entering a birth date predating the local civil-timezone standardization (roughly pre-1880 in Western Europe, pre-1920 in the Americas, varies elsewhere — Bulgaria adopted Europe/Sofia in the 1879-1894 range). **Technical fix:** extend `localTimeToUTC` with an LMT branch for pre-standardized-tz dates, looked up by longitude rather than civil zone. **Product-scope question:** does Celestia intend to support historical/ancestor birth charts as a feature? Currently no product copy claims this capability (founder-verified 2026-04-20). If the answer is "no, historical charts are out of scope," the fix is to add an input-validation boundary rejecting pre-1920 birth dates with a clear Bulgarian-language error. If the answer is "yes eventually," the fix is the LMT branch. Decision deferred; flagged so it doesn't sleep. **If marketing adds copy about historical/ancestor charts, this deferral converts to a pre-launch blocker.**
5. **Threshold table mislabel — Mean Node reference source.** During §9.1 JPL adapter work, discovered that `09-01-PRECISION-FLOOR.md`'s threshold table mislabeled Mean Node's reference source as "JPL" — JPL doesn't produce Mean Node at all (only instantaneous osculating ascending node, which would be ~True Node). Corrected 2026-04-20 to "Meeus Ch. 47 polynomial" with explicit scope-honesty language (see `09-01-HARNESS.md § Node validation — explicit scope`). Threshold value (20″) unchanged; the source label was wrong, the number was right. **Inline-vs-per-case asymmetry:** Mean Node reference is ~5 lines of TypeScript code inline in the harness (landing with §9.2 code); per-case reference-data files omit the `northNode` entry in their `planets.jpl` arrays. Documented in `packages/astrology/test/validation/reference-data/README.md § Mean Node — inline-reference asymmetry` so a future reader doesn't try to find a `northNode` reference snapshot and think it's missing. Validation constant renamed from `JPL_THRESHOLDS_ARCSEC` to `PRIMARY_THRESHOLDS_ARCSEC` in `thresholds.ts` so the name doesn't bake in the incorrect JPL framing.
6. **§9.0 plan assumed astro.com is an independent reference source for houses and aspects.** Verified during §9.1 task 5c: astro.com uses Swiss Ephemeris internally, so house-cusp and aspect comparisons against astro.com are sweph-family comparisons, not independent-implementation comparisons. This invalidates the originally-planned §9.3 and §9.4 reference-data sourcing protocol. **Corrected during §9.1:** astro.com demoted from primary reference to optional spot-check tertiary; houses validated via an independent inline Placidus implementation (same pattern as Mean Node's Meeus polynomial); aspects validated arithmetically from §9.2-validated planetary longitudes plus synthetic unit-test inputs for orb/type/applying-separating classification logic. This restructures §9.3 / §9.4 around code-path-integrity checks where the input data (planets) is the physical-reality anchor; houses + aspects inherit correctness from correct inputs + correct code. See `09-01-HARNESS.md § §9.2/§9.3/§9.4 validation semantics — tiered by reference source` for the full tiered architecture.
7. **`localTimeToUTC` DST-transition-day ambiguity.** Discovered 2026-04-21 during §9.2 fixture generation (Leonor 2005-10-31 01:46 Madrid). The 01:00-03:00 local hour on a DST fall-back day is genuinely ambiguous — the same wall-clock local time refers to two distinct UTC instants (pre-transition at UTC+2 / CEST, post-transition at UTC+1 / CET). Celestia's `localTimeToUTC` via `geo-tz` + `Intl.DateTimeFormat` probe resolves the ambiguity to the **post-transition interpretation** (CET for Leonor, i.e., `00:46 UTC` on 2005-10-31) rather than the pre-transition interpretation (CEST, i.e., `23:46 UTC` on 2005-10-30) without user input or documentation of the choice. **Scope of impact:** any user born in the 01:00-03:00 local window on a DST fall-back day gets a chart based on one of two defensible UTC interpretations, silently. Sibling case to historical-tz (entry 4): both are `localTimeToUTC` semantic gaps where input disambiguation is absent. **Product-scope question:** should Celestia (a) gate this input window during onboarding with a Bulgarian-language "please specify pre- or post-transition" prompt, (b) document the deterministic choice so at least it's not silent, or (c) flag in chart metadata when the birth time is DST-ambiguous? Decision deferred; flagged so it doesn't sleep. **If product copy ever positions Celestia as handling edge-case birth times with care, this deferral converts to a pre-launch blocker.**
8. **DE441 upper-bound assumption in §9 planning docs.** Planning docs referenced DE441's theoretical upper bound (~17000 CE per SE docs, with the "13,200 BC to 17,191 AD" figure cited in Park 2021's DE440/DE441 AJ paper). Verified 2026-04-21 during §9.2 S7 coverage check: JPL Horizons' serving of DE441 returns `Jupiter` ephemeris ending `2200-01-08 23:58:50.8159 UT` and `Pluto` ending `2199-12-28 23:58:50.8163 UT`. Other bodies may also have caps below DE441's theoretical upper bound that have not been surveyed. Symmetric finding to the pre-1800 historical-body gap uncovered in S6 (Saturn pre-1749, Pluto pre-1800). Not a Celestia-user issue (Celestia supports modern-era birth dates only), but documented so future test-case selection for far-from-modern dates requires per-body coverage verification on both ends. **Test-case selection protocol extension:** any test case outside the ~1900-2100 window requires a pre-selection JPL Horizons per-body coverage check (both lower and upper bounds) before JPL is used as the Tier 1 reference. Captured in `09-01-TEST-CASES.md § Test-case selection protocol`.

Full cleanup pass deferred to post-§9.6 — this breadcrumb exists so future readers searching for "swisseph-wasm," "topocentric Moon," "True Node precision," "historical-tz / LMT," "Mean Node reference source," "astro.com independence," "DST-transition ambiguity," or "DE441 upper bound" find the trail.

---

## Findings summary

1. **Library identity: `sweph` v2.10.3-b-1 (native Node N-API bindings), not `swisseph-wasm`.** `[verified]` — `packages/astrology/package.json` dependency list; `packages/astrology/node_modules/sweph/package.json` name + version; `binding.gyp` confirms native C/C++ add-on build.
2. **Ephemeris mode: Moshier (`SEFLG_MOSEPH`), exclusively.** `[verified]` — only flag combination used in `packages/astrology/src`; `calculator.ts:46` and `transit.ts:113` both pass `SEFLG_MOSEPH | SEFLG_SPEED` to `sweph.calc_ut`. No `set_ephe_path()` call anywhere in `@celestia/astrology`. No `.se1` or JPL data files are bundled with the `sweph` package (sweph README: *"This library does not include any ephemeris files by default"*).
3. **Moshier precision floor is not uniform across bodies.** Planets ≤1″ vs JPL; Moon "a few arc seconds"; True Node ~70″; Mean Node <20″ worst-case over full range (≪5″ at modern dates). `[verified]` — quoted below from the Swiss Ephemeris official documentation.
4. **Node-type decision: Mean Node.** `[user-decision]` `constants.ts:118` changed from `northNode: 11 // SE_TRUE_NODE` to `northNode: 10 // SE_MEAN_NODE` in this round's atomic commit. Rationale: True Node's ~70″ Moshier floor is incompatible with validation at arc-second tolerances; Mean Node's <5″ modern-date floor is compatible with a 20″ threshold that gives meaningful regression-detection.

---

## Evidence — library identity

`[verified]` `packages/astrology/package.json`:

```json
"dependencies": {
  "geo-tz": "^8.1.6",
  "sweph": "^2.10.3-4"
}
```

`[verified]` `packages/astrology/node_modules/sweph/package.json`: name `"sweph"`, version `"2.10.3-b-1"`, "Equivalent to Swiss Ephemeris version: 2.10.03b revision 1".

`[verified]` `packages/astrology/node_modules/sweph/binding.gyp` present; sweph README explicitly: *"This library is a C/C++ add-on designed for Node.JS only, it will not work in browsers"*. Runtime path is native bindings, never WebAssembly.

## Evidence — Moshier mode in use

`[verified]` Only two places in `@celestia/astrology/src` set ephemeris flags, and both choose Moshier:

- `packages/astrology/src/calculator.ts:46` — `const flags = sweph.constants.SEFLG_MOSEPH | sweph.constants.SEFLG_SPEED`
- `packages/astrology/src/transit.ts:113` — same flag combination.

`[verified]` `calculator.ts:4-6` source comment: *"All calculations use the Moshier ephemeris (built-in, no external files needed)."*

`[verified]` No `set_ephe_path` call in `packages/astrology/src` (grep across src tree for `set_ephe_path` and `SEFLG_SWIEPH` / `SEFLG_JPLEPH`: zero hits).

`[verified]` Houses: `sweph.houses(jd, lat, lon, HOUSE_SYSTEM_PLACIDUS)` at `calculator.ts:164` — takes no ephemeris flag. House computation in the Swiss Ephemeris depends on sidereal time / Earth rotation, **not** on planetary ephemeris tables. Moshier-vs-SE-files does not affect house output. `[inferred]` — from Swiss Ephemeris source (`swehouse.c`) and the `sweph.houses` signature not accepting flags.

## Evidence — Moshier precision floor (planets and Moon)

`[verified]` Quoted verbatim from the Swiss Ephemeris official documentation (`https://www.astro.com/swisseph/swisseph.htm`, Moshier section):

> "Its deviation from JPL is below 1 arc second with the planets and a few arc seconds with the Moon."

> "The Moon's position is calculated by a modified version of the lunar theory of Chapront-Touze' and Chapront. This has a precision of 0.5 arc second relative to DE404 for all dates between 1369 B.C. and 3000 A.D."

> "The Moshier Ephemeris covers the interval from 3000 BCE to 3000 CE."

> "the adjustment for the inner planets is strictly valid only from 1350 B.C. to 3000 A.D., but may be used to 3000 B.C. with some loss of precision"

> "The advantage of the Moshier mode of the Swiss Ephemeris is that it needs no disk storage. Its disadvantage, besides the limited precision, is reduced speed: it is about 10 times slower than JPL mode and the compressed JPL mode."

`[verified]` Source-level date-range defines (`packages/astrology/node_modules/sweph/swisseph/sweph.h:219-222`), active branch:

```
#define MOSHPLEPH_START  625000.5    // JD, roughly 3001 BC
#define MOSHPLEPH_END   2818000.5    // JD, roughly 3000 AD
#define MOSHLUEPH_START  625000.5
#define MOSHLUEPH_END   2818000.5
```

`[verified]` Synthetic-case date-range check against those defines:
- Year **1600** → JD ≈ 2305448 → **inside** Moshier range. OK.
- Year **2200** → JD ≈ 2524593 → **inside** Moshier range. OK.

## Evidence — Moshier precision floor (lunar nodes)

`[verified]` Quoted verbatim from the Swiss Ephemeris official documentation (`https://www.astro.com/swisseph/swisseph.htm`, lunar nodes section):

> **Mean Node vs ELP2000-85:** *"its deviation from the mean node of ELP2000-85 is 0 for J2000 and remains below 20 arc seconds for the whole period."*

> **Mean Node vs DE431 extension:** *"Estimated precision is 1 arcsec, relative to DE431."*

> **True Node differences:**
> - JPL-derived vs Swiss Ephemeris-derived: *"~ 0.1 arc second"*
> - JPL-derived vs Moshier-derived: *"~ 70 arc seconds"*

> **Precision warning:** *"If you want a precision of the order of at least one arc second, you have to choose either the JPL or the Swiss Ephemeris."*

> **Node-type semantics:** *"In the strict sense of the word, even the 'true' nodes are true only twice a month"* (when the Moon crosses the ecliptic); monthly oscillations between those passages.

`[verified]` Empirical constant check: `packages/astrology/node_modules/sweph/constants.js:25` → `SE_MEAN_NODE = 10`; line 26 → `SE_TRUE_NODE = 11`. Prior `constants.ts:118` used id 11 (True Node); this round's commit switches to id 10 (Mean Node).

---

## Locked thresholds for §9.2

### Primary threshold — reference source is heterogeneous across bodies

| Body | Threshold | Reference source | Queue-for-later trigger | Pause-and-fix trigger |
|---|---|---|---|---|
| Sun + 7 planets (Mercury through Pluto) | **1″** | JPL Horizons (physical-reality) | any planet >1″, all ≤5″ | any planet >10″ **OR** >1 planet >5″ |
| Moon | **3″** | JPL Horizons (physical-reality) | >3″ but ≤15″ | >30″ **OR** >1 trigger across bodies |
| Mean Node | **20″** | sweph Mean Node vs. Meeus Ch. 47 polynomial (independent implementation of the same ELP2000-85 secular formula used by sweph's Moshier mode) | >20″ but ≤100″ | >200″ |

See `09-01-HARNESS.md § Node validation — explicit scope` for the epistemic qualifier on the Mean Node row (code-path integrity check, not physical-reality check) and `§ §9.2 validation semantics — tiered by reference source` for the planet/Moon-vs-Node distinction.

**Trigger scope:**
- The *"any planet / >1 planet"* systemic-issue rule applies only to the **9 non-Moon non-Node bodies** (Sun + 7 planets).
- Moon and Mean Node trigger independently. A threshold miss on the Moon or Node does not compose with the planet-systemic rule.

**Retroactive-tightening clause (Mean Node only):** the 20″ threshold reflects the worst-case ceiling Swiss Ephemeris documents across the full Moshier range. At modern birth dates (post-1950, the vast majority of Celestia's target users), actual Mean Node drift is expected in the low single-digit arc-seconds. If §9.2 runs show consistent <5″ drift at modern dates, the threshold can be retroactively tightened and the change re-committed with the supporting numbers.

### Secondary sanity check (vs Astronomy Engine)

| Body | Threshold vs Astronomy Engine | Scope note |
|---|---|---|
| Sun + 7 planets | **1′ (60″)** | sanity check only — Astronomy Engine's stated ±1′ accuracy means a tighter threshold is not meaningful |
| Moon | **not checked** | Astronomy Engine's 1′ accuracy spec is coarser than the Moon's 3″ primary threshold; it cannot meaningfully validate the Moon at that level |
| Mean Node | **not checked** | same rationale — 1′ spec > 20″ Node threshold |

Document this scope-limitation explicitly in the harness README so future readers don't wonder why Moon/Node have only one reference source.

### House and aspect thresholds (unchanged from original proposal)

| Dimension | Threshold vs astro.com | Notes |
|---|---|---|
| House cusps (12 cusps + ASC + MC) | 1′ (60″) | house math independent of ephemeris mode (no flag on `sweph.houses`) |
| Aspect orbs | 1′ (60″) | worst-case 3″ Moon noise is 5% of this threshold — inside budget |
| Aspect type identification | exact match | conjunction / sextile / square / trine / opposition |
| Applying / separating classification | exact match | via speed-comparison; verify semantic matches astro.com convention |

---

## Rationale — why Mean Node over True Node

Product context: `COMPETITOR_ANALYSIS.md:211, 501, 531` previously positioned True Node as a Celestia precision differentiator vs competitors using Mean Node. The marketing frame was written assuming the ephemeris backend could deliver sub-arc-second True Node precision. Under the shipped Moshier mode, that assumption is false — True Node's ~70″ Moshier floor is ~14× less precise than Mean Node's <5″ modern-date floor.

Switching to Mean Node:

- **Restores arc-second-level precision** for the node in the validated output. A 20″ threshold with expected <5″ actual drift is meaningful regression-detection; a 60″ threshold permanently parked at the ~70″ True Node floor is theatre.
- **Matches astro.com / TimePassages default behaviour** for cross-user chart comparison. Users checking their Celestia chart against those tools will see agreement, not a systematic mismatch.
- **Requires marketing copy revision** in the post-§9.6 cleanup pass. Either drop the Node-based precision claim entirely, or reframe as "Mean Node for classical-astrology agreement." Product decision on framing; this report flags it but does not resolve it.

The Swiss Ephemeris advisory *"In the strict sense of the word, even the 'true' nodes are true only twice a month"* reinforces the choice — monthly oscillation in the "true" node is arguably more noise than signal for chart-interpretation at UI precision, independent of the ephemeris-backend question.

---

## What is now unblocked

- Harness scaffold at `packages/astrology/test/validation/` — fixture loader, threshold config file (single source of truth for the table above), comparison runner with human-readable output. Vitest-picked-up automatically, no separate package. Atomic commit, separable from the sample-comparison commit.
- AA-rating verification for Einstein via Astro-Databank. Propose 2-4 additional AA-rated candidates (vary latitude, era, hemisphere) with Rodden ratings and birth-data sources. Surface for user approval before reference-data sourcing for those cases. Einstein drops from the set if Astro-Databank does not confirm AA rating.
- JPL Horizons API adapter sketch — how to query planetary positions for a given (UTC instant, set of bodies), how to parse the response, where to commit reference-data snapshots.
- Astronomy Engine integration — `astronomy-engine` npm package install + call; flag any API-surface differences that complicate comparison logic.
- astro.com transcription protocol for 8-10 cases — exact fields to transcribe, commit format, spot-check procedure for catching transcription errors on the first discrepancy pass.
- One reference case against a known-good native-Swiss-Ephemeris tool (not astro.com) — identification is part of §9.1 sourcing work; if harder to find than expected, flag rather than guess.
- Sample end-to-end comparison using Queen Elizabeth II (AA-rated, no verification needed). Full tiered-threshold comparison output surfaced for user review before §9.2 opens.

## Exit criteria for §9.1

1. Harness scaffold committed with threshold config wired to the locked table above.
2. Test-case list user-approved (Einstein AA-verification + 2-4 additions + 7 synthetic + 1 reference case).
3. Reference-data sourcing plan documented and user-reviewed (JPL adapter, Astronomy Engine integration, astro.com transcription protocol).
4. Sample comparison output for Queen Elizabeth II reviewed by user.
5. User signs off: *"proceed to §9.2."*
