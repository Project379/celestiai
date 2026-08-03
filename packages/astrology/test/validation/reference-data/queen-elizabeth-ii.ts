/**
 * Queen Elizabeth II — reference data snapshot.
 *
 * Case: see ../fixtures/queen-elizabeth-ii.ts
 * Fixture → UTC: 1926-04-21 02:40 London (BST = UTC+1) → 1926-04-21 01:40 UTC.
 *   Verified by running @stellaeum/astrology's localTimeToUTC against the
 *   fixture inputs (utcHours=1.666..., dayOffset=0).
 *
 * Coverage in this commit (§9.1 task 5b):
 *   - planets.jpl:             POPULATED (task 5a). Apparent geocentric
 *                              ecliptic longitudes, 10 bodies (no northNode
 *                              — see inline-reference asymmetry note below).
 *   - planets.astronomyEngine: POPULATED (this commit). 9 non-Moon non-Node
 *                              bodies per locked scope.
 *   - houses.astrocom:         NOT YET POPULATED. Added in §9.1 task 5c.
 *   - aspects.astrocom:        NOT YET POPULATED. Added in §9.1 task 5c.
 *   - planets.nativeSwisseph:  NOT YET POPULATED. Moshier-vs-SE-files floor
 *                              check, added in §9.1 task 6 (sample comparison
 *                              round) via the AGPL protocol in README.md.
 *
 * Astronomy Engine generation protocol:
 *   Computed 2026-04-20 via computeAstronomyEngineLongitudes() in
 *   ../adapters/astronomy-engine.ts. Pure local computation, no network.
 *   astronomy-engine npm package v2.1.19, VSOP87-based, ±1' stated accuracy.
 *   Scope: 9 non-Moon non-Node bodies (Moon + Node intentionally skipped —
 *   AE's ±1' floor is coarser than their primary thresholds).
 *
 * JPL Horizons generation protocol:
 *   Queried 2026-04-20 via the JPL Horizons API
 *   (https://ssd.jpl.nasa.gov/api/horizons.api) with:
 *     COMMAND = body ID per ../adapters/jpl-horizons.ts HORIZONS_BODY_ID
 *     CENTER = '500@399' (geocentric)
 *     START_TIME = '1926-04-21 01:40', STOP_TIME = '1926-04-21 01:41'
 *     STEP_SIZE = '1', QUANTITIES = '31' (apparent observer ecliptic long/lat)
 *   Output includes light-time, gravitational deflection, stellar aberration
 *   — matches sweph.calc_ut convention under SEFLG_MOSEPH.
 *
 * Mean Node — inline-reference asymmetry:
 *   northNode is intentionally omitted from planets.jpl. JPL Horizons does
 *   not output astrology Mean Node; the Node reference is a Meeus Ch. 47
 *   polynomial inline in the harness (lands with §9.2 code). Do NOT add a
 *   northNode entry here — the comparison runs from inline code for every
 *   case. See ./README.md § Mean Node — inline-reference asymmetry and
 *   09-01-HARNESS.md § Node validation — explicit scope.
 */

import type { ReferenceData } from '../types'

export const referenceData: ReferenceData = {
  caseId: 'queen-elizabeth-ii',
  planets: {
    jpl: [
      { body: 'sun', longitude: 30.2058949 },
      { body: 'moon', longitude: 132.1217302 },
      { body: 'mercury', longitude: 4.6620631 },
      { body: 'venus', longitude: 343.9560232 },
      { body: 'mars', longitude: 320.8661448 },
      { body: 'jupiter', longitude: 322.5095871 },
      { body: 'saturn', longitude: 234.4450330 },
      { body: 'uranus', longitude: 357.3559613 },
      { body: 'neptune', longitude: 142.0348474 },
      { body: 'pluto', longitude: 102.7061116 },
    ],
    astronomyEngine: [
      { body: 'sun', longitude: 30.2059137 },
      { body: 'mercury', longitude: 4.6621214 },
      { body: 'venus', longitude: 343.9569815 },
      { body: 'mars', longitude: 320.8669314 },
      { body: 'jupiter', longitude: 322.5091628 },
      { body: 'saturn', longitude: 234.4461431 },
      { body: 'uranus', longitude: 357.3561529 },
      { body: 'neptune', longitude: 142.0379241 },
      { body: 'pluto', longitude: 102.7065759 },
    ],
  },
}
