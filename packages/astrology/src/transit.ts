/**
 * Daily transit calculation using Swiss Ephemeris
 *
 * Provides functions for calculating current planet transit positions
 * and detecting transit-to-natal aspects.
 *
 * Transit positions use noon UTC as the standard Julian Day time,
 * which is the astrological convention for daily transits.
 */

import * as sweph from 'sweph'

import { PLANET_IDS, PLANETS_ORDER } from './constants'
import type { AspectType, PlanetPosition } from './types'
import { getJulianDay } from './utils/julian-day'
import { getZodiacSign, longitudeToSignDegree } from './utils/zodiac'

/**
 * Transit planet positions for a given date
 */
export interface TransitData {
  /** ISO date string 'YYYY-MM-DD' */
  date: string
  /** Planet positions without house (houses are natal, not transit) */
  planets: Omit<PlanetPosition, 'house'>[]
}

/**
 * Aspect between a transiting planet and a natal planet
 */
export interface TransitAspect {
  /** The transiting planet (today's position) */
  transitPlanet: string
  /** The natal planet being aspected */
  natalPlanet: string
  /** Aspect type */
  aspect: AspectType
  /** Deviation from exact aspect in degrees */
  orb: number
  /** Is the aspect applying (transit planet moving toward exactness)? */
  applying: boolean
}

/**
 * Transit aspect definitions with tighter orbs than natal.
 * Inner planets move fast, so tighter orbs are astrologically meaningful.
 * Outer planets move slowly, slightly wider orbs still indicate active influence.
 */
interface TransitAspectDefinition {
  name: AspectType
  angle: number
  orbInner: number // Sun, Moon, Mercury, Venus, Mars
  orbOuter: number // Jupiter, Saturn, Uranus, Neptune, Pluto
}

const TRANSIT_ASPECT_DEFINITIONS: TransitAspectDefinition[] = [
  { name: 'conjunction', angle: 0, orbInner: 3, orbOuter: 4 },
  { name: 'sextile', angle: 60, orbInner: 2, orbOuter: 3 },
  { name: 'square', angle: 90, orbInner: 2.5, orbOuter: 3.5 },
  { name: 'trine', angle: 120, orbInner: 2.5, orbOuter: 3.5 },
  { name: 'opposition', angle: 180, orbInner: 3, orbOuter: 4 },
]

/** Outer planets — slower-moving, use wider transit orbs */
const OUTER_PLANETS = new Set([
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
])

/**
 * Calculate the shortest angular distance between two longitudes
 */
function getShortestAngle(lon1: number, lon2: number): number {
  let diff = Math.abs(lon1 - lon2)
  if (diff > 180) {
    diff = 360 - diff
  }
  return diff
}

/**
 * Calculate planet transit positions for a given date at noon UTC.
 *
 * Noon UTC is the standard astrological convention for daily transits.
 * This ensures consistent results regardless of when in the day the
 * function is called.
 *
 * @param date - The date for which to calculate transit positions
 * @returns TransitData with planet positions for that date
 *
 * @example
 * ```typescript
 * const transits = calculateDailyTransits(new Date())
 * console.log(transits.date) // '2026-02-15'
 * console.log(transits.planets[0]) // Sun position at noon UTC
 * ```
 */
export function calculateDailyTransits(date: Date): TransitData {
  // Resolve date string from UTC components to avoid timezone drift
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const isoDate = `${year}-${month}-${day}`

  // Noon UTC is the standard astrological convention for daily transits
  const jd = getJulianDay(date, '12:00')

  // Use Moshier ephemeris with speed calculation (same flags as natal chart)
  const flags = sweph.constants.SEFLG_MOSEPH | sweph.constants.SEFLG_SPEED

  const planets = PLANETS_ORDER.map((planetName) => {
    const planetId = PLANET_IDS[planetName]
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
  })

  return { date: isoDate, planets }
}

/**
 * Calculate transit-to-natal aspects.
 *
 * Cross-references each transiting planet against each natal planet
 * using tighter orbs than natal-to-natal aspects. This produces only
 * the most significant active influences.
 *
 * Applying/separating is determined by transit planet speed only —
 * natal positions are fixed, so only the transit planet moves.
 *
 * @param transits - Transit planet positions for today
 * @param natalPlanets - The user's natal planet positions
 * @returns Array of transit aspects with orb and applying/separating status
 *
 * @example
 * ```typescript
 * const aspects = calculateTransitAspects(transits, natalChart.planets)
 * aspects.forEach(a => {
 *   const status = a.applying ? 'прилагащ' : 'раздалечаващ'
 *   console.log(`Транзитен ${a.transitPlanet} ${a.aspect} натален ${a.natalPlanet} (${a.orb.toFixed(1)}° ${status})`)
 * })
 * ```
 */
export function calculateTransitAspects(
  transits: TransitData,
  natalPlanets: PlanetPosition[]
): TransitAspect[] {
  const aspects: TransitAspect[] = []

  for (const transitPlanet of transits.planets) {
    const isOuter = OUTER_PLANETS.has(transitPlanet.planet)

    for (const natalPlanet of natalPlanets) {
      const angle = getShortestAngle(
        transitPlanet.longitude,
        natalPlanet.longitude
      )

      for (const aspectDef of TRANSIT_ASPECT_DEFINITIONS) {
        const orb = Math.abs(angle - aspectDef.angle)
        const maxOrb = isOuter ? aspectDef.orbOuter : aspectDef.orbInner

        if (orb <= maxOrb) {
          // Determine applying/separating using only transit planet speed
          // Natal positions are fixed — only the transit planet moves
          const currentOrb = orb
          const futureLon = transitPlanet.longitude + transitPlanet.speed
          const futureAngle = getShortestAngle(futureLon, natalPlanet.longitude)
          const futureOrb = Math.abs(futureAngle - aspectDef.angle)
          const applying = futureOrb < currentOrb

          aspects.push({
            transitPlanet: transitPlanet.planet,
            natalPlanet: natalPlanet.planet,
            aspect: aspectDef.name,
            orb,
            applying,
          })

          // Only the most exact aspect per transit-natal planet pair
          break
        }
      }
    }
  }

  return aspects
}
