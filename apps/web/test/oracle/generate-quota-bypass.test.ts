import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockSupabase, type MockSupabase } from '../mocks/supabase'
import { makeAppUser } from '../mocks/fixtures'

/**
 * Batch 5.5 finding #1 (HIGH): `regenerate:true` skipped BOTH the 24h
 * cooldown AND the quota check/claim whenever no live cached reading
 * existed — a user could send regenerate:true for any owned chart x topic
 * and get unlimited paid AI generations with zero quota consumption.
 *
 * Fix: `isRegenerationOfExisting = Boolean(regenerate && existingReading)`
 * gates the quota exemption on there actually being a reading to
 * regenerate.
 *
 * Frozen tier definition (2026-09-01): regenerate is now PREMIUM-only, so
 * this test's subject moved from a free user to a premium user — premium
 * is the tier that CAN regenerate and therefore the tier where the
 * anti-bypass invariant still has to hold. Plus a new assertion that a
 * FREE user's regenerate is blocked outright (CAP_REACHED /
 * premium_regenerate) before any quota interaction.
 *
 * Prove-red: run with
 *   git stash push apps/web/app/api/oracle/generate/route.ts
 * "free regenerate -> blocked" then FAILS (pre-change: free regenerate
 * allowed). The premium anti-bypass assertions still describe the
 * unchanged isRegenerationOfExisting logic.
 */

const AI_MOCK_MODEL = 'fake-model-instance'
const userState = vi.hoisted(() => ({ tier: 'premium' as 'free' | 'premium' }))

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(async () => ({ userId: 'user_bypass_test' })),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceSupabaseClient: vi.fn(),
}))

vi.mock('@/lib/users/ensure-user', () => ({
  ensureUserRecord: vi.fn(async () =>
    makeAppUser({ clerk_id: 'user_bypass_test', subscription_tier: userState.tier }),
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
  openrouter: vi.fn(() => AI_MOCK_MODEL),
  isUpstreamAiError: vi.fn(() => false),
}))
vi.mock('@/lib/oracle/prompts', () => ({ buildSystemPrompt: vi.fn(() => 'system prompt') }))
vi.mock('@/lib/oracle/chart-to-prompt', () => ({ chartToPromptText: vi.fn(() => 'chart prompt text') }))
vi.mock('@stellaeum/core/oracle/planet-parser', () => ({ stripSentinels: vi.fn((t: string) => t) }))
vi.mock('ai', () => ({
  generateText: vi.fn(async () => ({ text: 'a generated reading' })),
  streamText: vi.fn(),
}))

const quotaState = vi.hoisted(() => ({ used: 0, limit: 3 }))
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
    Response.json({ error: 'cap reached (test)', code: 'CAP_REACHED', cap: 3 }, { status: 429 }),
  ),
}))

const claimSpy = vi.hoisted(() => vi.fn())
vi.mock('@/lib/subscriptions/free-oracle', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/subscriptions/free-oracle')>()
  return {
    ...actual,
    claimFreeOracleReading: vi.fn(async () => {
      claimSpy()
      return { claimed: true, columnMissing: false }
    }),
    releaseFreeOracleReading: vi.fn(async () => {}),
  }
})

import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { POST } from '@/app/api/oracle/generate/route'

let mockSupabase: MockSupabase

function seedNoExistingReading() {
  mockSupabase.push('charts', { data: { id: 'chart-1', user_id: 'user_bypass_test' } })
  mockSupabase.push('ai_readings', { data: null }) // cache check — nothing
  mockSupabase.push('chart_calculations', {
    data: {
      planet_positions: [{ planet: 'sun', sign: 'aries', house: 1, longitude: 0 }],
      house_cusps: [], aspects: [], ascendant: 0, mc: 0, birth_time_known: true,
    },
  })
  mockSupabase.push('ai_readings', { data: null }) // final upsert — ignored
}

function seedLiveExistingReading() {
  mockSupabase.push('charts', { data: { id: 'chart-1', user_id: 'user_bypass_test' } })
  mockSupabase.push('ai_readings', {
    data: {
      id: 'reading-1',
      content: 'old content',
      generated_at: '2026-08-01T00:00:00.000Z',
      expires_at: '2026-12-20T00:00:00.000Z',
      last_regenerated_at: '2026-08-01T00:00:00.000Z',
    },
  })
  mockSupabase.push('chart_calculations', {
    data: {
      planet_positions: [{ planet: 'sun', sign: 'aries', house: 1, longitude: 0 }],
      house_cusps: [], aspects: [], ascendant: 0, mc: 0, birth_time_known: true,
    },
  })
  mockSupabase.push('ai_readings', { data: null })
}

function makeRequest() {
  return new Request('http://localhost/api/oracle/generate?format=json', {
    method: 'POST',
    body: JSON.stringify({ chartId: 'chart-1', topic: 'general', regenerate: true }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  userState.tier = 'premium'
  quotaState.used = 0
  mockSupabase = createMockSupabase()
  vi.mocked(createServiceSupabaseClient).mockReturnValue(mockSupabase as never)
})

describe('POST /api/oracle/generate — regenerate:true quota bypass (Batch 5.5 #1, premium)', () => {
  it('consumes quota on every regenerate:true call when there is no existing cached reading, and blocks once the cap is reached', async () => {
    for (let i = 0; i < quotaState.limit; i++) {
      seedNoExistingReading()
      const res = await POST(makeRequest())
      expect(res.status).toBe(200)
    }
    expect(quotaState.used).toBe(quotaState.limit)

    seedNoExistingReading()
    const blockedRes = await POST(makeRequest())
    expect(blockedRes.status).toBe(429)
    const body = await blockedRes.json()
    expect(body.code).toBe('CAP_REACHED')
  })

  it('does not consume quota when regenerating an existing, live cached reading — the legitimate exemption still works', async () => {
    seedLiveExistingReading()
    const res = await POST(makeRequest())
    expect(res.status).toBe(200)
    expect(quotaState.used).toBe(0)
  })
})

describe('POST /api/oracle/generate — regenerate is premium-only (frozen definition 2026-09-01)', () => {
  it('blocks a FREE user regenerate with CAP_REACHED / premium_regenerate, no quota or lifetime-marker interaction', async () => {
    userState.tier = 'free'
    seedLiveExistingReading()

    const res = await POST(makeRequest())

    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.code).toBe('CAP_REACHED')
    expect(body.reason).toBe('premium_regenerate')
    expect(quotaState.used).toBe(0)
    expect(claimSpy).not.toHaveBeenCalled()
  })
})
