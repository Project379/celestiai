# §9 Ephemeris validation harness

Validates `@celestia/astrology` outputs against reference data (JPL Horizons, Astronomy Engine, astro.com). Locked thresholds from §9.1 live in `thresholds.ts` as the single source of truth.

See `../../../../.planning/phases/09-ephemeris-validation/09-01-PRECISION-FLOOR.md` for decision rationale and citations.

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

## §9.6 promotion path

The harness is already at the location Vitest picks up tests. §9.6 adds:
- `turbo.json` `test` task wiring across the monorepo.
- Root-level `test` script.
- CI config to run `pnpm --filter @celestia/astrology test` on PRs touching `packages/astrology/**`.
- Fail-the-build semantics for `queue`-level discrepancies (currently they pass; §9.6 tightens).
- Reference-data update protocol documentation.
