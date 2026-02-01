/**
 * Aspect calculation utilities
 *
 * Detects major aspects between planets based on their angular separation.
 */

import { ASPECT_DEFINITIONS } from '../constants'
import type { AspectData, PlanetPosition } from '../types'

/**
 * Calculate the shortest angular distance between two longitudes
 *
 * @param lon1 - First longitude (0-360)
 * @param lon2 - Second longitude (0-360)
 * @returns Shortest angle between them (0-180)
 */
function getShortestAngle(lon1: number, lon2: number): number {
  let diff = Math.abs(lon1 - lon2)
  if (diff > 180) {
    diff = 360 - diff
  }
  return diff
}

/**
 * Determine if an aspect is applying (planets getting closer to exact)
 *
 * @param p1 - First planet position
 * @param p2 - Second planet position
 * @param exactAngle - The exact angle of the aspect
 * @returns True if the aspect is applying
 */
function isApplying(
  p1: PlanetPosition,
  p2: PlanetPosition,
  exactAngle: number
): boolean {
  // Calculate current orb
  const currentAngle = getShortestAngle(p1.longitude, p2.longitude)
  const currentOrb = Math.abs(currentAngle - exactAngle)

  // Calculate orb in the future (using daily speed)
  const futureLon1 = p1.longitude + p1.speed
  const futureLon2 = p2.longitude + p2.speed
  const futureAngle = getShortestAngle(futureLon1, futureLon2)
  const futureOrb = Math.abs(futureAngle - exactAngle)

  // Aspect is applying if orb is getting smaller
  return futureOrb < currentOrb
}

/**
 * Calculate all aspects between a set of planets
 *
 * @param planets - Array of planet positions
 * @returns Array of detected aspects
 *
 * @example
 * ```typescript
 * const aspects = calculateAspects(chart.planets)
 * aspects.forEach(a => {
 *   console.log(`${a.planet1} ${a.aspect} ${a.planet2} (orb: ${a.orb.toFixed(1)}°)`)
 * })
 * ```
 */
export function calculateAspects(planets: PlanetPosition[]): AspectData[] {
  const aspects: AspectData[] = []

  // Check each pair of planets
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const p1 = planets[i]
      const p2 = planets[j]

      // Calculate shortest angle between planets
      const angle = getShortestAngle(p1.longitude, p2.longitude)

      // Check against each aspect type
      for (const aspectDef of ASPECT_DEFINITIONS) {
        const orb = Math.abs(angle - aspectDef.angle)

        if (orb <= aspectDef.orb) {
          aspects.push({
            planet1: p1.planet,
            planet2: p2.planet,
            aspect: aspectDef.name,
            angle,
            orb,
            applying: isApplying(p1, p2, aspectDef.angle),
          })
          // Only one aspect per planet pair (most exact)
          break
        }
      }
    }
  }

  return aspects
}
