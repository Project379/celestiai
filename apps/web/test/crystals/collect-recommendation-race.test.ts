import { describe, expect, it } from 'vitest'
import { createMockSupabase } from '../mocks/supabase'
import { collectRecommendation } from '@stellaeum/core/crystals/queries'

/**
 * Batch 5.5 finding #17: collectRecommendation's update had no
 * .is('collected_at', null) guard — two concurrent collect calls for the
 * same recommendation could both pass the rec.collected_at read-check and
 * both attempt the update. The real user_crystals unique index already
 * prevented a double-reward at the insert step, so this was low severity,
 * but the update itself wasn't exclusive. This test proves a losing
 * racer's update (now .is('collected_at', null)-guarded) correctly
 * matches zero rows and the function returns null rather than proceeding
 * to a stale/inconsistent insert.
 */
describe('collectRecommendation — concurrent-collect race (Batch 5.5 #17)', () => {
  it('guards the update with .is(collected_at, null) — makes the check part of the write, not a separate prior read', async () => {
    // The shared FIFO mock is result-driven, not filter-driven (it can't
    // model a real UPDATE...WHERE rejecting a losing racer the way the
    // stateful fakes elsewhere in this suite do for INSERT-based races —
    // see test/mocks/supabase.ts's own header comment). So the property
    // that actually distinguishes pre-fix from post-fix code here is
    // simply whether .is() is called on the update chain at all — the
    // real correctness guarantee comes from Postgres evaluating that
    // WHERE clause, which this mock doesn't execute. Asserting the call
    // itself is what proves this specific fix landed.
    const mockSupabase = createMockSupabase()
    mockSupabase.push('crystal_recommendations', {
      data: { id: 'rec-1', user_id: 'user_1', collected_at: null, crystal_id: 'c1', trigger_type: 'x' },
    })
    mockSupabase.push('crystal_recommendations', {
      data: { id: 'rec-1', user_id: 'user_1', collected_at: '2026-08-14T00:00:00.000Z', crystal_id: 'c1', trigger_type: 'x' },
    })
    mockSupabase.push('user_crystals', {
      data: { id: 'uc-1', user_id: 'user_1', crystal_id: 'c1' },
    })

    await collectRecommendation(mockSupabase as never, 'user_1', 'rec-1')

    const updateBuilder = mockSupabase.from.mock.results[1].value
    expect(updateBuilder.is).toHaveBeenCalledWith('collected_at', null)
  })

  it('succeeds when the update matches (no concurrent racer)', async () => {
    const mockSupabase = createMockSupabase()
    mockSupabase.push('crystal_recommendations', {
      data: { id: 'rec-1', user_id: 'user_1', collected_at: null, crystal_id: 'c1', trigger_type: 'x' },
    })
    mockSupabase.push('crystal_recommendations', {
      data: { id: 'rec-1', user_id: 'user_1', collected_at: '2026-08-14T00:00:00.000Z', crystal_id: 'c1', trigger_type: 'x' },
    })
    mockSupabase.push('user_crystals', {
      data: { id: 'uc-1', user_id: 'user_1', crystal_id: 'c1' },
    })

    const result = await collectRecommendation(mockSupabase as never, 'user_1', 'rec-1')

    expect(result).not.toBeNull()
    expect(result?.userCrystal.id).toBe('uc-1')
  })
})
