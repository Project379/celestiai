/**
 * Frida Kahlo — AA-rated famous case.
 *
 * Rodden rating: AA. Birth registry from Distrito Federal archives, provided
 * to Astro-Databank by Sy Scholfield (rigorous rectification researcher).
 *
 * Source: [reference-dependent — Astro-Databank]
 * https://www.astro.com/astro-databank/Kahlo,_Frida
 *
 * Timezone note — LMT predating standardized tz:
 * Mexico standardized time zones around 1922. In July 1907 Coyoacán used
 * Local Mean Time — offset from UTC ≈ -99.16°W / 15 = -6:36:38.
 * 08:30 LMT = 15:06:38 UTC, whereas modern America/Mexico_City (CST, UTC-6)
 * interpretation of 08:30 local is 14:30 UTC — a 36-minute discrepancy,
 * equivalent to ~9° of Earth rotation (significant for Ascendant / houses).
 *
 * Same reference-data-sourcing treatment as Einstein (see albert-einstein.ts).
 */

import type { TestCase } from '../types'

export const testCase: TestCase = {
  id: 'frida-kahlo',
  name: 'Frida Kahlo',
  kind: 'famous',
  rodden: 'AA',
  birthDate: '1907-07-06',
  birthTime: '08:30',
  birthTimeKnown: true,
  lat: 19.3498,
  lon: -99.1621,
  city: 'Coyoacán, Mexico',
  notes:
    'Pre-standardized-tz era (Mexico adopted zone time ~1922). Stored time is the birth-registry LMT value; reference data must be computed for the UTC instant Celestia derives, not the LMT-corrected UTC.',
  sources: ['https://www.astro.com/astro-databank/Kahlo,_Frida'],
}
