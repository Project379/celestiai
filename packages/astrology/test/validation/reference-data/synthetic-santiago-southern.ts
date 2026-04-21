/**
 * Synthetic — Santiago, Chile (34°S) — reference data snapshot (§9.2 generator).
 *
 * Case: see ../fixtures/synthetic-santiago-southern.ts
 * Fixture → UTC: 1990-06-15 09:00 local → 1990-06-15 13:00:00 UTC.
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
  caseId: 'synthetic-santiago-southern',
  planets: {
    jpl: [
      { body: 'sun', longitude: 84.1693383 },
      { body: 'moon', longitude: 345.9150809 },
      { body: 'mercury', longitude: 65.7622260 },
      { body: 'venus', longitude: 48.8265847 },
      { body: 'mars', longitude: 11.0712513 },
      { body: 'jupiter', longitude: 105.8985032 },
      { body: 'saturn', longitude: 294.0294858 },
      { body: 'uranus', longitude: 278.1635746 },
      { body: 'neptune', longitude: 283.7160212 },
      { body: 'pluto', longitude: 225.4006442 },
    ],
    astronomyEngine: [
      { body: 'sun', longitude: 84.1691865 },
      { body: 'mercury', longitude: 65.7623227 },
      { body: 'venus', longitude: 48.8263740 },
      { body: 'mars', longitude: 11.0710207 },
      { body: 'jupiter', longitude: 105.8985152 },
      { body: 'saturn', longitude: 294.0294257 },
      { body: 'uranus', longitude: 278.1623177 },
      { body: 'neptune', longitude: 283.7158086 },
      { body: 'pluto', longitude: 225.4013420 },
    ],
  },
}
