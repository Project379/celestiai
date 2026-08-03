/**
 * Synthetic — New Year's Eve, New York (tz boundary) — reference data snapshot (§9.2 generator).
 *
 * Case: see ../fixtures/synthetic-nye-tz-boundary.ts
 * Fixture → UTC: 1999-12-31 23:30 local → 2000-01-01 04:30:00 UTC.
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
  caseId: 'synthetic-nye-tz-boundary',
  planets: {
    jpl: [
      { body: 'sun', longitude: 280.0503410 },
      { body: 'moon', longitude: 219.5595777 },
      { body: 'mercury', longitude: 271.4031973 },
      { body: 'venus', longitude: 241.1880095 },
      { body: 'mars', longitude: 327.7208955 },
      { body: 'jupiter', longitude: 25.2404949 },
      { body: 'saturn', longitude: 40.4019586 },
      { body: 'uranus', longitude: 314.7934573 },
      { body: 'neptune', longitude: 303.1818955 },
      { body: 'pluto', longitude: 251.4437624 },
    ],
    astronomyEngine: [
      { body: 'sun', longitude: 280.0501716 },
      { body: 'mercury', longitude: 271.4028334 },
      { body: 'venus', longitude: 241.1874633 },
      { body: 'mars', longitude: 327.7215012 },
      { body: 'jupiter', longitude: 25.2416291 },
      { body: 'saturn', longitude: 40.4024445 },
      { body: 'uranus', longitude: 314.7903935 },
      { body: 'neptune', longitude: 303.1843369 },
      { body: 'pluto', longitude: 251.4437377 },
    ],
  },
}
