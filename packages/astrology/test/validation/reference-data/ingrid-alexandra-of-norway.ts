/**
 * Princess Ingrid Alexandra of Norway — reference data snapshot (§9.2 generator).
 *
 * Case: see ../fixtures/ingrid-alexandra-of-norway.ts
 * Fixture → UTC: 2004-01-21 09:13 local → 2004-01-21 08:13:00 UTC.
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
  caseId: 'ingrid-alexandra-of-norway',
  planets: {
    jpl: [
      { body: 'sun', longitude: 300.6156049 },
      { body: 'moon', longitude: 293.2977146 },
      { body: 'mercury', longitude: 277.0509753 },
      { body: 'venus', longitude: 338.0412004 },
      { body: 'mars', longitude: 21.7385842 },
      { body: 'jupiter', longitude: 168.4221585 },
      { body: 'saturn', longitude: 98.1397553 },
      { body: 'uranus', longitude: 331.0198881 },
      { body: 'neptune', longitude: 312.4121611 },
      { body: 'pluto', longitude: 261.1876666 },
    ],
    astronomyEngine: [
      { body: 'sun', longitude: 300.6157552 },
      { body: 'mercury', longitude: 277.0504278 },
      { body: 'venus', longitude: 338.0414639 },
      { body: 'mars', longitude: 21.7397249 },
      { body: 'jupiter', longitude: 168.4236948 },
      { body: 'saturn', longitude: 98.1395308 },
      { body: 'uranus', longitude: 331.0186642 },
      { body: 'neptune', longitude: 312.4159640 },
      { body: 'pluto', longitude: 261.1876344 },
    ],
  },
}
