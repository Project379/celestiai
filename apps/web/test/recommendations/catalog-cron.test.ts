import { beforeEach, describe, expect, it, vi } from 'vitest'

const { runDevelopmentCatalogImport } = vi.hoisted(() => ({
  runDevelopmentCatalogImport: vi.fn(async () => ({
    imports: [{ source: 'open-library-development', seen: 10, upserted: 10, rejected: 0 }],
  })),
}))

vi.mock('@stellaeum/core/recommendations/import', () => ({ runDevelopmentCatalogImport }))

import { GET } from '@/app/api/cron/recommendation-catalog/route'

function request(secret?: string) {
  return new Request('http://localhost/api/cron/recommendation-catalog', {
    headers: secret ? { Authorization: `Bearer ${secret}` } : {},
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.CRON_SECRET = 'catalog-secret'
  process.env.TMDB_API_READ_TOKEN = 'tmdb-token'
  // RECOMMENDATION-CONTENT-LICENSING (.planning/PLACEHOLDERS.md) — the
  // route now no-ops unless FF_MEDIA_RECOMMENDATIONS is on. Default it on
  // here since most of this suite predates the flag and tests the import
  // path itself; the flag-off behavior gets its own test below.
  process.env.FF_MEDIA_RECOMMENDATIONS = 'true'
})

describe('GET /api/cron/recommendation-catalog', () => {
  it('fails closed without the cron secret', async () => {
    const response = await GET(request())
    expect(response.status).toBe(401)
    expect(runDevelopmentCatalogImport).not.toHaveBeenCalled()
  })

  it('runs the bounded development import when authorized', async () => {
    const response = await GET(request('catalog-secret'))
    expect(response.status).toBe(200)
    expect(runDevelopmentCatalogImport).toHaveBeenCalledWith({
      tmdbToken: 'tmdb-token',
      tmdbPages: 1,
      openLibraryLimit: 50,
    })
  })

  it('skips the import without error when FF_MEDIA_RECOMMENDATIONS is off — defense in depth alongside removing the cron from vercel.json', async () => {
    process.env.FF_MEDIA_RECOMMENDATIONS = 'false'
    const response = await GET(request('catalog-secret'))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.skipped).toBe(true)
    expect(runDevelopmentCatalogImport).not.toHaveBeenCalled()
  })
})

