import { calculateNatalChart } from '@celestia/astrology'

/**
 * Simplified planet position for the current-sky endpoint. Consumed by
 * the web celestial-background animation and mobile (planned) — callers
 * don't need the full chart data (houses, aspects), just positions.
 */
export interface CurrentPlanet {
  name: string
  longitude: number
  latitude: number
  speed: number
  sign: string
}

export interface CurrentPlanetsResponse {
  planets: CurrentPlanet[]
  calculatedAt: string
}

/**
 * Core function: current real-time planet positions via Swiss Ephemeris.
 *
 * No auth — these are public astronomical coordinates. Called on every
 * page render of the celestial-background component; callers should add
 * `Cache-Control: public, s-maxage=600, stale-while-revalidate=300` at
 * their response layer since planetary motion is slow.
 */
export function getCurrentPlanets(date: Date = new Date()): CurrentPlanetsResponse {
  const hh = date.getUTCHours().toString().padStart(2, '0')
  const mm = date.getUTCMinutes().toString().padStart(2, '0')

  const chart = calculateNatalChart({
    date,
    time: `${hh}:${mm}`,
    lat: 0,
    lon: 0,
    birthTimeKnown: true,
  })

  return {
    planets: chart.planets.map((p) => ({
      name: p.planet,
      longitude: p.longitude,
      latitude: p.latitude,
      speed: p.speed,
      sign: p.sign,
    })),
    calculatedAt: date.toISOString(),
  }
}
