/**
 * Core natal chart calculation using Swiss Ephemeris
 *
 * This module provides the main calculation function for natal charts.
 * All calculations use the Moshier ephemeris (built-in, no external files needed).
 */

// sweph is loaded via createRequire (CJS entry) rather than static ESM
// import to keep it off Next.js's Webpack module graph — the ESM entry
// (`index.mjs`) uses `fileURLToPath(new URL(".", import.meta.url))` at
// bootstrap, which fails under Next's RSC bundler on Node 24 because
// the bundled `import.meta.url` resolves to `webpack-internal://...`
// instead of a `file://` URL. The CJS entry (`index.js`) avoids that
// bootstrap entirely. See doc-drift tracker #14 at
// .planning/phases/09-ephemeris-validation/09-01-PRECISION-FLOOR.md
// and the preserved serverExternalPackages + transpilePackages config
// at apps/web/next.config.js.
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const sweph = require('sweph') as typeof import('sweph')

import {
  APPROX_TIME_RANGE_MIDPOINT,
  DEFAULT_UNKNOWN_TIME,
  HOUSE_SYSTEM_PLACIDUS,
  PLANET_IDS,
  PLANETS_ORDER,
} from './constants'
import type {
  ChartData,
  ChartInput,
  HouseData,
  PlanetPosition,
  PointData,
} from './types'
import { calculateAspects } from './utils/aspects'
import { getJulianDay, getJulianDayUTC } from './utils/julian-day'
import { localTimeToUTC } from './utils/timezone'
import { getZodiacSign, longitudeToSignDegree } from './utils/zodiac'

/**
 * Calculate planet position for a given Julian Day
 *
 * @param jd - Julian Day number
 * @param planetId - Swiss Ephemeris planet ID
 * @param planetName - Planet name (lowercase)
 * @returns Planet position data (without house - calculated separately)
 */
function calculatePlanetPosition(
  jd: number,
  planetId: number,
  planetName: string
): Omit<PlanetPosition, 'house'> {
  // Use Moshier ephemeris (built-in, no files needed) with speed calculation.
  // Geocentric positions are the standard for all Western astrology software
  // (Co-Star, Astro.com, TimePassages, etc.). Topocentric correction was
  // previously applied to the Moon but introduced a ~27' parallax shift that
  // diverged from every reference chart — removed.
  const flags = sweph.constants.SEFLG_MOSEPH | sweph.constants.SEFLG_SPEED
  const result = sweph.calc_ut(jd, planetId, flags)

  // result.data = [longitude, latitude, distance, lonSpeed, latSpeed, distSpeed]
  const longitude = result.data[0]
  const latitude = result.data[1]
  const speed = result.data[3]

  return {
    planet: planetName,
    longitude,
    latitude,
    speed,
    sign: getZodiacSign(longitude),
    signDegree: longitudeToSignDegree(longitude),
  }
}

/**
 * Determine which house a planet falls into based on house cusps
 *
 * @param longitude - Planet longitude
 * @param houses - Array of house data with cusp longitudes
 * @returns House number (1-12)
 */
function getHouseForPlanet(longitude: number, houses: HouseData[]): number {
  // Normalize longitude to 0-360
  const normalizedLon = ((longitude % 360) + 360) % 360

  for (let i = 0; i < 12; i++) {
    const currentCusp = houses[i].cuspLongitude
    const nextCusp = houses[(i + 1) % 12].cuspLongitude

    // Handle wrap-around at 0/360
    if (nextCusp < currentCusp) {
      // House crosses 0 degrees
      if (normalizedLon >= currentCusp || normalizedLon < nextCusp) {
        return houses[i].number
      }
    } else {
      if (normalizedLon >= currentCusp && normalizedLon < nextCusp) {
        return houses[i].number
      }
    }
  }

  // Fallback (shouldn't happen with valid data)
  return 1
}

/**
 * Create a PointData object from a longitude
 *
 * @param longitude - Ecliptic longitude
 * @returns PointData with sign information
 */
function createPointData(longitude: number): PointData {
  return {
    longitude,
    sign: getZodiacSign(longitude),
    degree: longitudeToSignDegree(longitude),
  }
}

/**
 * Calculate a complete natal chart
 *
 * @param input - Birth data for calculation
 * @returns Complete chart data with planets, houses, and aspects
 *
 * @example
 * ```typescript
 * const chart = calculateNatalChart({
 *   date: new Date('1990-06-15'),
 *   time: '14:30',
 *   lat: 42.6977,
 *   lon: 23.3219, // Sofia
 *   birthTimeKnown: true,
 * })
 *
 * console.log(chart.planets[0]) // Sun position
 * console.log(chart.ascendant)  // Rising sign
 * ```
 */
export function calculateNatalChart(input: ChartInput): ChartData {
  // Use noon as default if birth time is unknown
  const time = input.time ?? DEFAULT_UNKNOWN_TIME

  // Calculate Julian Day
  // When birth time is known, convert local time → UTC using the birth location's timezone.
  // This is critical because users enter local birth time, but Swiss Ephemeris needs UTC.
  // Without this conversion, the Ascendant can be off by 1+ zodiac signs.
  let jd: number
  if (input.birthTimeKnown && input.time) {
    const { utcHours, dayOffset } = localTimeToUTC(
      input.date,
      time,
      input.lat,
      input.lon
    )
    jd = getJulianDayUTC(input.date, utcHours, dayOffset)
  } else {
    // Unknown birth time: use a *local* time at the birth location, then
    // convert to UTC (never noon UTC — that is up to several hours of error
    // for locations far from Greenwich and can place the Moon in the wrong
    // sign). If the user picked an approximate window, use its midpoint —
    // a ~3h-max error instead of the up-to-9h error of a blind noon. Else
    // fall back to noon local, the classic minimise-maximum-error default.
    const unknownLocalTime =
      (input.approximateTimeRange &&
        APPROX_TIME_RANGE_MIDPOINT[input.approximateTimeRange]) ||
      DEFAULT_UNKNOWN_TIME
    const { utcHours, dayOffset } = localTimeToUTC(
      input.date,
      unknownLocalTime,
      input.lat,
      input.lon
    )
    jd = getJulianDayUTC(input.date, utcHours, dayOffset)
  }

  // Calculate house cusps using Placidus
  const housesResult = sweph.houses(
    jd,
    input.lat,
    input.lon,
    HOUSE_SYSTEM_PLACIDUS
  )

  // Extract house data
  // housesResult.data.houses is array of 12 cusp longitudes
  const houses: HouseData[] = housesResult.data.houses.map(
    (cuspLongitude: number, index: number) => ({
      number: index + 1,
      cuspLongitude,
      sign: getZodiacSign(cuspLongitude),
      signDegree: longitudeToSignDegree(cuspLongitude),
    })
  )

  // Extract Ascendant and MC from points array
  // Index 0 = Ascendant (SE_ASC), Index 1 = MC (SE_MC)
  const ascendant = createPointData(housesResult.data.points[sweph.constants.SE_ASC])
  const mc = createPointData(housesResult.data.points[sweph.constants.SE_MC])

  // Calculate all planet positions (geocentric, matching industry standard)
  const planetsWithoutHouse = PLANETS_ORDER.map((planetName) => {
    const planetId = PLANET_IDS[planetName]
    return calculatePlanetPosition(jd, planetId, planetName)
  })

  // Add house placements to planets
  const planets: PlanetPosition[] = planetsWithoutHouse.map((planet) => ({
    ...planet,
    house: getHouseForPlanet(planet.longitude, houses),
  }))

  // Calculate aspects between planets
  const aspects = calculateAspects(planets)

  return {
    planets,
    houses,
    aspects,
    ascendant,
    mc,
    birthTimeKnown: input.birthTimeKnown,
  }
}
