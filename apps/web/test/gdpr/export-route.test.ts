import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockSupabase, type MockSupabase } from '../mocks/supabase'

/**
 * 2026-08-26 sweep finding #13: GDPR export omitted user_crystals and
 * user_daily_crystals entirely, alongside the same tables missing from
 * GDPR delete (#6) — a consistent single-cause gap, not two unrelated
 * ones. This test proves both tables are now present in the export
 * payload. Per standing discipline, run against the pre-fix route (no
 * userCrystals/userDailyCrystals fetch or field) and confirmed the fields
 * were absent before the fix was restored.
 */

vi.mock('next/server', () => ({
  after: (fn: () => unknown) => {
    fn()
  },
}))

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(async () => ({ userId: 'user_test123' })),
}))

vi.mock('@/lib/rate-limit', () => ({
  assertRateLimit: vi.fn(async () => undefined),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceSupabaseClient: vi.fn(),
}))

vi.mock('@/lib/audit', () => ({
  logAuditEvent: vi.fn(),
}))

let mockSupabase: MockSupabase

import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { GET } from '@/app/api/gdpr/export/route'

beforeEach(() => {
  vi.clearAllMocks()
  mockSupabase = createMockSupabase()
  vi.mocked(createServiceSupabaseClient).mockReturnValue(mockSupabase as never)
})

describe('GET /api/gdpr/export — user_crystals / user_daily_crystals (2026-08-26 sweep #13)', () => {
  it('includes userCrystals and userDailyCrystals in the export payload', async () => {
    mockSupabase.push('connection_members', { data: [] })
    mockSupabase.push('charts', { data: [] })
    mockSupabase.push('ai_readings', { data: [] })
    mockSupabase.push('daily_horoscopes', { data: [] })
    mockSupabase.push('diary_entries', { data: [] })
    mockSupabase.push('connection_invites', { data: [] })
    mockSupabase.push('saved_people_profiles', { data: [] })
    mockSupabase.push('users', { data: { subscription_tier: 'free', created_at: '2026-01-01' } })
    mockSupabase.push('user_crystals', {
      data: [{ id: 'uc-1', user_id: 'user_test123', crystal_id: 'c-1' }],
    })
    mockSupabase.push('user_daily_crystals', {
      data: [{ id: 'udc-1', user_id: 'user_test123', crystal_id: 'c-1', date: '2026-08-26' }],
    })
    mockSupabase.push('recommendation_deliveries', {
      data: [{ id: 'delivery-1', user_id: 'user_test123', work_id: 'work-1' }],
    })
    mockSupabase.push('user_recommendation_work_states', {
      data: [{ user_id: 'user_test123', work_id: 'work-1', status: 'saved' }],
    })
    mockSupabase.push('recommendation_events', {
      data: [{ user_id: 'user_test123', work_id: 'work-1', event_type: 'saved' }],
    })

    const res = await GET()
    const body = JSON.parse(await res.text())

    expect(body.userCrystals).toEqual([{ id: 'uc-1', user_id: 'user_test123', crystal_id: 'c-1' }])
    expect(body.userDailyCrystals).toEqual([
      { id: 'udc-1', user_id: 'user_test123', crystal_id: 'c-1', date: '2026-08-26' },
    ])
    expect(body.recommendationDeliveries).toHaveLength(1)
    expect(body.recommendationWorkStates).toHaveLength(1)
    expect(body.recommendationEvents).toHaveLength(1)
  })

  it('queries both tables scoped by the caller\'s own user_id', async () => {
    mockSupabase.push('connection_members', { data: [] })
    mockSupabase.push('charts', { data: [] })
    mockSupabase.push('ai_readings', { data: [] })
    mockSupabase.push('daily_horoscopes', { data: [] })
    mockSupabase.push('diary_entries', { data: [] })
    mockSupabase.push('connection_invites', { data: [] })
    mockSupabase.push('saved_people_profiles', { data: [] })
    mockSupabase.push('users', { data: { subscription_tier: 'free', created_at: '2026-01-01' } })
    mockSupabase.push('user_crystals', { data: [] })
    mockSupabase.push('user_daily_crystals', { data: [] })

    await GET()

    const crystalsCallIndex = mockSupabase.from.mock.calls.findIndex((c) => c[0] === 'user_crystals')
    const dailyCallIndex = mockSupabase.from.mock.calls.findIndex((c) => c[0] === 'user_daily_crystals')
    expect(crystalsCallIndex).toBeGreaterThanOrEqual(0)
    expect(dailyCallIndex).toBeGreaterThanOrEqual(0)
    expect(mockSupabase.from.mock.results[crystalsCallIndex].value.eq).toHaveBeenCalledWith(
      'user_id',
      'user_test123',
    )
    expect(mockSupabase.from.mock.results[dailyCallIndex].value.eq).toHaveBeenCalledWith(
      'user_id',
      'user_test123',
    )
  })
})

describe('GET /api/gdpr/export — birth_data_edits (Batch 8 b)', () => {
  function seedEmpty() {
    mockSupabase.push('connection_members', { data: [] })
    mockSupabase.push('charts', {
      data: [{ id: 'chart-1', user_id: 'user_test123', birth_data_edited_at: '2026-10-01T10:00:00.000Z' }],
    })
    mockSupabase.push('ai_readings', { data: [] })
    mockSupabase.push('daily_horoscopes', { data: [] })
    mockSupabase.push('diary_entries', { data: [] })
    mockSupabase.push('connection_invites', { data: [] })
    mockSupabase.push('saved_people_profiles', { data: [] })
    mockSupabase.push('users', { data: { subscription_tier: 'free', created_at: '2026-01-01' } })
    mockSupabase.push('user_crystals', { data: [] })
    mockSupabase.push('user_daily_crystals', { data: [] })
    mockSupabase.push('recommendation_deliveries', { data: [] })
    mockSupabase.push('user_recommendation_work_states', { data: [] })
    mockSupabase.push('recommendation_events', { data: [] })
  }

  it('includes birthDataEdits in the export payload, and the charts keep their birth_data_edited_at marker', async () => {
    seedEmpty()
    mockSupabase.push('birth_data_edits', {
      data: [
        {
          id: 'e-1',
          user_id: 'user_test123',
          chart_id: 'chart-1',
          edited_at: '2026-10-01T10:00:00.000Z',
          quota_exempt: true,
          was_active_chart: true,
        },
      ],
    })

    const res = await GET()
    const body = JSON.parse(await res.text())

    expect(body.birthDataEdits).toHaveLength(1)
    expect(body.birthDataEdits[0].quota_exempt).toBe(true)
    expect(body.charts[0].birth_data_edited_at).toBe('2026-10-01T10:00:00.000Z')
  })

  it("queries birth_data_edits scoped by the caller's own user_id (never another user's ledger)", async () => {
    seedEmpty()
    mockSupabase.push('birth_data_edits', { data: [] })

    await GET()

    const idx = mockSupabase.from.mock.calls.findIndex((c) => c[0] === 'birth_data_edits')
    expect(idx).toBeGreaterThanOrEqual(0)
    expect(mockSupabase.from.mock.results[idx].value.eq).toHaveBeenCalledWith('user_id', 'user_test123')
  })
})

describe('GET /api/gdpr/export — push_subscriptions / push_tokens', () => {
  function seedEmpty() {
    for (const t of [
      'connection_members', 'charts', 'ai_readings', 'daily_horoscopes', 'diary_entries',
      'connection_invites', 'saved_people_profiles', 'user_crystals', 'user_daily_crystals',
      'recommendation_deliveries', 'user_recommendation_work_states', 'recommendation_events',
      'birth_data_edits',
    ]) {
      mockSupabase.push(t, { data: [] })
    }
    mockSupabase.push('users', { data: { subscription_tier: 'free', created_at: '2026-01-01' } })
  }

  it('includes pushSubscriptions and pushTokens with their notification-preference columns', async () => {
    seedEmpty()
    mockSupabase.push('push_subscriptions', {
      data: [{ id: 's1', endpoint: 'https://push.example/1', created_at: '2026-09-01', morning_enabled: true, diary_enabled: false }],
    })
    mockSupabase.push('push_tokens', {
      data: [{ id: 't1', token: 'ExpoPushToken[x]', platform: 'ios', morning_enabled: true, diary_enabled: true }],
    })

    const body = JSON.parse(await (await GET()).text())

    expect(body.pushSubscriptions[0]).toMatchObject({ morning_enabled: true, diary_enabled: false })
    expect(body.pushTokens[0]).toMatchObject({ platform: 'ios', diary_enabled: true })
  })

  it("is scoped by the caller's own user_id and selects the preference columns", async () => {
    seedEmpty()

    await GET()

    for (const table of ['push_subscriptions', 'push_tokens']) {
      const idx = mockSupabase.from.mock.calls.findIndex((c) => c[0] === table)
      expect(idx).toBeGreaterThanOrEqual(0)
      const builder = mockSupabase.from.mock.results[idx].value
      expect(builder.eq).toHaveBeenCalledWith('user_id', 'user_test123')
      expect(builder.select).toHaveBeenCalledWith(expect.stringContaining('diary_enabled'))
    }
  })

  it('never exports the Web Push encryption secrets (p256dh, auth) — credentials, not user information', async () => {
    seedEmpty()

    await GET()

    const idx = mockSupabase.from.mock.calls.findIndex((c) => c[0] === 'push_subscriptions')
    const selectArg = mockSupabase.from.mock.results[idx].value.select.mock.calls[0][0] as string
    expect(selectArg).not.toMatch(/p256dh|auth/)
  })
})
