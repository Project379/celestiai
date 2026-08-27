import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * VERIFICATION-SURFACE-GAPS #9: `toErrorResponse` CATCHES an error and
 * RETURNS a 500 Response, so Next's onRequestError / captureRequestError
 * never fires and the 500 is invisible in Sentry. The fix is an explicit
 * `Sentry.captureException` in the non-ApiError branch. This test is the
 * "verify with a deliberate error" the founder asked for — "configured but
 * silently not capturing" has bitten this project repeatedly.
 */

const captureException = vi.fn()
vi.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => captureException(...args),
}))

// guards.ts also imports these transitively — keep them inert.
vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceSupabaseClient: vi.fn() }))

import { ApiError, toErrorResponse } from '@/lib/auth/guards'

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('toErrorResponse', () => {
  it('reports a non-ApiError to Sentry AND returns a 500', async () => {
    const bug = new SyntaxError('Unexpected end of JSON input')
    const res = toErrorResponse(bug, 'Failed to generate horoscope.')

    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toEqual({ error: 'Failed to generate horoscope.' })
    expect(captureException).toHaveBeenCalledTimes(1)
    expect(captureException).toHaveBeenCalledWith(
      bug,
      expect.objectContaining({ extra: { fallbackMessage: 'Failed to generate horoscope.' } }),
    )
  })

  it('does NOT report an ApiError to Sentry (it is a handled, expected outcome)', async () => {
    const res = toErrorResponse(new ApiError(429, 'Too many requests', 'RATE_LIMITED'), 'fallback')

    expect(res.status).toBe(429)
    await expect(res.json()).resolves.toEqual({ error: 'Too many requests', code: 'RATE_LIMITED' })
    expect(captureException).not.toHaveBeenCalled()
  })

  it('reports the AI_UPSTREAM_FAILED 502 path is an ApiError → NOT captured (deliberate, not a crash)', async () => {
    const res = toErrorResponse(
      new ApiError(502, 'Временно не успяваме да обработим заявката. Опитай отново след малко.', 'AI_UPSTREAM_FAILED'),
      'AI upstream failure',
    )
    expect(res.status).toBe(502)
    expect(captureException).not.toHaveBeenCalled()
  })
})
