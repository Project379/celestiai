/**
 * Crown Princess Leonor of Spain — AA-rated 21st-century Mediterranean case.
 *
 * Rodden rating: AA. Spanish royal announcement of birth at 01:46 on
 * 31 October 2005 at Ruber International Hospital, Madrid.
 *
 * Source: [reference-dependent — Astro-Databank]
 * https://www.astro.com/astro-databank/Leonor,_Princess_of_Spain
 *
 * Coverage gap filled: 21st-century era + Mediterranean mid-latitude (40.4°N).
 *
 * Timezone: October 31 2005 Madrid transitioned from CEST (UTC+2) to CET
 * (UTC+1) at 03:00 local time (last Sunday of October). 01:46 local was
 * therefore CEST (pre-transition) = 23:46 UTC on 2005-10-30. This is a
 * timezone-boundary edge case — useful for §9.3 (house calculations depend
 * on sidereal time, so tz math matters).
 */

import type { TestCase } from '../types'

export const testCase: TestCase = {
  id: 'leonor-of-spain',
  name: 'Crown Princess Leonor of Spain',
  kind: 'famous',
  rodden: 'AA',
  birthDate: '2005-10-31',
  birthTime: '01:46',
  birthTimeKnown: true,
  lat: 40.4168,
  lon: -3.7038,
  city: 'Madrid, Spain',
  notes:
    'Birth falls on the last Sunday of October — the CEST→CET transition day. 01:46 local is pre-transition CEST (UTC+2) = 23:46 UTC on 2005-10-30. Useful edge case for tz-handling validation in §9.3 houses.',
  sources: ['https://www.astro.com/astro-databank/Leonor,_Princess_of_Spain'],
}
