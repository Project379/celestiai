/**
 * Real-call latency measurement for the two generation paths (NOT part of check:all;
 * makes live Gemini calls and costs money, about EUR 0.002 each). Run:
 *   pnpm --filter @stellaeum/web run measure:gemini-latency
 *
 * Measures what a single user waits on the model, with the PRODUCTION code path for
 * everything between the route's inputs and the model's output: the same prompt
 * builders (Oracle: buildSystemPrompt + the gate-9 chart prompts; horoscope:
 * buildDailyHoroscopePrompt + transitAndNatalToPromptText on a freshly computed natal
 * chart and today's transits), generateFinalText with the route's maxOutputTokens
 * and thinking level, and the route's validation band. Auth, Supabase and quota
 * steps are excluded (they are milliseconds and need a signed-in session).
 *
 * Calls are SEQUENTIAL (one in flight), because the question is "how long does one
 * user wait", not throughput. Added 2026-10-07 for the GEMINI-SLOW-NO-FAILOVER build.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { calculateDailyTransits, calculateNatalChart, calculateTransitAspects } from '@stellaeum/astrology'
import { buildTransitOverview } from '@stellaeum/core/horoscope/transit-analysis'
import { buildSystemPrompt } from '@/lib/oracle/prompts'
import { buildDailyHoroscopePrompt } from '@/lib/horoscope/prompts'
import { buildHoroscopePlaceholderValues, transitAndNatalToPromptText } from '@/lib/horoscope/transit-to-prompt'
import { validateReading } from '@/lib/ai/validate-reading'
import { GEMINI_THINKING_LEVEL, generateFinalText } from '@/lib/ai/generate-final-text'
import { AI_MODEL, ORACLE_FALLBACK_MODEL } from '@/lib/ai/client'

const FIXTURE = JSON.parse(readFileSync(path.resolve(__dirname, '../gate9/gate9-fixture.json'), 'utf8')) as {
  charts: Array<{
    meta: { date: string; time: string; lat: number; lon: number; city: string }
    userPrompt: string
    placeholderValues: Record<string, string>
  }>
}

const ORACLE_CALLS = Number(process.env.MEASURE_ORACLE_CALLS ?? 20)
const HOROSCOPE_CALLS = Number(process.env.MEASURE_HOROSCOPE_CALLS ?? 10)
const OUT = process.env.MEASURE_OUT

type Sample = {
  ms: number
  model: string
  ok: boolean
  words: number
  thoughts: number | null
  candidates: number | null
  failure?: string
}

// generateFinalText logs the raw usageMetadata with console.log('[AI usage]', json): capture it.
type Usage = { thoughtsTokenCount: number | null; candidatesTokenCount: number | null }
const usageBox: { last: Usage | null } = { last: null }
const origLog = console.log
console.log = (...args: unknown[]) => {
  if (args[0] === '[AI usage]' && typeof args[1] === 'string') {
    try {
      usageBox.last = JSON.parse(args[1]) as Usage
    } catch {
      /* ignore */
    }
  } else origLog(...args)
}

function pct(sorted: number[], p: number) {
  return sorted[Math.min(sorted.length - 1, Math.round(p * (sorted.length - 1)))]!
}

function summarize(label: string, s: Sample[]) {
  const ms = s.map((x) => x.ms).sort((a, b) => a - b)
  const out = {
    label,
    n: s.length,
    pass: s.filter((x) => x.ok).length,
    p50: pct(ms, 0.5),
    p90: pct(ms, 0.9),
    p95: pct(ms, 0.95),
    max: ms[ms.length - 1],
    min: ms[0],
    mean: Math.round(ms.reduce((a, b) => a + b, 0) / ms.length),
    fallbackServed: s.filter((x) => x.model !== AI_MODEL).length,
    thinkingCalls: s.filter((x) => (x.thoughts ?? 0) > 0).length,
    thinkingMax: Math.max(0, ...s.map((x) => x.thoughts ?? 0)),
    wordsMin: Math.min(...s.map((x) => x.words)),
    wordsMax: Math.max(...s.map((x) => x.words)),
    candidatesMedian: pct(s.map((x) => x.candidates ?? 0).sort((a, b) => a - b), 0.5),
  }
  origLog('[latency summary]', JSON.stringify(out))
  return out
}

function readUsage(): Usage | null {
  return usageBox.last
}

async function timed(fn: () => Promise<{ model: string; text: string }>) {
  usageBox.last = null
  const t0 = Date.now()
  const r = await fn()
  return { ms: Date.now() - t0, ...r, usage: readUsage() }
}

describe('Gemini latency (live, sequential)', () => {
  const results: Record<string, unknown> = {}

  it('Oracle generations', async () => {
    expect(process.env.GEMINI_API_KEY, 'GEMINI_API_KEY missing').toBeTruthy()
    const system = buildSystemPrompt('general')
    const samples: Sample[] = []
    for (let i = 0; i < ORACLE_CALLS; i++) {
      const c = FIXTURE.charts[i % FIXTURE.charts.length]!
      try {
        const r = await timed(() =>
          generateFinalText({
            system,
            prompt: c.userPrompt,
            maxOutputTokens: 2000,
            fallbackModel: ORACLE_FALLBACK_MODEL,
            thinkingLevel: GEMINI_THINKING_LEVEL.oracle,
          }),
        )
        const v = validateReading(r.text, c.placeholderValues, { minWords: 100, maxWords: 250 })
        samples.push({
          ms: r.ms,
          model: r.model,
          ok: v.ok,
          words: v.ok ? v.wordCount : 0,
          thoughts: r.usage?.thoughtsTokenCount ?? null,
          candidates: r.usage?.candidatesTokenCount ?? null,
          failure: v.ok ? undefined : v.code,
        })
      } catch (e) {
        samples.push({ ms: 0, model: 'ERROR', ok: false, words: 0, thoughts: null, candidates: null, failure: String(e).slice(0, 80) })
      }
    }
    results.oracle = { summary: summarize('oracle', samples.filter((x) => x.model !== 'ERROR')), samples }
  })

  it('Horoscope generations', async () => {
    const system = buildDailyHoroscopePrompt()
    const now = new Date()
    const transits = calculateDailyTransits(now)
    const samples: Sample[] = []
    for (let i = 0; i < HOROSCOPE_CALLS; i++) {
      const m = FIXTURE.charts[i % FIXTURE.charts.length]!.meta
      const chart = calculateNatalChart({
        date: new Date(m.date),
        time: m.time,
        lat: m.lat,
        lon: m.lon,
        birthTimeKnown: true,
        approximateTimeRange: null,
      } as never)
      const calculation = {
        planet_positions: chart.planets,
        house_cusps: chart.houses,
        aspects: chart.aspects,
        ascendant: chart.ascendant,
        mc: chart.mc,
        birth_time_known: chart.birthTimeKnown,
      } as never
      const aspects = calculateTransitAspects({ date: transits.date, planets: transits.planets }, chart.planets as never)
      const overview = buildTransitOverview(calculation, now)
      const prompt = transitAndNatalToPromptText(transits.planets as never, calculation, aspects, overview)
      const placeholders = buildHoroscopePlaceholderValues(transits.planets as never, calculation, aspects)
      try {
        const r = await timed(() =>
          generateFinalText({
            system,
            prompt,
            maxOutputTokens: 1500,
            fallbackModel: ORACLE_FALLBACK_MODEL,
            thinkingLevel: GEMINI_THINKING_LEVEL.horoscope,
          }),
        )
        const v = validateReading(r.text, placeholders, { minWords: 30, maxWords: 160 })
        samples.push({
          ms: r.ms,
          model: r.model,
          ok: v.ok,
          words: v.ok ? v.wordCount : 0,
          thoughts: r.usage?.thoughtsTokenCount ?? null,
          candidates: r.usage?.candidatesTokenCount ?? null,
          failure: v.ok ? undefined : v.code,
        })
      } catch (e) {
        samples.push({ ms: 0, model: 'ERROR', ok: false, words: 0, thoughts: null, candidates: null, failure: String(e).slice(0, 80) })
      }
    }
    results.horoscope = { summary: summarize('horoscope', samples.filter((x) => x.model !== 'ERROR')), samples }
    if (OUT) writeFileSync(OUT, JSON.stringify(results, null, 2))
  })
})
