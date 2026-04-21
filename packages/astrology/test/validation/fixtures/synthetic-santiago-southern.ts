/**
 * S3 — Santiago, Chile (34°S).
 *
 * Purpose per §9.1-TEST-CASES.md synthetic S3: southern-hemisphere case
 * for hemisphere-symmetric math. Santiago at -33.4489°, -70.6693° is
 * mid-latitude southern. Date 1990-06-15 is austral winter (sun low,
 * observer in southern hemisphere) — exercises the sign conventions in
 * declination-dependent house-cusp formulas.
 */

import type { TestCase } from '../types'

export const testCase: TestCase = {
  id: 'synthetic-santiago-southern',
  name: 'Synthetic — Santiago, Chile (34°S)',
  kind: 'synthetic',
  birthDate: '1990-06-15',
  birthTime: '09:00',
  birthTimeKnown: true,
  lat: -33.4489,
  lon: -70.6693,
  city: 'Santiago, Chile',
  notes: 'Southern-hemisphere case for hemisphere-symmetric math.',
}
