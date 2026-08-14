import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockSupabase, type MockSupabase } from '../mocks/supabase'
import { makeAppUser } from '../mocks/fixtures'

/**
 * Batch 5.5 finding #1 (HIGH, the most serious finding of the security
 * sweep): `regenerate:true` skipped BOTH the 24h cooldown AND the quota
 * check/claim whenever no live cached reading existed for that chart+topic
 * (never generated, or past the 7-day TTL) — a free-tier user could send
 * regenerate:true for any owned chart x 4 topics and get unlimited paid AI
 * generations with zero quota consumption, repeatable forever.
 *
 * This test proves the fix (isRegenerationOfExisting gating the quota
 * exemption on existingReading truthiness, not on the raw regenerate flag)
 * by exercising the exact free-tier repeat-regenerate scenario end-to-end
 * against the real route handler. Per standing discipline, this test was
 * run against the pre-fix route.ts (regenerate flag used directly instead
 * of isRegenerationOfExisting) and confirmed to FAIL before the fix was
 * restored — see the commit message for the confirmation.
 */

const AI_MOCK_MODEL = 'fake-model-instance'

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(async () => ({ userId: 'user_free_bypass_test' })),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceSupabaseClient: vi.fn(),
}))

vi.mock('@/lib/users/ensure-user', () => ({
  ensureUserRecord: vi.fn(async () =>
    makeAppUser({ clerk_id: 'user_free_bypass_test', subscription_tier: 'free' })
  ),
}))

vi.mock('@/lib/rate-limit', () => ({
  assertRateLimit: vi.fn(async () => {}),
}))

vi.mock('@/lib/audit', () => ({
  logAuditEvent: vi.fn(),
}))

vi.mock('@/lib/ai/check-bg-output', () => ({
  checkAndLogGeneration: vi.fn(async () => {}),
}))

vi.mock('@/lib/ai/client', () => ({
  AI_MODEL: 'fake-model',
  openrouter: vi.fn(() => AI_MOCK_MODEL),
}))

vi.mock('@/lib/oracle/prompts', () => ({
  buildSystemPrompt: vi.fn(() => 'system prompt'),
}))

vi.mock('@/lib/oracle/chart-to-prompt', () => ({
  chartToPromptText: vi.fn(() => 'chart prompt text'),
}))

vi.mock('@stellaeum/core/oracle/planet-parser', () => ({
  stripSentinels: vi.fn((text: string) => text),
}))

vi.mock('ai', () => ({
  generateText: vi.fn(async () => ({ text: 'a generated reading' })),
  streamText: vi.fn(),
}))

// Stateful quota mock — mirrors the real RPC's behavior (atomic
// check-and-increment up to `limit`, race-loss/cap-reached returns
// success:false) closely enough to prove the ROUTE's gating logic, without
// re-testing quota.ts's own internals (already covered by quota.test.ts).
const quotaState = vi.hoisted(() => ({ used: 0, limit: 3 }))

vi.mock('@/lib/subscriptions/quota', () => ({
  checkQuotaAvailable: vi.fn(async () => ({
    available: quotaState.used < quotaState.limit,
    used: quotaState.used,
    limit: quotaState.limit,
    periodStart: new Date('2026-08-01T00:00:00.000Z'),
  })),
  incrementQuotaUsage: vi.fn(async () => {
    if (quotaState.used >= quotaState.limit) return { success: false }
    quotaState.used += 1
    return { success: true }
  }),
  decrementQuotaUsage: vi.fn(async () => {
    quotaState.used = Math.max(0, quotaState.used - 1)
  }),
}))

import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { POST } from '@/app/api/oracle/generate/route'

let mockSupabase: MockSupabase

function seedRouteQueries() {
  // 4. Chart ownership — always the caller's own chart.
  mockSupabase.push('charts', {
    data: { id: 'chart-1', user_id: 'user_free_bypass_test' },
  })
  // 5. Cache check — no existing reading. This is the exact condition the
  // bypass exploited: no live cache means existingReading is undefined.
  mockSupabase.push('ai_readings', { data: null })
  // 8. Chart calculation load — must succeed to reach the AI-generation step.
  mockSupabase.push('chart_calculations', {
    data: {
      planet_positions: [{ planet: 'sun', sign: 'aries', house: 1, longitude: 0 }],
      house_cusps: [],
      aspects: [],
      ascendant: 0,
      mc: 0,
      birth_time_known: true,
    },
  })
  // Final ai_readings upsert — its return value is ignored by the route,
  // queued only so the FIFO queue for this table doesn't underflow.
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
  quotaState.used = 0
  mockSupabase = createMockSupabase()
  vi.mocked(createServiceSupabaseClient).mockReturnValue(mockSupabase as never)
})

describe('POST /api/oracle/generate — regenerate:true quota bypass (Batch 5.5 #1)', () => {
  it('consumes quota on every regenerate:true call when there is no existing cached reading, and blocks once the free-tier cap is reached', async () => {
    // Pre-fix, this loop would return 200 on every single call — regenerate
    // skipped checkQuotaAvailable/incrementQuotaUsage entirely whenever
    // existingReading was absent, so quotaState.used would stay 0 forever
    // and the 4th call (limit=3) would never be blocked.
    for (let i = 0; i < quotaState.limit; i++) {
      seedRouteQueries()
      const res = await POST(makeRequest())
      expect(res.status).toBe(200)
    }

    expect(quotaState.used).toBe(quotaState.limit)

    // The (limit + 1)th regenerate:true call, still with no existing
    // reading, must now be blocked — this is the assertion that fails
    // against the pre-fix code (pre-fix: 200, unlimited).
    seedRouteQueries()
    const blockedRes = await POST(makeRequest())
    expect(blockedRes.status).toBe(429)
    const body = await blockedRes.json()
    expect(body.code).toBe('CAP_REACHED')
  })

  it('does not consume quota when regenerating an existing, live cached reading — the legitimate B.0f-2-fix-1 exemption still works', async () => {
    mockSupabase.push('charts', {
      data: { id: 'chart-1', user_id: 'user_free_bypass_test' },
    })
    // A live cached reading exists, last regenerated far enough in the past
    // to clear the 24h cooldown.
    mockSupabase.push('ai_readings', {
      data: {
        id: 'reading-1',
        content: 'old content',
        generated_at: '2026-08-01T00:00:00.000Z',
        expires_at: '2026-08-20T00:00:00.000Z',
        last_regenerated_at: '2026-08-01T00:00:00.000Z',
      },
    })
    mockSupabase.push('chart_calculations', {
      data: {
        planet_positions: [{ planet: 'sun', sign: 'aries', house: 1, longitude: 0 }],
        house_cusps: [],
        aspects: [],
        ascendant: 0,
        mc: 0,
        birth_time_known: true,
      },
    })
    mockSupabase.push('ai_readings', { data: null })

    const res = await POST(makeRequest())

    expect(res.status).toBe(200)
    expect(quotaState.used).toBe(0)
  })
})
