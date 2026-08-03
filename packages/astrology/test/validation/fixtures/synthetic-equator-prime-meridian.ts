/**
 * S1 — Noon UTC at 0°N 0°E (equator / prime meridian intersection).
 *
 * Purpose per §9.1-TEST-CASES.md synthetic S1: simplest possible case.
 * Catches basic coordinate-system errors. 2000-01-01 12:00 local at
 * (0°, 0°) resolves via geo-tz to a UTC-anchored zone (ocean → Etc/GMT
 * equivalent), so local = UTC. Any sign/hemisphere flip shows up cleanly.
 *
 * Date chosen: J2000.0 anchor (2000-01-01 12:00 TT ≈ 12:00 UT) — the
 * reference epoch for most astronomical algorithms, keeping T-from-J2000
 * ≈ 0 in derived polynomial evaluations.
 */

import type { TestCase } from '../types'

export const testCase: TestCase = {
  id: 'synthetic-equator-prime-meridian',
  name: 'Synthetic — 0°N 0°E at J2000',
  kind: 'synthetic',
  birthDate: '2000-01-01',
  birthTime: '12:00',
  birthTimeKnown: true,
  lat: 0.0,
  lon: 0.0,
  city: 'Equator / Prime Meridian',
  notes:
    'J2000 epoch anchor. Catches basic coordinate-system / hemisphere-sign errors.',
}
