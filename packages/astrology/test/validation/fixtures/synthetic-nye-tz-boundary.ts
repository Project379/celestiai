/**
 * S4 — New Year's Eve crossing midnight at a timezone boundary.
 *
 * Purpose per §9.1-TEST-CASES.md synthetic S4: UTC/local conversion across
 * a date-change boundary. 1999-12-31 23:30 local in New York (EST, UTC-5)
 * = 2000-01-01 04:30 UTC — the local→UTC conversion rolls the date forward.
 * Exercises `localTimeToUTC`'s `dayOffset = +1` path and `getJulianDayUTC`'s
 * date-arithmetic across year/month/day boundaries.
 */

import type { TestCase } from '../types'

export const testCase: TestCase = {
  id: 'synthetic-nye-tz-boundary',
  name: "Synthetic — New Year's Eve, New York (tz boundary)",
  kind: 'synthetic',
  birthDate: '1999-12-31',
  birthTime: '23:30',
  birthTimeKnown: true,
  lat: 40.7128,
  lon: -74.006,
  city: 'New York, USA',
  notes:
    'Local → UTC conversion crosses year/month/day boundary. 1999-12-31 23:30 EST = 2000-01-01 04:30 UTC. Exercises dayOffset=+1 path.',
}
