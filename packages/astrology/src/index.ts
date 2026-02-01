/**
 * @celestia/astrology - Swiss Ephemeris wrapper for natal chart calculations
 *
 * This package provides server-side astrology calculations using the Swiss Ephemeris.
 * All calculations use the Moshier ephemeris (built-in, no external files needed).
 *
 * @example
 * ```typescript
 * import { calculateNatalChart, PLANETS_BG, ZODIAC_SIGNS_BG } from '@celestia/astrology'
 *
 * const chart = calculateNatalChart({
 *   date: new Date('1990-06-15'),
 *   time: '14:30',
 *   lat: 42.6977,
 *   lon: 23.3219,
 *   birthTimeKnown: true,
 * })
 *
 * // Display in Bulgarian
 * const sunSign = ZODIAC_SIGNS_BG[chart.planets[0].sign]
 * console.log(`Слънце в ${sunSign}`)
 * ```
 */

// Types
export type {
  AspectData,
  AspectType,
  ChartData,
  ChartInput,
  HouseData,
  Planet,
  PlanetPosition,
  PointData,
  ZodiacSign,
} from './types'

// Constants
export {
  ASPECT_DEFINITIONS,
  ASPECTS_BG,
  DEFAULT_UNKNOWN_TIME,
  HOUSE_SYSTEM_PLACIDUS,
  PLANET_IDS,
  PLANETS_BG,
  PLANETS_ORDER,
  UNKNOWN_TIME_DISCLAIMER_BG,
  ZODIAC_SIGNS_BG,
  ZODIAC_SIGNS_ORDER,
} from './constants'
export type { AspectDefinition } from './constants'

// Calculator (will be added in Task 2)
export { calculateNatalChart } from './calculator'

// Utilities (will be added in Task 2)
export { getJulianDay } from './utils/julian-day'
export { getZodiacSign, longitudeToSignDegree } from './utils/zodiac'
export { calculateAspects } from './utils/aspects'
