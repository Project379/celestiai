/**
 * Queen Elizabeth II — AA-rated famous case.
 *
 * Rodden rating: AA (pre-approved in §9.1 opening planning message).
 * Source: [reference-dependent — Astro-Databank]
 * https://www.astro.com/astro-databank/Elizabeth_II,_Queen_of_United_Kingdom
 *
 * Timezone note: London April 1926 used GMT year-round (British Summer Time
 * did not apply on 21 April 1926). 02:40 GMT = 02:40 local.
 */

import type { TestCase } from '../types'

export const testCase: TestCase = {
  id: 'queen-elizabeth-ii',
  name: 'Queen Elizabeth II',
  kind: 'famous',
  rodden: 'AA',
  birthDate: '1926-04-21',
  birthTime: '02:40',
  birthTimeKnown: true,
  lat: 51.5074,
  lon: -0.1278,
  city: 'London, UK',
  sources: [
    'https://www.astro.com/astro-databank/Elizabeth_II,_Queen_of_United_Kingdom',
  ],
}
