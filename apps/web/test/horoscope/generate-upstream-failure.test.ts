import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockSupabase, type MockSupabase } from '../mocks/supabase'

/**
 * COMPLETION-TRACKER §0.8 + LLM-FAILOVER Option B (2026-09-09).
 *
 * History: when the provider returned a non-JSON / empty body the `ai` SDK
 * threw a raw `SyntaxError` out of `generateText`, and the route re-threw
 * it to `toErrorResponse` → an opaque **500**. §0.8 changed that to a
 * deliberate **502 AI_UPSTREAM_FAILED** for upstream failures while a
 * genuine bug in our own code still 500'd.
 *
 * LLM-FAILOVER Option B then folded BOTH into one outcome: both Gemini
 * tiers are Google, so once `generateFinalText` has exhausted its own
 * fallback there is nothing left to try — every post-fallback failure
 * (transient, upstream/transport, or an unclassified throw) now returns
 * the shared **503 `aiTemporarilyUnavailableResponse()`** (code
 * `AI_TEMPORARILY_UNAVAILABLE`, `Retry-After: 30`, Bulgarian retry copy).
 * A full Google outage reads as "temporarily unavailable", not an error
 * page. An UNCLASSIFIED throw is still `Sentry.captureException`'d before
 * the 503, so a real bug in this loop is still reported even though the
 * user sees the graceful message.
 *
 * The validation-failed-twice path (model responded, output unusable —
 * not an outage) is a separate concern and still returns 502
 * AI_OUTPUT_INVALID; it is not exercised here.
 *
 * Prove-it-fails: this file asserted `502` / `500` before Option B —
 * running it against `71a5c96^`'s route.ts (the `isUpstreamAiError` →
 * `throw ApiError(502)` / `throw err` branches) fails every assertion
 * below with `expected 502 to be 503`.
 */

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(async () => ({ userId: 'user_upstream_fail' })),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceSupabaseClient: vi.fn(),
}))

vi.mock('@/lib/rate-limit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/rate-limit')>()
  return { ...actual, assertRateLimit: vi.fn(async () => {}) }
})

vi.mock('@/lib/audit', () => ({ logAuditEvent: vi.fn() }))
vi.mock('@/lib/ai/check-bg-output', () => ({ checkAndLogGeneration: vi.fn(async () => {}) }))

const captureException = vi.fn()
vi.mock('@sentry/nextjs', () => ({ captureException: (...a: unknown[]) => captureException(...a) }))

vi.mock('@/lib/horoscope/prompts', () => ({
  buildDailyHoroscopePrompt: vi.fn(() => 'system prompt'),
}))
vi.mock('@/lib/horoscope/transit-analysis', () => ({
  buildTransitOverview: vi.fn(() => ({ activeTransits: [], lunarEvents: [] })),
}))
vi.mock('@/lib/horoscope/transit-to-prompt', () => ({
  transitAndNatalToPromptText: vi.fn(() => 'prompt text'),
  buildHoroscopePlaceholderValues: vi.fn(() => ({})),
}))
vi.mock('@/lib/ai/validate-reading', () => ({
  validateReading: vi.fn((raw: string) => ({ ok: true, text: raw, content: raw, wordCount: 90 })),
}))

vi.mock('@stellaeum/astrology', () => ({
  calculateDailyTransits: vi.fn(() => ({ planets: [] })),
  calculateNatalChart: vi.fn(() => ({
    planets: [], houses: [], aspects: [], ascendant: 0, mc: 0, birthTimeKnown: true,
  })),
  calculateTransitAspects: vi.fn(() => []),
}))

// @/lib/ai/client is deliberately NOT mocked — this test exercises the
// REAL isUpstreamAiError / isTransientAIError classifiers the route imports.
const { generateFinalText } = vi.hoisted(() => ({ generateFinalText: vi.fn() }))
vi.mock('@/lib/ai/generate-final-text', () => ({ generateFinalText }))

import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { POST } from '@/app/api/horoscope/generate/route'

let mockSupabase: MockSupabase

function seed(chartId: string) {
  mockSupabase.push('charts', {
    data: {
      id: chartId,
      user_id: 'user_upstream_fail',
      birth_date: '2000-01-01',
      birth_time: '12:00',
      birth_time_known: true,
      latitude: 42.7,
      longitude: 23.3,
    },
  })
  mockSupabase.push('daily_horoscopes', { data: null }) // cache miss
  mockSupabase.push('daily_transits', { data: { planet_positions: [] } })
  mockSupabase.push('chart_calculations', {
    data: { planet_positions: [], house_cusps: [], aspects: [], ascendant: 0, mc: 0, birth_time_known: true },
  })
  mockSupabase.push('daily_horoscopes', { data: { chart_id: chartId }, error: null }) // claim insert
  mockSupabase.push('daily_horoscopes', { error: null }) // releaseClaimOnFailure delete
}

function makeRequest(chartId: string) {
  return new Request('http://localhost/api/horoscope/generate?format=json', {
    method: 'POST',
    body: JSON.stringify({ chartId }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mockSupabase = createMockSupabase()
  vi.mocked(createServiceSupabaseClient).mockReturnValue(mockSupabase as never)
  // Default: provider returned a non-JSON body → raw SyntaxError.
  generateFinalText.mockRejectedValue(new SyntaxError('Unexpected end of JSON input'))
})

describe('POST /api/horoscope/generate — post-fallback AI failure (§0.8 + LLM-FAILOVER)', () => {
  it('returns the ratified 503 (AI_TEMPORARILY_UNAVAILABLE, Retry-After) when the AI SDK throws a SyntaxError', async () => {
    seed('chart-1')
    const res = await POST(makeRequest('chart-1'))

    // Was 502 before LLM-FAILOVER Option B — this is the assertion that
    // fails against the pre-change route.
    expect(res.status).toBe(503)
    expect(res.headers.get('Retry-After')).toBe('30')
    const body = await res.json()
    expect(body.code).toBe('AI_TEMPORARILY_UNAVAILABLE')
    expect(typeof body.error).toBe('string')
    expect(body.error.length).toBeGreaterThan(0)
    // An upstream/transport failure is classified — no Sentry noise.
    expect(captureException).not.toHaveBeenCalled()
  })

  it('an UNCLASSIFIED throw also degrades to 503, but is still Sentry-captured', async () => {
    generateFinalText.mockRejectedValueOnce(
      new TypeError("Cannot read properties of undefined (reading 'x')"),
    )
    seed('chart-3')
    const res = await POST(makeRequest('chart-3'))

    // Was 500 before Option B. The user now sees the graceful 503...
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.code).toBe('AI_TEMPORARILY_UNAVAILABLE')
    // ...but the unrecognised failure is not swallowed — it reaches Sentry.
    expect(captureException).toHaveBeenCalledTimes(1)
  })
})
