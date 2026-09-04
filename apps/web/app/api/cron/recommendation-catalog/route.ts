import { runDevelopmentCatalogImport } from '@stellaeum/core/recommendations/import'
import { verifyCronSecret } from '@/lib/auth/cron-secret'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

/** Monthly, bounded candidate import. New records stay draft + review_required. */
export async function GET(request: Request) {
  if (!verifyCronSecret(request.headers.get('Authorization'), process.env.CRON_SECRET)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runDevelopmentCatalogImport({
      tmdbToken: process.env.TMDB_API_READ_TOKEN,
      tmdbPages: 1,
      openLibraryLimit: 50,
    })
    return Response.json(result)
  } catch (error) {
    console.error('[cron/recommendation-catalog] import failed', error)
    return Response.json({ error: 'Catalog import failed' }, { status: 500 })
  }
}

