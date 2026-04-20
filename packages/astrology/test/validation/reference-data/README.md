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
      // ... 9 non-Moon non-Node bodies only (scope-limited — see README)
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

## Sources and scope

| Source | Scope | Threshold | Notes |
|---|---|---|---|
| `jpl` | All 10 bodies + Mean Node | per-body (see `thresholds.ts`) | Primary. Ecliptic longitudes from JPL Horizons. |
| `astronomyEngine` | 9 non-Moon non-Node bodies only | 1′ (60″) | Secondary sanity check. Astronomy Engine's ±1′ spec is coarser than Moon (3″) and Node (20″) thresholds — **do not** populate Moon or Node entries for this source. |
| `astrocom` | Houses, aspects | 1′ (60″) | Manual transcription from astro.com natal-chart output. Spot-check transcription on first discrepancy pass. |
| `nativeSwisseph` | One reference case | same as `jpl` for planets | Independent native Swiss Ephemeris tool — optional, for the wasm-vs-native spot check. |

## Updating

JPL Horizons values for past dates do not drift (astronomical reality is stable). astro.com uses its own computation pipeline and could in principle change algorithms; if a previously-passing case drifts, investigate before regenerating reference data.
