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
      // ... 10 bodies (no northNode — see § Mean Node — inline-reference asymmetry)
    ],
    astronomyEngine: [
      { body: 'sun', longitude: 30.12344 },
      // ... 9 non-Moon non-Node bodies only (scope-limited — see below)
    ],
  },
  // Houses: validated by inline Placidus reference, not stored here.
  //   See § Houses and aspects — inline references (no per-case data).
  // Aspects: validated arithmetically + by synthetic unit tests in
  //   aspects-synthetic.test.ts, not stored here.
}
```

## All fixture entries are [reference-dependent — Astro-Databank]

Every test case's birth-data ultimately traces to an Astro-Databank entry (directly or via Astro-Databank's cited sources). Astro-Databank is a human-curated astrology database with its own error rate. The `sources` array in each fixture cites the Astro-Databank URL; a future reader should treat these as "the rating Astro-Databank assigned at commit time," not as independent certification.

Stronger verification would require cross-referencing against Rodden's own published rating system (Lois Rodden's original publications). The cost is high relative to the benefit for §9's purposes; the current chain of trust is accepted with this tag.

## Sources and scope

| Source | Scope | Threshold | Notes |
|---|---|---|---|
| `jpl` | **10 bodies only — Sun, Moon, Mercury-Pluto** (Mean Node is inline-referenced, not in per-case files — see § Mean Node — inline-reference asymmetry) | per-body (see `thresholds.ts`) | Primary physical-reality reference. Ecliptic longitudes from JPL Horizons. |
| `astronomyEngine` | 9 non-Moon non-Node bodies only | 1′ (60″) | Secondary sanity check. Astronomy Engine's ±1′ spec is coarser than Moon (3″) and Node (20″) thresholds — **do not** populate Moon or Node entries for this source. |
| `inlinePlacidus` | Houses (12 cusps + ASC + MC) | 1′ (60″) | Reference is computed inline at comparison time from case `(JD, lat, lon)`. Not stored per-case — no data field to populate. See `adapters/placidus-inline.ts`. |
| `astrocom` | Houses, aspects — **optional post-§9.6 spot-check only** | 1′ (60″) | Demoted from primary per `09-01-PRECISION-FLOOR.md § Doc drift corrections` entry 6. astro.com uses Swiss Ephemeris internally; comparison is sweph-family vs. sweph-family with a different UI, not sweph-vs-independent. §9 does not depend on astro.com. Transcription protocol preserved below in case a future reader wants to run a one-off spot-check, but not part of §9 routine work. |
| `nativeSwisseph` | One reference case (Moshier-vs-SE-files floor check, merged into QE II fixture) | same as `jpl` for planets | Generated locally via the AGPL reference-generation protocol below. |

### Houses and aspects — inline references (no per-case data)

**Houses** are validated against an inline Placidus implementation (Meeus-based) computed at comparison time from each case's `(JD, lat, lon)`. See `09-01-HARNESS.md § Tier 3`. No per-case data file is written for houses; the comparison emits `referenceSource: 'inlinePlacidus'` in its output.

**Aspects** are validated by (a) arithmetic derivation — if §9.2 planetary longitudes pass, aspects computed from them are correct by construction — plus (b) synthetic unit tests for the classification logic (`aspects-synthetic.test.ts`). No per-case aspect reference data. See `09-01-HARNESS.md § Tier 4`.

### Mean Node — inline-reference asymmetry

Mean Node has a structurally different reference source from the other bodies. Per-case reference-data files **omit the `northNode` entry from their `planets.jpl` array** because JPL Horizons does not output astrology Mean Node — JPL only produces the instantaneous osculating ascending node (which is ~True Node, not Mean). See `09-01-HARNESS.md § Node validation — explicit scope` for the full rationale and epistemic qualifier.

The Node reference is a ~5-line Meeus Ch. 47 polynomial implementation inline in the harness (lands with §9.2 code), not a snapshot file. If you're writing a new per-case reference-data file and wondering where `northNode` belongs: don't include it in `planets.jpl` at all. The Node comparison runs from inline harness code for every case.

When you create a new per-case reference-data `.ts` file, include a header comment pointing here so a future reader doesn't look for a `northNode` entry and assume it's missing by mistake.

## §9.1.1 Historical-tz interpretation — query instant matters

Fixtures record the birth time as documented (birth certificate / registry), which for pre-standardized-tz cases (Einstein 1879 Ulm, Kahlo 1907 Coyoacán) is **Local Mean Time**, not zone time. Celestia's `localTimeToUTC` uses modern `geo-tz` zone resolution — Europe/Berlin for Ulm, America/Mexico_City for Coyoacán — because that is how the app interprets user input today.

**Reference-data sourcing for those cases MUST query JPL / Astronomy Engine / astro.com for the same UTC instant Celestia actually computes against**, not the astro-community's LMT-corrected UTC. If reference data is sourced for the LMT-corrected instant, the comparison will systematically fail for a known-explainable tz-interpretation reason rather than an ephemeris error.

Protocol: the JPL / Astronomy Engine adapter scripts should take the `TestCase`, run it through Celestia's chart calculation to get the computed Julian Day, and use that JD as the query instant. This makes Celestia's own tz interpretation the source of truth for "what instant does this fixture reference." Inline Placidus (houses) is already handled this way by `comparison.ts` — it uses the JD derived from the test case's inputs.

## Optional astro.com transcription protocol (post-§9.6 spot-check, NOT part of §9 routine work)

**This section is preserved for future use.** Per `09-01-PRECISION-FLOOR.md § Doc drift corrections` entry 6, astro.com is not an independent reference (it uses Swiss Ephemeris internally) and is not part of §9's routine validation path. §9 validates houses via the inline Placidus implementation and aspects via synthetic unit tests + arithmetic-from-longitudes. If a future reader wants to spot-check a specific discrepancy against astro.com after §9.6 closes (e.g., to investigate an unexpected Placidus-implementation divergence), follow the protocol below.

astro.com's chart pages are bot-gated against automated fetch. Transcription is a human workflow. For each case:

1. **Source URL:** navigate to [astro.com Extended Chart Selection](https://www.astro.com/cgi/chart.cgi). Enter the fixture's `birthDate`, `birthTime`, `city` (or lat/lon via manual coordinate entry). Select Placidus house system (default). Generate the natal chart.
2. **Transcribe:**
   - **12 house cusps** in order (Cusp 1 through Cusp 12). For each, record ecliptic longitude as a decimal degree (0-360). astro.com displays as "sign + degree + minute/second" — convert to decimal via `signIndex × 30 + degree + minute/60 + second/3600` where signs are aries=0..pisces=11.
   - **Ascendant** and **Midheaven (MC)** as decimal degrees. These sit on Cusp 1 and Cusp 10 respectively; transcribe both explicitly.
   - **Aspect table** from astro.com's aspect grid. For each aspect: `body1`, `body2` (ordered alphabetically in our fixtures), aspect type (conjunction/sextile/square/trine/opposition), orb in decimal degrees, applying (true/false).
3. **Record metadata in file header:**
   - Source URL used (the actual URL including query parameters after chart generation).
   - Transcription date (ISO format).
   - Transcriber (founder / Claude Code / etc.).
4. **Error-rate acknowledgment:** at ~30 data points per case × ~9 cases = ~270 hand-typed values, expect 1-2% transcription error rate. First discrepancy pass in §9.2 / §9.3 / §9.4 will surface outliers; correct transcription errors at that pass before treating outliers as ephemeris bugs.
5. **Spot-check procedure** (post-transcription, pre-commit):
   - Re-read Cusp 1 and Cusp 10 aloud against the astro.com output (catches off-by-one sign errors on the most load-bearing cusps).
   - Verify the applying/separating column for at least 3 aspects — this flips sign near-exact and is easy to miscopy.
   - Check that the sum of longitudes modulo 360° is stable — large transcription errors skew this sum conspicuously.

**Loading:** the transcribed data goes into the existing per-case reference-data `.ts` file under `houses.astrocom` and `aspects.astrocom`. The `ReferenceSource` type retains `'astrocom'` and `comparison.ts` still iterates any `houses.astrocom` / `aspects.astrocom` entries found alongside the primary sources. If you populate these, the comparison output will include them as supplementary rows — **useful only for spot-check investigations**, not for routine validation.

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

### Determinism and drift — when regeneration is needed

- **JPL Horizons for past dates (anything before the current UT):** astronomical reality is stable, so past-date queries do not drift. Exception: JPL may issue a new ephemeris generation (DE441 → DE442 → DE450, etc.) and Celestia may choose to upgrade. See § Inter-ephemeris-generation caveat below.
- **JPL Horizons for future dates (2026 onwards at time of writing):** Horizons' "predict boundary" moves forward as new Earth-orientation-parameter (EOP) data is ingested. Queries near or past the predict boundary extrapolate — values can shift slightly as the server's EOP file updates. Typically not a Celestia-user concern because the validation corpus is natal-chart dates (past), not forward forecasts.
- **Astronomy Engine:** deterministic by construction for a given `astronomy-engine` npm version. Package updates occasionally refine VSOP87 / lunar / Pluto coefficients. If a snapshot drifts after `pnpm install` picks up a new version, check the AE changelog before treating it as a Celestia regression.
- **Inline Meeus Ch. 47 polynomial (Mean Node reference):** deterministic by implementation. No regeneration ever needed; reference value is recomputed at comparison time from each case's JD.
- **Inline Placidus implementation (houses reference):** deterministic by implementation. No regeneration ever needed.
- **astro.com:** demoted to optional spot-check per `09-01-PRECISION-FLOOR.md § Doc drift corrections` entry 6 (not independent — uses sweph internally). Not part of routine regeneration.

### Regeneration procedure

The generator lives at `test/validation/scripts/generate-reference-data.ts`. Used once during §9.2 to populate 11 of 12 cases; designed to be idempotent on subsequent runs.

**To regenerate a single case** (e.g., JPL Horizons upgraded to DE442 and the snapshot needs refresh):

1. Delete the existing `reference-data/<case-id>.ts` file.
2. `pnpm --filter @stellaeum/astrology exec tsx test/validation/scripts/generate-reference-data.ts` — the generator iterates all fixtures, skips cases with existing reference-data files, and generates missing ones. Deleting the target file makes it the single generation target.
3. `pnpm --filter @stellaeum/astrology typecheck` — verify the new file type-checks.
4. `pnpm --filter @stellaeum/astrology test` — run the harness. Capture the diff in observed deltas against the previous snapshot. Sub-arcsec modern-era drift is unremarkable; significant far-range drift is the `[inferred]` inter-ephemeris-generation variance — see caveat below.
5. Commit the regenerated file with a header noting the regeneration date, the JPL ephemeris generation in use, and the reason (upgrade, drift investigation, etc.).

**Wall time:** ~10–20 seconds per case (10 sequential JPL Horizons queries). For all 12 cases, budget ~3–5 minutes. The generator is sequential-by-design to stay polite to the Horizons API.

**Network:** Required for JPL Horizons queries. Astronomy Engine and Meeus/Placidus references are local. If running in an offline environment, AE-only regeneration can be scripted separately by skipping the JPL fetch block — not part of the routine workflow.

### Inter-ephemeris-generation caveat — `[inferred]`

**Observation:** Year 1600 Moon vs JPL shows 10.31″ delta; Year 2200 Moon shows 47.54″. SE docs claim Moshier Moon is `[verified]` 0.5″ vs **DE404** uniformly across 1369 BC – 3000 AD. The observed deltas exceed that claim by 20–100× at far-T.

**Attribution (`[inferred]`):** The most plausible explanation is inter-ephemeris-generation divergence between DE404 (Moshier's fit target per SE docs) and DE441 (JPL Horizons' current). Moshier's fit to DE404 remains 0.5″ uniformly; DE441 vs DE404 at far-T is the source of the observed deltas. Other candidate contributors (frame-convention differences between Moshier's 1990s transformation code and current IAU conventions; time-scale handling at far-T) have not been eliminated. No primary source quantifies the relative contributions. Full framing in `09-02-LONGITUDE-REPORT.md § Tier 1 § Far-range cases`.

**Forward-looking implication:** if future JPL ephemeris generations are released (DE442, DE450, etc.) and Celestia regenerates its reference data against them, **far-range observation magnitudes may shift in either direction**. A Year 1600 Moon delta that was 10.31″ against DE441 could be 6″ or 14″ against DE450 — the exact number depends on how the new generation's lunar theory differs from DE404 at that T. **This is expected inter-generation variance, not a Celestia-side regression.** Future readers regenerating far-range snapshots should:

- Record the JPL ephemeris generation in the regenerated file's header (which the generator already does via the `API VERSION` / `Source: DE441` line in Horizons responses).
- Compare the magnitude shift against modern-era cases from the same regeneration run. If modern-era cases (1879–2020) stay sub-arcsec and only far-range cases shift, the shift is inter-generation variance and the `[inferred]` attribution holds.
- Only treat a delta shift as a Celestia-side regression if **modern-era cases also shift** by a non-noise amount. That would indicate either a sweph update, a Moshier-to-DE404 fit regression (unlikely), or a deeper issue worth surfacing.

The modern-era `[verified]` claim is the load-bearing one. Far-range cases are scope-explicit `[observation]` records, not validation assertions. This distinction is captured in fixture-level `farRangeObservation: true` flags and in the consolidated §9.2 report.
