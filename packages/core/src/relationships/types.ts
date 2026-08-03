import type { AspectData, AspectType, ChartData, PlanetPosition } from '@stellaeum/astrology'

export type RelationshipType = 'romantic' | 'friendship' | 'work' | 'family'

export type CompatibilityDomainKey =
  | 'emotional_resonance'
  | 'communication'
  | 'romance_attraction'
  | 'long_term_stability'
  | 'conflict_friction'
  | 'growth_expansion'
  | 'power_dynamics'
  | 'shared_values'

export interface CrossChartAspect extends AspectData {
  personAPlanet: string
  personBPlanet: string
  personALongitude: number
  personBLongitude: number
}

export interface CompatibilityAspectContribution {
  planet_a: string
  planet_b: string
  aspect: AspectType
  orb: number
  points: number
}

export interface CompatibilityDomainResult {
  score: number
  headline: string
  summary: string
  contributing_aspects: CompatibilityAspectContribution[]
  modifier: number
}

export interface CompatibilitySummary {
  headline_score: number
  relationship_type: RelationshipType
  strongest_domain: CompatibilityDomainKey
  growth_domain: CompatibilityDomainKey
  domains: Record<CompatibilityDomainKey, CompatibilityDomainResult>
  notable_aspects: Array<{
    description: string
    significance: 'medium' | 'high'
    domain: CompatibilityDomainKey
  }>
}

export interface CompositeChartData {
  planets: PlanetPosition[]
  aspects: AspectData[]
  ascendant: ChartData['ascendant'] | null
  mc: ChartData['mc'] | null
  birthTimeKnown: boolean
}
