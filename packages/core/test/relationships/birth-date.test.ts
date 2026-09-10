import { describe, expect, it } from 'vitest'
import { calculateNatalChart } from '@stellaeum/astrology'

describe('saved-profile timestamptz birth dates', () => {
  // The profile POST stores birthDate + T00:00:00Z. These are equivalent
  // representations of that instant returned by different DB sessions.
  // Exercise the real calculator used by buildSavedProfileComputation.
  it.each([
    '1990-06-15T00:00:00+00:00',
    '1990-06-15T03:00:00+03:00',
    '1990-06-14T17:00:00-07:00',
  ])('preserves the full chart for %s', birthDate => {
    const input = { time: '14:30', lat: 42.6977, lon: 23.3219, birthTimeKnown: true }
    const expected = calculateNatalChart({ ...input, date: new Date('1990-06-15') })
    expect(calculateNatalChart({ ...input, date: new Date(birthDate) })).toEqual(expected)
    // Ensure the fixture can detect an actual one-day shift.
    expect(calculateNatalChart({ ...input, date: new Date('1990-06-14') }).planets).not.toEqual(expected.planets)
  })
})
