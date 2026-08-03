/**
 * Synthetic — Year 2200, Greenwich — reference data snapshot (§9.2 generator).
 *
 * Case: see ../fixtures/synthetic-year-2200.ts
 * Fixture → UTC: 2200-06-15 12:00 local → 2200-06-15 11:00:00 UTC.
 *   UTC derived via Celestia's `localTimeToUTC` so reference-data query instant
 *   matches what the harness feeds `sweph.calc_ut`. Historical-tz cases (Einstein,
 *   Kahlo, year-1600) are self-consistency checks under Celestia's zone interpretation;
 *   see reference-data/README.md §9.1.1.
 *
 * Generated: 2026-04-21 by test/validation/scripts/generate-reference-data.ts.
 *
 * JPL Horizons protocol: apparent geocentric ecliptic longitudes,
 *   CENTER='500@399', QUANTITIES='31'. Matches sweph.calc_ut convention under
 *   SEFLG_MOSEPH (light-time, gravitational deflection, stellar aberration).
 *
 * Astronomy Engine protocol: local `astronomy-engine` npm package, `GeoVector`
 *   with aberration=true, `Ecliptic` conversion. Scope: 9 non-Moon non-Node bodies.
 *   Note: JPL out of coverage for jupiter, pluto at this date; per-body soft-skip applied. Those bodies validate via Astronomy Engine only (60″ threshold, Tier-secondary).
 *
 * Mean Node — inline-reference asymmetry:
 *   northNode intentionally omitted from planets.jpl. Node reference is the
 *   inline Meeus Ch. 47 polynomial in `adapters/node-meeus.ts`.
 */

import type { ReferenceData } from '../types'

export const referenceData: ReferenceData = {
  caseId: 'synthetic-year-2200',
  planets: {
    jpl: [
      { body: 'sun', longitude: 84.3322730 },
      { body: 'moon', longitude: 116.2244478 },
      { body: 'mercury', longitude: 61.2209021 },
      { body: 'venus', longitude: 100.1698263 },
      { body: 'mars', longitude: 160.5693657 },
      { body: 'saturn', longitude: 343.4191031 },
      { body: 'uranus', longitude: 89.3640541 },
      { body: 'neptune', longitude: 26.8030344 },
    ],
    astronomyEngine: [
      { body: 'sun', longitude: 84.3362441 },
      { body: 'mercury', longitude: 61.2257896 },
      { body: 'venus', longitude: 100.1749833 },
      { body: 'mars', longitude: 160.5710616 },
      { body: 'jupiter', longitude: 9.9525114 },
      { body: 'saturn', longitude: 343.4204921 },
      { body: 'uranus', longitude: 89.3630190 },
      { body: 'neptune', longitude: 26.8041948 },
      { body: 'pluto', longitude: 142.9759920 },
    ],
  },
}
