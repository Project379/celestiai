import type { TransitAspect } from '@stellaeum/astrology'
import type { AspectType, Planet, PlanetPosition, ZodiacSign } from '@stellaeum/astrology/client'
import {
  ASPECTS_BG,
  PLANETS_BG,
  PLANETS_BG_GENDER,
  ZODIAC_SIGNS_BG,
} from '@stellaeum/astrology/client'
import { NATAL_ADJ, RETROGRADE_ADJ, TRANSITING_ADJ, agreeAdjective } from '@stellaeum/core/i18n/bg-grammar'
import { placeholderKey } from '@stellaeum/core/oracle/planet-parser'
import type { TransitOverview } from './transit-analysis'
import { transitOverviewToPromptText } from './transit-analysis'

/** "24°06'" — whole degrees within the sign + zero-padded arc-minutes. */
function formatDegMin(signDegree: number): string {
  const degrees = Math.floor(signDegree)
  const minutes = Math.floor((signDegree - degrees) * 60)
  return `${degrees}°${minutes.toString().padStart(2, '0')}'`
}

interface NatalCalculationData {
  planet_positions: PlanetPosition[]
  house_cusps?: Array<{ number: number; cuspLongitude: number; sign: string; signDegree: number }>
  birth_time_known?: boolean
}

function retrogradeSuffix(planet: string, speed: number): string {
  if (speed >= 0) return ''
  const gender = PLANETS_BG_GENDER[planet as Planet] ?? 'masc'
  return ` (${agreeAdjective(RETROGRADE_ADJ, gender)})`
}

function formatTransitPlanetLine(planet: Omit<PlanetPosition, 'house'>): string {
  const planetName = PLANETS_BG[planet.planet as Planet] ?? planet.planet
  const signName = ZODIAC_SIGNS_BG[planet.sign as ZodiacSign] ?? planet.sign
  const degrees = Math.floor(planet.signDegree)
  const minutes = Math.floor((planet.signDegree - degrees) * 60)
  const retrograde = retrogradeSuffix(planet.planet, planet.speed)
  return `${planetName}: ${degrees}°${minutes.toString().padStart(2, '0')}' ${signName}${retrograde} (транзит)`
}

function formatNatalPlanetLine(planet: PlanetPosition): string {
  const planetName = PLANETS_BG[planet.planet as Planet] ?? planet.planet
  const signName = ZODIAC_SIGNS_BG[planet.sign as ZodiacSign] ?? planet.sign
  const degrees = Math.floor(planet.signDegree)
  const minutes = Math.floor((planet.signDegree - degrees) * 60)
  const retrograde = retrogradeSuffix(planet.planet, planet.speed)
  return `${planetName}: ${degrees}°${minutes.toString().padStart(2, '0')}' ${signName}, дом ${planet.house}${retrograde}`
}

function formatTransitAspectLine(aspect: TransitAspect): string {
  const transitPlanetName =
    PLANETS_BG[aspect.transitPlanet as Planet] ?? aspect.transitPlanet
  const natalPlanetName = PLANETS_BG[aspect.natalPlanet as Planet] ?? aspect.natalPlanet
  const aspectName = ASPECTS_BG[aspect.aspect as AspectType] ?? aspect.aspect
  const orb = Math.round(aspect.orb * 10) / 10
  const status = aspect.applying ? 'прилагащ' : 'раздалечаващ'
  const transitGender = PLANETS_BG_GENDER[aspect.transitPlanet as Planet] ?? 'masc'
  const natalGender = PLANETS_BG_GENDER[aspect.natalPlanet as Planet] ?? 'masc'
  return `${agreeAdjective(TRANSITING_ADJ, transitGender)} ${transitPlanetName} ${aspectName} ${agreeAdjective(NATAL_ADJ, natalGender)} ${natalPlanetName} (орб ${orb}°, ${status})`
}

export function transitAndNatalToPromptText(
  transitPlanets: Omit<PlanetPosition, 'house'>[],
  natalCalculation: NatalCalculationData,
  transitAspects: TransitAspect[],
  transitOverview?: TransitOverview
): string {
  const lines: string[] = []

  lines.push('ТРАНЗИТНИ ПЛАНЕТИ (днес):')
  for (const planet of transitPlanets) {
    lines.push(formatTransitPlanetLine(planet))
  }

  lines.push('')
  lines.push('НАТАЛНА КАРТА:')
  const natalPlanets: PlanetPosition[] = natalCalculation.planet_positions ?? []
  for (const planet of natalPlanets) {
    lines.push(formatNatalPlanetLine(planet))
  }

  if (natalCalculation.birth_time_known === false) {
    lines.push('(Часът на раждане е неизвестен - домовете са приблизителни)')
  }

  lines.push('')
  lines.push('АКТИВНИ ТРАНЗИТНИ АСПЕКТИ:')

  if (transitAspects.length > 0) {
    for (const aspect of transitAspects) {
      lines.push(formatTransitAspectLine(aspect))
    }
  } else {
    lines.push('(Няма точни транзитни аспекти за днес)')
  }

  if (transitOverview) {
    lines.push('')
    lines.push(transitOverviewToPromptText(transitOverview))
  }

  return lines.join('\n')
}

/**
 * Deterministic placeholder map for a daily horoscope (Astrology Phase 2,
 * Part 3). Same contract as the Oracle's buildOraclePlaceholderValues:
 * the model emits tokens instead of writing figures, the server
 * substitutes real values here.
 *
 * Keys (via `placeholderKey`):
 *   pos:<planet> | pos:asc | pos:mc  -> natal position  "24°06' Близнаци"
 *   house:<planet>                   -> natal house       "дом 9"
 *   tpos:<planet>                    -> transit position  "12°41' Овен"
 *   taspect:<transit>-<natal>        -> transit->natal aspect "квадрат (орб 1.2°)"
 */
export function buildHoroscopePlaceholderValues(
  transitPlanets: Omit<PlanetPosition, 'house'>[],
  natalCalculation: NatalCalculationData,
  transitAspects: TransitAspect[],
): Record<string, string> {
  const values: Record<string, string> = {}

  for (const p of natalCalculation.planet_positions ?? []) {
    const signName = ZODIAC_SIGNS_BG[p.sign as ZodiacSign] ?? p.sign
    values[placeholderKey('pos', p.planet)] = `${formatDegMin(p.signDegree)} ${signName}`
    values[placeholderKey('house', p.planet)] = `дом ${p.house}`
  }
  // Ascendant = 1st-house cusp, MC = 10th.
  values[placeholderKey('house', 'asc')] = 'дом 1'
  values[placeholderKey('house', 'mc')] = 'дом 10'

  for (const p of transitPlanets) {
    const signName = ZODIAC_SIGNS_BG[p.sign as ZodiacSign] ?? p.sign
    values[placeholderKey('tpos', p.planet)] = `${formatDegMin(p.signDegree)} ${signName}`
  }

  for (const a of transitAspects) {
    const aspectName = (ASPECTS_BG[a.aspect as AspectType] ?? a.aspect).toLowerCase()
    values[placeholderKey('taspect', `${a.transitPlanet}-${a.natalPlanet}`)] =
      `${aspectName} (орб ${a.orb.toFixed(1)}°)`
  }

  return values
}
