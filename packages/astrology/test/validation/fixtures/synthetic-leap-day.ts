/**
 * S5 — Leap day (Feb 29).
 *
 * Purpose per §9.1-TEST-CASES.md synthetic S5: calendar edge case.
 * 2000-02-29 is a valid leap day (year divisible by 400). Exercises calendar
 * arithmetic in `sweph.julday` and in the inline Placidus reference's
 * T-from-J2000 computation.
 *
 * Location: Greenwich (51.4778°N, 0°E) for the simplest tz conversion.
 */

import type { TestCase } from '../types'

export const testCase: TestCase = {
  id: 'synthetic-leap-day',
  name: 'Synthetic — Leap day (2000-02-29), Greenwich',
  kind: 'synthetic',
  birthDate: '2000-02-29',
  birthTime: '12:00',
  birthTimeKnown: true,
  lat: 51.4778,
  lon: 0.0,
  city: 'Greenwich, UK',
  notes: 'Leap-day calendar edge case (2000 divisible by 400).',
}
