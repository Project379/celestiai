import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockSupabase, type MockSupabase } from '../mocks/supabase'
import { makeAppUser } from '../mocks/fixtures'

/**
 * Birth-data edit invalidation on POST /api/oracle/generate (Batch 8 "b").
 *
 * A reading generated before the chart's `birth_data_edited_at` describes the
 * OLD chart and must never be served. Quota rule (founder, 2026-10-01): a stale
 * row skips the premium quota claim ONLY if its TRIGGERING edit (the chart's
 * latest birth_data_edits row) has quota_exempt = true; otherwise it claims
 * quota normally. Free is gated by its lifetime marker, which the edit RPC
 * re-grants at most once ever.
 */

const userState = vi.hoisted(() => ({ tier: 'premium' as 'free' | 'premium' }))

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(async () => ({ userId: 'user_stale_test' })),
}))
vi.mock('@/lib/supabase/service', () => ({ createServiceSupabaseClient: vi.fn() }))
vi.mock('@/lib/users/ensure-user', () => ({
  ensureUserRecord: vi.fn(async () =>
    makeAppUser({ clerk_id: 'user_stale_test', subscription_tier: userState.tier }),
  ),
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
vi.mock('@/lib/oracle/prompts', () => ({ buildSystemPrompt: vi.fn(() => 'system prompt') }))
vi.mock('@/lib/oracle/chart-to-prompt', () => ({
  chartToPromptText: vi.fn(() => 'chart prompt text'),
  buildOraclePlaceholderValues: vi.fn(() => ({})),
}))
vi.mock('@/lib/ai/validate-reading', () => ({
  validateReading: vi.fn((raw: string) => ({ ok: true, text: raw, content: raw, wordCount: 500 })),
}))
vi.mock('@stellaeum/core/oracle/planet-parser', () => ({ stripSentinels: vi.fn((t: string) => t) }))
vi.mock('@/lib/ai/generate-final-text', () => ({
  GEMINI_THINKING_LEVEL: { oracle: 'low', horoscope: 'low', smoke: 'low' },
  generateFinalText: vi.fn(async () => ({ model: 'fake-model', text: 'a generated reading' })),
}))

const calcSpy = vi.hoisted(() => vi.fn(async () => ({ ok: true, data: {}, cached: false })))
vi.mock('@stellaeum/core/charts/calculate', () => ({ calculateChartForUser: calcSpy }))

const quotaState = vi.hoisted(() => ({ used: 0, limit: 300 }))
vi.mock('@/lib/subscriptions/quota', () => ({
  checkQuotaAvailable: vi.fn(async () => ({
    available: quotaState.used < quotaState.limit,
    used: quotaState.used,
    limit: quotaState.limit,
    periodStart: new Date('2026-09-01T00:00:00.000Z'),
  })),
  incrementQuotaUsage: vi.fn(async () => {
    if (quotaState.used >= quotaState.limit) return { success: false, newUsed: null }
    quotaState.used += 1
    return { success: true, newUsed: quotaState.used }
  }),
  decrementQuotaUsage: vi.fn(async () => {
    quotaState.used = Math.max(0, quotaState.used - 1)
    return true
  }),
  quotaCapReachedResponse: vi.fn(() =>
    Response.json({ error: 'temporarily unavailable' }, { status: 503 }),
  ),
}))

const freeOracleState = vi.hoisted(() => ({ used: false, regrantUsed: false }))
const claimSpy = vi.hoisted(() => vi.fn())
const regrantClaimSpy = vi.hoisted(() => vi.fn())
vi.mock('@/lib/subscriptions/free-oracle', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/subscriptions/free-oracle')>()
  return {
    ...actual,
    claimFreeOracleReading: vi.fn(async () => {
      claimSpy()
      if (freeOracleState.used) return { claimed: false, columnMissing: false }
      freeOracleState.used = true
      return { claimed: true, columnMissing: false }
    }),
    releaseFreeOracleReading: vi.fn(async () => {
      freeOracleState.used = false
    }),
    claimFreeOracleRegrant: vi.fn(async () => {
      regrantClaimSpy()
      if (freeOracleState.regrantUsed) return false
      freeOracleState.regrantUsed = true
      return true
    }),
    releaseFreeOracleRegrant: vi.fn(async () => {
      freeOracleState.regrantUsed = false
    }),
  }
})

import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { generateFinalText } from '@/lib/ai/generate-final-text'
import { incrementQuotaUsage } from '@/lib/subscriptions/quota'
import { POST } from '@/app/api/oracle/generate/route'

let mockSupabase: MockSupabase

const MARKER = '2026-09-10T00:00:00.000Z'
const BEFORE_EDIT = '2026-09-01T00:00:00.000Z'
const AFTER_EDIT = '2026-09-11T00:00:00.000Z'
const CALC = {
  planet_positions: [{ planet: 'sun', sign: 'aries', house: 1, longitude: 0 }],
  house_cusps: [],
  aspects: [],
  ascendant: 0,
  mc: 0,
  birth_time_known: true,
}

function reading(generatedAt: string, extra: Record<string, unknown> = {}) {
  return {
    id: 'reading-1',
    content: 'old content',
    generated_at: generatedAt,
    expires_at: '2999-12-31T00:00:00.000Z',
    last_regenerated_at: null,
    ...extra,
  }
}

function seed(opts: {
  prior: Record<string, unknown> | null
  edit?: { quota_exempt: boolean; was_active_chart?: boolean } | null
  markerAfter?: string
  calc?: boolean
}) {
  mockSupabase.push('charts', {
    data: { id: 'chart-1', user_id: 'user_stale_test', birth_data_edited_at: MARKER },
  })
  mockSupabase.push('ai_readings', { data: opts.prior })
  if (opts.edit !== undefined) mockSupabase.push('birth_data_edits', { data: opts.edit })
  mockSupabase.push('chart_calculations', { data: opts.calc === false ? null : CALC })
  // re-read after the lazy recompute
  if (opts.calc === false) mockSupabase.push('chart_calculations', { data: CALC })
  // race-guard re-read of the marker
  mockSupabase.push('charts', { data: { birth_data_edited_at: opts.markerAfter ?? MARKER } })
  mockSupabase.push('ai_readings', { data: null }) // final upsert
}

function req(body: Record<string, unknown>) {
  return new Request('http://localhost/api/oracle/generate?format=json', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  userState.tier = 'premium'
  quotaState.used = 0
  freeOracleState.used = false
  freeOracleState.regrantUsed = false
  mockSupabase = createMockSupabase()
  vi.mocked(createServiceSupabaseClient).mockReturnValue(mockSupabase as never)
})

describe('stale reading (generated before the last birth-data edit)', () => {
  it('is NOT served as a cache hit — it regenerates (premium)', async () => {
    seed({ prior: reading(BEFORE_EDIT), edit: { quota_exempt: true } })
    const res = await POST(req({ chartId: 'chart-1', topic: 'general' }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.cached).toBe(false)
    expect(body.content).not.toBe('old content')
    expect(vi.mocked(generateFinalText)).toHaveBeenCalledTimes(1)
  })

  it('a reading generated AFTER the edit is still a normal cache hit (control)', async () => {
    mockSupabase.push('charts', {
      data: { id: 'chart-1', user_id: 'user_stale_test', birth_data_edited_at: MARKER },
    })
    mockSupabase.push('ai_readings', { data: reading(AFTER_EDIT) })
    const res = await POST(req({ chartId: 'chart-1', topic: 'general' }))
    expect((await res.json()).cached).toBe(true)
    expect(vi.mocked(generateFinalText)).not.toHaveBeenCalled()
  })

  it('premium + EXEMPT triggering edit: skips the quota claim and the regenerate cooldown', async () => {
    seed({
      prior: reading(BEFORE_EDIT, { last_regenerated_at: new Date().toISOString() }),
      edit: { quota_exempt: true },
    })
    const res = await POST(req({ chartId: 'chart-1', topic: 'general', regenerate: true }))
    expect(res.status).toBe(200)
    expect(vi.mocked(incrementQuotaUsage)).not.toHaveBeenCalled()
    expect(quotaState.used).toBe(0)
  })

  it('premium + NON-exempt triggering edit (the third edit inside 30 days): claims quota normally', async () => {
    seed({ prior: reading(BEFORE_EDIT), edit: { quota_exempt: false } })
    const res = await POST(req({ chartId: 'chart-1', topic: 'general' }))
    expect(res.status).toBe(200)
    expect(vi.mocked(incrementQuotaUsage)).toHaveBeenCalledTimes(1)
    expect(quotaState.used).toBe(1)
  })

  it('premium + stale row but NO matching edit row: fails safe to claiming quota', async () => {
    seed({ prior: reading(BEFORE_EDIT), edit: null })
    const res = await POST(req({ chartId: 'chart-1', topic: 'general' }))
    expect(res.status).toBe(200)
    expect(vi.mocked(incrementQuotaUsage)).toHaveBeenCalledTimes(1)
  })

  it('premium + NON-exempt edit with the monthly cap already reached is refused like any new reading', async () => {
    quotaState.used = quotaState.limit
    mockSupabase.push('charts', {
      data: { id: 'chart-1', user_id: 'user_stale_test', birth_data_edited_at: MARKER },
    })
    mockSupabase.push('ai_readings', { data: reading(BEFORE_EDIT) })
    mockSupabase.push('birth_data_edits', { data: { quota_exempt: false } })
    const res = await POST(req({ chartId: 'chart-1', topic: 'general' }))
    expect(res.status).toBe(503)
    expect(vi.mocked(generateFinalText)).not.toHaveBeenCalled()
  })

  it('FREE: lifetime reading spent + stale + regrant UNUSED + active-chart edit — allowed, the regrant is spent at generation time (the lifetime marker is untouched)', async () => {
    userState.tier = 'free'
    freeOracleState.used = true
    seed({ prior: reading(BEFORE_EDIT), edit: { quota_exempt: true, was_active_chart: true } })
    const res = await POST(req({ chartId: 'chart-1', topic: 'general' }))
    expect(res.status).toBe(200)
    expect(regrantClaimSpy).toHaveBeenCalledTimes(1)
    expect(freeOracleState.regrantUsed).toBe(true)
    expect(freeOracleState.used).toBe(true) // lifetime marker not cleared
    expect(vi.mocked(incrementQuotaUsage)).not.toHaveBeenCalled()
  })

  it('FREE: stale + regrant already SPENT — locked (429 free_used), never served, never regenerated', async () => {
    userState.tier = 'free'
    freeOracleState.used = true
    freeOracleState.regrantUsed = true
    mockSupabase.push('charts', {
      data: { id: 'chart-1', user_id: 'user_stale_test', birth_data_edited_at: MARKER },
    })
    mockSupabase.push('ai_readings', { data: reading(BEFORE_EDIT) })
    mockSupabase.push('birth_data_edits', { data: { quota_exempt: true, was_active_chart: true } })
    const res = await POST(req({ chartId: 'chart-1', topic: 'general' }))
    const body = await res.json()
    expect(res.status).toBe(429)
    expect(body.code).toBe('CAP_REACHED')
    expect(body.reason).toBe('free_used')
    expect(vi.mocked(generateFinalText)).not.toHaveBeenCalled()
  })

  it('FREE: stale from an edit to a NON-active chart gets no regrant (locked) even though the regrant is unused', async () => {
    userState.tier = 'free'
    freeOracleState.used = true
    mockSupabase.push('charts', {
      data: { id: 'chart-1', user_id: 'user_stale_test', birth_data_edited_at: MARKER },
    })
    mockSupabase.push('ai_readings', { data: reading(BEFORE_EDIT) })
    mockSupabase.push('birth_data_edits', { data: { quota_exempt: false, was_active_chart: false } })
    const res = await POST(req({ chartId: 'chart-1', topic: 'general' }))
    expect(res.status).toBe(429)
    expect(regrantClaimSpy).not.toHaveBeenCalled()
    expect(freeOracleState.regrantUsed).toBe(false)
  })

  it('FREE: a stale reading with the lifetime marker still UNUSED claims the normal marker, not the regrant', async () => {
    userState.tier = 'free'
    freeOracleState.used = false
    seed({ prior: reading(BEFORE_EDIT), edit: { quota_exempt: true, was_active_chart: true } })
    const res = await POST(req({ chartId: 'chart-1', topic: 'general' }))
    expect(res.status).toBe(200)
    expect(claimSpy).toHaveBeenCalledTimes(1)
    expect(regrantClaimSpy).not.toHaveBeenCalled()
  })

  it('FREE: a discarded generation (edit mid-flight) refunds the spent regrant', async () => {
    userState.tier = 'free'
    freeOracleState.used = true
    seed({
      prior: reading(BEFORE_EDIT),
      edit: { quota_exempt: true, was_active_chart: true },
      markerAfter: '2026-09-12T00:00:00.000Z',
    })
    const res = await POST(req({ chartId: 'chart-1', topic: 'general' }))
    expect(res.status).toBe(409)
    expect(freeOracleState.regrantUsed).toBe(false)
  })

  it('PREMIUM: an edit never touches the regrant', async () => {
    seed({ prior: reading(BEFORE_EDIT), edit: { quota_exempt: false, was_active_chart: true } })
    await POST(req({ chartId: 'chart-1', topic: 'general' }))
    expect(regrantClaimSpy).not.toHaveBeenCalled()
  })

  it('RACE GUARD: birth data edited while the model ran — result discarded (409), claim refunded, nothing saved', async () => {
    seed({ prior: null, markerAfter: '2026-09-12T00:00:00.000Z' })
    const res = await POST(req({ chartId: 'chart-1', topic: 'general' }))
    expect(res.status).toBe(409)
    expect((await res.json()).code).toBe('CHART_EDITED_DURING_GENERATION')
    expect(quotaState.used).toBe(0) // the premium claim was refunded
    const readingCalls = mockSupabase.from.mock.calls.filter((c) => c[0] === 'ai_readings')
    expect(readingCalls).toHaveLength(1) // only the cache check — no upsert reached
  })

  it('lazily recomputes the natal chart when the edit deleted the chart_calculations cache (no 404 for a user who opens Oracle first)', async () => {
    seed({ prior: null, calc: false })
    const res = await POST(req({ chartId: 'chart-1', topic: 'general' }))
    expect(res.status).toBe(200)
    expect(calcSpy).toHaveBeenCalledWith('user_stale_test', 'chart-1')
  })
})
