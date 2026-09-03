/**
 * Astrology Phase 2 — Gate 9.
 *
 * Runs the 10 Phase-1 Bulgarian charts through the LIVE placeholder model
 * (meta-llama/llama-3.3-70b-instruct via OpenRouter) with the real system
 * prompt + serializer + placeholder map, then asserts the output is
 * shippable:
 *
 *   Per reading (via the real pre-display validator):
 *     - every [pos:|house:|aspect:] token substitutes (nothing survives)
 *     - the model wrote no digit / degree of its own
 *     - SCRIPT PURITY — no CJK / Hangul / Greek / other non-Bulgarian glyph
 *     - planet sentinels balanced
 *     - word count 300-800
 *   (Degree/sign/house/orb correctness is guaranteed *by construction* now
 *    that the figures come from substitution, so it is not re-asserted —
 *    the checks above are the ones that can still fail.)
 *
 *   Across the 10 readings:
 *     - no opening construction shared by more than 3 of 10
 *     - no 3+-word phrase shared by more than 3 of 10
 *
 * COSTS API CALLS. Not in check:all. Run: `pnpm run test:oracle-gate9`.
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { validateReading } from '@/lib/ai/validate-reading'

const HERE = dirname(fileURLToPath(import.meta.url))
const FIXTURE = JSON.parse(
  readFileSync(resolve(HERE, 'gate9-fixture.json'), 'utf8'),
) as {
  model: string
  temperature: number
  maxTokens: number
  systemPrompt: string
  charts: Array<{
    meta: { id: number; city: string; date: string }
    userPrompt: string
    placeholderValues: Record<string, string>
  }>
}

const KEY =
  process.env.OPENROUTER_API_KEY ??
  (() => {
    try {
      const env = readFileSync(resolve(HERE, '../../.env.local'), 'utf8')
      const line = env.split('\n').find((l) => l.startsWith('OPENROUTER_API_KEY'))
      return line ? line.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '') : ''
    } catch {
      return ''
    }
  })()

async function generate(system: string, user: string): Promise<string> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: FIXTURE.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: FIXTURE.temperature,
      max_tokens: FIXTURE.maxTokens,
    }),
  })
  if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  return json.choices?.[0]?.message?.content ?? ''
}

/** Strip every bracket token ([planet:…], [/planet], [pos:…], …) and punctuation. */
function words(text: string): string[] {
  return text
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/[^\p{L}\s]/gu, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
}

/** First 6 significant words. */
function opening(text: string): string {
  return words(text).slice(0, 6).join(' ')
}

/** Set of n-word shingles in a reading. */
function shingles(text: string, n = 3): Set<string> {
  const w = words(text)
  const out = new Set<string>()
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(' '))
  return out
}

describe('Gate 9 — Oracle output on the live placeholder model', () => {
  const results: Array<{
    id: number
    city: string
    ok: boolean
    code?: string
    detail?: string
    wordCount?: number
    plainText: string
  }> = []

  beforeAll(async () => {
    if (!KEY) throw new Error('OPENROUTER_API_KEY not set — Gate 9 needs it (apps/web/.env.local).')
    // Fire all 10 generations concurrently — OpenRouter handles it and it
    // keeps the whole gate under ~2 minutes instead of ~6.
    const raws = await Promise.all(
      FIXTURE.charts.map((c) => generate(FIXTURE.systemPrompt, c.userPrompt)),
    )
    FIXTURE.charts.forEach((chart, idx) => {
      const raw = raws[idx] ?? ''
      const v = validateReading(raw, chart.placeholderValues, { minWords: 300, maxWords: 800 })
      results.push({
        id: chart.meta.id,
        city: chart.meta.city,
        ok: v.ok,
        code: v.ok ? undefined : v.code,
        detail: v.ok ? undefined : v.detail,
        wordCount: v.ok ? v.wordCount : undefined,
        plainText: v.ok ? v.text : raw,
      })
    })
    console.table(
      results.map((r) => ({
        chart: `${r.id} ${r.city}`,
        ok: r.ok,
        words: r.wordCount ?? '-',
        failure: r.code ?? '',
      })),
    )
  })

  it('every reading passes the pre-display validator', () => {
    const failed = results.filter((r) => !r.ok)
    expect(
      failed,
      failed.map((r) => `chart ${r.id}: ${r.code} — ${r.detail}`).join('\n'),
    ).toEqual([])
  })

  it('no opening construction is shared by more than 3 of 10 readings', () => {
    const counts = new Map<string, number[]>()
    for (const r of results) {
      const key = opening(r.plainText)
      counts.set(key, [...(counts.get(key) ?? []), r.id])
    }
    const over = [...counts.entries()].filter(([, ids]) => ids.length > 3)
    expect(over.map(([k, ids]) => `"${k}" in charts ${ids.join(',')}`)).toEqual([])
  })

  it('no 3-word phrase is shared by more than 3 of 10 readings', () => {
    const docFreq = new Map<string, number>()
    for (const r of results) {
      for (const s of shingles(r.plainText)) docFreq.set(s, (docFreq.get(s) ?? 0) + 1)
    }
    const over = [...docFreq.entries()]
      .filter(([, n]) => n > 3)
      .sort((a, b) => b[1] - a[1])
      .map(([s, n]) => `"${s}" (${n}/10)`)
    expect(over).toEqual([])
  })
})
