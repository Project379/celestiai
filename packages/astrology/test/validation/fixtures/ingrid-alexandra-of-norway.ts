/**
 * Princess Ingrid Alexandra of Norway — AA-rated 21st-century high-latitude case.
 *
 * Rodden rating: AA. Royal Court of Norway government announcement of the
 * royal birth at 09:13 on 21 January 2004 at Oslo University Hospital.
 *
 * Source: [reference-dependent — Astro-Databank]
 * https://www.astro.com/astro-databank/Ingrid_Alexandra,_Princess_of_Norway
 *
 * Coverage gap filled: 21st-century era + higher latitude (59.9°N, +8° over
 * Queen Elizabeth II's 51.5°N).
 *
 * Timezone: January 2004 Oslo was on Central European Time (UTC+1, standard
 * time, not DST). 09:13 CET = 08:13 UTC. Standard tz handling applies — no
 * LMT concern.
 */

import type { TestCase } from '../types'

export const testCase: TestCase = {
  id: 'ingrid-alexandra-of-norway',
  name: 'Princess Ingrid Alexandra of Norway',
  kind: 'famous',
  rodden: 'AA',
  birthDate: '2004-01-21',
  birthTime: '09:13',
  birthTimeKnown: true,
  lat: 59.9139,
  lon: 10.7522,
  city: 'Oslo, Norway',
  sources: [
    'https://www.astro.com/astro-databank/Ingrid_Alexandra,_Princess_of_Norway',
  ],
}
