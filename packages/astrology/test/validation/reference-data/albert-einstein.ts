/**
 * Albert Einstein — reference data snapshot (§9.2 generator).
 *
 * Case: see ../fixtures/albert-einstein.ts
 * Fixture → UTC: 1879-03-14 11:30 local → 1879-03-14 10:37:00 UTC.
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
  caseId: 'albert-einstein',
  planets: {
    jpl: [
      { body: 'sun', longitude: 353.4986725 },
      { body: 'moon', longitude: 254.4001584 },
      { body: 'mercury', longitude: 3.1261796 },
      { body: 'venus', longitude: 16.9738053 },
      { body: 'mars', longitude: 296.9075603 },
      { body: 'jupiter', longitude: 327.4819679 },
      { body: 'saturn', longitude: 4.1886187 },
      { body: 'uranus', longitude: 151.2887412 },
      { body: 'neptune', longitude: 37.8716196 },
      { body: 'pluto', longitude: 54.7253652 },
    ],
    astronomyEngine: [
      { body: 'sun', longitude: 353.4986717 },
      { body: 'mercury', longitude: 3.1256079 },
      { body: 'venus', longitude: 16.9737755 },
      { body: 'mars', longitude: 296.9080983 },
      { body: 'jupiter', longitude: 327.4819014 },
      { body: 'saturn', longitude: 4.1880894 },
      { body: 'uranus', longitude: 151.2889738 },
      { body: 'neptune', longitude: 37.8715104 },
      { body: 'pluto', longitude: 54.7269499 },
    ],
  },
}
