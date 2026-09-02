/**
 * Deterministic placeholder substitution (Astrology Phase 2, Part 3).
 */
import { describe, expect, it } from 'vitest'
import {
  findPlaceholderTokens,
  placeholderKey,
  PlaceholderSubstitutionError,
  substitutePlaceholders,
} from '@stellaeum/core/oracle/planet-parser'
import { buildOraclePlaceholderValues } from '@/lib/oracle/chart-to-prompt'
import type { ChartData } from '@stellaeum/astrology/client'

const CHART: ChartData = {
  planets: [
    { planet: 'sun', longitude: 84.1, latitude: 0, speed: 0.95, sign: 'gemini', signDegree: 24.1, house: 9 },
    { planet: 'moon', longitude: 345.08, latitude: 0, speed: 13.35, sign: 'pisces', signDegree: 15.08, house: 6 },
  ],
  houses: [],
  aspects: [
    {
      planet1: 'moon',
      planet2: 'sun',
      aspect: 'trine',
      angle: 120,
      orb: 2.34,
      applying: false,
    },
  ],
  ascendant: { longitude: 187.25, sign: 'libra', degree: 7.25 },
  mc: { longitude: 98.56, sign: 'cancer', degree: 8.56 },
  birthTimeKnown: true,
}

describe('placeholderKey', () => {
  it('sorts aspect keys so order does not matter', () => {
    expect(placeholderKey('aspect', 'moon-sun')).toBe('aspect:moon-sun')
    expect(placeholderKey('aspect', 'sun-moon')).toBe('aspect:moon-sun')
  })
  it('keeps other kinds verbatim (planet key lowercased)', () => {
    expect(placeholderKey('pos', 'sun')).toBe('pos:sun')
    expect(placeholderKey('taspect', 'mars-sun')).toBe('taspect:mars-sun')
  })

  it('normalises casing so the model’s capitalisation does not matter', () => {
    expect(placeholderKey('pos', 'Sun')).toBe('pos:sun')
    expect(placeholderKey('pos', 'northNode')).toBe('pos:northnode')
    expect(placeholderKey('aspect', 'Sun-Jupiter')).toBe('aspect:jupiter-sun')
  })
})

describe('buildOraclePlaceholderValues + substitutePlaceholders', () => {
  const values = buildOraclePlaceholderValues(CHART)

  it('produces one entry per planet position, house and aspect (+ asc/mc)', () => {
    expect(values['pos:sun']).toBe("24°06' Близнаци")
    expect(values['house:sun']).toBe('дом 9')
    expect(values['pos:asc']).toBe("7°15' Везни")
    expect(values['pos:mc']).toBe("8°33' Рак")
    expect(values['aspect:moon-sun']).toBe('тригон (орб 2.3°)')
  })

  it('substitutes every token, in any aspect order', () => {
    const out = substitutePlaceholders(
      'Слънце на [pos:sun] в [house:sun]; [aspect:sun-moon] с Луна.',
      values,
    )
    expect(out).toBe("Слънце на 24°06' Близнаци в дом 9; тригон (орб 2.3°) с Луна.")
    expect(findPlaceholderTokens(out)).toEqual([])
  })

  it('throws (never blanks) on an unknown token', () => {
    expect(() => substitutePlaceholders('[pos:pluto]', values)).toThrow(
      PlaceholderSubstitutionError,
    )
  })

  it('leaves planet sentinels alone', () => {
    const out = substitutePlaceholders('[planet:sun]Слънце[/planet] на [pos:sun]', values)
    expect(out).toContain('[planet:sun]Слънце[/planet]')
  })
})
