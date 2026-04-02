/**
 * Chart data to textual prompt serializer
 *
 * Converts a ChartData object into a structured textual representation
 * suitable for inclusion in an AI prompt. The AI model reads this text
 * to understand the user's natal chart before generating a reading.
 *
 * Output format (Bulgarian labels, English planet/sign names for consistency
 * with sentinel keys):
 *
 * НАТАЛНА КАРТА:
 * Слънце: 15° Лъв, дом 5
 * Луна: 28° Рак, дом 4
 * ...
 * Асцендент: 12° Скорпион
 * MC: 3° Лъв
 *
 * АСПЕКТИ:
 * Слънце тригон Луна (орб 2.3°)
 * ...
 */

import type { ChartData, PlanetPosition, AspectData } from '@celestia/astrology/client'
import { PLANETS_BG, ZODIAC_SIGNS_BG, ASPECTS_BG } from '@celestia/astrology/client'
import type { Planet, ZodiacSign, AspectType } from '@celestia/astrology/client'

/**
 * Formats a planet position as a human-readable line in Bulgarian.
 * Example: "Слънце: 15° Лъв, дом 5 (ретроградна)"
 */
function formatPlanetLine(position: PlanetPosition): string {
  const planetName = PLANETS_BG[position.planet as Planet] ?? position.planet
  const signName = ZODIAC_SIGNS_BG[position.sign as ZodiacSign] ?? position.sign
  const degrees = Math.floor(position.signDegree)
  const minutes = Math.floor((position.signDegree - degrees) * 60)
  const retrograde = position.speed < 0 ? ' (ретроградна)' : ''
  return `${planetName}: ${degrees}°${minutes.toString().padStart(2, '0')}' ${signName}, дом ${position.house}${retrograde}`
}

/**
 * Formats an aspect as a human-readable line in Bulgarian.
 * Example: "Слънце тригон Луна (орб 2.3°)"
 */
function formatAspectLine(aspect: AspectData): string {
  const planet1 = PLANETS_BG[aspect.planet1 as Planet] ?? aspect.planet1
  const planet2 = PLANETS_BG[aspect.planet2 as Planet] ?? aspect.planet2
  const aspectName = ASPECTS_BG[aspect.aspect as AspectType] ?? aspect.aspect
  const orb = Math.round(aspect.orb * 10) / 10
  const applying = aspect.applying ? ', прилагащ' : ', раздалечаващ'
  return `${planet1} ${aspectName} ${planet2} (орб ${orb}°${applying})`
}

/**
 * Converts a ChartData object to a textual prompt representation.
 *
 * @param chartData - The calculated natal chart data
 * @returns A formatted string describing the chart for use in an AI prompt
 */
export function chartToPromptText(chartData: ChartData): string {
  const lines: string[] = ['НАТАЛНА КАРТА:']

  // Planet positions
  for (const planet of chartData.planets) {
    lines.push(formatPlanetLine(planet))
  }

  // Ascendant
  const asc = chartData.ascendant
  const ascSign = ZODIAC_SIGNS_BG[asc.sign as ZodiacSign] ?? asc.sign
  const ascDeg = Math.floor(asc.degree)
  const ascMin = Math.floor((asc.degree - ascDeg) * 60)
  lines.push(`Асцендент: ${ascDeg}°${ascMin.toString().padStart(2, '0')}' ${ascSign}`)

  // MC (Midheaven)
  const mc = chartData.mc
  const mcSign = ZODIAC_SIGNS_BG[mc.sign as ZodiacSign] ?? mc.sign
  const mcDeg = Math.floor(mc.degree)
  const mcMin = Math.floor((mc.degree - mcDeg) * 60)
  lines.push(`MC (Среднебо): ${mcDeg}°${mcMin.toString().padStart(2, '0')}' ${mcSign}`)

  // Birth time note
  if (!chartData.birthTimeKnown) {
    lines.push('(Часът на раждане е неизвестен — Асцендент и домове са приблизителни)')
  }

  // Aspects section
  if (chartData.aspects.length > 0) {
    lines.push('')
    lines.push('АСПЕКТИ:')
    for (const aspect of chartData.aspects) {
      lines.push(formatAspectLine(aspect))
    }
  }

  return lines.join('\n')
}
