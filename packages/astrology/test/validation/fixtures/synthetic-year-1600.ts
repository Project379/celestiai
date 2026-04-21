/**
 * S6 — Year 1600 (historical date handling).
 *
 * Purpose per §9.1-TEST-CASES.md synthetic S6: tests pre-19th-century date
 * handling. 1600 is comfortably inside Swiss Ephemeris' Moshier-mode range
 * (which spans roughly -3000 to +3000 AD; JD 625000.5 – 2818000.5). Date
 * is post-1582 Gregorian reform so `SE_GREG_CAL` matches civil calendar.
 *
 * Location: Greenwich (0°E, 51.4778°N). Before zone time existed; Intl
 * DateTimeFormat for Europe/London circa 1600 falls back to LMT-equivalent
 * (~0 offset at Greenwich meridian), so the UTC derived from Celestia's
 * pipeline should match the astro-community UTC convention closely.
 *
 * Astronomy Engine NOTE: AE's VSOP87 validity spans ~1000 years around
 * J2000; Pluto polynomial is narrower (~1700-2200). Generator skips AE
 * for this case if it throws or returns out-of-range results. The JPL
 * comparison (Tier 1) remains the primary verdict.
 */

import type { TestCase } from '../types'

export const testCase: TestCase = {
  id: 'synthetic-year-1600',
  name: 'Synthetic — Year 1600, Greenwich',
  kind: 'synthetic',
  birthDate: '1600-06-15',
  birthTime: '12:00',
  birthTimeKnown: true,
  lat: 51.4778,
  lon: 0.0,
  city: 'Greenwich, UK',
  notes:
    'Pre-19th-century date. Inside Moshier range. Far-range [observation] case per §9.2 ruling: Tier 1 (JPL) deltas at far-T reflect DE404-vs-DE441 inter-ephemeris-generation divergence, not sweph-Moshier drift. Per-body rows still show raw status; case-level overallStatus demoted.',
  farRangeObservation: true,
}
