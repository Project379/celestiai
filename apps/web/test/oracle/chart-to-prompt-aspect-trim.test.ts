import { describe, expect, it } from 'vitest'
import { chartToPromptText, buildOraclePlaceholderValues } from '@/lib/oracle/chart-to-prompt'
import type { ChartData, AspectData, PlanetPosition } from '@stellaeum/astrology/client'

/**
 * THINKING-BUDGET-SPIKE fix (.planning/PLACEHOLDERS.md): the ASPECTI
 * section is trimmed to orb<=4.0 for the prompt, but buildOraclePlaceholderValues
 * still maps every aspect — see chart-to-prompt.ts's significantAspects().
 */

function planet(overrides: Partial<PlanetPosition>): PlanetPosition {
  return {
    planet: 'sun',
    longitude: 0,
    latitude: 0,
    speed: 1,
    sign: 'aries',
    signDegree: 0,
    house: 1,
    ...overrides,
  }
}

function aspect(overrides: Partial<AspectData>): AspectData {
  return {
    planet1: 'sun',
    planet2: 'moon',
    aspect: 'trine',
    angle: 120,
    orb: 1,
    applying: true,
    ...overrides,
  }
}

const baseChart: ChartData = {
  planets: [planet({ planet: 'sun' }), planet({ planet: 'moon' })],
  houses: [],
  aspects: [
    aspect({ planet1: 'sun', planet2: 'moon', orb: 2.8 }), // kept
    aspect({ planet1: 'sun', planet2: 'moon', aspect: 'conjunction', orb: 4.2 }), // dropped
    aspect({ planet1: 'sun', planet2: 'moon', aspect: 'opposition', orb: 6.8 }), // dropped
  ],
  ascendant: { longitude: 0, sign: 'libra', degree: 3 },
  mc: { longitude: 0, sign: 'cancer', degree: 4 },
  birthTimeKnown: true,
}

describe('chartToPromptText — aspects orb trim (THINKING-BUDGET-SPIKE)', () => {
  it('drops aspects with orb > 4.0 from the rendered prompt', () => {
    const text = chartToPromptText(baseChart)
    const aspectsSection = text.split('АСПЕКТИ:\n')[1] ?? ''
    expect(aspectsSection.split('\n').filter(Boolean)).toHaveLength(1)
    expect(aspectsSection).toContain('орб 2.8°')
    expect(aspectsSection).not.toContain('орб 4.2°')
    expect(aspectsSection).not.toContain('орб 6.8°')
  })

  it('omits the ASPECTI header entirely when every aspect is trimmed', () => {
    const chart: ChartData = {
      ...baseChart,
      aspects: [aspect({ orb: 5 }), aspect({ orb: 7 })],
    }
    const text = chartToPromptText(chart)
    expect(text).not.toContain('АСПЕКТИ:')
  })

  it('still maps every aspect in the placeholder table, including trimmed ones', () => {
    // Distinct planet pairs so both survive as separate keys.
    const chart: ChartData = {
      ...baseChart,
      aspects: [
        aspect({ planet1: 'sun', planet2: 'moon', orb: 2.8 }),
        aspect({ planet1: 'sun', planet2: 'venus', aspect: 'opposition', orb: 6.8 }),
      ],
    }
    const placeholders = buildOraclePlaceholderValues(chart)
    // placeholderKey sorts the pair alphabetically: moon-sun, sun-venus.
    expect(placeholders['aspect:moon-sun']).toBeTruthy()
    expect(placeholders['aspect:sun-venus']).toBeTruthy()
  })
})
