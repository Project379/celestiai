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

  it('throws (does not continue to the Clerk/users-row delete) when deleteUserDiaryEntries reports ok:false — 2026-08-26 sweep #7: this was the one delete in the cascade that DID signal failure, and it was previously logged-and-swallowed the same way the non-throwing .delete() calls were, destroying the retry anchor', async () => {
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

    // Pre-fix, this assertion would fail: deleted would be 1 and Clerk
    // would have been called despite the diary delete having failed.
    expect(body.deleted).toBe(0)
    expect(deleteClerkUser).not.toHaveBeenCalled()
  })

  it('throws (does not continue past it) when a non-throwing .delete() call returns a populated error field — the core defect: supabase-js .delete() failures do not throw on their own', async () => {
    let usersCallCount = 0
    let aiReadingsCallCount = 0
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'users') {
        usersCallCount++
        if (usersCallCount === 1) {
          const builder: Record<string, unknown> = {}
          for (const m of ['select', 'not', 'lte']) builder[m] = vi.fn(() => builder)
          builder.then = (onFulfilled: (v: unknown) => unknown) =>
            Promise.resolve({ data: [{ id: 'row-1', clerk_id: 'user_err' }], error: null }).then(onFulfilled)
          return builder
        }
      }
      if (table === 'ai_readings') {
        aiReadingsCallCount++
        if (aiReadingsCallCount === 1) {
          const builder: Record<string, unknown> = {}
          const methods = ['eq', 'delete']
          for (const m of methods) builder[m] = vi.fn(() => builder)
          builder.then = (onFulfilled: (v: unknown) => unknown) =>
            Promise.resolve({
              data: null,
              error: { message: 'permission denied for table ai_readings' },
            }).then(onFulfilled)
          return builder
        }
      }
      return genericBuilder()
    })

    const res = await GET(req('test-cron-secret'))
    const body = await res.json()

    // Pre-fix, this error field was never inspected — the loop would have
    // sailed past it to delete the Clerk account and the users row.
    expect(body.deleted).toBe(0)
    expect(deleteClerkUser).not.toHaveBeenCalled()
  })
})

describe('GET /api/cron/cleanup-deleted-accounts — Clerk-account-orphan fix (Batch 5.5 #4)', () => {
  // Distinguishes the SELECT-result 'users' call from the per-user DELETE
  // 'users' call, and instruments whether that DELETE was actually invoked
  // — the discriminating signal for this bug. Pre-fix, the users-row
  // DELETE ran unconditionally BEFORE the Clerk delete, so it fired even
  // when Clerk subsequently threw. Post-fix, it must only run once Clerk
  // has succeeded (or is confirmed already-gone via a 404).
  function mockUsersTable(clerkId: string, onDeleteCalled: () => void) {
    let usersCallCount = 0
    return (table: string) => {
      if (table !== 'users') return null
      usersCallCount++
      if (usersCallCount === 1) {
        const builder: Record<string, unknown> = {}
        for (const m of ['select', 'not', 'lte']) builder[m] = vi.fn(() => builder)
        builder.then = (onFulfilled: (v: unknown) => unknown) =>
          Promise.resolve({ data: [{ id: 'row-1', clerk_id: clerkId }], error: null }).then(
            onFulfilled,
          )
        return builder
      }
      const builder: Record<string, unknown> = {}
      builder.delete = vi.fn(() => {
        onDeleteCalled()
        return builder
      })
      builder.eq = vi.fn(() => builder)
      builder.then = (onFulfilled: (v: unknown) => unknown) =>
        Promise.resolve({ data: null, error: null }).then(onFulfilled)
      return builder
    }
  }

  function genericBuilder() {
    const builder: Record<string, unknown> = {}
    const methods = ['select', 'eq', 'delete', 'in', 'not', 'lte', 'lt']
    for (const m of methods) builder[m] = vi.fn(() => builder)
    builder.then = (onFulfilled: (v: unknown) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(onFulfilled)
    return builder
  }

  it('does NOT delete the users row when the Clerk account delete fails with a real error (not 404) — proving Clerk is now deleted before, not after, the Supabase row', async () => {
    let usersDeleteCalled = false
    const usersTable = mockUsersTable('user_clerk_fails', () => {
      usersDeleteCalled = true
    })
    mockSupabase.from.mockImplementation(
      (table: string) => usersTable(table) ?? genericBuilder(),
    )
    deleteClerkUser.mockRejectedValueOnce(
      Object.assign(new Error('Clerk API outage'), { status: 500 }),
    )

    const res = await GET(req('test-cron-secret'))
    const body = await res.json()

    expect(deleteClerkUser).toHaveBeenCalledWith('user_clerk_fails')
    // This is the assertion that fails against the pre-fix route: pre-fix,
    // the users-row DELETE ran before the Clerk call and unconditionally,
    // so it would have fired here too even though Clerk failed.
    expect(usersDeleteCalled).toBe(false)
    expect(body.deleted).toBe(0)
  })

  it('treats a Clerk 404 (already deleted by a prior run) as success and still deletes the users row — closes the retry loop for the narrow residual window', async () => {
    let usersDeleteCalled = false
    const usersTable = mockUsersTable('user_already_gone', () => {
      usersDeleteCalled = true
    })
    mockSupabase.from.mockImplementation(
      (table: string) => usersTable(table) ?? genericBuilder(),
    )
    deleteClerkUser.mockRejectedValueOnce(
      Object.assign(new Error('Not Found'), { status: 404 }),
    )

    const res = await GET(req('test-cron-secret'))
    const body = await res.json()

    expect(usersDeleteCalled).toBe(true)
    expect(body.deleted).toBe(1)
  })
})

describe('GET /api/cron/cleanup-deleted-accounts — user_crystals / user_daily_crystals (2026-08-26 sweep #6)', () => {
  it('deletes both crystals tables for the user, scoped by user_id', async () => {
    let usersCallCount = 0
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'users') {
        usersCallCount++
        if (usersCallCount === 1) {
          const builder: Record<string, unknown> = {}
          for (const m of ['select', 'not', 'lte']) builder[m] = vi.fn(() => builder)
          builder.then = (onFulfilled: (v: unknown) => unknown) =>
            Promise.resolve({ data: [{ id: 'row-1', clerk_id: 'user_crystals_test' }], error: null }).then(
              onFulfilled,
            )
          return builder
        }
      }
      const builder: Record<string, unknown> = {}
      const methods = ['select', 'eq', 'delete', 'in', 'not', 'lte', 'lt']
      for (const m of methods) builder[m] = vi.fn(() => builder)
      builder.then = (onFulfilled: (v: unknown) => unknown) =>
        Promise.resolve({ data: [], error: null }).then(onFulfilled)
      return builder
    })

    const res = await GET(req('test-cron-secret'))
    const body = await res.json()

    expect(body.deleted).toBe(1)
    // Pre-fix, this call never existed — the assertion that fails against
    // the pre-fix route.
    const crystalsCall = mockSupabase.from.mock.calls.find((c) => c[0] === 'user_crystals')
    const dailyCrystalsCall = mockSupabase.from.mock.calls.find((c) => c[0] === 'user_daily_crystals')
    expect(crystalsCall).toBeTruthy()
    expect(dailyCrystalsCall).toBeTruthy()

    const crystalsCallIndex = mockSupabase.from.mock.calls.findIndex((c) => c[0] === 'user_crystals')
    const dailyCallIndex = mockSupabase.from.mock.calls.findIndex((c) => c[0] === 'user_daily_crystals')
    expect(mockSupabase.from.mock.results[crystalsCallIndex].value.eq).toHaveBeenCalledWith(
      'user_id',
      'user_crystals_test',
    )
    expect(mockSupabase.from.mock.results[dailyCallIndex].value.eq).toHaveBeenCalledWith(
      'user_id',
      'user_crystals_test',
    )
  })
})
