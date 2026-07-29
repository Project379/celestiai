import type { TransitAspect } from '@stellaeum/astrology'
import type { AspectType, Planet, PlanetPosition, ZodiacSign } from '@stellaeum/astrology/client'
import {
  ASPECTS_BG,
  PLANETS_BG,
  PLANETS_BG_GENDER,
  ZODIAC_SIGNS_BG,
} from '@stellaeum/astrology/client'
import { NATAL_ADJ, RETROGRADE_ADJ, TRANSITING_ADJ, agreeAdjective } from '@stellaeum/core/i18n/bg-grammar'
import type { TransitOverview } from './transit-analysis'
import { transitOverviewToPromptText } from './transit-analysis'

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
