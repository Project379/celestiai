/**
 * Approximate-birth-time midpoint estimate (Astrology Phase 2, Finding 2).
 *
 * When birthTimeKnown is false but the user picked a window, the chart is
 * now computed at the window's midpoint (morning 09:00, afternoon 15:00,
 * evening 21:00, night 03:00) instead of a blind noon. Confirms the range
 * actually changes the calculation and that each range lands on its
 * midpoint.
 */
import { describe, expect, it } from 'vitest'
import { calculateNatalChart } from '../src/calculator'
import { APPROX_TIME_RANGE_MIDPOINT } from '../src/constants'

const SOFIA = { lat: 42.6977, lon: 23.3219 }
const DATE = new Date('1990-06-15T00:00:00Z')

function moonLon(input: Parameters<typeof calculateNatalChart>[0]): number {
  const chart = calculateNatalChart(input)
  return chart.planets.find((p) => p.planet === 'moon')!.longitude
}

describe('calculateNatalChart — approximate birth-time window', () => {
  it('night vs afternoon produce materially different charts', () => {
    const night = moonLon({
      date: DATE,
      time: null,
      ...SOFIA,
      birthTimeKnown: false,
      approximateTimeRange: 'night',
    })
    const afternoon = moonLon({
      date: DATE,
      time: null,
      ...SOFIA,
      birthTimeKnown: false,
      approximateTimeRange: 'afternoon',
    })
    // 12 hours of Moon motion is ~6deg — nowhere near equal.
    expect(Math.abs(night - afternoon)).toBeGreaterThan(3)
  })

  it('each range matches its explicit midpoint local time', () => {
    for (const [range, midpoint] of Object.entries(APPROX_TIME_RANGE_MIDPOINT)) {
      const viaRange = moonLon({
        date: DATE,
        time: null,
        ...SOFIA,
        birthTimeKnown: false,
        approximateTimeRange: range,
      })
      // birthTimeKnown:true forces the exact-time path with the midpoint.
      const viaExact = moonLon({
        date: DATE,
        time: midpoint,
        ...SOFIA,
        birthTimeKnown: true,
      })
      expect(viaRange).toBeCloseTo(viaExact, 6)
    }
  })

  it('no range falls back to noon (12:00)', () => {
    const noon = moonLon({
      date: DATE,
      time: '12:00',
      ...SOFIA,
      birthTimeKnown: true,
    })
    const morning = moonLon({
      date: DATE,
      time: null,
      ...SOFIA,
      birthTimeKnown: false,
      approximateTimeRange: 'morning',
    })
    expect(morning).not.toBeCloseTo(noon, 4)
  })

  it('unrecognised / null range still falls back to noon', () => {
    const noon = moonLon({
      date: DATE,
      time: '12:00',
      ...SOFIA,
      birthTimeKnown: true,
    })
    const nullRange = moonLon({
      date: DATE,
      time: null,
      ...SOFIA,
      birthTimeKnown: false,
      approximateTimeRange: null,
    })
    const garbage = moonLon({
      date: DATE,
      time: null,
      ...SOFIA,
      birthTimeKnown: false,
      approximateTimeRange: 'sometime',
    })
    expect(nullRange).toBeCloseTo(noon, 6)
    expect(garbage).toBeCloseTo(noon, 6)
  })
})
