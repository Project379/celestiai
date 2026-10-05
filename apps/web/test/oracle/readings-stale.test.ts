import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockSupabase, type MockSupabase } from '../mocks/supabase'

/**
 * GET /api/oracle/readings must never serve a reading generated before the
 * chart's last birth-affecting edit (Batch 8 "b"): its degrees and houses are
 * the old chart's. That includes a free user's never-expiring lifetime reading
 * (expires_at 2999) — it is hidden, not deleted.
 */

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(async () => ({ userId: 'user_readings_stale' })),
}))
vi.mock('@/lib/supabase/service', () => ({ createServiceSupabaseClient: vi.fn() }))
vi.mock('@/lib/rate-limit', () => ({ assertRateLimit: vi.fn(async () => {}) }))

import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { GET } from '@/app/api/oracle/readings/route'

let mockSupabase: MockSupabase

const MARKER = '2026-09-10T00:00:00.000Z'

function row(topic: string, generatedAt: string, expiresAt = '2999-12-31T00:00:00.000Z') {
  return { topic, content: `${topic} content`, generated_at: generatedAt, expires_at: expiresAt, teaser_content: null }
}

function call() {
  return GET(new Request('http://localhost/api/oracle/readings?chartId=chart-1'))
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSupabase = createMockSupabase()
  vi.mocked(createServiceSupabaseClient).mockReturnValue(mockSupabase as never)
  mockSupabase.push('charts', {
    data: { id: 'chart-1', user_id: 'user_readings_stale', birth_data_edited_at: MARKER },
  })
})

describe('GET /api/oracle/readings — staleness', () => {
  it('hides readings generated before the chart marker, including a never-expiring lifetime reading', async () => {
    mockSupabase.push('ai_readings', {
      data: [row('general', '2026-09-01T00:00:00.000Z'), row('love', '2026-09-02T00:00:00.000Z')],
    })

    const res = await call()

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('still returns readings generated at or after the marker', async () => {
    mockSupabase.push('ai_readings', {
      data: [
        row('general', '2026-09-01T00:00:00.000Z'), // stale
        row('career', '2026-09-10T00:00:00.000Z'), // exactly at the marker: fresh
        row('health', '2026-09-11T00:00:00.000Z'), // after: fresh
      ],
    })

    const body = (await (await call()).json()) as Array<{ topic: string }>

    expect(body.map((r) => r.topic).sort()).toEqual(['career', 'health'])
  })

  it('a chart that was never edited (marker backfilled to created_at) serves its existing readings untouched', async () => {
    // Fresh mock with a marker far in the past, as the migration backfill produces.
    mockSupabase = createMockSupabase()
    vi.mocked(createServiceSupabaseClient).mockReturnValue(mockSupabase as never)
    mockSupabase.push('charts', {
      data: { id: 'chart-1', user_id: 'user_readings_stale', birth_data_edited_at: '2026-04-13T12:00:00.000Z' },
    })
    mockSupabase.push('ai_readings', { data: [row('general', '2026-08-01T00:00:00.000Z')] })

    const body = (await (await call()).json()) as unknown[]

    expect(body).toHaveLength(1)
  })
})
