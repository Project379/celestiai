import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockSupabase, type MockSupabase } from '../mocks/supabase'

/**
 * Batch 5.5 finding #3 (founder-ruled MEDIUM, migration authorised
 * 2026-08-14): POST /api/circle/profiles previously read the caller's
 * tier + existing profile count, then inserted — a plain check-then-act
 * with no DB constraint behind it, letting a free-tier user create 2+
 * saved profiles under concurrent requests. Fixed via
 * create_saved_profile_if_allowed (20260814180000_saved_profile_quota_rpc.sql),
 * a single atomic Postgres function (tier check + count check + insert,
 * serialized per-user via an advisory lock) that the route now calls
 * instead of a plain .insert(). This test verifies the route's own
 * contract against that RPC's documented return shape (row on success,
 * null when quota-exhausted) — not the RPC's internal SQL, which isn't
 * something a JS test can exercise directly.
 */

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(async () => ({ userId: 'user_1' })),
}))

vi.mock('@/lib/rate-limit', () => ({
  assertRateLimit: vi.fn(async () => {}),
}))

vi.mock('@/lib/audit', () => ({
  logAuditEvent: vi.fn(),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceSupabaseClient: vi.fn(),
}))

import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { POST } from '@/app/api/circle/profiles/route'

let mockSupabase: MockSupabase

const VALID_BODY = {
  name: 'Тест',
  birthDate: '1995-06-15',
  birthTimeKnown: true,
  birthTime: '12:00',
  cityName: 'Sofia',
  latitude: 42.7,
  longitude: 23.3,
}

function makeRequest(body: unknown = VALID_BODY) {
  return new Request('http://localhost/api/circle/profiles', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSupabase = createMockSupabase()
  vi.mocked(createServiceSupabaseClient).mockReturnValue(mockSupabase as never)
})

describe('POST /api/circle/profiles — RPC-backed quota claim (Batch 5.5 #3)', () => {
  it('creates the profile via create_saved_profile_if_allowed and returns 201 when the RPC returns a row', async () => {
    mockSupabase.pushRpc('create_saved_profile_if_allowed', {
      data: { id: 'profile-1', user_id: 'user_1', kind: 'crush', name: 'Тест' },
    })

    const res = await POST(makeRequest())

    expect(res.status).toBe(201)
    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      'create_saved_profile_if_allowed',
      expect.objectContaining({ p_user_id: 'user_1', p_kind: 'crush' }),
    )
  })

  it('returns 403 with the quota message AND code PREMIUM_REQUIRED when the RPC returns null (free tier, quota exhausted)', async () => {
    // tier item 5 (Кръг): the client renders a locked "add profile"
    // affordance from `data.tier` so a free user does not normally reach
    // this — but the server 403 stays the authority, and `code` lets any
    // caller distinguish the tier cap from other 403s.
    mockSupabase.pushRpc('create_saved_profile_if_allowed', { data: null })

    const res = await POST(makeRequest())
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toBe('Без Premium можеш да пазиш само един crush профил.')
    expect(body.code).toBe('PREMIUM_REQUIRED')
  })

  it('returns 500 when the RPC itself errors', async () => {
    mockSupabase.pushRpc('create_saved_profile_if_allowed', {
      data: null,
      error: { message: 'connection reset' },
    })

    const res = await POST(makeRequest())

    expect(res.status).toBe(500)
  })
})
