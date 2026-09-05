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
})

