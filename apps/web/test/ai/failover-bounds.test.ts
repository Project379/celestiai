import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  GEMINI_FALLBACK_TIMEOUT_MS,
  GEMINI_PRIMARY_TIMEOUT_MS,
  SMOKE_AI_TIMEOUT_MS,
} from '@/lib/ai/generate-final-text'

// The worst case for one request must stay inside the platform limit (maxDuration) with room
// for everything else the route does (auth, quota, DB writes, validation). Read from the route
// sources so changing either side without the other fails here.

const appRoot = path.resolve(__dirname, '../..')
const maxDuration = (rel: string) => {
  const m = /export const maxDuration = (\d+)/.exec(readFileSync(path.join(appRoot, rel), 'utf8'))
  if (!m) throw new Error(`${rel}: no maxDuration export found`)
  return Number(m[1]) * 1000
}

/** Oracle and horoscope routes run up to this many generateFinalText attempts (validation retry). */
const ROUTE_ATTEMPTS = 2
/** Headroom for auth, quota claim, validation and DB writes around the model calls. */
const ROUTE_OVERHEAD_MS = 60_000

describe('GEMINI-SLOW-NO-FAILOVER worst-case bounds', () => {
  it('keeps the primary timeout well above the measured p90/max and the fallback shorter than the primary', () => {
    // Measured 2026-10-07 (20 Oracle + 10 horoscope, level low, sequential): p90 8.9 s, max 14.3 s.
    expect(GEMINI_PRIMARY_TIMEOUT_MS).toBeGreaterThanOrEqual(14_300 * 1.5)
    expect(GEMINI_FALLBACK_TIMEOUT_MS).toBeLessThanOrEqual(GEMINI_PRIMARY_TIMEOUT_MS)
  })

  it.each([
    ['oracle', 'app/api/oracle/generate/route.ts'],
    ['horoscope', 'app/api/horoscope/generate/route.ts'],
  ])('%s route: two attempts of (primary + fallback) fit inside maxDuration with overhead', (_name, rel) => {
    const worstCase = ROUTE_ATTEMPTS * (GEMINI_PRIMARY_TIMEOUT_MS + GEMINI_FALLBACK_TIMEOUT_MS) + ROUTE_OVERHEAD_MS
    expect(worstCase).toBeLessThanOrEqual(maxDuration(rel))
  })

  it('smoke probe: primary + fallback fit inside its maxDuration and the smoke client timeout (45 s)', () => {
    const worstCase = 2 * SMOKE_AI_TIMEOUT_MS
    expect(worstCase).toBeLessThan(45_000)
    expect(worstCase).toBeLessThanOrEqual(maxDuration('app/api/smoke/route.ts'))
  })
})
