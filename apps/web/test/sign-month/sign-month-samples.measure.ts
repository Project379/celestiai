/**
 * Live sample of the monthly sign text (NOT part of check:all; makes real Gemini calls,
 * 12 signs x up to 3 tries, about EUR 0.03 in total). Writes NOTHING to the database.
 *
 *   pnpm --filter @stellaeum/web run measure:sign-months
 *
 * Env: SAMPLE_MONTH=YYYY-MM (default: the month after today, Europe/Sofia),
 *      SAMPLE_OUT=path to write the table as markdown.
 *
 * Added for the Днес v2 review: the founder reads the prompt and all 12 texts before
 * the monthly cron is allowed to run in production.
 */
import { writeFileSync } from 'node:fs'
import { describe, it } from 'vitest'

import { ZODIAC_SIGNS_BG } from '@stellaeum/astrology/client'
import { buildSkyFacts, generateSignMonthText, usedMarkers, monthNameBg, SIGN_KEYS } from '@/lib/sign-month/generate'
import { sofiaYearMonth } from '@/lib/sign-month/month'

function nextMonth(ym: string): string {
  const y = Number(ym.slice(0, 4))
  const m = Number(ym.slice(5, 7))
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
}

describe('monthly sign text sample', () => {
  it('generates all 12 signs', async () => {
    const ym = process.env.SAMPLE_MONTH ?? nextMonth(sofiaYearMonth(new Date()))
    const rows: string[] = []
    const usedStarts: string[] = []
    for (const sign of SIGN_KEYS) {
      const facts = await buildSkyFacts(ym, sign)
      const r = await generateSignMonthText(sign, ym, usedStarts)
      if (r.ok) usedStarts.push(...usedMarkers(r.content))
      const text = r.ok ? r.content : `FAILED (${r.reason})`
      const chars = r.ok ? r.content.length : 0
      rows.push(`| ${ZODIAC_SIGNS_BG[sign]} · ${monthNameBg(ym)} | ${text} | ${chars} | ${r.attempts} | ${facts.text.split('\n').join(' ')} |`)
      console.info(`${ZODIAC_SIGNS_BG[sign]}: ${text}  [${chars} chars, ${r.attempts} attempt(s)]`)
    }
    const md = ['| Screen title | Text | Chars | Tries | Sky facts given |', '|---|---|---|---|---|', ...rows].join('\n')
    if (process.env.SAMPLE_OUT) writeFileSync(process.env.SAMPLE_OUT, md, 'utf8')
  })
})
