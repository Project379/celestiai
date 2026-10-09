import { describe, expect, it } from 'vitest'

import { moonChangesSignDuringDay } from '../src/calculator'

const SOFIA = { lat: 42.6977, lon: 23.3219 }

describe('moonChangesSignDuringDay', () => {
  it('is true on roughly 4 days in 9 (the Moon moves ~13 degrees a day)', () => {
    let changed = 0
    const days = 90
    for (let i = 0; i < days; i++) {
      const d = new Date(Date.UTC(1990, 5, 1 + i))
      if (moonChangesSignDuringDay(d, SOFIA.lat, SOFIA.lon)) changed++
    }
    const share = changed / days
    expect(share).toBeGreaterThan(0.33)
    expect(share).toBeLessThan(0.56)
  })

  it('never throws for a far-east and a far-west birthplace', () => {
    expect(typeof moonChangesSignDuringDay(new Date(Date.UTC(2000, 0, 1)), -33.87, 151.2)).toBe('boolean')
    expect(typeof moonChangesSignDuringDay(new Date(Date.UTC(2000, 0, 1)), 40.7, -74)).toBe('boolean')
  })
})
