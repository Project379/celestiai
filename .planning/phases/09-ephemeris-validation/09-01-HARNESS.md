# §9.1 — Harness validation semantics and reference-source architecture

**Opened:** 2026-04-20
**Status:** companion doc to `09-01-PRECISION-FLOOR.md` and `09-01-TEST-CASES.md`. Low-traffic — read when you need to understand what §9.2 / §9.3 / §9.4 are actually measuring.

## Scope of this doc

Documents the semantic distinction between different kinds of "pass" a test case can produce and the explicit scope of each reference source. Complements:

- `09-01-PRECISION-FLOOR.md` — locked threshold values, precision-floor evidence, doc-drift tracker
- `09-01-TEST-CASES.md` — test-case list and scope boundaries
- `packages/astrology/test/validation/README.md` — harness code layout
- `packages/astrology/test/validation/reference-data/README.md` — reference-data protocol

---

## §9.2 / §9.3 / §9.4 validation semantics — tiered by reference source

Four distinct validation tiers, each measuring something different. A "pass" in one tier does not imply the same epistemic strength as a pass in another.

### Tier 1 — Planet/Moon longitudes vs JPL Horizons (§9.2)

**Scope:** Sun + Mercury through Pluto + Moon (10 bodies).
**Reference:** JPL Horizons Observer Ecliptic Longitude — a physical-reality reference anchored on decades of observations (planetary radar, spacecraft tracking, lunar laser ranging).
**What a pass means:** `sweph`'s Moshier-mode output matches the physical position of the body as JPL Horizons reports it, to the locked threshold (1″ for planets, 3″ for Moon).
**What a pass does not mean:** it does not cross-validate the *architectural integration* (chart inputs → tz handling → JD → sweph flags). A planet-position pass implies the library-call integration is correct for the computed JD, but it does not re-verify Celestia's JD derivation for pre-standardized-tz cases (see `09-01-TEST-CASES.md § Scope boundary — historical-tz cases`).

### Tier 2 — Mean Node vs Meeus Ch. 47 polynomial (§9.2)

**Scope:** Mean Node only.
**Reference:** independent inline implementation of the Meeus Ch. 47 polynomial for ELP2000-85's secular mean-node formula. Not an external tool; ~5 lines of TypeScript in the harness.
**What a pass means:** `sweph`'s polynomial code is transcribed/implemented correctly — it matches the same formula when the formula is implemented independently.
**What a pass does not mean:** it does not validate the polynomial's agreement with physical reality — the underlying ELP2000-85 model's ~20″ fit to lunar laser ranging observations is trusted, not tested. This is a **code-path integrity check against the same mathematical formula `sweph` uses**.

### Tier 3 — House cusps vs inline Placidus implementation (§9.3)

**Scope:** 12 house cusps + Ascendant + MC.
**Reference:** independent inline implementation of Placidus formulas (from Meeus Ch. 13 / equivalent). Not an external tool; the reference is computed at comparison time from each case's inputs (JD, lat, lon).
**What a pass means:** `sweph.houses()`'s Placidus output matches the Placidus formulas when implemented independently.
**What a pass does not mean:** Placidus is a *mathematical construction*, not an observational quantity. There is no "physical reality" house-cusp position to compare against. All "correctness" claims for houses are **code-path-integrity claims, not physical-reality claims**.

**Why no astro.com comparison:** astro.com uses Swiss Ephemeris internally. An astro.com comparison is sweph-vs-sweph with a different UI, not sweph-vs-independent. Demoted to optional post-§9.6 spot-check. See `09-01-PRECISION-FLOOR.md § Doc drift corrections` entry 6.

### Tier 4 — Aspect classification via synthetic unit tests (§9.4)

**Scope:** `calculateAspects`'s aspect-identification logic — orb calculation, aspect type (conjunction/sextile/square/trine/opposition), applying/separating classification.
**Reference:** synthetic known-input-known-output tests. No per-case external reference data.
**What a pass means:** the aspect-classification code is correct for the synthetic test matrix (boundary conditions: exact 0°/60°/90°/120°/180°, inside-orb, outside-orb, speed-sign flips for applying/separating).
**What a pass does not mean:** it does not test aspect correctness for any specific real case's output. That is **implied by construction**: if §9.2 planetary longitudes pass, aspects computed from those longitudes are correct (aspects are arithmetic functions of planetary longitudes and speeds). The synthetic tests exist to rule out bugs in the classification logic itself.

### Secondary — Astronomy Engine sanity check (§9.2)

**Scope:** 9 non-Moon non-Node bodies (Astronomy Engine's ±1′ spec is coarser than Moon's 3″ and Node's 20″ primary thresholds, so it cannot meaningfully validate them).
**Reference:** local `astronomy-engine` npm computation (VSOP87-based).
**What a pass means:** `sweph`'s and Astronomy Engine's independent implementations of major-planet ephemerides agree to 1′.
**Epistemic weight:** lighter than Tier 1 (JPL is anchored on observations; Astronomy Engine is anchored on VSOP87 theory fit to JPL ephemeris). If Tier 1 passes and Tier secondary fails, Tier 1's physical-reality verdict wins.

---

## Reporting convention

When reporting §9.2 / §9.3 / §9.4 results (in a planning doc, commit message, PR description, or status update), preserve the tier:

- **"Planet X passes / fails vs JPL Horizons"** — Tier 1 physical-reality check.
- **"Moon passes / fails vs JPL Horizons"** — Tier 1 physical-reality check.
- **"Mean Node passes / fails vs Meeus Ch. 47 polynomial"** — Tier 2 code-path check.
- **"Cusp N (or ASC, MC) passes / fails vs inline Placidus implementation"** — Tier 3 code-path check.
- **"Aspect classification passes / fails synthetic unit tests"** — Tier 4 code-path check.

Avoid shortcuts that flatten the tier ("all checks pass", "validation complete", "§9 correct") — they lose the epistemic distinction a reviewer needs to interpret the result correctly. A reviewer who reads "all checks pass" and treats that as "this library matches physical reality to arc-second tolerance" is over-claiming based on Tier 3 + Tier 4 code-path-integrity checks that do not support that interpretation.

---

## Implementation placement summary

| Tier | Reference implementation | Per-case reference-data file |
|---|---|---|
| 1 — Planets/Moon vs JPL | External: JPL Horizons API (adapter: `adapters/jpl-horizons.ts`). Snapshots committed per-case under `reference-data/<case>.ts` as `planets.jpl`. | Yes — `planets.jpl` array. |
| 2 — Mean Node vs Meeus | Inline harness code (file TBD at §9.2 implementation time, ~5 lines). | No — computed at comparison time. |
| 3 — Houses vs inline Placidus | Inline harness code (file `adapters/placidus-meeus.ts` or equivalent, ~20 lines). | No — computed at comparison time from case's lat/lon/JD. |
| 4 — Aspect classification | Inline harness unit tests (file `aspects-synthetic.test.ts`, separate from per-case harness). | No — no per-case reference. |
| Secondary — AE sanity | External: `astronomy-engine` npm package (adapter: `adapters/astronomy-engine.ts`). Snapshots committed per-case under `reference-data/<case>.ts` as `planets.astronomyEngine`. | Yes — `planets.astronomyEngine` array. |

Per-case reference-data files contain only what's externally-sourced (JPL, AE, optionally astro.com if spot-checked later). Meeus polynomial and inline Placidus computations happen at runtime in the harness; they are code, not data.
