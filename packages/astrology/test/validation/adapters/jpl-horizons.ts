/**
 * JPL Horizons adapter (DRAFT).
 *
 * Smallest possible wrapper around the JPL Horizons API. Takes a UTC instant
 * and a body list, returns apparent geocentric ecliptic longitudes.
 *
 * NOT wired into the harness test run. Used offline to generate reference-data
 * snapshots committed under test/validation/reference-data/.
 *
 * Scope:
 *   - Bodies: Sun, Moon, Mercury through Pluto (10 bodies). Mean Node is
 *     NOT queryable from Horizons (it outputs osculating orbital elements
 *     only, which is ~True Node, not Mean Node). See
 *     .planning/phases/09-ephemeris-validation/09-01-HARNESS.md § Node
 *     validation — explicit scope.
 *   - Output: apparent ecliptic longitude (QUANTITIES='31', includes light-
 *     time, gravitational deflection, stellar aberration). Matches the
 *     convention sweph.calc_ut returns under SEFLG_MOSEPH without special
 *     flags.
 *
 * Response format (plain text, parsed with regex):
 *   ...preamble...
 *   $$SOE
 *   1926-Apr-21 01:40:00.000      30.2058949   0.0000382
 *   $$EOE
 *   ...footer...
 *
 *   Column 1: date (YYYY-Mon-DD HH:MM:SS.fff UT)
 *   Column 2: ObsEcLon (degrees, 0-360)
 *   Column 3: ObsEcLat (degrees, -90..90)
 *
 * Usage:
 *   const refs = await fetchJplLongitudes(
 *     new Date('1926-04-21T01:40:00Z'),
 *     ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn',
 *      'uranus', 'neptune', 'pluto'],
 *   )
 */

import type { Body } from '../types'
import type { PlanetReference } from '../types'

/** JPL Horizons body IDs for geocentric ecliptic queries. */
const HORIZONS_BODY_ID: Record<Exclude<Body, 'northNode'>, string> = {
  sun: '10',
  moon: '301',
  mercury: '199',
  venus: '299',
  mars: '499',
  jupiter: '599',
  saturn: '699',
  uranus: '799',
  neptune: '899',
  pluto: '999',
}

const HORIZONS_URL = 'https://ssd.jpl.nasa.gov/api/horizons.api'

/** Build the Horizons API URL for a single body at a single instant. */
export function buildHorizonsUrl(body: Exclude<Body, 'northNode'>, utc: Date): string {
  const id = HORIZONS_BODY_ID[body]
  const start = formatHorizonsTimestamp(utc)
  const stop = formatHorizonsTimestamp(new Date(utc.getTime() + 60_000))
  const params = new URLSearchParams({
    format: 'text',
    COMMAND: `'${id}'`,
    CENTER: `'500@399'`, // Geocentric
    MAKE_EPHEM: `'YES'`,
    EPHEM_TYPE: `'OBSERVER'`,
    START_TIME: `'${start}'`,
    STOP_TIME: `'${stop}'`,
    STEP_SIZE: `'1'`,
    QUANTITIES: `'31'`,
  })
  return `${HORIZONS_URL}?${params.toString()}`
}

function formatHorizonsTimestamp(utc: Date): string {
  // Horizons accepts 'YYYY-MM-DD HH:MM' (UT). Use ISO slicing for determinism.
  const iso = utc.toISOString() // '1926-04-21T01:40:00.000Z'
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`
}

/** Parse a Horizons text response for the first longitude value. */
export function parseHorizonsLongitude(text: string): number | null {
  const soe = text.indexOf('$$SOE')
  const eoe = text.indexOf('$$EOE')
  if (soe === -1 || eoe === -1 || eoe < soe) return null
  const body = text.slice(soe + 5, eoe).trim()
  // First non-empty line, split by whitespace. Columns:
  //   date-time (5 whitespace-separated tokens with spaces in the date str),
  //   ObsEcLon, ObsEcLat
  // Simplest: match the last two numeric tokens (they are the longitude/latitude).
  const firstLine = body.split('\n')[0]?.trim()
  if (!firstLine) return null
  const tokens = firstLine.split(/\s+/)
  if (tokens.length < 3) return null
  const lon = Number.parseFloat(tokens[tokens.length - 2])
  return Number.isFinite(lon) ? lon : null
}

/**
 * Fetch geocentric ecliptic longitudes for a list of bodies at a single UTC
 * instant. Returns one PlanetReference per body; throws if any body fails.
 *
 * Sequential rather than parallel to stay polite to the Horizons API. For
 * 10 bodies the total wall time is ~10-20 seconds — acceptable for offline
 * snapshot generation.
 */
export async function fetchJplLongitudes(
  utc: Date,
  bodies: Array<Exclude<Body, 'northNode'>>,
): Promise<PlanetReference[]> {
  const results: PlanetReference[] = []
  for (const body of bodies) {
    const url = buildHorizonsUrl(body, utc)
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`Horizons ${body} fetch failed: ${res.status} ${res.statusText}`)
    }
    const text = await res.text()
    const longitude = parseHorizonsLongitude(text)
    if (longitude === null) {
      throw new Error(`Horizons ${body} parse failed — no $$SOE block or bad format`)
    }
    results.push({ body, longitude })
  }
  return results
}
