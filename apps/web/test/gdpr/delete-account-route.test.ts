import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockSupabase, type MockSupabase } from '../mocks/supabase'
import { makeAppUser } from '../mocks/fixtures'

/**
 * Route-level tests for /api/gdpr/delete-account — POST (request deletion),
 * DELETE (cancel pending deletion). Tests the actual grace-period/
 * already-pending gating, not an assumed shape of "GDPR delete."
 *
 * assertRateLimit is mocked to a real pass-through here (not throwing) —
 * routes-surface-429.test.ts already covers the rate-limited path for this
 * route; this file covers the business logic behind it.
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
let currentUser: ReturnType<typeof makeAppUser>

vi.mock('@/lib/users/ensure-user', () => ({
  ensureUserRecord: vi.fn(async () => currentUser),
  isDeletionPending: vi.fn((user: ReturnType<typeof makeAppUser>) => Boolean(user.deleted_at || user.deletion_scheduled_at)),
}))

import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { logAuditEvent } from '@/lib/audit'
import { GET, POST, DELETE } from '@/app/api/gdpr/delete-account/route'

beforeEach(() => {
  vi.clearAllMocks()
  mockSupabase = createMockSupabase()
  vi.mocked(createServiceSupabaseClient).mockReturnValue(mockSupabase as never)
  currentUser = makeAppUser()
})

describe('GET /api/gdpr/delete-account', () => {
  it('returns the current deletionScheduledAt from the app-user row', async () => {
    currentUser = makeAppUser({ deletion_scheduled_at: '2026-09-01T00:00:00.000Z' })

    const res = await GET()
    const body = await res.json()

    expect(body.deletionScheduledAt).toBe('2026-09-01T00:00:00.000Z')
  })
})

describe('POST /api/gdpr/delete-account', () => {
  it('rejects with 409 DELETION_ALREADY_PENDING when a deletion is already scheduled — does not reset the clock or double-write', async () => {
    currentUser = makeAppUser({ deletion_scheduled_at: '2026-09-01T00:00:00.000Z' })

    const res = await POST()

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.code).toBe('DELETION_ALREADY_PENDING')
    // No users.update call should have happened — the pending check must
    // gate BEFORE any write, not just before the response.
    const updateCalls = mockSupabase.from.mock.results
      .map((r) => r.value)
      .filter((builder) => builder.update?.mock.calls.length > 0)
    expect(updateCalls.length).toBe(0)
  })

  it('schedules deletion exactly 30 days out and sets deleted_at to now, for a user with no pending deletion', async () => {
    currentUser = makeAppUser({ deletion_scheduled_at: null, deleted_at: null })
    // A truthy row here means the conditional UPDATE (.is('deletion_scheduled_at', null))
    // actually matched a row — Batch 5.5 #21's race-loss guard treats a
    // null/no-row result as "someone else already claimed it," so success
    // tests need a real row, not just error:null.
    mockSupabase.push('users', { data: { id: 'user-row-1' }, error: null })

    const before = Date.now()
    const res = await POST()
    const body = await res.json()
    const after = Date.now()

    expect(res.status).toBe(200)
    const scheduled = new Date(body.scheduledDeletion).getTime()
    const expectedMin = before + 30 * 24 * 60 * 60 * 1000
    const expectedMax = after + 30 * 24 * 60 * 60 * 1000
    expect(scheduled).toBeGreaterThanOrEqual(expectedMin)
    expect(scheduled).toBeLessThanOrEqual(expectedMax)
  })

  it('logs the account.deletion_request audit event on success', async () => {
    currentUser = makeAppUser({ deletion_scheduled_at: null, deleted_at: null })
    // A truthy row here means the conditional UPDATE (.is('deletion_scheduled_at', null))
    // actually matched a row — Batch 5.5 #21's race-loss guard treats a
    // null/no-row result as "someone else already claimed it," so success
    // tests need a real row, not just error:null.
    mockSupabase.push('users', { data: { id: 'user-row-1' }, error: null })

    await POST()

    expect(logAuditEvent).toHaveBeenCalledWith(
      'user_test123',
      'account.deletion_request',
      expect.objectContaining({ scheduledDeletion: expect.any(String) }),
    )
  })

  it('rejects with 409 when the conditional UPDATE matches zero rows — a concurrent request already claimed it (Batch 5.5 #21)', async () => {
    currentUser = makeAppUser({ deletion_scheduled_at: null, deleted_at: null })
    // Pre-fix, the isDeletionPending() read above and this write were not
    // atomic — a losing racer's plain UPDATE still succeeded (error:null,
    // no row-matched signal to check), so the route returned 200 and
    // double-logged the audit event. Post-fix, .is('deletion_scheduled_at',
    // null) makes the check part of the write: a losing racer matches zero
    // rows, surfaced here as data:null.
    mockSupabase.push('users', { data: null, error: null })

    const res = await POST()

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.code).toBe('DELETION_ALREADY_PENDING')
    expect(logAuditEvent).not.toHaveBeenCalled()
  })

  it('returns 500 (not a silent 200) when the Supabase update fails', async () => {
    currentUser = makeAppUser({ deletion_scheduled_at: null, deleted_at: null })
    mockSupabase.push('users', { data: null, error: { message: 'db error' } })

    const res = await POST()

    expect(res.status).toBe(500)
    expect(logAuditEvent).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/gdpr/delete-account (cancel)', () => {
  it('clears deleted_at and deletion_scheduled_at and logs account.deletion_confirm/cancelled', async () => {
    mockSupabase.push('users', { data: null, error: null })

    const res = await DELETE()

    expect(res.status).toBe(200)
    expect(logAuditEvent).toHaveBeenCalledWith(
      'user_test123',
      'account.deletion_confirm',
      expect.objectContaining({ action: 'cancelled' }),
    )
    const usersBuilder = mockSupabase.from.mock.results[0].value
    expect(usersBuilder.update).toHaveBeenCalledWith({ deleted_at: null, deletion_scheduled_at: null })
  })

  it('does NOT check isDeletionPending before cancelling — cancel is idempotent by design, not gated on there being a pending row (matches the route source, which has no such check)', async () => {
    mockSupabase.push('users', { data: null, error: null })

    const res = await DELETE()

    expect(res.status).toBe(200)
  })

  it('returns 500 when the Supabase update fails', async () => {
    mockSupabase.push('users', { data: null, error: { message: 'db error' } })

    const res = await DELETE()

    expect(res.status).toBe(500)
  })
})
