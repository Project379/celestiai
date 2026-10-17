import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockSupabase, type MockSupabase } from '../mocks/supabase'

let supabase: MockSupabase
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => supabase) }))
import { listDiaryEntriesV2 } from '@stellaeum/core/diary/entries-v2'

beforeEach(() => {
  vi.clearAllMocks()
  supabase = createMockSupabase()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_SECRET_KEY = 'test-service-key'
})

describe('diary search', () => {
  it('searches both title and content with case-insensitive substring matching', async () => {
    supabase.push('diary_entries', { data: [] })
    await listDiaryEntriesV2('user-1', { query: 'clouds', limit: 20 })
    const builder = supabase.from.mock.results[0].value
    expect(builder.or).toHaveBeenCalledWith('title.ilike."%clouds%",search_text.ilike."%clouds%"')
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'user-1')
  })

  it('treats wildcard characters and filter punctuation as literal search text', async () => {
    supabase.push('diary_entries', { data: [] })
    const search = '50%_clouds,(rain)'
    await listDiaryEntriesV2('user-1', { query: search, limit: 20 })
    const builder = supabase.from.mock.results[0].value
    const quoted = JSON.stringify('%50\\%\\_clouds,(rain)%')
    expect(builder.or).toHaveBeenCalledWith(`title.ilike.${quoted},search_text.ilike.${quoted}`)
  })
})
