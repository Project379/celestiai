/**
 * Frida Kahlo — reference data snapshot (§9.2 generator).
 *
 * Case: see ../fixtures/frida-kahlo.ts
 * Fixture → UTC: 1907-07-06 08:30 local → 1907-07-06 15:07:00 UTC.
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
  caseId: 'frida-kahlo',
  planets: {
    jpl: [
      { body: 'sun', longitude: 103.3759585 },
      { body: 'moon', longitude: 59.7147970 },
      { body: 'mercury', longitude: 126.3351921 },
      { body: 'venus', longitude: 84.3396304 },
      { body: 'mars', longitude: 283.3944410 },
      { body: 'jupiter', longitude: 110.4356217 },
      { body: 'saturn', longitude: 357.4466206 },
      { body: 'uranus', longitude: 280.6132256 },
      { body: 'neptune', longitude: 102.3967216 },
      { body: 'pluto', longitude: 83.7460202 },
    ],
    astronomyEngine: [
      { body: 'sun', longitude: 103.3757734 },
      { body: 'mercury', longitude: 126.3360514 },
      { body: 'venus', longitude: 84.3396431 },
      { body: 'mars', longitude: 283.3961760 },
      { body: 'jupiter', longitude: 110.4352823 },
      { body: 'saturn', longitude: 357.4452331 },
      { body: 'uranus', longitude: 280.6122029 },
      { body: 'neptune', longitude: 102.3989953 },
      { body: 'pluto', longitude: 83.7467908 },
    ],
  },
}
