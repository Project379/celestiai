import { describe, expect, it } from 'vitest'
import { getZodiacSign, type ChartData, type PlanetPosition } from '@stellaeum/astrology'
import { buildCompositeChartData, calculateCompatibilitySummary, calculateCrossChartAspects } from '../../src/relationships/compatibility'

function planet(name: string, longitude: number): PlanetPosition {
  return { planet: name, longitude, latitude: 0, speed: 1, sign: getZodiacSign(longitude), signDegree: longitude % 30, house: 1 }
}
function chart(planets: PlanetPosition[], birthTimeKnown = true): ChartData {
  return { planets, birthTimeKnown, aspects: [], houses: [2, 9].map(number => ({ number, cuspLongitude: 0, sign: 'aries', signDegree: 0 })),
    ascendant: { longitude: 350, sign: 'pisces', degree: 20 }, mc: { longitude: 80, sign: 'gemini', degree: 20 } }
}

describe('cross-chart aspects', () => {
  it.each([
    ['conjunction', 0, 8], ['sextile', 60, 5], ['square', 90, 7], ['trine', 120, 7], ['opposition', 180, 8],
  ] as const)('detects %s and includes its exact orb boundary', (name, angle, orb) => {
    const a = chart([planet('sun', 0)])
    const direction = angle === 180 ? -1 : 1
    expect(calculateCrossChartAspects(a, chart([planet('moon', angle)]))[0]).toMatchObject({
      personAPlanet: 'sun', personBPlanet: 'moon', aspect: name, angle, orb: 0,
    })
    expect(calculateCrossChartAspects(a, chart([planet('moon', angle + direction * orb)]))[0]).toMatchObject({ aspect: name, orb })
    expect(calculateCrossChartAspects(a, chart([planet('moon', angle + direction * (orb + 0.001))]))).toEqual([])
    if (angle > 0 && angle < 180) {
      expect(calculateCrossChartAspects(a, chart([planet('moon', angle - orb)]))[0]?.orb).toBe(orb)
      expect(calculateCrossChartAspects(a, chart([planet('moon', angle - orb - 0.001)]))).toEqual([])
    }
  })
  it('wraps across Aries and preserves chart ownership', () => {
    expect(calculateCrossChartAspects(chart([planet('venus', 358)]), chart([planet('mars', 2)]))).toEqual([
      expect.objectContaining({ personAPlanet: 'venus', personBPlanet: 'mars', angle: 4, orb: 4, aspect: 'conjunction' }),
    ])
  })
  it('compares all planet pairs, including the same planet, and sorts by orb', () => {
    const results = calculateCrossChartAspects(chart([planet('sun', 0), planet('moon', 62)]), chart([planet('sun', 1), planet('venus', 120)]))
    expect(results).toHaveLength(4)
    expect(results.map(a => a.orb)).toEqual([0, 1, 1, 2])
    expect(calculateCrossChartAspects(chart([]), chart([planet('sun', 0)]))).toEqual([])
  })
})

describe('compatibility scoring', () => {
  it('uses hand-calculated points, element modifiers, and relationship weights', () => {
    const a = chart([planet('moon', 0)])
    const b = chart([planet('moon', 120)])
    // Emotional: trine 10 + same-element 8 -> round(48/65*100) = 74.
    // Values: two matching houses = 16 -> 71. Other ordinary domains = 46.
    const summary = calculateCompatibilitySummary(a, b)
    expect(summary.domains.emotional_resonance).toMatchObject({ score: 74, modifier: 8,
      contributing_aspects: [{ planet_a: 'moon', planet_b: 'moon', aspect: 'trine', orb: 0, points: 10 }] })
    expect(summary.domains.shared_values.score).toBe(71)
    expect(summary.domains.conflict_friction.score).toBe(100)
    expect(summary.domains.power_dynamics.score).toBe(100)
    expect(summary.headline_score).toBe(61)
    expect(calculateCompatibilitySummary(a, b, 'friendship').headline_score).toBe(65)
    expect(calculateCompatibilitySummary(a, b, 'work').headline_score).toBe(64)
    expect(calculateCompatibilitySummary(a, b, 'family').headline_score).toBe(64)
  })
  it.each([[0, 12], [4, 6], [8, 4]])('damps conjunction points at orb %s', (orb, points) => {
    const summary = calculateCompatibilitySummary(chart([planet('moon', 0)]), chart([planet('moon', orb)]))
    expect(summary.domains.emotional_resonance.contributing_aspects[0]?.points).toBe(points)
  })
  it('inverts friction and power intensity and clamps saturated domains', () => {
    const a = chart([planet('mars', 0), planet('sun', 0), planet('pluto', 0)])
    const b = chart([planet('mars', 180), planet('moon', 180), planet('sun', 180), planet('venus', 180)])
    const summary = calculateCompatibilitySummary(a, b)
    expect(summary.domains.conflict_friction.score).toBe(0)
    expect(summary.domains.power_dynamics.score).toBe(0)
    for (const domain of Object.values(summary.domains)) {
      expect(domain.score).toBeGreaterThanOrEqual(0)
      expect(domain.score).toBeLessThanOrEqual(100)
    }
  })
  it.each([false, true])('ignores uncertain houses when chart A known=%s', (known) => {
    const a = chart([planet('moon', 0)], known)
    const b = chart([planet('moon', 120)], !known)
    const original = calculateCompatibilitySummary(a, b)
    a.houses = []; b.houses = []
    expect(calculateCompatibilitySummary(a, b)).toEqual(original)
    expect(original.domains.emotional_resonance.score).toBe(74)
    expect(original.domains.shared_values.score).toBe(46)
  })
})

describe('composite chart', () => {
  it('uses shortest-arc midpoints and matches planets by name', () => {
    const a = chart([planet('sun', 350), planet('moon', 80)])
    const b = chart([planet('moon', 100), planet('sun', 10)])
    b.ascendant.longitude = 10
    const result = buildCompositeChartData(a, b)
    expect(result.planets.map(p => p.longitude)).toEqual([0, 90])
    expect(result.ascendant?.longitude).toBe(0)
    expect(result.aspects[0]?.aspect).toBe('square')
  })
  it.each([false, true])('omits angles if either birth time is unknown (A=%s)', (known) => {
    const result = buildCompositeChartData(chart([planet('sun', 350)], known), chart([planet('sun', 10)], !known))
    expect(result).toMatchObject({ birthTimeKnown: false, ascendant: null, mc: null })
    expect(result.planets[0]?.longitude).toBe(0)
  })
})
