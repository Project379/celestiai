/**
 * Synthetic — 0°N 0°E at J2000 — reference data snapshot (§9.2 generator).
 *
 * Case: see ../fixtures/synthetic-equator-prime-meridian.ts
 * Fixture → UTC: 2000-01-01 12:00 local → 2000-01-01 12:00:00 UTC.
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
  caseId: 'synthetic-equator-prime-meridian',
  planets: {
    jpl: [
      { body: 'sun', longitude: 280.3689092 },
      { body: 'moon', longitude: 223.3237860 },
      { body: 'mercury', longitude: 271.8892699 },
      { body: 'venus', longitude: 241.5657794 },
      { body: 'mars', longitude: 327.9632921 },
      { body: 'jupiter', longitude: 25.2530685 },
      { body: 'saturn', longitude: 40.3956366 },
      { body: 'uranus', longitude: 314.8091680 },
      { body: 'neptune', longitude: 303.1930003 },
      { body: 'pluto', longitude: 251.4547644 },
    ],
    astronomyEngine: [
      { body: 'sun', longitude: 280.3687386 },
      { body: 'mercury', longitude: 271.8889121 },
      { body: 'venus', longitude: 241.5652329 },
      { body: 'mars', longitude: 327.9638991 },
      { body: 'jupiter', longitude: 25.2541998 },
      { body: 'saturn', longitude: 40.3961241 },
      { body: 'uranus', longitude: 314.8061046 },
      { body: 'neptune', longitude: 303.1954421 },
      { body: 'pluto', longitude: 251.4547352 },
    ],
  },
}
