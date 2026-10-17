import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockSupabase, type MockSupabase } from '../mocks/supabase'
import { DIARY_PAGE_SIZE } from '@stellaeum/core/diary/v2'

let supabase: MockSupabase
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => supabase) }))
import { listDiaryEntriesV2, summarizeDiaryWeek } from '@stellaeum/core/diary/entries-v2'

beforeEach(() => {
  vi.clearAllMocks()
  supabase = createMockSupabase()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_SECRET_KEY = 'test-service-key'
})

const rows = Array.from({ length: 25 }, (_, index) => ({
  id: `11111111-1111-4111-8111-${String(25 - index).padStart(12, '0')}`,
  user_id: 'user-1', kind: 'note', status: 'completed',
  occurred_at: '2026-10-12T12:00:00.000Z', entry_date: '2026-10-12', timezone: 'Europe/Sofia',
  title: `Note ${index}`, mood: null, topics: [], content: { version: 1, body: 'Reflection' },
  revision: 1, created_at: '2026-10-12T12:00:00.000Z', updated_at: '2026-10-12T12:00:00.000Z',
}))

describe('diary cursor pagination', () => {
  it('summarizes explicitly selected feelings without inferring feelings from older ratings', async () => {
    supabase.push('diary_entries', { data: [
      { mood: 2, topics: [], prompt_id: null, next_step: null, content: { feeling: 'anxious' } },
      { mood: 2, topics: [], prompt_id: null, next_step: null, content: {} },
    ] })
    const summary = await summarizeDiaryWeek('user-1', '2026-10-01', '2026-10-07')
    expect(summary.feelings).toEqual({ anxious: 1 })
    expect(summary.moods).toEqual({ '2': 2 })
    const builder = supabase.from.mock.results[0].value
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(builder.eq).toHaveBeenCalledWith('status', 'completed')
    expect(builder.gte).toHaveBeenCalledWith('entry_date', '2026-10-01')
    expect(builder.lte).toHaveBeenCalledWith('entry_date', '2026-10-07')
  })
  it('bounds pages and preserves the date/id boundary for entries sharing a timestamp', async () => {
    supabase.push('diary_entries', { data: rows.slice(0, DIARY_PAGE_SIZE + 1) })
    const first = await listDiaryEntriesV2('user-1', { limit: DIARY_PAGE_SIZE })
    expect(first.entries).toHaveLength(DIARY_PAGE_SIZE)
    expect(first.nextCursor).not.toBeNull()
    const boundary = rows[DIARY_PAGE_SIZE - 1]!
    expect(JSON.parse(Buffer.from(first.nextCursor!, 'base64url').toString())).toEqual({ occurredAt: boundary.occurred_at, id: boundary.id })
    const firstBuilder = supabase.from.mock.results[0].value
    expect(firstBuilder.limit).toHaveBeenCalledWith(DIARY_PAGE_SIZE + 1)
    expect(firstBuilder.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(firstBuilder.order).toHaveBeenCalledWith('id', { ascending: false })

    supabase.push('diary_entries', { data: rows.slice(DIARY_PAGE_SIZE) })
    const second = await listDiaryEntriesV2('user-1', { cursor: first.nextCursor!, limit: DIARY_PAGE_SIZE })
    expect(second.entries).toHaveLength(5)
    expect(second.nextCursor).toBeNull()
    const builder = supabase.from.mock.results[1].value
    expect(builder.or).toHaveBeenCalledWith(`occurred_at.lt.${boundary.occurred_at},and(occurred_at.eq.${boundary.occurred_at},id.lt.${boundary.id})`)
  })

  it('keeps search and date filters on subsequent pages', async () => {
    supabase.push('diary_entries', { data: [] })
    const cursor = Buffer.from(JSON.stringify({ occurredAt: rows[0]!.occurred_at, id: rows[0]!.id })).toString('base64url')
    await listDiaryEntriesV2('user-1', { limit: DIARY_PAGE_SIZE, cursor, query: 'clouds', from: '2026-10-01', to: '2026-10-12', kind: 'note' })
    const builder = supabase.from.mock.results[0].value
    expect(builder.or).toHaveBeenCalledWith('title.ilike."%clouds%",search_text.ilike."%clouds%"')
    expect(builder.gte).toHaveBeenCalledWith('entry_date', '2026-10-01')
    expect(builder.lte).toHaveBeenCalledWith('entry_date', '2026-10-12')
    expect(builder.eq).toHaveBeenCalledWith('kind', 'note')
  })
})
