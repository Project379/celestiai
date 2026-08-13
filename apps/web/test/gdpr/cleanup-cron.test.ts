import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockSupabase, type MockSupabase } from '../mocks/supabase'

/**
 * Tests /api/cron/cleanup-deleted-accounts — the GDPR hard-delete cascade.
 * NOT an exhaustive per-table cascade test (that's ~15 delete calls in one
 * function; asserting each would encode "the code does what the code does"
 * rather than verify a real property). Focused on the properties that are
 * easy to get wrong and matter most for a destructive batch job: the auth
 * gate, the empty-result short-circuit, and — the one this file actually
 * exists to check — that one user's deletion failure does not abort the
 * rest of the batch.
 */

vi.mock('@/lib/supabase/service', () => ({
  createServiceSupabaseClient: vi.fn(),
}))

const { deleteUserDiaryEntries } = vi.hoisted(() => ({
  deleteUserDiaryEntries: vi.fn(
    async (): Promise<{ ok: true } | { ok: false; error: string; message: string }> => ({ ok: true }),
  ),
}))

vi.mock('@stellaeum/core/diary/entries', () => ({
  deleteUserDiaryEntries,
}))

const { deleteClerkUser } = vi.hoisted(() => ({
  deleteClerkUser: vi.fn(async () => undefined),
}))

vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: vi.fn(async () => ({
    users: { deleteUser: deleteClerkUser },
  })),
}))

import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { GET } from '@/app/api/cron/cleanup-deleted-accounts/route'

let mockSupabase: MockSupabase

function req(secret: string | null) {
  return new Request('http://localhost/api/cron/cleanup-deleted-accounts', {
    headers: secret ? { Authorization: `Bearer ${secret}` } : {},
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSupabase = createMockSupabase()
  vi.mocked(createServiceSupabaseClient).mockReturnValue(mockSupabase as never)
  process.env.CRON_SECRET = 'test-cron-secret'
})

describe('GET /api/cron/cleanup-deleted-accounts — auth gate', () => {
  it('returns 401 with no Authorization header', async () => {
    const res = await GET(req(null))
    expect(res.status).toBe(401)
  })

  it('returns 401 with the wrong secret', async () => {
    const res = await GET(req('wrong-secret'))
    expect(res.status).toBe(401)
  })

  it('returns 401 when CRON_SECRET is unset server-side, even if the request happens to send "Bearer undefined" — this is the fail-closed behavior a misconfigured env var needs', async () => {
    delete process.env.CRON_SECRET
    const res = await GET(req('undefined'))
    expect(res.status).toBe(401)
  })
})

describe('GET /api/cron/cleanup-deleted-accounts — empty result', () => {
  it('returns deleted:0 and does not touch any per-user delete tables when no accounts are past grace period', async () => {
    mockSupabase.push('users', { data: [] })
    mockSupabase.push('rate_limit_buckets', { data: null, error: null, count: 0 })

    const res = await GET(req('test-cron-secret'))
    const body = await res.json()

    expect(body).toEqual({ deleted: 0 })
    expect(deleteClerkUser).not.toHaveBeenCalled()
  })
})

describe('GET /api/cron/cleanup-deleted-accounts — batch continues past a single failure', () => {
  function genericBuilder() {
    const builder: Record<string, unknown> = {}
    const methods = ['select', 'eq', 'delete', 'in', 'not', 'lte', 'lt']
    for (const m of methods) builder[m] = vi.fn(() => builder)
    builder.then = (onFulfilled: (v: unknown) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(onFulfilled)
    return builder
  }

  it('deletes the second user even when the first user\'s cascade throws partway through', async () => {
    // First 'users' call is the top-level SELECT (find accounts past grace
    // period); every subsequent 'users' call is a per-user DELETE at the
    // end of a successful cascade — they must be distinguished, not treated
    // as the same queued result.
    let usersCallCount = 0
    let chartsCallCount = 0
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'users') {
        usersCallCount++
        if (usersCallCount === 1) {
          const builder: Record<string, unknown> = {}
          for (const m of ['select', 'not', 'lte']) builder[m] = vi.fn(() => builder)
          builder.then = (onFulfilled: (v: unknown) => unknown) =>
            Promise.resolve({
              data: [
                { id: 'row-1', clerk_id: 'user_fails' },
                { id: 'row-2', clerk_id: 'user_succeeds' },
              ],
              error: null,
            }).then(onFulfilled)
          return builder
        }
        return genericBuilder()
      }
      if (table === 'charts') {
        chartsCallCount++
        // First 'charts' call belongs to user_fails' cascade — throw there.
        if (chartsCallCount === 1) {
          return {
            select: () => ({
              eq: () => {
                throw new Error('db connection lost mid-cascade')
              },
            }),
          }
        }
      }
      return genericBuilder()
    })

    const res = await GET(req('test-cron-secret'))
    const body = await res.json()

    // Only user_succeeds counts — user_fails' cascade threw before
    // reaching the Clerk delete or the final `deleted++`.
    expect(body.deleted).toBe(1)
    expect(deleteClerkUser).toHaveBeenCalledTimes(1)
    expect(deleteClerkUser).toHaveBeenCalledWith('user_succeeds')
    expect(deleteClerkUser).not.toHaveBeenCalledWith('user_fails')
  })

  it('logs (does not throw/abort) when deleteUserDiaryEntries reports ok:false, and still deletes the Clerk account for that user', async () => {
    let usersCallCount = 0
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'users') {
        usersCallCount++
        if (usersCallCount === 1) {
          const builder: Record<string, unknown> = {}
          for (const m of ['select', 'not', 'lte']) builder[m] = vi.fn(() => builder)
          builder.then = (onFulfilled: (v: unknown) => unknown) =>
            Promise.resolve({ data: [{ id: 'row-1', clerk_id: 'user_1' }], error: null }).then(onFulfilled)
          return builder
        }
      }
      return genericBuilder()
    })
    deleteUserDiaryEntries.mockResolvedValueOnce({ ok: false, error: 'DELETE_FAILED', message: 'fk violation' })

    const res = await GET(req('test-cron-secret'))
    const body = await res.json()

    expect(body.deleted).toBe(1)
    expect(deleteClerkUser).toHaveBeenCalledWith('user_1')
  })
})
