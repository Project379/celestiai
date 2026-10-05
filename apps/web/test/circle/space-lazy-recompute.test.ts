import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockSupabase, type MockSupabase } from '../mocks/supabase'

/**
 * Lazy space recompute after a birth-data edit (Batch 8 "b"): a space's cached
 * compatibility/synastry/composite data is stale once any member chart's
 * birth_data_edited_at is newer than the cache's computed_at (falling back to
 * updated_at for rows from before that column). On next view the space is
 * recomputed via recomputeAndPersistSpace. The full recompute pipeline is not
 * re-tested here — the trigger is: "did the view enter the recompute path".
 */

vi.mock('@/lib/supabase/service', () => ({ createServiceSupabaseClient: vi.fn() }))
vi.mock('@/lib/circle/weather', () => ({ buildRelationshipWeatherOverview: vi.fn(() => null) }))

import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { buildCircleSpaceView } from '@/lib/circle/service'

let mockSupabase: MockSupabase

function space(over: Record<string, unknown> = {}) {
  return {
    id: 'space-1',
    label: null,
    created_by_user_id: 'u1',
    status: 'active',
    relationship_type: 'romantic',
    max_members: 2,
    member_count: 2,
    connection_date: '2026-01-01',
    anniversary_date: null,
    compatibility_summary: {},
    synastry_aspects: [],
    composite_chart_data: {},
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-06-01T00:00:00.000Z',
    computed_at: '2026-06-01T00:00:00.000Z',
    archived_at: null,
    ...over,
  } as never
}

function seedMembersAndMarkers(markers: string[]) {
  mockSupabase.push('connection_members', { data: markers.map((_, i) => ({ chart_id: `c${i}` })) })
  mockSupabase.push('charts', { data: markers.map((m) => ({ birth_data_edited_at: m })) })
}

const enteredRecompute = () => mockSupabase.from.mock.calls.some((c) => c[0] === 'connection_spaces')

beforeEach(() => {
  vi.clearAllMocks()
  mockSupabase = createMockSupabase()
  vi.mocked(createServiceSupabaseClient).mockReturnValue(mockSupabase as never)
})

describe('buildCircleSpaceView — lazy recompute after a member birth-data edit', () => {
  it('recomputes when a member chart was edited AFTER the space data was computed', async () => {
    seedMembersAndMarkers(['2026-01-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z'])

    await buildCircleSpaceView(space())

    expect(enteredRecompute()).toBe(true)
  })

  it('does NOT recompute when every member edit predates the cache (no spurious work after the migration backfill)', async () => {
    seedMembersAndMarkers(['2026-01-01T00:00:00.000Z', '2026-05-01T00:00:00.000Z'])

    await buildCircleSpaceView(space())

    expect(enteredRecompute()).toBe(false)
  })

  it('falls back to updated_at when computed_at is null (rows computed before the column existed)', async () => {
    seedMembersAndMarkers(['2026-01-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z'])

    await buildCircleSpaceView(space({ computed_at: null }))

    expect(enteredRecompute()).toBe(true)
  })

  it('treats an edit exactly at computed_at as fresh (strictly newer is stale)', async () => {
    seedMembersAndMarkers(['2026-06-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'])

    await buildCircleSpaceView(space())

    expect(enteredRecompute()).toBe(false)
  })

  it('a recompute that fails does not break the view — it returns the previous space', async () => {
    seedMembersAndMarkers(['2026-01-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z'])
    // connection_spaces queue is empty => getSpaceById returns null => recompute throws

    const view = await buildCircleSpaceView(space())

    expect(view.space.id).toBe('space-1')
  })

  it('skips the check entirely for a space with fewer than two members', async () => {
    await buildCircleSpaceView(space({ member_count: 1 }))

    expect(mockSupabase.from.mock.calls.some((c) => c[0] === 'charts')).toBe(false)
    expect(enteredRecompute()).toBe(false)
  })
})
