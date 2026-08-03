/**
 * S7 — Year 2200 (future-date handling).
 *
 * Purpose per §9.1-TEST-CASES.md synthetic S7: tests future-date handling
 * near the upper edge of Astronomy Engine's Pluto polynomial range
 * (1700-2200). Inside Moshier range by a wide margin.
 *
 * Location: Greenwich — simplest tz conversion, avoids speculative future
 * zone changes.
 *
 * JPL Horizons NOTE: Horizons extrapolates EOP (Earth orientation
 * parameters) for far-future dates. The response footer flags this with
 * "last known leap-second is used as a constant" — comparison validity is
 * slightly degraded for dates past Horizons' predict boundary but still
 * the best available reference. Observation, not a blocker.
 */

import type { TestCase } from '../types'

export const testCase: TestCase = {
  id: 'synthetic-year-2200',
  name: 'Synthetic — Year 2200, Greenwich',
  kind: 'synthetic',
  birthDate: '2200-06-15',
  birthTime: '12:00',
  birthTimeKnown: true,
  lat: 51.4778,
  lon: 0.0,
  city: 'Greenwich, UK',
  notes:
    'Future date near AE Pluto polynomial edge (valid to 2200). Inside Moshier range. JPL extrapolates EOP past 2026 predict boundary. Far-range [observation] case per §9.2 ruling: Tier 1 (JPL) deltas at far-T (Moon 47.54″, inner planets 3-5″) reflect DE404-vs-DE441 inter-ephemeris-generation divergence, not sweph-Moshier drift. Per-body rows still show raw status; case-level overallStatus demoted.',
  farRangeObservation: true,
}
