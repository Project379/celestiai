import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockSupabase, type MockSupabase } from '../mocks/supabase'

/**
 * Unit tests for assertRateLimit (lib/rate-limit.ts) — the primitive Batch 1
 * applied to 17 routes without any verification beyond a typecheck. This
 * tests the actual behavior of the limiter itself: what it does with the
 * RPC result, not what any route assumes it does.
 */

vi.mock('@/lib/supabase/service', () => ({
  createServiceSupabaseClient: vi.fn(),
}))

import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { assertRateLimit, getRequestIp } from '@/lib/rate-limit'
import { ApiError } from '@/lib/auth/guards'

let mockSupabase: MockSupabase

beforeEach(() => {
  vi.clearAllMocks()
  mockSupabase = createMockSupabase()
  vi.mocked(createServiceSupabaseClient).mockReturnValue(mockSupabase as never)
})

describe('assertRateLimit', () => {
  it('does not throw when the RPC-returned count is at or below the limit', async () => {
    mockSupabase.pushRpc('check_and_increment_rate_limit', { data: 5 })

    await expect(
      assertRateLimit({ key: 'k', limit: 10, windowMs: 60_000 }),
    ).resolves.toBeUndefined()
  })

  it('does not throw when the count exactly equals the limit (boundary — not "over")', async () => {
    mockSupabase.pushRpc('check_and_increment_rate_limit', { data: 10 })

    await expect(
      assertRateLimit({ key: 'k', limit: 10, windowMs: 60_000 }),
    ).resolves.toBeUndefined()
  })

  it('throws a 429 ApiError when the count exceeds the limit', async () => {
    mockSupabase.pushRpc('check_and_increment_rate_limit', { data: 11 })

    const err = await assertRateLimit({ key: 'k', limit: 10, windowMs: 60_000 }).catch(
      (e) => e,
    )

    expect(err).toBeInstanceOf(ApiError)
    expect((err as InstanceType<typeof ApiError>).status).toBe(429)
  })

  it('passes key/limit/windowMs through to the RPC call unmodified', async () => {
    mockSupabase.pushRpc('check_and_increment_rate_limit', { data: 1 })

    await assertRateLimit({ key: 'birth-data-create:user_1', limit: 10, windowMs: 60_000 })

    expect(mockSupabase.rpc).toHaveBeenCalledWith('check_and_increment_rate_limit', {
      p_key: 'birth-data-create:user_1',
      p_limit: 10,
      p_window_ms: 60_000,
    })
  })

  it('fails OPEN (does not throw) when the RPC itself errors', async () => {
    mockSupabase.pushRpc('check_and_increment_rate_limit', {
      data: null,
      error: { message: 'connection reset' },
    })

    await expect(
      assertRateLimit({ key: 'k', limit: 10, windowMs: 60_000 }),
    ).resolves.toBeUndefined()
  })

  it('does not throw when data is not a number (defensive — malformed RPC response)', async () => {
    mockSupabase.pushRpc('check_and_increment_rate_limit', { data: 'not-a-number' })

    await expect(
      assertRateLimit({ key: 'k', limit: 10, windowMs: 60_000 }),
    ).resolves.toBeUndefined()
  })

  describe('failClosed (2026-08-26 sweep #17)', () => {
    it('throws a 503 ApiError (not fail-open) when the RPC errors and failClosed:true', async () => {
      mockSupabase.pushRpc('check_and_increment_rate_limit', {
        data: null,
        error: { message: 'connection reset' },
      })

      const err = await assertRateLimit({
        key: 'oracle-generate:user_1',
        limit: 10,
        windowMs: 60_000,
        failClosed: true,
      }).catch((e) => e)

      expect(err).toBeInstanceOf(ApiError)
      expect((err as InstanceType<typeof ApiError>).status).toBe(503)
    })

    it('still fails open when failClosed is omitted, even on the same RPC error — the default posture is unchanged', async () => {
      mockSupabase.pushRpc('check_and_increment_rate_limit', {
        data: null,
        error: { message: 'connection reset' },
      })

      await expect(
        assertRateLimit({ key: 'k', limit: 10, windowMs: 60_000 }),
      ).resolves.toBeUndefined()
    })

    it('still enforces the real limit normally when failClosed:true and the RPC succeeds — this only changes the ERROR-path behavior', async () => {
      mockSupabase.pushRpc('check_and_increment_rate_limit', { data: 11 })

      const err = await assertRateLimit({
        key: 'oracle-generate:user_1',
        limit: 10,
        windowMs: 60_000,
        failClosed: true,
      }).catch((e) => e)

      expect(err).toBeInstanceOf(ApiError)
      expect((err as InstanceType<typeof ApiError>).status).toBe(429)
    })
  })
})

describe('getRequestIp', () => {
  it('reads the first entry of a comma-separated x-forwarded-for', () => {
    const req = new Request('http://localhost/x', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    })
    expect(getRequestIp(req)).toBe('1.2.3.4')
  })

  it('falls back to x-real-ip when x-forwarded-for is absent', () => {
    const req = new Request('http://localhost/x', {
      headers: { 'x-real-ip': '9.9.9.9' },
    })
    expect(getRequestIp(req)).toBe('9.9.9.9')
  })

  it('returns "unknown" when neither header is present', () => {
    const req = new Request('http://localhost/x')
    expect(getRequestIp(req)).toBe('unknown')
  })
})
