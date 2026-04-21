# @celestia/astrology

Swiss Ephemeris-based astrology engine for Celestia AI. Computes natal charts, transits, and aspects via the `sweph` native N-API binding (GPL-2.0 path; see `docs/licensing.md` at the repo root).

**Ephemeris mode:** Moshier (`SEFLG_MOSEPH`), built-in polynomial fit to JPL DE404 — no external data files required. Moon `[verified]` to 0.5″ vs DE404 uniformly across 1369 BC – 3000 AD per Swiss Ephemeris docs; planet floor ≤1″; Mean Node ceiling 20″ across 3000 BCE – 3000 CE. Rationale and source citations live in `.planning/phases/09-ephemeris-validation/09-01-PRECISION-FLOOR.md`.

## Package scripts

```bash
pnpm --filter @celestia/astrology typecheck   # tsc --noEmit (src + test)
pnpm --filter @celestia/astrology test        # vitest — runs §9 validation harness
```

## Source layout

- `src/` — production engine (calculator, transits, aspects, utils)
- `test/validation/` — §9 validation harness (permanent regression gate)

## Validation layer (`test/validation/`)

The validation harness is a **permanent CI-enforced regression gate** for the astrology engine. It exists because the audit in §9 established that the math has to be validated against external reference data, not just trusted by reputation. Full workstream history in `.planning/phases/09-ephemeris-validation/`.

### Four validation tiers

Each tier measures a different thing. A "pass" in one tier does not imply the same epistemic strength as a pass in another — `09-01-HARNESS.md § §9.2/§9.3/§9.4 validation semantics` documents the distinctions.

| Tier | Scope | Reference | Threshold | What "pass" means |
|---|---|---|---|---|
| **1 — Planets / Moon** | Sun + Mercury through Pluto + Moon (10 bodies) | JPL Horizons DE441 (physical-reality) | 1″ planets, 3″ Moon | sweph's Moshier output matches physical position per JPL |
| **2 — Mean Node** | Mean Node only | Inline Meeus Ch. 47 polynomial (~5 lines of TS) | 20″ | sweph's polynomial matches the formula when implemented independently (code-path integrity, not physical-reality) |
| **3 — Houses** | 12 cusps + Ascendant + MC | Inline Placidus (Meeus Ch. 12-13) | 60″ (1′) | sweph's Placidus matches independent formulas (code-path integrity; Placidus is mathematical, not observational) |
| **4 — Aspect classification** | aspect type + orb + applying/separating logic | Synthetic unit tests (`aspects-synthetic.test.ts`) | exact match | classification logic correct across boundary conditions; real-case correctness implied-by-construction from Tier 1 + Tier 4 |

Plus a **secondary sanity check** vs local `astronomy-engine` npm (VSOP87-based) at 60″ for the 9 non-Moon non-Node bodies — weaker than Tier 1 but provides cross-validation when JPL is unavailable at a given date.

### Threshold single-source-of-truth

`test/validation/thresholds.ts` is the single source of truth for all validation thresholds. Changing a threshold requires a planning-doc update referencing `09-01-PRECISION-FLOOR.md` and user sign-off — thresholds are locked, not tunable at will.

### Epistemic tags

The §9.2 / §9.3 / §9.4 consolidated report and per-fixture classifications use a small tag vocabulary:

- `[verified]` — observed in tool output or quoted from primary-source docs
- `[observation]` — single-case or pattern datum without full explanation
- `[inferred]` — reasoned attribution not directly documented by a primary source
- `[open]` — explanation incomplete but not blocking

Far-range synthetic cases (Year 1600, Year 2200) are tagged `[observation]` with `[inferred]` DE404-vs-DE441 inter-ephemeris-generation-divergence attribution. They are **not** validation failures of sweph's Moshier implementation; see `09-02-LONGITUDE-REPORT.md § Tier 1 § Far-range cases` for the framing. The `farRangeObservation` fixture flag demotes case-level `overallStatus` for these cases while preserving per-body raw status in the report tables.

### Validation claim — scope

§9's validation claim is **scoped to modern-era dates (~±100 years from J2000, i.e., 1900–2100)**. Celestia supports only modern birth dates; the scoping aligns with the user base by construction. Far-range cases in the harness exercise sweph at the edges of the Moshier validity window and record `[observation]` data for future reference — they do not extend the validation claim.

## Reference-data update protocol

Reference-data files under `test/validation/reference-data/` are committed snapshots. They rarely need regeneration; when they do, follow the protocol in `test/validation/reference-data/README.md § Updating reference data`. Includes the explicit `[inferred]` caveat on DE404-vs-DE441 attribution — future ephemeris generations (DE442, DE450) may shift far-range observation magnitudes, and that shift is expected inter-generation variance, not a Celestia-side regression.

## CI enforcement

GitHub Actions workflow at `.github/workflows/astrology.yml` runs `pnpm --filter @celestia/astrology typecheck` + `pnpm --filter @celestia/astrology test` on every PR and push touching `packages/astrology/**` (branches: develop, main, mobile-parallel-test). 39 tests across 12 cases must pass for the workflow to succeed. See `.planning/phases/09-ephemeris-validation/09-06-CI-INTEGRATION.md` for design rationale.

## Further reading

- `.planning/phases/09-ephemeris-validation/00-PLAN.md` — workstream plan
- `.planning/phases/09-ephemeris-validation/09-01-PRECISION-FLOOR.md` — threshold rationale + primary-source citations
- `.planning/phases/09-ephemeris-validation/09-01-HARNESS.md` — harness tier architecture
- `.planning/phases/09-ephemeris-validation/09-02-LONGITUDE-REPORT.md` — consolidated validation report
- `test/validation/README.md` — module-level harness docs
- `test/validation/reference-data/README.md` — reference-data conventions + update protocol
