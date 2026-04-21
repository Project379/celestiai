/**
 * Synthetic — Year 1600, Greenwich — reference data snapshot (§9.2 generator).
 *
 * Case: see ../fixtures/synthetic-year-1600.ts
 * Fixture → UTC: 1600-06-15 12:00 local → 1600-06-15 12:02:00 UTC.
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
 *   Note: JPL out of coverage for saturn, pluto at this date; per-body soft-skip applied. Those bodies validate via Astronomy Engine only (60″ threshold, Tier-secondary).
 *
 * Mean Node — inline-reference asymmetry:
 *   northNode intentionally omitted from planets.jpl. Node reference is the
 *   inline Meeus Ch. 47 polynomial in `adapters/node-meeus.ts`.
 */

import type { ReferenceData } from '../types'

export const referenceData: ReferenceData = {
  caseId: 'synthetic-year-1600',
  planets: {
    jpl: [
      { body: 'sun', longitude: 84.3665176 },
      { body: 'moon', longitude: 139.7041550 },
      { body: 'mercury', longitude: 75.3649521 },
      { body: 'venus', longitude: 56.3844468 },
      { body: 'mars', longitude: 153.9282016 },
      { body: 'jupiter', longitude: 138.2027170 },
      { body: 'uranus', longitude: 34.0647308 },
      { body: 'neptune', longitude: 145.6389050 },
    ],
    astronomyEngine: [
      { body: 'sun', longitude: 84.3670242 },
      { body: 'mercury', longitude: 75.3651216 },
      { body: 'venus', longitude: 56.3848322 },
      { body: 'mars', longitude: 153.9285040 },
      { body: 'jupiter', longitude: 138.2022983 },
      { body: 'saturn', longitude: 201.8967262 },
      { body: 'uranus', longitude: 34.0683512 },
      { body: 'neptune', longitude: 145.6384477 },
      { body: 'pluto', longitude: 24.0104181 },
    ],
  },
}
