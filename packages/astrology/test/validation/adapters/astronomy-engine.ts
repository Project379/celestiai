/**
 * Astronomy Engine adapter (DRAFT).
 *
 * Computes apparent geocentric ecliptic longitudes locally using the
 * astronomy-engine npm package (cosinekitty/astronomy, MIT, VSOP87-based).
 * No network, no file I/O — pure computation.
 *
 * Scope per locked §9.2 thresholds: 9 non-Moon non-Node bodies only.
 *   - Sun, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto
 *   - Moon and northNode NOT computed: Astronomy Engine's ±1' stated accuracy
 *     is coarser than the 3" Moon and 20" Mean Node primary thresholds, so AE
 *     can't meaningfully validate them. Do not extend this adapter to include
 *     Moon or Node without a corresponding threshold change in
 *     09-01-PRECISION-FLOOR.md.
 *
 * NOT wired into the harness test run. Used offline to generate reference-
 * data snapshots committed under test/validation/reference-data/.
 */

// Default import via esModuleInterop — astronomy-engine's npm package lacks
// "type": "module" in its nested esm/ directory, so Node's ESM loader treats
// the file as CJS. Named imports (`import { Body }`) fail at runtime;
// namespace imports wrap everything under `.default`. Default import with
// esModuleInterop gives the cleanest access pattern: AE.Body.Sun,
// AE.GeoVector, AE.Ecliptic all work.
import AE from 'astronomy-engine'

import type { Body, PlanetReference } from '../types'

/** Astronomy Engine's Body enum values for the 9 non-Moon non-Node bodies. */
const AE_BODY: Record<Exclude<Body, 'moon' | 'northNode'>, AE.Body> = {
  sun: AE.Body.Sun,
  mercury: AE.Body.Mercury,
  venus: AE.Body.Venus,
  mars: AE.Body.Mars,
  jupiter: AE.Body.Jupiter,
  saturn: AE.Body.Saturn,
  uranus: AE.Body.Uranus,
  neptune: AE.Body.Neptune,
  pluto: AE.Body.Pluto,
}

/** Compute apparent geocentric ecliptic longitude for one body at a UTC instant. */
function longitudeFor(body: Exclude<Body, 'moon' | 'northNode'>, utc: Date): number {
  // GeoVector(body, date, aberration=true) returns apparent geocentric position
  // in the J2000 equatorial frame. Ecliptic() converts to ecliptic coords.
  const vec = AE.GeoVector(AE_BODY[body], utc, true)
  const ecl = AE.Ecliptic(vec)
  // elon is in degrees, normalized to 0-360 by Astronomy Engine.
  return ecl.elon
}

/**
 * Compute AE ecliptic longitudes for the in-scope bodies at one UTC instant.
 * Pure/synchronous — no I/O.
 */
export function computeAstronomyEngineLongitudes(
  utc: Date,
  bodies: Array<Exclude<Body, 'moon' | 'northNode'>>,
): PlanetReference[] {
  return bodies.map((body) => ({
    body,
    longitude: longitudeFor(body, utc),
  }))
}
