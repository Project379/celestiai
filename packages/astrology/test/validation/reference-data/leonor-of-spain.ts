/**
 * Crown Princess Leonor of Spain — reference data snapshot (§9.2 generator).
 *
 * Case: see ../fixtures/leonor-of-spain.ts
 * Fixture → UTC: 2005-10-31 01:46 local → 2005-10-31 00:46:00 UTC.
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
  caseId: 'leonor-of-spain',
  planets: {
    jpl: [
      { body: 'sun', longitude: 217.6952456 },
      { body: 'moon', longitude: 193.7094712 },
      { body: 'mercury', longitude: 240.7616488 },
      { body: 'venus', longitude: 264.6500302 },
      { body: 'mars', longitude: 47.5933999 },
      { body: 'jupiter', longitude: 211.0688159 },
      { body: 'saturn', longitude: 130.8485722 },
      { body: 'uranus', longitude: 336.9496574 },
      { body: 'neptune', longitude: 314.8214838 },
      { body: 'pluto', longitude: 262.7118039 },
    ],
    astronomyEngine: [
      { body: 'sun', longitude: 217.6953826 },
      { body: 'mercury', longitude: 240.7624449 },
      { body: 'venus', longitude: 264.6500134 },
      { body: 'mars', longitude: 47.5922003 },
      { body: 'jupiter', longitude: 211.0673617 },
      { body: 'saturn', longitude: 130.8491450 },
      { body: 'uranus', longitude: 336.9487227 },
      { body: 'neptune', longitude: 314.8256090 },
      { body: 'pluto', longitude: 262.7117921 },
    ],
  },
}
