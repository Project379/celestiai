/**
 * Synthetic — Arctic Circle, polar night — reference data snapshot (§9.2 generator).
 *
 * Case: see ../fixtures/synthetic-arctic-polar-night.ts
 * Fixture → UTC: 2020-12-21 12:00 local → 2020-12-21 11:00:00 UTC.
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
  caseId: 'synthetic-arctic-polar-night',
  planets: {
    jpl: [
      { body: 'sun', longitude: 270.0407673 },
      { body: 'moon', longitude: 354.1528809 },
      { body: 'mercury', longitude: 270.7843939 },
      { body: 'venus', longitude: 247.2197950 },
      { body: 'mars', longitude: 23.0975488 },
      { body: 'jupiter', longitude: 300.4187469 },
      { body: 'saturn', longitude: 300.4529989 },
      { body: 'uranus', longitude: 36.9652714 },
      { body: 'neptune', longitude: 348.3076806 },
      { body: 'pluto', longitude: 293.8522709 },
    ],
    astronomyEngine: [
      { body: 'sun', longitude: 270.0406189 },
      { body: 'mercury', longitude: 270.7841295 },
      { body: 'venus', longitude: 247.2197397 },
      { body: 'mars', longitude: 23.0974955 },
      { body: 'jupiter', longitude: 300.4184904 },
      { body: 'saturn', longitude: 300.4531685 },
      { body: 'uranus', longitude: 36.9663116 },
      { body: 'neptune', longitude: 348.3118185 },
      { body: 'pluto', longitude: 293.8520076 },
    ],
  },
}
