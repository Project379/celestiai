/**
 * Synthetic — Leap day (2000-02-29), Greenwich — reference data snapshot (§9.2 generator).
 *
 * Case: see ../fixtures/synthetic-leap-day.ts
 * Fixture → UTC: 2000-02-29 12:00 local → 2000-02-29 12:00:00 UTC.
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
 *
 * Mean Node — inline-reference asymmetry:
 *   northNode intentionally omitted from planets.jpl. Node reference is the
 *   inline Meeus Ch. 47 polynomial in `adapters/node-meeus.ts`.
 */

import type { ReferenceData } from '../types'

export const referenceData: ReferenceData = {
  caseId: 'synthetic-leap-day',
  planets: {
    jpl: [
      { body: 'sun', longitude: 340.2058271 },
      { body: 'moon', longitude: 275.5362099 },
      { body: 'mercury', longitude: 342.5064927 },
      { body: 'venus', longitude: 313.9565554 },
      { body: 'mars', longitude: 13.2215498 },
      { body: 'jupiter', longitude: 32.5771018 },
      { body: 'saturn', longitude: 42.3657722 },
      { body: 'uranus', longitude: 318.1229307 },
      { body: 'neptune', longitude: 305.3502214 },
      { body: 'pluto', longitude: 252.8379370 },
    ],
    astronomyEngine: [
      { body: 'sun', longitude: 340.2059483 },
      { body: 'mercury', longitude: 342.5070960 },
      { body: 'venus', longitude: 313.9563903 },
      { body: 'mars', longitude: 13.2222890 },
      { body: 'jupiter', longitude: 32.5777361 },
      { body: 'saturn', longitude: 42.3665613 },
      { body: 'uranus', longitude: 318.1199492 },
      { body: 'neptune', longitude: 305.3527832 },
      { body: 'pluto', longitude: 252.8379345 },
    ],
  },
}
