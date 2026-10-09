/**
 * Live sample of the monthly sign text (NOT part of check:all; makes real Gemini calls:
 * 12 signs x up to 4 tries x (generation + editor pass), once per model). Writes NOTHING to the
 * database, only files.
 *
 *   pnpm --filter @stellaeum/web run measure:sign-months
 *
 * Env:
 *   SAMPLE_MONTH=YYYY-MM         default: the month after today (Europe/Sofia)
 *   SAMPLE_MODELS=a,b            comma list of model ids; default: the app's AI_MODEL
 *   SAMPLE_OUT_DIR=path          default: ../../.planning/design/dnes
 *
 * Every attempt (raw generation, serving model, validator verdict, editor output and verdict,
 * try number) is saved to sign-month-attempts-<month>.json; the final texts of all models are put
 * side by side in sign-month-compare-<month>.md. The silent fallback model is OFF here: a row from
 * a model other than the one asked for would be a lie in a comparison.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { describe, it } from 'vitest'

import { ZODIAC_SIGNS_BG } from '@stellaeum/astrology/client'
import { AI_MODEL } from '@/lib/ai/client'
import {
  generateSignMonthText,
  monthNameBg,
  SIGN_KEYS,
  usedMarkers,
  type SignMonthAttempt,
} from '@/lib/sign-month/generate'
import { sofiaYearMonth } from '@/lib/sign-month/month'

function nextMonth(ym: string): string {
  const y = Number(ym.slice(0, 4))
  const m = Number(ym.slice(5, 7))
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
}

interface ModelRun {
  model: string
  results: Record<string, { ok: boolean; text: string | null; reason: string | null; tries: number; ms: number }>
  attempts: SignMonthAttempt[]
}

describe('monthly sign text sample', () => {
  it('generates all 12 signs per model', async () => {
    const ym = process.env.SAMPLE_MONTH ?? nextMonth(sofiaYearMonth(new Date()))
    const models = (process.env.SAMPLE_MODELS ?? AI_MODEL).split(',').map((m) => m.trim()).filter(Boolean)
    const outDir = process.env.SAMPLE_OUT_DIR ?? path.resolve(__dirname, '../../../../.planning/design/dnes')
    mkdirSync(outDir, { recursive: true })

    const runs: ModelRun[] = []
    for (const model of models) {
      const run: ModelRun = { model, results: {}, attempts: [] }
      const usedStarts: string[] = []
      for (const sign of SIGN_KEYS) {
        const t0 = Date.now()
        const r = await generateSignMonthText(sign, ym, usedStarts, {
          model,
          allowFallback: false,
          onAttempt: (a) => run.attempts.push({ ...a }),
        })
        if (r.ok) usedStarts.push(...usedMarkers(r.content))
        run.results[sign] = {
          ok: r.ok,
          text: r.ok ? r.content : null,
          reason: r.ok ? null : r.reason,
          tries: r.attempts,
          ms: Date.now() - t0,
        }
        console.info(`[${model}] ${ZODIAC_SIGNS_BG[sign]}: ${r.ok ? r.content : `FAILED (${r.reason})`}  [${r.attempts} try(s)]`)
      }
      runs.push(run)
      // Save after each model, so a crash in the second run keeps the first.
      writeFileSync(path.join(outDir, `sign-month-attempts-${ym}.json`), JSON.stringify({ month: ym, runs }, null, 2), 'utf8')
    }

    const head = ['| Знак |', ...models.map((m) => ` ${m} |`)].join('')
    const sep = '|---|' + models.map(() => '---|').join('')
    const rows = SIGN_KEYS.map((sign) => {
      const cells = runs.map((r) => {
        const x = r.results[sign]!
        return x.ok ? `${x.text} <br><sub>${x.text!.length} зн., ${x.tries} опит(а), ${Math.round(x.ms / 1000)} s</sub>` : `**НЕУСПЯХ** (${x.reason})`
      })
      return `| ${ZODIAC_SIGNS_BG[sign]} · ${monthNameBg(ym)} | ${cells.join(' | ')} |`
    })
    const editorStats = runs.map((r) => {
      const eds = r.attempts.filter((a) => a.editor)
      const count = (k: string) => eds.filter((a) => a.editor!.action === k).length
      return `- ${r.model}: ${r.attempts.length} опита общо; редакторът върна непроменен ${count('unchanged')}, пренаписа ${count('rewritten')}, отхвърли ${count('rejected')}`
    })
    writeFileSync(
      path.join(outDir, `sign-month-compare-${ym}.md`),
      [`# Месечни текстове ${ym}: сравнение на модели`, '', 'Всеки текст е минал валидатора и редакторския проход. Всички опити (суров текст, модел, присъда) са в `sign-month-attempts-' + ym + '.json`.', '', head, sep, ...rows, '', ...editorStats, ''].join('\n'),
      'utf8',
    )
  })
})
