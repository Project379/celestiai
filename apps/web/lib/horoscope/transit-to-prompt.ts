import type { TransitAspect } from '@celestia/astrology'
import type { AspectType, Planet, PlanetPosition, ZodiacSign } from '@celestia/astrology/client'
import {
  ASPECTS_BG,
  PLANETS_BG,
  ZODIAC_SIGNS_BG,
} from '@celestia/astrology/client'
import type { TransitOverview } from './transit-analysis'
import { transitOverviewToPromptText } from './transit-analysis'

interface NatalCalculationData {
  planet_positions: PlanetPosition[]
  house_cusps?: Array<{ number: number; cuspLongitude: number; sign: string; signDegree: number }>
  birth_time_known?: boolean
}

function formatTransitPlanetLine(planet: Omit<PlanetPosition, 'house'>): string {
  const planetName = PLANETS_BG[planet.planet as Planet] ?? planet.planet
  const signName = ZODIAC_SIGNS_BG[planet.sign as ZodiacSign] ?? planet.sign
  const degrees = Math.floor(planet.signDegree)
  const minutes = Math.floor((planet.signDegree - degrees) * 60)
  const retrograde = planet.speed < 0 ? ' (ретроградна)' : ''
  return `${planetName}: ${degrees}°${minutes.toString().padStart(2, '0')}' ${signName}${retrograde} (транзит)`
}

function formatNatalPlanetLine(planet: PlanetPosition): string {
  const planetName = PLANETS_BG[planet.planet as Planet] ?? planet.planet
  const signName = ZODIAC_SIGNS_BG[planet.sign as ZodiacSign] ?? planet.sign
  const degrees = Math.floor(planet.signDegree)
  const minutes = Math.floor((planet.signDegree - degrees) * 60)
  const retrograde = planet.speed < 0 ? ' (ретроградна)' : ''
  return `${planetName}: ${degrees}°${minutes.toString().padStart(2, '0')}' ${signName}, дом ${planet.house}${retrograde}`
}

function formatTransitAspectLine(aspect: TransitAspect): string {
  const transitPlanetName =
    PLANETS_BG[aspect.transitPlanet as Planet] ?? aspect.transitPlanet
  const natalPlanetName = PLANETS_BG[aspect.natalPlanet as Planet] ?? aspect.natalPlanet
  const aspectName = ASPECTS_BG[aspect.aspect as AspectType] ?? aspect.aspect
  const orb = Math.round(aspect.orb * 10) / 10
  const status = aspect.applying ? 'прилагащ' : 'раздалечаващ'
  return `Транзитен ${transitPlanetName} ${aspectName} натален ${natalPlanetName} (орб ${orb}°, ${status})`
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
    lines.push('(Часът на раждане е неизвестен — домовете са приблизителни)')
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
