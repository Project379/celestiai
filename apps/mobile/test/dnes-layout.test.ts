import { describe, expect, it } from 'vitest'

import { contentBottom, dnesMetrics, oracleTop } from '@/lib/dnes/layout'

// The two emulators we verify on (Android, gesture nav). Measured on the emulator:
// top inset 48, bottom inset 24. Screen area below the top inset = full height - 48.
const SIZES = [
  { name: '384x832', h: 832 - 48, w: 384 - 56 },
  { name: '360x780', h: 780 - 48, w: 360 - 56 },
]
const INSET_BOTTOM = 24

describe('Днес v2 fit', () => {
  for (const s of SIZES) {
    it(`${s.name}: the worst-case stack clears the Oracle exit`, () => {
      const { metrics, slack } = dnesMetrics(s.h, INSET_BOTTOM, s.w)
      // horoscope block bottom must be above the Oracle slot top, which is above the nav
      expect(contentBottom(metrics, s.w)).toBeLessThanOrEqual(oracleTop(s.h, INSET_BOTTOM))
      expect(slack).toBeGreaterThanOrEqual(0)
    })

    it(`${s.name}: the Oracle exit bottom sits 14px above the nav top and is 48px tall`, () => {
      const navTop = s.h - (56 + INSET_BOTTOM)
      const top = oracleTop(s.h, INSET_BOTTOM)
      expect(top + 48 + 14).toBe(navTop)
    })
  }

  it('the primary size is never more shrunk than the floor', () => {
    const primary = dnesMetrics(832 - 48, INSET_BOTTOM, 328).metrics.swipeH
    const floor = dnesMetrics(780 - 48, INSET_BOTTOM, 304).metrics.swipeH
    expect(primary).toBeGreaterThanOrEqual(floor)
  })

  it('three-button navigation (bottom inset 48) at the floor takes the tightest tier, then the levels scroll', () => {
    const { metrics } = dnesMetrics(780 - 48, 48, 304)
    expect(metrics.tier).toBe(3)
  })
})
