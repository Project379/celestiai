import * as Sentry from '@sentry/nextjs'
import { runDevelopmentCatalogImport } from '@stellaeum/core/recommendations/import'
import { verifyCronSecret } from '@/lib/auth/cron-secret'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

/** Monthly, bounded candidate import. New records stay draft + review_required. */
export async function GET(request: Request) {
  // .trim(): a trailing newline in the pasted Vercel env var is invisible in
  // the dashboard and would fail verifyCronSecret's length check (SMOKE-TEST).
  if (!verifyCronSecret(request.headers.get('Authorization'), process.env.CRON_SECRET?.trim())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Probe mode (SMOKE-TEST): `?probe=1` confirms only that this route
  // authenticates and that its TMDB credential is configured — it does NOT
  // run the import (external TMDB / Open Library fetches + DB upserts, no
  // dry-run mode on runDevelopmentCatalogImport). This is a shallower
  // check than the other two crons' probes; the gap is tracked in
  // .planning/VERIFICATION-SURFACE-GAPS.md.
  if (new URL(request.url).searchParams.get('probe') === '1') {
    return Response.json({
      probe: true,
      tmdbTokenPresent: Boolean(process.env.TMDB_API_READ_TOKEN),
    })
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
    // CAUGHT-500S (historical) — see .planning/PLACEHOLDERS.md.
    Sentry.captureException(error, { extra: { context: 'GET /api/cron/recommendation-catalog' } })
    return Response.json({ error: 'Catalog import failed' }, { status: 500 })
  }
}

