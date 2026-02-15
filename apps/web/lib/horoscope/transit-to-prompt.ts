/**
 * Transit and natal data to textual prompt serializer
 *
 * Converts transit planet positions + natal chart data into a structured
 * textual representation suitable for inclusion in the daily horoscope
 * AI prompt. The AI model reads this text to understand both today's
 * transits and the user's natal chart before generating the horoscope.
 *
 * Output format:
 *
 * ТРАНЗИТНИ ПЛАНЕТИ (днес):
 * Слънце: 26° Водолей (транзит)
 * Луна: 14° Телец (транзит)
 * ...
 *
 * НАТАЛНА КАРТА:
 * Слънце: 15° Лъв, дом 5
 * Луна: 28° Рак, дом 4
 * ...
 *
 * АКТИВНИ ТРАНЗИТНИ АСПЕКТИ:
 * Транзитен Марс квадрат натален Слънце (орб 1.8°, прилагащ)
 * ...
 */

import type { PlanetPosition } from '@celestia/astrology/client'
import type { Planet, ZodiacSign, AspectType } from '@celestia/astrology/client'
import {
  PLANETS_BG,
  ZODIAC_SIGNS_BG,
  ASPECTS_BG,
} from '@celestia/astrology/client'
import type { TransitAspect } from '@celestia/astrology'

/**
 * Shape of the natal chart_calculations row data from Supabase
 */
interface NatalCalculationData {
  planet_positions: PlanetPosition[]
  house_cusps?: Array<{ number: number; cuspLongitude: number; sign: string; signDegree: number }>
  birth_time_known?: boolean
}

/**
 * Format a transit planet position as a human-readable line.
 * Example: "Слънце: 26° Водолей (транзит)"
 */
function formatTransitPlanetLine(
  planet: Omit<PlanetPosition, 'house'>
): string {
  const planetName = PLANETS_BG[planet.planet as Planet] ?? planet.planet
  const signName = ZODIAC_SIGNS_BG[planet.sign as ZodiacSign] ?? planet.sign
  const degree = Math.round(planet.signDegree * 10) / 10
  const retrograde = planet.speed < 0 ? ' (ретроградна)' : ''
  return `${planetName}: ${degree}° ${signName}${retrograde} (транзит)`
}

/**
 * Format a natal planet position as a human-readable line.
 * Example: "Слънце: 15° Лъв, дом 5"
 */
function formatNatalPlanetLine(planet: PlanetPosition): string {
  const planetName = PLANETS_BG[planet.planet as Planet] ?? planet.planet
  const signName = ZODIAC_SIGNS_BG[planet.sign as ZodiacSign] ?? planet.sign
  const degree = Math.round(planet.signDegree * 10) / 10
  const retrograde = planet.speed < 0 ? ' (ретроградна)' : ''
  return `${planetName}: ${degree}° ${signName}, дом ${planet.house}${retrograde}`
}

/**
 * Format a transit aspect as a human-readable line.
 * Example: "Транзитен Марс квадрат натален Слънце (орб 1.8°, прилагащ)"
 */
function formatTransitAspectLine(aspect: TransitAspect): string {
  const transitPlanetName =
    PLANETS_BG[aspect.transitPlanet as Planet] ?? aspect.transitPlanet
  const natalPlanetName =
    PLANETS_BG[aspect.natalPlanet as Planet] ?? aspect.natalPlanet
  const aspectName = ASPECTS_BG[aspect.aspect as AspectType] ?? aspect.aspect
  const orb = Math.round(aspect.orb * 10) / 10
  const status = aspect.applying ? 'прилагащ' : 'раздалечаващ'
  return `Транзитен ${transitPlanetName} ${aspectName} натален ${natalPlanetName} (орб ${orb}°, ${status})`
}

/**
 * Converts transit positions + natal chart data into a textual prompt.
 *
 * @param transitPlanets - Today's transit planet positions (from daily_transits cache or fresh calc)
 * @param natalCalculation - The natal chart_calculations row from Supabase
 * @param transitAspects - Computed transit-to-natal aspects
 * @returns A formatted string for use in the daily horoscope AI prompt
 */
export function transitAndNatalToPromptText(
  transitPlanets: Omit<PlanetPosition, 'house'>[],
  natalCalculation: NatalCalculationData,
  transitAspects: TransitAspect[]
): string {
  const lines: string[] = []

  // Today's transit planet positions
  lines.push('ТРАНЗИТНИ ПЛАНЕТИ (днес):')
  for (const planet of transitPlanets) {
    lines.push(formatTransitPlanetLine(planet))
  }

  lines.push('')

  // Natal chart planet positions
  lines.push('НАТАЛНА КАРТА:')
  const natalPlanets: PlanetPosition[] = natalCalculation.planet_positions ?? []
  for (const planet of natalPlanets) {
    lines.push(formatNatalPlanetLine(planet))
  }

  // Birth time note
  if (natalCalculation.birth_time_known === false) {
    lines.push(
      '(Часът на раждане е неизвестен — домовете са приблизителни)'
    )
  }

  lines.push('')

  // Active transit aspects
  if (transitAspects.length > 0) {
    lines.push('АКТИВНИ ТРАНЗИТНИ АСПЕКТИ:')
    for (const aspect of transitAspects) {
      lines.push(formatTransitAspectLine(aspect))
    }
  } else {
    lines.push('АКТИВНИ ТРАНЗИТНИ АСПЕКТИ:')
    lines.push('(Няма точни транзитни аспекти за днес)')
  }

  return lines.join('\n')
}
