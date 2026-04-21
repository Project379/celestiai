/**
 * S2 — Arctic Circle (~70°N) during polar night.
 *
 * Purpose per §9.1-TEST-CASES.md synthetic S2: Placidus is mathematically
 * undefined at latitudes where the declination-dependent semi-arc condition
 * |tan(φ) · tan(D)| ≥ 1 holds — the intermediate-cusp formula has no real
 * solution. Expected behaviour per §9.3 scope: deterministic fallback.
 *
 * Inline Placidus reference returns NaN for the intermediate cusps at this
 * latitude; the comparison classifies those as `queue`, not `pause-and-fix`.
 * This case is reported as a polar-edge observation rather than a discrepancy.
 *
 * Location: Kautokeino, Norway (~69.0°N, 23.0°E — just inside the Arctic
 * Circle at 66°34′). Dec 21 is the winter solstice; the sun is below the
 * horizon all day at this latitude.
 */

import type { TestCase } from '../types'

export const testCase: TestCase = {
  id: 'synthetic-arctic-polar-night',
  name: 'Synthetic — Arctic Circle, polar night',
  kind: 'synthetic',
  birthDate: '2020-12-21',
  birthTime: '12:00',
  birthTimeKnown: true,
  lat: 69.0,
  lon: 23.0,
  city: 'Kautokeino, Norway',
  notes:
    'Polar-night Placidus edge case. Inline reference returns NaN for intermediate cusps; comparison classifies as queue. Report as polar-edge observation, not pause-and-fix.',
}
