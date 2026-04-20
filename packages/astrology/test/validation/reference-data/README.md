# Reference data

Each test case gets a `.ts` file exporting a single named `referenceData` constant, keyed by the same `id` as the corresponding fixture.

```ts
import type { ReferenceData } from '../types'

export const referenceData: ReferenceData = {
  caseId: 'queen-elizabeth-ii',
  planets: {
    jpl: [
      { body: 'sun', longitude: 30.123456 },
      { body: 'moon', longitude: 122.987654 },
      // ... one entry per body
    ],
    astronomyEngine: [
      { body: 'sun', longitude: 30.12344 },
      // ... 9 non-Moon non-Node bodies only (scope-limited — see below)
    ],
  },
  houses: {
    astrocom: {
      cusps: [/* 12 cusp longitudes in order 1..12 */],
      ascendant: 123.456,
      mc: 234.567,
    },
  },
  aspects: {
    astrocom: [
      {
        body1: 'sun',
        body2: 'moon',
        type: 'square',
        orb: 2.34,
        applying: false,
      },
    ],
  },
}
```

## All fixture entries are [reference-dependent — Astro-Databank]

Every test case's birth-data ultimately traces to an Astro-Databank entry (directly or via Astro-Databank's cited sources). Astro-Databank is a human-curated astrology database with its own error rate. The `sources` array in each fixture cites the Astro-Databank URL; a future reader should treat these as "the rating Astro-Databank assigned at commit time," not as independent certification.

Stronger verification would require cross-referencing against Rodden's own published rating system (Lois Rodden's original publications). The cost is high relative to the benefit for §9's purposes; the current chain of trust is accepted with this tag.

## Sources and scope

| Source | Scope | Threshold | Notes |
|---|---|---|---|
| `jpl` | **10 bodies only — Sun, Moon, Mercury-Pluto** (Mean Node is inline-referenced, not in per-case files — see § Mean Node — inline-reference asymmetry) | per-body (see `thresholds.ts`) | Primary. Ecliptic longitudes from JPL Horizons. |
| `astronomyEngine` | 9 non-Moon non-Node bodies only | 1′ (60″) | Secondary sanity check. Astronomy Engine's ±1′ spec is coarser than Moon (3″) and Node (20″) thresholds — **do not** populate Moon or Node entries for this source. |
| `astrocom` | Houses, aspects | 1′ (60″) | Manual transcription from astro.com natal-chart output. Spot-check transcription on first discrepancy pass. |
| `nativeSwisseph` | One reference case (Moshier-vs-SE-files floor check, merged into QE II fixture) | same as `jpl` for planets | Generated locally via the AGPL reference-generation protocol below. |

### Mean Node — inline-reference asymmetry

Mean Node has a structurally different reference source from the other bodies. Per-case reference-data files **omit the `northNode` entry from their `planets.jpl` array** because JPL Horizons does not output astrology Mean Node — JPL only produces the instantaneous osculating ascending node (which is ~True Node, not Mean). See `09-01-HARNESS.md § Node validation — explicit scope` for the full rationale and epistemic qualifier.

The Node reference is a ~5-line Meeus Ch. 47 polynomial implementation inline in the harness (lands with §9.2 code), not a snapshot file. If you're writing a new per-case reference-data file and wondering where `northNode` belongs: don't include it in `planets.jpl` at all. The Node comparison runs from inline harness code for every case.

When you create a new per-case reference-data `.ts` file, include a header comment pointing here so a future reader doesn't look for a `northNode` entry and assume it's missing by mistake.

## §9.1.1 Historical-tz interpretation — query instant matters

Fixtures record the birth time as documented (birth certificate / registry), which for pre-standardized-tz cases (Einstein 1879 Ulm, Kahlo 1907 Coyoacán) is **Local Mean Time**, not zone time. Celestia's `localTimeToUTC` uses modern `geo-tz` zone resolution — Europe/Berlin for Ulm, America/Mexico_City for Coyoacán — because that is how the app interprets user input today.

**Reference-data sourcing for those cases MUST query JPL / Astronomy Engine / astro.com for the same UTC instant Celestia actually computes against**, not the astro-community's LMT-corrected UTC. If reference data is sourced for the LMT-corrected instant, the comparison will systematically fail for a known-explainable tz-interpretation reason rather than an ephemeris error.

Protocol: the JPL / Astronomy Engine adapter scripts (§9.1 upcoming work) should take the `TestCase`, run it through Celestia's chart calculation to get the computed Julian Day, and use that JD as the query instant. This makes Celestia's own tz interpretation the source of truth for "what instant does this fixture reference."

astro.com reference for houses + aspects should be transcribed by entering the fixture's birthDate/birthTime/lat/lon/city into astro.com's natal-chart form directly — astro.com's own tz handling will produce whatever chart astro.com produces for that input, which is the comparison target.

## Moshier-vs-SE-files reference snapshot — AGPL protocol

**Licensing context:** Celestia uses `sweph` under GPL-2.0 (`2.10.0-11`, pinned) for license reasons documented in `docs/licensing.md`. The Moshier-vs-SE-files reference generation described below uses AGPL-licensed `.se1` data files to produce numeric output; **the output is committed as reference data, the data files are never committed**. This follows the working-assumption interpretation that AGPL/GPL obligations apply to the software and data, not to numeric outputs computed by it (analogous to compiler output not inheriting GPL from the compiler). If this interpretation is ever challenged, the reference data can be regenerated from JPL Horizons alone without SE files, losing the empirical Moshier floor check but preserving §9.2's primary validation.

**Protocol:**

1. Developer downloads required `.se1` files (`semo_18.se1` for Moon, `sepl_18.se1` for planets) from Astrodienst's official distribution (via the `sweph` README's listed sources: [github.com/aloistr/swisseph/tree/master/ephe](https://github.com/aloistr/swisseph/tree/master/ephe) or the Astrodienst Dropbox link in the `sweph` README, current at regeneration time) to a local scratch directory. These files are **NOT committed to the repo**.
2. Developer runs `scripts/generate-se-reference.ts` (TBD — written in the sample-comparison round of §9.1) once with `sweph.set_ephe_path(localScratchDir)` and the `SEFLG_SWIEPH` flag.
3. Script writes a TypeScript snapshot to `test/validation/reference-data/queen-elizabeth-ii.ts` containing only numeric longitudes under the `nativeSwisseph` key. This snapshot IS committed — it is the output of AGPL software, not AGPL software or data.
4. Developer deletes the `.se1` files after generation.
5. `.gitignore` contains an entry for `*.se1` at the repo root to prevent accidental commit.

If a future reader wants to regenerate the snapshot (e.g., ephemeris data version changed, or the floor check needs re-validation), repeat steps 1-4. The snapshot file's header comments the ephemeris version used and the date of regeneration.

**Scope:** the Moshier-vs-SE-files check runs on the **Queen Elizabeth II fixture only**, merged into her existing reference-data file. Not a separate test case. Rationale: reference data for QE II is the most cross-validated (JPL + Astronomy Engine + astro.com all available), so adding the `nativeSwisseph` column gives an empirical Moshier-floor data point alongside the primary validation without adding a sixth test case.

## Updating reference data

JPL Horizons values for past dates do not drift (astronomical reality is stable). astro.com uses its own computation pipeline and could in principle change algorithms; if a previously-passing case drifts, investigate before regenerating reference data. Astronomy Engine updates its `astronomy-engine` npm package over time — if a new version surfaces a divergence from a committed snapshot, check the package changelog before treating it as a Celestia regression.
