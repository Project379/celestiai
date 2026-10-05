import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * PATCH /api/birth-data/[id] — route-level behaviour (Batch 8 "b").
 *
 * The edit is applied to the EXISTING chart through updateBirthChart; tier is
 * NOT an input (the free once-ever regrant is spent at generation time, and a
 * premium edit never touches it), so the route must not look up the user's
 * tier or pass one down. A database failure is a 500 with ERR-BD-002 — it must
 * not masquerade as a 404 "not found".
 */

const authState = vi.hoisted(() => ({ userId: 'user_patch_test' as string | null }))
vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn(async () => ({ userId: authState.userId })) }))
vi.mock('@/lib/rate-limit', () => ({ assertRateLimit: vi.fn(async () => {}) }))
vi.mock('@/lib/audit', () => ({ logAuditEvent: vi.fn() }))
vi.mock('@/lib/monitoring/log-server-error', () => ({ logServerError: vi.fn() }))

const ensureUserRecord = vi.hoisted(() => vi.fn())
vi.mock('@/lib/users/ensure-user', () => ({ ensureUserRecord }))

const updateBirthChart = vi.hoisted(() => vi.fn())
vi.mock('@stellaeum/core/charts/birth-data', () => ({
  updateBirthChart,
  getBirthChart: vi.fn(),
  deleteBirthChart: vi.fn(),
}))

import { logAuditEvent } from '@/lib/audit'
import { logServerError } from '@/lib/monitoring/log-server-error'
import { PATCH } from '@/app/api/birth-data/[id]/route'

const CHART = { id: 'chart-1', name: 'Нов', birth_data_edited_at: '2026-10-01T10:00:00.000Z' }

function call(body: unknown) {
  return PATCH(
    new Request('http://localhost/api/birth-data/chart-1', { method: 'PATCH', body: JSON.stringify(body) }),
    { params: Promise.resolve({ id: 'chart-1' }) },
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  authState.userId = 'user_patch_test'
})

describe('PATCH /api/birth-data/[id]', () => {
  it('401 when unauthenticated — nothing is updated', async () => {
    authState.userId = null
    const res = await call({ name: 'Нов' })
    expect(res.status).toBe(401)
    expect(updateBirthChart).not.toHaveBeenCalled()
  })

  it('400 on an invalid body — nothing is updated', async () => {
    const res = await call({ latitude: 'not a number' })
    expect(res.status).toBe(400)
    expect(updateBirthChart).not.toHaveBeenCalled()
  })

  it('updates the existing chart with exactly (userId, chartId, validated data) — NO tier input, and the route never looks the tier up (free vs premium is decided at generation time)', async () => {
    updateBirthChart.mockResolvedValueOnce({
      ok: true,
      data: CHART,
      edit: { birthDataChanged: true, quotaExempt: true },
    })

    const res = await call({ name: 'Нов' })

    expect(res.status).toBe(200)
    expect(updateBirthChart).toHaveBeenCalledTimes(1)
    const args = updateBirthChart.mock.calls[0]
    expect(args).toHaveLength(3)
    expect(args[0]).toBe('user_patch_test')
    expect(args[1]).toBe('chart-1')
    expect(args[2]).toMatchObject({ name: 'Нов' })
    expect(ensureUserRecord).not.toHaveBeenCalled()
  })

  it('returns the updated chart row (it carries birth_data_edited_at for client cache invalidation) and audits the edit', async () => {
    updateBirthChart.mockResolvedValueOnce({
      ok: true,
      data: CHART,
      edit: { birthDataChanged: true, quotaExempt: false },
    })

    const res = await call({ name: 'Нов' })

    expect(await res.json()).toEqual(CHART)
    expect(logAuditEvent).toHaveBeenCalledWith('user_patch_test', 'account.birth_data_edit', { chartId: 'chart-1' })
  })

  it('404 when no chart matches (id, user_id)', async () => {
    updateBirthChart.mockResolvedValueOnce({ ok: false, error: 'NOT_FOUND' })
    const res = await call({ name: 'Нов' })
    expect(res.status).toBe(404)
  })

  it('a database failure is a 500 with ERR-BD-002 and is logged — it is NOT reported as a 404', async () => {
    updateBirthChart.mockResolvedValueOnce({ ok: false, error: 'UPDATE_FAILED', message: 'db down' })

    const res = await call({ name: 'Нов' })

    expect(res.status).toBe(500)
    expect((await res.json()).code).toBe('ERR-BD-002')
    expect(logServerError).toHaveBeenCalledWith('ERR-BD-002', expect.any(Error), expect.anything())
  })
})
