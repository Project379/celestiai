import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockSupabase, type MockSupabase } from '../mocks/supabase'

/**
 * Frozen tier definition (2026-09-01): the daily "Днес" horoscope is FULLY
 * FREE for every authed user, every day, with NO monthly cap. This route
 * no longer touches `subscription_quotas` at all — that counter is now
 * Oracle-only.
 *
 * History this test guards against re-introducing:
 *   - 2026-08-26 sweep #2 wired checkQuotaAvailable/incrementQuotaUsage
 *     into this route (it had none), sharing the free tier's 3/month
 *     Oracle cap. That fixed a real abuse vector at the time (chained with
 *     uncapped chart creation, since fixed by sweep #3's 20-chart cap).
 *   - 2026-09-01: the tier freeze removed the coupling. A free user's
 *     daily horoscope must not die after N generations in a month.
 *
 * The remaining brakes are STRUCTURAL, not a quota: the 5/min burst
 * limiter, the `daily_horoscopes` UNIQUE(chart_id, date) pre-generation
 * INSERT claim (one generation per chart per day), and the 20-chart cap.
 *
 * Prove-red: run with
 *   git stash push apps/web/app/api/horoscope/generate/route.ts
 * to restore the coupled route — "generates across DISTINCT charts with no
 * cap" then FAILS at the 4th call (429, the old shared 3/month cap), and
 * "never calls the quota helpers" FAILS on the first call.
 */

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(async () => ({ userId: 'user_free_horoscope' })),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceSupabaseClient: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  assertRateLimit: vi.fn(async () => {}),
  RETRY_LATER_MESSAGE: 'retry later',
}))

vi.mock('@/lib/audit', () => ({ logAuditEvent: vi.fn() }))
vi.mock('@/lib/ai/check-bg-output', () => ({ checkAndLogGeneration: vi.fn(async () => {}) }))
vi.mock('@/lib/ai/client', () => ({
  AI_MODEL: 'fake-model',
  gemini: vi.fn((model: string) => `fake-model-instance:${model}`),
  isUpstreamAiError: vi.fn(() => false),
}))
vi.mock('@/lib/horoscope/prompts', () => ({ buildDailyHoroscopePrompt: vi.fn(() => 'system prompt') }))
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
vi.mock('ai', () => ({
  generateText: vi.fn(async () => ({
    output: { content: 'a generated horoscope' },
    text: '',
  })),
  Output: { object: vi.fn((options) => options) },
  streamText: vi.fn(),
}))

// Regression guard: the route must NOT reach for the Oracle monthly quota.
// These spies are asserted un-called. If someone re-couples the routes,
// this file goes red.
const checkQuotaAvailable = vi.hoisted(() => vi.fn())
const incrementQuotaUsage = vi.hoisted(() => vi.fn())
const decrementQuotaUsage = vi.hoisted(() => vi.fn())
vi.mock('@/lib/subscriptions/quota', () => ({
  checkQuotaAvailable,
  incrementQuotaUsage,
  decrementQuotaUsage,
  quotaCapReachedResponse: vi.fn(),
}))

import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { generateText } from 'ai'
import { POST } from '@/app/api/horoscope/generate/route'

let mockSupabase: MockSupabase

function seedRouteQueries(chartId: string) {
  mockSupabase.push('charts', {
    data: {
      id: chartId,
      user_id: 'user_free_horoscope',
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
    data: {
      planet_positions: [], house_cusps: [], aspects: [], ascendant: 0, mc: 0, birth_time_known: true,
    },
  })
  mockSupabase.push('daily_horoscopes', { data: { chart_id: chartId }, error: null }) // claim insert OK
  mockSupabase.push('daily_horoscopes', { data: null }) // final upsert
}

function makeRequest(chartId: string) {
  return new Request('http://localhost/api/horoscope/generate?format=json', {
    method: 'POST',
    body: JSON.stringify({ chartId }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSupabase = createMockSupabase()
  vi.mocked(createServiceSupabaseClient).mockReturnValue(mockSupabase as never)
})

describe('POST /api/horoscope/generate — Днес is free, no monthly cap (frozen definition 2026-09-01)', () => {
  it('generates across many DISTINCT charts for a free account with no cap', async () => {
    for (let i = 0; i < 10; i++) {
      seedRouteQueries(`chart-${i}`)
      const res = await POST(makeRequest(`chart-${i}`))
      expect(res.status).toBe(200)
    }
  })

  it('never calls the Oracle monthly-quota helpers', async () => {
    seedRouteQueries('chart-solo')
    await POST(makeRequest('chart-solo'))

    expect(checkQuotaAvailable).not.toHaveBeenCalled()
    expect(incrementQuotaUsage).not.toHaveBeenCalled()
    expect(decrementQuotaUsage).not.toHaveBeenCalled()
  })

  it('serves a cache hit without generating', async () => {
    mockSupabase.push('charts', {
      data: {
        id: 'chart-cached',
        user_id: 'user_free_horoscope',
        birth_date: '2000-01-01',
        birth_time: '12:00',
        birth_time_known: true,
        latitude: 42.7,
        longitude: 23.3,
      },
    })
    mockSupabase.push('daily_horoscopes', {
      data: { content: 'cached content', generated_at: '2026-08-25T00:00:00.000Z' },
    })

    const res = await POST(makeRequest('chart-cached'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.cached).toBe(true)
  })

  it('makes one provider request with retries disabled and removes leaked self-talk', async () => {
    seedRouteQueries('chart-single-call')
    vi.mocked(generateText).mockResolvedValueOnce({
      output: {
        content: 'Финален български хороскоп. \\*(Wait, let us construct carefully.)\\*',
      },
      text: '',
    } as never)

    const res = await POST(makeRequest('chart-single-call'))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      content: 'Финален български хороскоп.',
    })
    expect(generateText).toHaveBeenCalledTimes(1)
    expect(vi.mocked(generateText).mock.calls[0]?.[0]).toMatchObject({
      maxRetries: 0,
      model: 'fake-model-instance:fake-model',
      providerOptions: {
        google: {
          thinkingConfig: { includeThoughts: false, thinkingLevel: 'low' },
        },
      },
    })
  })

  it('returns a retryable 503 and releases the daily claim after the single Gemini call fails', async () => {
    seedRouteQueries('chart-overloaded')
    const overload = Object.assign(new Error('high demand'), {
      isRetryable: true,
      statusCode: 503,
    })
    vi.mocked(generateText).mockRejectedValueOnce(overload)

    const res = await POST(makeRequest('chart-overloaded'))

    expect(res.status).toBe(503)
    expect(res.headers.get('Retry-After')).toBe('30')
    await expect(res.json()).resolves.toMatchObject({
      code: 'AI_TEMPORARILY_UNAVAILABLE',
    })
    expect(generateText).toHaveBeenCalledTimes(1)
  })

  it('treats an empty claim row as in-progress without consuming quota or calling Gemini', async () => {
    mockSupabase.push('charts', {
      data: {
        id: 'chart-generating',
        user_id: 'user_free_horoscope',
        birth_date: '2000-01-01',
        birth_time: '12:00',
        birth_time_known: true,
        latitude: 42.7,
        longitude: 23.3,
      },
    })
    mockSupabase.push('daily_horoscopes', {
      data: { content: '', generated_at: '2026-09-01T00:00:00.000Z' },
    })

    const res = await POST(makeRequest('chart-generating'))

    expect(res.status).toBe(202)
    expect(res.headers.get('Retry-After')).toBe('3')
    await expect(res.json()).resolves.toMatchObject({ generating: true })
    expect(generateText).not.toHaveBeenCalled()
  })
})
