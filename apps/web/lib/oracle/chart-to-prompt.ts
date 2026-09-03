/**
 * Chart data to textual prompt serializer + deterministic placeholder map.
 *
 * `chartToPromptText` converts a ChartData object into the structured
 * Bulgarian text the model reads to understand the chart.
 *
 * `buildOraclePlaceholderValues` produces the token -> real-value map the
 * server substitutes into the model's output (Astrology Phase 2, Part 3).
 * The model is instructed to never write a degree/sign/house/orb itself
 * and to emit tokens instead; every figure the reader sees comes from
 * this map, not from the model.
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

import type { ChartData, PlanetPosition, AspectData } from '@stellaeum/astrology/client'
import { PLANETS_BG, PLANETS_BG_GENDER, ZODIAC_SIGNS_BG, ASPECTS_BG } from '@stellaeum/astrology/client'
import type { Planet, ZodiacSign, AspectType } from '@stellaeum/astrology/client'
import { RETROGRADE_ADJ, agreeAdjective } from '@stellaeum/core/i18n/bg-grammar'
import { placeholderKey } from '@stellaeum/core/oracle/planet-parser'

/**
 * "24°06'" — whole degrees within the sign + arc-minutes, zero-padded.
 * Shared by the placeholder map and the prompt serializer so a position
 * renders the same in both.
 */
function formatDegMin(signDegree: number): string {
  const degrees = Math.floor(signDegree)
  const minutes = Math.floor((signDegree - degrees) * 60)
  return `${degrees}°${minutes.toString().padStart(2, '0')}'`
}

/**
 * Formats a planet position as a human-readable line in Bulgarian.
 * Example: "Слънце: 15°23' Лъв, дом 5 (ретроградно)"
 */
function formatPlanetLine(position: PlanetPosition): string {
  const planetName = PLANETS_BG[position.planet as Planet] ?? position.planet
  const signName = ZODIAC_SIGNS_BG[position.sign as ZodiacSign] ?? position.sign
  const degrees = Math.floor(position.signDegree)
  const minutes = Math.floor((position.signDegree - degrees) * 60)
  const retrogradeGender = PLANETS_BG_GENDER[position.planet as Planet] ?? 'masc'
  const retrograde = position.speed < 0 ? ` (${agreeAdjective(RETROGRADE_ADJ, retrogradeGender)})` : ''
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
  lines.push(`Медиум Цели (MC): ${mcDeg}°${mcMin.toString().padStart(2, '0')}' ${mcSign}`)

  // Birth time note
  if (!chartData.birthTimeKnown) {
    lines.push('(Часът на раждане е неизвестен - Асцендент и домове са приблизителни)')
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

/**
 * Build the deterministic placeholder map for an Oracle reading.
 *
 * Keys (via `placeholderKey`):
 *   pos:<planet> | pos:asc | pos:mc  -> "24°06' Близнаци"
 *   house:<planet>                   -> "дом 9"
 *   aspect:<a>-<b>  (a,b sorted)     -> "тригон (орб 0.8°)"
 *
 * The model may reference any of these; anything it references that is not
 * here throws at substitution time rather than rendering blank.
 */
export function buildOraclePlaceholderValues(
  chartData: ChartData,
): Record<string, string> {
  const values: Record<string, string> = {}

  for (const p of chartData.planets) {
    const signName = ZODIAC_SIGNS_BG[p.sign as ZodiacSign] ?? p.sign
    values[placeholderKey('pos', p.planet)] = `${formatDegMin(p.signDegree)} ${signName}`
    values[placeholderKey('house', p.planet)] = `дом ${p.house}`
  }

  const ascSign = ZODIAC_SIGNS_BG[chartData.ascendant.sign as ZodiacSign] ?? chartData.ascendant.sign
  values[placeholderKey('pos', 'asc')] = `${formatDegMin(chartData.ascendant.degree)} ${ascSign}`
  const mcSign = ZODIAC_SIGNS_BG[chartData.mc.sign as ZodiacSign] ?? chartData.mc.sign
  values[placeholderKey('pos', 'mc')] = `${formatDegMin(chartData.mc.degree)} ${mcSign}`
  // The Ascendant is the 1st-house cusp and the MC the 10th — accept
  // [house:asc] / [house:mc] rather than reject an astrologically sound
  // reference the model keeps reaching for.
  values[placeholderKey('house', 'asc')] = 'дом 1'
  values[placeholderKey('house', 'mc')] = 'дом 10'

  for (const a of chartData.aspects) {
    const aspectName = (ASPECTS_BG[a.aspect as AspectType] ?? a.aspect).toLowerCase()
    values[placeholderKey('aspect', `${a.planet1}-${a.planet2}`)] =
      `${aspectName} (орб ${a.orb.toFixed(1)}°)`
  }

  return values
}
