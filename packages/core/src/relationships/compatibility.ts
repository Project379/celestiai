import {
  ASPECTS_BG,
  PLANETS_BG,
  calculateAspects,
  getZodiacSign,
  type ChartData,
  type PlanetPosition,
} from '@stellaeum/astrology'
import type {
  CompatibilityAspectContribution,
  CompatibilityDomainKey,
  CompatibilityDomainResult,
  CompatibilitySummary,
  CompositeChartData,
  CrossChartAspect,
  RelationshipType,
} from './types'

const DOMAIN_ORDER: readonly CompatibilityDomainKey[] = [
  'emotional_resonance',
  'communication',
  'romance_attraction',
  'long_term_stability',
  'conflict_friction',
  'growth_expansion',
  'power_dynamics',
  'shared_values',
]

const DOMAIN_LABELS_BG: Record<CompatibilityDomainKey, string> = {
  emotional_resonance: 'Емоционален резонанс',
  communication: 'Комуникация',
  romance_attraction: 'Романтика и привличане',
  long_term_stability: 'Дългосрочна стабилност',
  conflict_friction: 'Конфликт и триене',
  growth_expansion: 'Растеж и разгръщане',
  power_dynamics: 'Сила и контрол',
  shared_values: 'Споделени ценности',
}

const HARMONIOUS_POINTS: Record<CrossChartAspect['aspect'], number> = {
  conjunction: 12,
  sextile: 8,
  square: -8,
  trine: 10,
  opposition: -9,
}

const ROMANCE_POINTS: Record<CrossChartAspect['aspect'], number> = {
  conjunction: 11,
  sextile: 8,
  square: 6,
  trine: 10,
  opposition: 7,
}

const STABILITY_POINTS: Record<CrossChartAspect['aspect'], number> = {
  conjunction: 10,
  sextile: 7,
  square: -4,
  trine: 9,
  opposition: -5,
}

const INTENSITY_POINTS: Record<CrossChartAspect['aspect'], number> = {
  conjunction: 12,
  sextile: 5,
  square: 11,
  trine: 7,
  opposition: 12,
}

const DOMAIN_WEIGHTS: Record<RelationshipType, Record<CompatibilityDomainKey, number>> = {
  romantic: {
    emotional_resonance: 0.2,
    communication: 0.15,
    romance_attraction: 0.2,
    long_term_stability: 0.15,
    conflict_friction: 0.1,
    growth_expansion: 0.1,
    power_dynamics: 0.05,
    shared_values: 0.05,
  },
  friendship: {
    emotional_resonance: 0.25,
    communication: 0.2,
    romance_attraction: 0,
    long_term_stability: 0.15,
    conflict_friction: 0.15,
    growth_expansion: 0.15,
    power_dynamics: 0.05,
    shared_values: 0.05,
  },
  work: {
    emotional_resonance: 0.1,
    communication: 0.25,
    romance_attraction: 0,
    long_term_stability: 0.2,
    conflict_friction: 0.2,
    growth_expansion: 0.15,
    power_dynamics: 0.05,
    shared_values: 0.05,
  },
  family: {
    emotional_resonance: 0.2,
    communication: 0.2,
    romance_attraction: 0,
    long_term_stability: 0.2,
    conflict_friction: 0.15,
    growth_expansion: 0.15,
    power_dynamics: 0.05,
    shared_values: 0.05,
  },
}

const ELEMENTS_BY_SIGN: Record<string, 'fire' | 'earth' | 'air' | 'water'> = {
  aries: 'fire',
  leo: 'fire',
  sagittarius: 'fire',
  taurus: 'earth',
  virgo: 'earth',
  capricorn: 'earth',
  gemini: 'air',
  libra: 'air',
  aquarius: 'air',
  cancer: 'water',
  scorpio: 'water',
  pisces: 'water',
}

function normalizeScore(value: number, min: number, max: number): number {
  if (max <= min) return 50
  const normalized = ((value - min) / (max - min)) * 100
  return Math.max(0, Math.min(100, Math.round(normalized)))
}

function midpointLongitude(left: number, right: number): number {
  let diff = right - left
  if (Math.abs(diff) > 180) {
    diff -= Math.sign(diff) * 360
  }
  const midpoint = (left + diff / 2 + 360) % 360
  return midpoint
}

function midpointPlanet(left: PlanetPosition, right: PlanetPosition): PlanetPosition {
  const longitude = midpointLongitude(left.longitude, right.longitude)
  return {
    ...left,
    longitude,
    latitude: (left.latitude + right.latitude) / 2,
    speed: (left.speed + right.speed) / 2,
    sign: getZodiacSign(longitude),
    signDegree: longitude % 30,
    house: left.house,
  }
}

export function buildCompositeChartData(
  chartA: ChartData,
  chartB: ChartData,
): CompositeChartData {
  const byPlanetB = new Map(chartB.planets.map((planet) => [planet.planet, planet]))

  const planets = chartA.planets
    .map((planetA) => {
      const planetB = byPlanetB.get(planetA.planet)
      if (!planetB) return null
      return midpointPlanet(planetA, planetB)
    })
    .filter((planet): planet is PlanetPosition => Boolean(planet))

  return {
    planets,
    aspects: calculateAspects(planets),
    ascendant:
      chartA.birthTimeKnown && chartB.birthTimeKnown
        ? {
            longitude: midpointLongitude(chartA.ascendant.longitude, chartB.ascendant.longitude),
            sign: getZodiacSign(
              midpointLongitude(chartA.ascendant.longitude, chartB.ascendant.longitude),
            ),
            degree: midpointLongitude(chartA.ascendant.longitude, chartB.ascendant.longitude) % 30,
          }
        : null,
    mc:
      chartA.birthTimeKnown && chartB.birthTimeKnown
        ? {
            longitude: midpointLongitude(chartA.mc.longitude, chartB.mc.longitude),
            sign: getZodiacSign(midpointLongitude(chartA.mc.longitude, chartB.mc.longitude)),
            degree: midpointLongitude(chartA.mc.longitude, chartB.mc.longitude) % 30,
          }
        : null,
    birthTimeKnown: chartA.birthTimeKnown && chartB.birthTimeKnown,
  }
}

export function calculateCrossChartAspects(
  chartA: ChartData,
  chartB: ChartData,
): CrossChartAspect[] {
  const aspects: CrossChartAspect[] = []
  const aspectDefs: Array<{ name: CrossChartAspect['aspect']; angle: number; orb: number }> = [
    { name: 'conjunction', angle: 0, orb: 8 },
    { name: 'sextile', angle: 60, orb: 5 },
    { name: 'square', angle: 90, orb: 7 },
    { name: 'trine', angle: 120, orb: 7 },
    { name: 'opposition', angle: 180, orb: 8 },
  ]

  for (const left of chartA.planets) {
    for (const right of chartB.planets) {
      let angle = Math.abs(left.longitude - right.longitude)
      if (angle > 180) angle = 360 - angle

      for (const def of aspectDefs) {
        const orb = Math.abs(angle - def.angle)
        if (orb <= def.orb) {
          aspects.push({
            personAPlanet: left.planet,
            personBPlanet: right.planet,
            personALongitude: left.longitude,
            personBLongitude: right.longitude,
            planet1: left.planet,
            planet2: right.planet,
            angle,
            aspect: def.name,
            orb,
            applying: false,
          })
          break
        }
      }
    }
  }

  return aspects.sort((left, right) => left.orb - right.orb)
}

function scoreContribution(
  aspect: CrossChartAspect,
  domain: CompatibilityDomainKey,
): number {
  const table =
    domain === 'romance_attraction'
      ? ROMANCE_POINTS
      : domain === 'long_term_stability'
        ? STABILITY_POINTS
        : domain === 'conflict_friction' || domain === 'power_dynamics'
          ? INTENSITY_POINTS
          : HARMONIOUS_POINTS

  const base = table[aspect.aspect]
  const orbDamping = Math.max(0.35, 1 - aspect.orb / 8)
  return Math.round(base * orbDamping)
}

function mapContribution(aspect: CrossChartAspect, points: number): CompatibilityAspectContribution {
  return {
    planet_a: aspect.personAPlanet,
    planet_b: aspect.personBPlanet,
    aspect: aspect.aspect,
    orb: Number(aspect.orb.toFixed(1)),
    points,
  }
}

function elementModifier(signA?: string, signB?: string): number {
  if (!signA || !signB) return 0
  const left = ELEMENTS_BY_SIGN[signA]
  const right = ELEMENTS_BY_SIGN[signB]
  if (!left || !right) return 0
  if (left === right) return 8
  const harmonious =
    (left === 'fire' && right === 'air') ||
    (left === 'air' && right === 'fire') ||
    (left === 'earth' && right === 'water') ||
    (left === 'water' && right === 'earth')
  return harmonious ? 4 : -4
}

function houseSignOverlap(chartA: ChartData, chartB: ChartData, houseNumber: number): number {
  const a = chartA.houses.find((house) => house.number === houseNumber)
  const b = chartB.houses.find((house) => house.number === houseNumber)
  if (!a || !b) return 0
  return a.sign === b.sign ? 8 : elementModifier(a.sign, b.sign)
}

function buildDomainResult(
  key: CompatibilityDomainKey,
  rawScore: number,
  contributions: CompatibilityAspectContribution[],
  modifier: number,
): CompatibilityDomainResult {
  const label = DOMAIN_LABELS_BG[key]
  const score = normalizeScore(rawScore + modifier, -30, 35)
  let headline = `${label} се усеща стабилно.`
  let summary = `Тази зона носи умерен баланс и ритъм между вас.`

  if (score >= 78) {
    headline = `${label} е една от силните ви оси.`
    summary = `Тук има естествен поток и бързо разпознаване на нуждите на другия.`
  } else if (score <= 42) {
    headline = `${label} изисква повече съзнателност.`
    summary = `Тук връзката не е счупена, но има повече търкане, различен ритъм и нужда от ясни уговорки.`
  }

  return {
    score,
    headline,
    summary,
    contributing_aspects: contributions.slice(0, 4),
    modifier,
  }
}

function pickStrongestDomain(
  domains: Record<CompatibilityDomainKey, CompatibilityDomainResult>,
  mode: 'high' | 'low',
): CompatibilityDomainKey {
  return DOMAIN_ORDER.reduce((best, current) => {
    const currentScore = domains[current].score
    const bestScore = domains[best].score
    return mode === 'high'
      ? currentScore > bestScore
        ? current
        : best
      : currentScore < bestScore
        ? current
        : best
  }, DOMAIN_ORDER[0])
}

function describeAspect(aspect: CompatibilityAspectContribution): string {
  const left = PLANETS_BG[aspect.planet_a as keyof typeof PLANETS_BG] ?? aspect.planet_a
  const right = PLANETS_BG[aspect.planet_b as keyof typeof PLANETS_BG] ?? aspect.planet_b
  const aspectName = ASPECTS_BG[aspect.aspect] ?? aspect.aspect
  return `${left} ${aspectName.toLowerCase()} ${right}`
}

export function calculateCompatibilitySummary(
  chartA: ChartData,
  chartB: ChartData,
  relationshipType: RelationshipType = 'romantic',
): CompatibilitySummary {
  const crossAspects = calculateCrossChartAspects(chartA, chartB)
  const byDomain: Record<CompatibilityDomainKey, CompatibilityDomainResult> = {
    emotional_resonance: buildDomainResult('emotional_resonance', 0, [], 0),
    communication: buildDomainResult('communication', 0, [], 0),
    romance_attraction: buildDomainResult('romance_attraction', 0, [], 0),
    long_term_stability: buildDomainResult('long_term_stability', 0, [], 0),
    conflict_friction: buildDomainResult('conflict_friction', 0, [], 0),
    growth_expansion: buildDomainResult('growth_expansion', 0, [], 0),
    power_dynamics: buildDomainResult('power_dynamics', 0, [], 0),
    shared_values: buildDomainResult('shared_values', 0, [], 0),
  }

  const scoreBuckets: Record<CompatibilityDomainKey, number> = {
    emotional_resonance: 0,
    communication: 0,
    romance_attraction: 0,
    long_term_stability: 0,
    conflict_friction: 0,
    growth_expansion: 0,
    power_dynamics: 0,
    shared_values: 0,
  }
  const contributions: Record<CompatibilityDomainKey, CompatibilityAspectContribution[]> = {
    emotional_resonance: [],
    communication: [],
    romance_attraction: [],
    long_term_stability: [],
    conflict_friction: [],
    growth_expansion: [],
    power_dynamics: [],
    shared_values: [],
  }

  const moonA = chartA.planets.find((planet) => planet.planet === 'moon')
  const moonB = chartB.planets.find((planet) => planet.planet === 'moon')
  const mercuryA = chartA.planets.find((planet) => planet.planet === 'mercury')
  const mercuryB = chartB.planets.find((planet) => planet.planet === 'mercury')
  const venusA = chartA.planets.find((planet) => planet.planet === 'venus')
  const venusB = chartB.planets.find((planet) => planet.planet === 'venus')

  for (const aspect of crossAspects) {
    const pair = `${aspect.personAPlanet}:${aspect.personBPlanet}`
    const pairReverse = `${aspect.personBPlanet}:${aspect.personAPlanet}`

    const add = (domain: CompatibilityDomainKey) => {
      const points = scoreContribution(aspect, domain)
      scoreBuckets[domain] += points
      contributions[domain].push(mapContribution(aspect, points))
    }

    if (
      ['moon:moon', 'moon:venus', 'venus:moon', 'moon:sun', 'sun:moon'].includes(pair) ||
      ['moon:moon', 'moon:venus', 'venus:moon', 'moon:sun', 'sun:moon'].includes(pairReverse)
    ) {
      add('emotional_resonance')
    }

    if (
      ['mercury:mercury', 'mercury:sun', 'sun:mercury', 'mercury:moon', 'moon:mercury'].includes(pair) ||
      ['mercury:mercury', 'mercury:sun', 'sun:mercury', 'mercury:moon', 'moon:mercury'].includes(pairReverse)
    ) {
      add('communication')
    }

    if (
      ['venus:mars', 'mars:venus', 'venus:venus', 'mars:mars'].includes(pair) ||
      ['venus:mars', 'mars:venus', 'venus:venus', 'mars:mars'].includes(pairReverse)
    ) {
      add('romance_attraction')
    }

    if (
      ['saturn:sun', 'sun:saturn', 'saturn:moon', 'moon:saturn', 'saturn:venus', 'venus:saturn'].includes(pair) ||
      ['saturn:sun', 'sun:saturn', 'saturn:moon', 'moon:saturn', 'saturn:venus', 'venus:saturn'].includes(pairReverse)
    ) {
      add('long_term_stability')
    }

    if (
      ['mars:mars', 'mars:moon', 'moon:mars', 'sun:sun'].includes(pair) ||
      ['mars:mars', 'mars:moon', 'moon:mars', 'sun:sun'].includes(pairReverse)
    ) {
      add('conflict_friction')
    }

    if (
      ['jupiter:sun', 'sun:jupiter', 'jupiter:moon', 'moon:jupiter', 'jupiter:venus', 'venus:jupiter', 'jupiter:jupiter'].includes(pair) ||
      ['jupiter:sun', 'sun:jupiter', 'jupiter:moon', 'moon:jupiter', 'jupiter:venus', 'venus:jupiter', 'jupiter:jupiter'].includes(pairReverse)
    ) {
      add('growth_expansion')
    }

    if (
      ['pluto:sun', 'sun:pluto', 'pluto:moon', 'moon:pluto', 'pluto:venus', 'venus:pluto', 'pluto:mars', 'mars:pluto'].includes(pair) ||
      ['pluto:sun', 'sun:pluto', 'pluto:moon', 'moon:pluto', 'pluto:venus', 'venus:pluto', 'pluto:mars', 'mars:pluto'].includes(pairReverse)
    ) {
      add('power_dynamics')
    }
  }

  scoreBuckets.shared_values += houseSignOverlap(chartA, chartB, 2)
  scoreBuckets.shared_values += houseSignOverlap(chartA, chartB, 9)

  const emotionalModifier = elementModifier(moonA?.sign, moonB?.sign)
  const communicationModifier = elementModifier(mercuryA?.sign, mercuryB?.sign)
  const romanceModifier = elementModifier(venusA?.sign, venusB?.sign)
  const valuesModifier = elementModifier(venusA?.sign, venusB?.sign)

  byDomain.emotional_resonance = buildDomainResult(
    'emotional_resonance',
    scoreBuckets.emotional_resonance,
    contributions.emotional_resonance.sort((a, b) => b.points - a.points),
    emotionalModifier,
  )
  byDomain.communication = buildDomainResult(
    'communication',
    scoreBuckets.communication,
    contributions.communication.sort((a, b) => b.points - a.points),
    communicationModifier,
  )
  byDomain.romance_attraction = buildDomainResult(
    'romance_attraction',
    scoreBuckets.romance_attraction,
    contributions.romance_attraction.sort((a, b) => b.points - a.points),
    romanceModifier,
  )
  byDomain.long_term_stability = buildDomainResult(
    'long_term_stability',
    scoreBuckets.long_term_stability,
    contributions.long_term_stability.sort((a, b) => b.points - a.points),
    0,
  )

  const frictionIntensity = normalizeScore(scoreBuckets.conflict_friction, 0, 30)
  byDomain.conflict_friction = {
    score: 100 - frictionIntensity,
    headline:
      frictionIntensity >= 70
        ? 'Тук има силен заряд и по-бързо палене.'
        : 'Тук напрежението е по-лесно за овладяване.',
    summary:
      frictionIntensity >= 70
        ? 'Има искра, но и повече шанс за реактивност, засичане на темпо и по-рязък тон.'
        : 'Различия има, но по-често могат да бъдат преведени в разговор, вместо в ескалация.',
    contributing_aspects: contributions.conflict_friction.sort((a, b) => Math.abs(b.points) - Math.abs(a.points)).slice(0, 4),
    modifier: 0,
  }

  byDomain.growth_expansion = buildDomainResult(
    'growth_expansion',
    scoreBuckets.growth_expansion,
    contributions.growth_expansion.sort((a, b) => b.points - a.points),
    0,
  )

  const powerIntensity = normalizeScore(scoreBuckets.power_dynamics, 0, 32)
  byDomain.power_dynamics = {
    score: 100 - powerIntensity,
    headline:
      powerIntensity >= 70
        ? 'Между вас има силна интензивност и магнетизъм.'
        : 'Темата за контрол и влияние е по-мека.',
    summary:
      powerIntensity >= 70
        ? 'Връзката вероятно усеща дълбоки привличания, ревност или нужда от яснота кой води в даден момент.'
        : 'Тук има по-малко натиск и по-лесно дишане около личното пространство.',
    contributing_aspects: contributions.power_dynamics.sort((a, b) => Math.abs(b.points) - Math.abs(a.points)).slice(0, 4),
    modifier: 0,
  }

  byDomain.shared_values = buildDomainResult(
    'shared_values',
    scoreBuckets.shared_values,
    contributions.shared_values,
    valuesModifier,
  )

  const weights = DOMAIN_WEIGHTS[relationshipType]
  const weightedScore = DOMAIN_ORDER.reduce(
    (sum, key) => sum + byDomain[key].score * weights[key],
    0,
  )

  const strongest = pickStrongestDomain(byDomain, 'high')
  const growth = pickStrongestDomain(byDomain, 'low')

  const notableAspects = DOMAIN_ORDER.flatMap((domain) =>
    byDomain[domain].contributing_aspects.slice(0, 1).map((aspect) => ({
      description: describeAspect(aspect),
      significance: (Math.abs(aspect.points) >= 9 ? 'high' : 'medium') as 'high' | 'medium',
      domain,
    })),
  )

  return {
    headline_score: Math.round(weightedScore),
    relationship_type: relationshipType,
    strongest_domain: strongest,
    growth_domain: growth,
    domains: byDomain,
    notable_aspects: notableAspects.slice(0, 6),
  }
}
