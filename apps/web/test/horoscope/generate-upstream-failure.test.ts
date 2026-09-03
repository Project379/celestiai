import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockSupabase, type MockSupabase } from '../mocks/supabase'

/**
 * COMPLETION-TRACKER §0.8. When the AI provider returns a non-JSON / empty body
 * the `ai` SDK throws a raw `SyntaxError` out of `generateText`. Before the
 * hardening, `/api/horoscope/generate` re-threw it to `toErrorResponse`,
 * which produced an opaque **500** — indistinguishable from "our route is
 * broken".
 *
 * This test proves the upstream failure now returns a deliberate **502**
 * with the AI_UPSTREAM_FAILED code and a retry-hint message, and that a
 * genuine bug in our own code still 500s.
 *
 * NOTE (2026-09-01): the earlier "refunds the quota claim" assertion was
 * removed — the frozen tier definition makes Днес fully free, so this
 * route no longer touches `subscription_quotas` and has nothing to refund.
 * The placeholder-row release (releaseClaimOnFailure) is still exercised
 * by generate-duplicate-race.test.ts.
 *
 * Standing discipline (prove-it-fails): run against the pre-hardening
 * route.ts (the `catch (err) { await releaseClaimOnFailure(); throw err }`
 * with no isUpstreamAiError branch) and confirm the 502 assertion FAILS
 * with `expected 500 to be 502` before restoring the fix.
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

vi.mock('@/lib/horoscope/prompts', () => ({
  buildDailyHoroscopePrompt: vi.fn(() => 'system prompt'),
}))
vi.mock('@/lib/horoscope/transit-analysis', () => ({
  buildTransitOverview: vi.fn(() => ({ activeTransits: [], lunarEvents: [] })),
}))
vi.mock('@/lib/horoscope/transit-to-prompt', () => ({
  transitAndNatalToPromptText: vi.fn(() => 'prompt text'),
}))

vi.mock('@stellaeum/astrology', () => ({
  calculateDailyTransits: vi.fn(() => ({ planets: [] })),
  calculateNatalChart: vi.fn(() => ({
    planets: [], houses: [], aspects: [], ascendant: 0, mc: 0, birthTimeKnown: true,
  })),
  calculateTransitAspects: vi.fn(() => []),
}))

vi.mock('@/lib/ai/client', () => ({
  AI_MODEL: 'fake-model',
  gemini: vi.fn(() => 'fake-model-instance'),
  isUpstreamAiError: vi.fn((error: unknown) => error instanceof SyntaxError),
}))

// The failure under test: the provider returned a non-JSON body → the ai SDK
// threw a raw SyntaxError out of generateText.
const { generateText } = vi.hoisted(() => ({ generateText: vi.fn() }))
vi.mock('ai', () => ({
  generateText,
  Output: { object: vi.fn((options) => options) },
  streamText: vi.fn(),
}))

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
  // Default: the provider returned a non-JSON body → raw SyntaxError.
  generateText.mockRejectedValue(new SyntaxError('Unexpected end of JSON input'))
})

describe('POST /api/horoscope/generate — upstream provider failure (§0.8)', () => {
  it('returns 502 AI_UPSTREAM_FAILED (not an opaque 500) when the AI SDK throws a SyntaxError', async () => {
    seed('chart-1')
    const res = await POST(makeRequest('chart-1'))

    // Pre-hardening this is 500 — the assertion that must fail against the
    // un-fixed route.
    expect(res.status).toBe(502)
    const body = await res.json()
    expect(body.code).toBe('AI_UPSTREAM_FAILED')
    expect(typeof body.error).toBe('string')
    expect(body.error.length).toBeGreaterThan(0)
  })

  it('still 500s for a genuine bug in our own code (not every throw is "upstream")', async () => {
    generateText.mockRejectedValueOnce(new TypeError("Cannot read properties of undefined (reading 'x')"))
    seed('chart-3')
    const res = await POST(makeRequest('chart-3'))
    expect(res.status).toBe(500)
  })
})
