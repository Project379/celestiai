import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createCoreSupabaseClient } from '../../src/lib/supabase'
import { runDevelopmentCatalogImport } from '../../src/recommendations/import'
import { mockSupabase } from '../helpers/supabase'

vi.mock('../../src/lib/supabase', () => ({ createCoreSupabaseClient: vi.fn() }))
beforeEach(() => { vi.stubEnv('NODE_ENV', 'test'); vi.stubEnv('RECOMMENDATION_RIGHTS_MODE', undefined); vi.clearAllMocks() })
afterEach(() => vi.unstubAllEnvs())
function setup(duplicate = false, failWrite = false) {
  const db = mockSupabase(q => {
    if (q.table === 'recommendation_works' && q.operation === 'insert') {
      if (failWrite) return { error: new Error('write failed') }
      if (duplicate) return { error: { code: '23505' } }
    }
    return { data: { id: q.table, code: q.filters.code } }
  })
  vi.mocked(createCoreSupabaseClient).mockReturnValue(db as unknown as ReturnType<typeof createCoreSupabaseClient>)
  return db
}
const book = { key: '/works/1', title: 'Book', author_name: ['Author'], cover_i: 42, number_of_pages_median: 123 }

describe('development import', () => {
  it.each(['commercial', undefined])('blocks production mode=%s before any network or writes', async mode => {
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('RECOMMENDATION_RIGHTS_MODE', mode)
    const fetchImpl = vi.fn<typeof fetch>()
    await expect(runDevelopmentCatalogImport({ fetchImpl })).rejects.toThrow('Development providers cannot run')
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(createCoreSupabaseClient).not.toHaveBeenCalled()
  })
  it('imports books without a TMDB token and keeps works and covers unapproved', async () => {
    const db = setup()
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ docs: [book, { title: 'Missing author' }] }))
    const result = await runDevelopmentCatalogImport({ fetchImpl, openLibraryLimit: 1 })
    expect(result.imports).toEqual([{ source: 'open-library-development', seen: 1, upserted: 1, rejected: 1 }])
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(String(fetchImpl.mock.calls[0]![0])).toContain('limit=10')
    expect(db.queries.find(q => q.table === 'recommendation_works' && q.operation === 'insert')?.values).toMatchObject({
      publication_status: 'draft', safety_status: 'review_required', rights_scope: 'development', content_flags: { verified: false },
    })
    expect(db.queries.find(q => q.table === 'recommendation_assets' && q.operation === 'upsert')?.values).toMatchObject({
      license_verified: false, rights_scope: 'development',
    })
  })
  it('preserves editorial fields on a duplicate work', async () => {
    const db = setup(true)
    await runDevelopmentCatalogImport({ fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(Response.json({ docs: [book] })) })
    const update = db.queries.find(q => q.table === 'recommendation_works' && q.operation === 'update')
    expect(Object.keys(update!.values!).sort()).toEqual(['imported_at', 'source_record_id'])
  })
  it('passes the TMDB bearer token and rejects incomplete movie details', async () => {
    const db = setup()
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ results: [{ id: 1 }, { id: 2 }, { id: 3, adult: true }] }))
      .mockResolvedValueOnce(Response.json({ title: 'Movie', runtime: 90, poster_path: '/p.jpg' }))
      .mockResolvedValueOnce(Response.json({ title: 'No runtime' }))
      .mockResolvedValueOnce(Response.json({ docs: [] }))
    const result = await runDevelopmentCatalogImport({ tmdbToken: 'test-token', tmdbPages: 1, fetchImpl })
    expect(fetchImpl.mock.calls[0]![1]?.headers).toMatchObject({ Authorization: 'Bearer test-token' })
    expect(result.imports[0]).toMatchObject({ seen: 2, upserted: 1, rejected: 2 })
    expect(db.queries.filter(q => q.table === 'recommendation_works' && q.operation === 'insert')).toHaveLength(1)
  })
  it.each([401, 500])('records and propagates provider HTTP %s failures', async status => {
    const db = setup()
    await expect(runDevelopmentCatalogImport({ fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status })) })).rejects.toThrow(`(${status})`)
    expect(db.queries.find(q => q.table === 'recommendation_import_runs' && q.operation === 'update')?.values).toMatchObject({ status: 'failed' })
  })
  it('records and propagates database write failures', async () => {
    const db = setup(false, true)
    await expect(runDevelopmentCatalogImport({ fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(Response.json({ docs: [book] })) })).rejects.toThrow('write failed')
    expect(db.queries.find(q => q.table === 'recommendation_import_runs' && q.operation === 'update')?.values).toMatchObject({ status: 'failed', error_message: 'write failed' })
  })
})
