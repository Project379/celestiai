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
  ORACLE_FALLBACK_MODEL: 'fake-fallback-model',
  isUpstreamAiError: vi.fn(() => false),
}))
vi.mock('@/lib/horoscope/prompts', () => ({ buildDailyHoroscopePrompt: vi.fn(() => 'system prompt') }))
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
vi.mock('@/lib/ai/generate-final-text', () => ({
  generateFinalText: vi.fn(async () => ({ model: 'fake-model', text: 'a generated horoscope' })),
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
      birth_data_edited_at: '2026-01-01T00:00:00.000Z',
    },
  })
  mockSupabase.push('daily_horoscopes', { data: null }) // stale-row delete
  mockSupabase.push('daily_horoscopes', { data: null }) // cache miss
  mockSupabase.push('daily_transits', { data: { planet_positions: [] } })
  mockSupabase.push('chart_calculations', {
    data: {
      planet_positions: [], house_cusps: [], aspects: [], ascendant: 0, mc: 0, birth_time_known: true,
    },
  })
  mockSupabase.push('charts', { data: { birth_data_edited_at: '2026-01-01T00:00:00.000Z' } }) // race-guard re-read
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
      birth_data_edited_at: '2026-01-01T00:00:00.000Z',
      },
    })
    mockSupabase.push('daily_horoscopes', { data: null }) // stale-row delete
    mockSupabase.push('daily_horoscopes', {
      data: { content: 'cached content', generated_at: '2026-08-25T00:00:00.000Z' },
    })

    const res = await POST(makeRequest('chart-cached'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.cached).toBe(true)
  })
})

describe('POST /api/horoscope/generate — birth-data edit invalidation (Batch 8 b)', () => {
  const MARKER = '2026-01-01T00:00:00.000Z'

  function seedGeneration(chartId: string, markerAfter = MARKER) {
    mockSupabase.push('charts', {
      data: {
        id: chartId,
        user_id: 'user_free_horoscope',
        birth_date: '2000-01-01',
        birth_time: '12:00',
        birth_time_known: true,
        latitude: 42.7,
        longitude: 23.3,
        birth_data_edited_at: MARKER,
      },
    })
    mockSupabase.push('daily_horoscopes', { data: null }) // stale-row delete
    mockSupabase.push('daily_horoscopes', { data: null }) // cache check — nothing left (stale row was removed)
    mockSupabase.push('daily_transits', { data: { planet_positions: [] } })
    mockSupabase.push('chart_calculations', {
      data: { planet_positions: [], house_cusps: [], aspects: [], ascendant: 0, mc: 0, birth_time_known: true },
    })
    mockSupabase.push('charts', { data: { birth_data_edited_at: markerAfter } }) // race-guard re-read
    mockSupabase.push('daily_horoscopes', { data: { chart_id: chartId }, error: null }) // claim insert
    mockSupabase.push('daily_horoscopes', { data: null }) // final upsert
  }

  it("removes a STALE row (generated before the chart's marker) before the cache check, scoped by chart + date and conditional on generated_at < marker — a fresh row can never be deleted by it", async () => {
    seedGeneration('chart-stale')

    const res = await POST(makeRequest('chart-stale'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.cached).toBe(false)
    const firstHoroscopeCall = mockSupabase.from.mock.calls.findIndex((c) => c[0] === 'daily_horoscopes')
    const builder = mockSupabase.from.mock.results[firstHoroscopeCall].value
    expect(builder.delete).toHaveBeenCalled()
    expect(builder.eq).toHaveBeenCalledWith('chart_id', 'chart-stale')
    expect(builder.lt).toHaveBeenCalledWith('generated_at', MARKER)
  })

  it('RACE GUARD: birth data edited while the model ran — 409, the claim is released, nothing is saved', async () => {
    seedGeneration('chart-race', '2026-02-01T00:00:00.000Z')

    const res = await POST(makeRequest('chart-race'))

    expect(res.status).toBe(409)
    expect((await res.json()).code).toBe('CHART_EDITED_DURING_GENERATION')
    const horoscopeCalls = mockSupabase.from.mock.calls.filter((c) => c[0] === 'daily_horoscopes')
    // stale delete, cache check, claim insert, claim release — and NO final upsert
    expect(horoscopeCalls).toHaveLength(4)
  })
})

describe('POST /api/horoscope/generate — stale-regeneration cap (3 per chart per day)', () => {
  const MARKER = '2026-01-01T00:00:00.000Z'
  const BEFORE = '2025-12-31T00:00:00.000Z'

  function seedChart(chartId: string) {
    mockSupabase.push('charts', {
      data: {
        id: chartId, user_id: 'user_free_horoscope', birth_date: '2000-01-01', birth_time: '12:00',
        birth_time_known: true, latitude: 42.7, longitude: 23.3, birth_data_edited_at: MARKER,
      },
    })
  }

  /** The tail of a successful generation, after the delete + cache check. */
  function seedGenerationTail() {
    mockSupabase.push('daily_transits', { data: { planet_positions: [] } })
    mockSupabase.push('chart_calculations', {
      data: { planet_positions: [], house_cusps: [], aspects: [], ascendant: 0, mc: 0, birth_time_known: true },
    })
    mockSupabase.push('charts', { data: { birth_data_edited_at: MARKER } }) // race-guard re-read
    mockSupabase.push('daily_horoscopes', { data: { chart_id: 'c' }, error: null }) // claim insert
    mockSupabase.push('daily_horoscopes', { data: null }) // final upsert
  }

  const claimInsert = () => {
    const calls = mockSupabase.from.mock.calls
    const results = mockSupabase.from.mock.results
    for (let i = 0; i < calls.length; i++) {
      if (calls[i][0] !== 'daily_horoscopes') continue
      const insert = results[i].value.insert
      if (insert.mock.calls.length) return insert.mock.calls[0][0] as Record<string, unknown>
    }
    return undefined
  }

  it('the stale-row delete only matches a row still UNDER the cap and returns it, so its count can be carried', async () => {
    seedChart('c-cap1')
    mockSupabase.push('daily_horoscopes', { data: null }) // delete
    mockSupabase.push('daily_horoscopes', { data: null }) // cache check
    seedGenerationTail()

    await POST(makeRequest('c-cap1'))

    const idx = mockSupabase.from.mock.calls.findIndex((c) => c[0] === 'daily_horoscopes')
    const builder = mockSupabase.from.mock.results[idx].value
    expect(builder.lt).toHaveBeenCalledWith('generated_at', MARKER)
    expect(builder.lt).toHaveBeenCalledWith('stale_regens', 3)
    expect(builder.select).toHaveBeenCalledWith('stale_regens')
  })

  it('an ordinary first generation (no stale row) is claimed with stale_regens 0', async () => {
    seedChart('c-cap2')
    mockSupabase.push('daily_horoscopes', { data: null })
    mockSupabase.push('daily_horoscopes', { data: null })
    seedGenerationTail()

    const res = await POST(makeRequest('c-cap2'))

    expect(res.status).toBe(200)
    expect(claimInsert()).toMatchObject({ stale_regens: 0 })
  })

  it('replacing a stale row CARRIES its count: previous 1 -> the new claim row is 2', async () => {
    seedChart('c-cap3')
    mockSupabase.push('daily_horoscopes', { data: [{ stale_regens: 1 }] }) // delete returns the replaced row
    mockSupabase.push('daily_horoscopes', { data: null })
    seedGenerationTail()

    const res = await POST(makeRequest('c-cap3'))

    expect(res.status).toBe(200)
    expect(claimInsert()).toMatchObject({ stale_regens: 2 })
  })

  it('the THIRD regeneration of the day is still allowed (previous 2 -> 3)', async () => {
    seedChart('c-cap4')
    mockSupabase.push('daily_horoscopes', { data: [{ stale_regens: 2 }] })
    mockSupabase.push('daily_horoscopes', { data: null })
    seedGenerationTail()

    const res = await POST(makeRequest('c-cap4'))

    expect(res.status).toBe(200)
    expect(claimInsert()).toMatchObject({ stale_regens: 3 })
  })

  it('AT the cap: the stale row is not deleted, nothing is generated or claimed, and the answer is `unavailable` (the quiet failure line) — a stale horoscope is never served', async () => {
    seedChart('c-cap5')
    mockSupabase.push('daily_horoscopes', { data: [] }) // delete skipped the row at the cap
    mockSupabase.push('daily_horoscopes', {
      data: { content: 'OLD CHART HOROSCOPE', generated_at: BEFORE }, // cache check finds the stale row
    })

    const res = await POST(makeRequest('c-cap5'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ content: null, unavailable: true, reason: 'regen_cap' })
    expect(JSON.stringify(body)).not.toContain('OLD CHART')
    expect(claimInsert()).toBeUndefined()
  })

  it('a FRESH cached row (generated after the edit) is still served normally, whatever its count', async () => {
    seedChart('c-cap6')
    mockSupabase.push('daily_horoscopes', { data: [] })
    mockSupabase.push('daily_horoscopes', {
      data: { content: 'fresh content', generated_at: '2026-02-01T00:00:00.000Z' },
    })

    const body = await (await POST(makeRequest('c-cap6'))).json()

    expect(body).toMatchObject({ content: 'fresh content', cached: true })
  })
})
