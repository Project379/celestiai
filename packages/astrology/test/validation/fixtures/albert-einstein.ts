/**
 * Albert Einstein — AA-rated famous case.
 *
 * Rodden rating: AA. Astro-Databank quotes the birth-certificate text verbatim:
 * "am vierzehnten März des Jahres tausend achthundert siebendzig und neun
 * vormittag um elf ein halb Uhr ein Kind männlichen Geschlechts geboren worden
 * sei" (on 14 March 1879 before noon at eleven and a half a child of male
 * sex was born).
 *
 * Source: [reference-dependent — Astro-Databank]
 * https://www.astro.com/astro-databank/Einstein,_Albert
 *
 * Timezone note — LMT predating standardized tz:
 * Germany standardized on Central European Time (UTC+1) in 1893. In March 1879
 * Ulm used Local Mean Time — offset from UTC ≈ 9.98°E / 15 = +0:39:54.
 * 11:30 LMT = 10:50:06 UTC, whereas modern CET interpretation of 11:30 local
 * is 10:30 UTC — a 20-minute discrepancy, equivalent to ~5° of Earth rotation
 * (significant for Ascendant / houses / Moon longitude).
 *
 * Reference-data sourcing MUST query JPL/Astronomy Engine/astro.com for the
 * same UTC instant Celestia actually computes against (i.e., use Celestia's
 * `localTimeToUTC` output as the query instant), not the astro-community's
 * LMT-corrected UTC. Otherwise Einstein's case will fail systematically for
 * a known-explainable tz-interpretation reason rather than an ephemeris error.
 * See reference-data/README.md §9.1.1 "Historical-tz interpretation".
 */

import type { TestCase } from '../types'

export const testCase: TestCase = {
  id: 'albert-einstein',
  name: 'Albert Einstein',
  kind: 'famous',
  rodden: 'AA',
  birthDate: '1879-03-14',
  birthTime: '11:30',
  birthTimeKnown: true,
  lat: 48.4011,
  lon: 9.9876,
  city: 'Ulm, Germany',
  notes:
    'Pre-standardized-tz era (Germany adopted CET in 1893). Stored time is the birth-certificate LMT value; reference data must be computed for the UTC instant Celestia derives, not the LMT-corrected UTC.',
  sources: ['https://www.astro.com/astro-databank/Einstein,_Albert'],
}
