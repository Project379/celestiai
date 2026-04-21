# §9 Ephemeris validation harness

Validates `@celestia/astrology` outputs against reference data (JPL Horizons, Astronomy Engine, inline Meeus polynomials). Locked thresholds from §9.1 live in `thresholds.ts` as the single source of truth.

See `../../../../.planning/phases/09-ephemeris-validation/09-01-PRECISION-FLOOR.md` for decision rationale and citations. Package-level README at `../../README.md` covers the harness role, epistemic tag vocabulary, and CI enforcement.

## Running

```bash
pnpm --filter @celestia/astrology test
```

Vitest picks up `harness.test.ts` automatically. When no fixtures are loaded the harness is a skipped test with a note. Once fixtures land, Vitest iterates each case, runs the comparison, prints a markdown report to the console, and fails iff any case has `pause-and-fix` status.

## Module map

| File | Purpose |
|---|---|
| `types.ts` | `TestCase`, `ReferenceData`, `CaseComparisonResult`, status types |
| `thresholds.ts` | **Single source of truth** for §9.2 locked thresholds + classifiers |
| `delta.ts` | Arc-second arithmetic and wrap-around-safe longitude delta |
| `comparison.ts` | Pure comparison functions (planets, houses, aspects) |
| `reporter.ts` | Markdown formatting for human review |
| `loader.ts` | Dynamic filesystem load of fixtures + reference data |
| `harness.test.ts` | Vitest entry point — iterates cases, asserts no pause-and-fix |
| `fixtures/` | Test-case TS modules (see fixtures/README.md) |
| `reference-data/` | Reference-data TS modules (see reference-data/README.md) |

## Scope limitations worth flagging

- **Astronomy Engine covers only the 9 non-Moon non-Node bodies.** Its stated ±1′ accuracy is coarser than the Moon (3″) and Mean Node (20″) primary thresholds, so it cannot meaningfully validate them. `comparison.ts` enforces this scope — Moon/Node entries for that source are silently skipped if present in reference data.
- **Aspect applying/separating mismatch classifies as `queue`, not `pause-and-fix`.** Near-exact aspects can flip sign near the exactness moment; review before treating as a hard bug.
- **Aspects present on only one side (Celestia or reference) classify as `queue`.** Orb-tolerance differences between reference tools and Celestia's fixed orbs can legitimately exclude an aspect on one side without either being wrong.

## Changing a threshold

Thresholds are locked by planning-doc sign-off. To change one:
1. Open a discussion in a planning-doc update referencing `09-01-PRECISION-FLOOR.md`.
2. User signs off.
3. Update `thresholds.ts`. Update any affected test-case references.
4. Commit together — code + planning doc in one atomic commit.

## §9.6 CI integration — done

Permanent regression gate wired 2026-04-21:

- `turbo.json` carries a `test` task; root-level `pnpm test` delegates to turbo.
- `.github/workflows/astrology.yml` runs `typecheck` + `test` on pull_request + push events touching `packages/astrology/**`. Branches: develop, main, mobile-parallel-test.
- Harness assertion remains `not.toBe('pause-and-fix')`. `queue`-level per-body statuses (e.g., Einstein Neptune 1.18″ scope-boundary observation) are preserved in the report output but do not fail CI — tightening to `fail-on-queue` was out of scope for §9.6 and would immediately break CI on the known-accepted Einstein observation. Re-open via planning-doc update + `09-01-PRECISION-FLOOR.md § Locked thresholds` amendment if the team wants stricter semantics later.
- Reference-data update protocol lives in `reference-data/README.md § Updating reference data`. Includes the `[inferred]` DE404-vs-DE441 caveat on far-range observation magnitudes.

See `.planning/phases/09-ephemeris-validation/09-06-CI-INTEGRATION.md` for the close artifact.
