/**
 * Zodiac sign utilities
 *
 * Functions for converting ecliptic longitude to zodiac sign positions.
 */

import { ZODIAC_SIGNS_ORDER } from '../constants'
import type { ZodiacSign } from '../types'

/**
 * Get the zodiac sign from an ecliptic longitude
 *
 * @param longitude - Ecliptic longitude in degrees (0-360)
 * @returns Zodiac sign identifier (lowercase)
 *
 * @example
 * ```typescript
 * getZodiacSign(45)  // 'taurus' (45 degrees is in Taurus: 30-60)
 * getZodiacSign(0)   // 'aries'
 * getZodiacSign(359) // 'pisces'
 * ```
 */
export function getZodiacSign(longitude: number): ZodiacSign {
  // Normalize longitude to 0-360 range
  const normalizedLongitude = ((longitude % 360) + 360) % 360

  // Each sign spans 30 degrees
  const signIndex = Math.floor(normalizedLongitude / 30)

  return ZODIAC_SIGNS_ORDER[signIndex]
}

/**
 * Get the degree within a zodiac sign from ecliptic longitude
 *
 * @param longitude - Ecliptic longitude in degrees (0-360)
 * @returns Degree within the sign (0-30)
 *
 * @example
 * ```typescript
 * longitudeToSignDegree(45) // 15 (15 degrees into Taurus)
 * longitudeToSignDegree(0)  // 0 (0 degrees Aries)
 * longitudeToSignDegree(29) // 29 (29 degrees Aries)
 * ```
 */
export function longitudeToSignDegree(longitude: number): number {
  // Normalize longitude to 0-360 range
  const normalizedLongitude = ((longitude % 360) + 360) % 360

  // Get degree within 30-degree sign
  return normalizedLongitude % 30
}
