import type { SupabaseClient } from '@supabase/supabase-js'
import { createCoreSupabaseClient } from '../lib/supabase'

interface SourceRow {
  id: string
  code: string
}

interface LicenseRow {
  id: string
  code: string
}

interface ImportStats {
  source: string
  seen: number
  upserted: number
  rejected: number
}

export interface DevelopmentCatalogImportOptions {
  tmdbToken?: string | null
  tmdbPages?: number
  openLibraryLimit?: number
  fetchImpl?: typeof fetch
}

export interface DevelopmentCatalogImportResult {
  imports: ImportStats[]
}

function shortHash(value: unknown): string {
  const text = JSON.stringify(value)
  let hash = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function textIncludes(haystack: string, words: string[]): boolean {
  const normalized = haystack.toLowerCase()
  return words.some((word) => normalized.includes(word))
}

/**
 * Cheap first-pass annotation. It never approves safety: imported works stay
 * review_required until a human/moderation job verifies the content flags.
 */
export function inferRecommendationTraits(labels: string[]): Record<string, number | string> {
  const text = labels.join(' ').toLowerCase()
  return {
    wonder: textIncludes(text, ['fantasy', 'science fiction', 'space', 'magic']) ? 0.85 : 0.5,
    reflection: textIncludes(text, ['drama', 'philosophy', 'literary', 'biography']) ? 0.8 : 0.5,
    comfort: textIncludes(text, ['family', 'cozy', 'humor', 'comedy']) ? 0.85 : 0.45,
    connection: textIncludes(text, ['family', 'romance', 'friendship', 'community']) ? 0.85 : 0.5,
    courage: textIncludes(text, ['adventure', 'action', 'quest']) ? 0.85 : 0.5,
    renewal: textIncludes(text, ['coming of age', 'self-help', 'healing']) ? 0.8 : 0.5,
    curiosity: textIncludes(text, ['mystery', 'science', 'history', 'documentary']) ? 0.9 : 0.55,
    playfulness: textIncludes(text, ['comedy', 'humor', 'children']) ? 0.9 : 0.4,
    intensity: textIncludes(text, ['thriller', 'war', 'crime', 'horror']) ? 0.85 : 0.35,
    pace: textIncludes(text, ['action', 'adventure', 'thriller']) ? 0.85 : 0.5,
    annotation: 'heuristic_v1_pending_review',
  }
}

async function requireSource(supabase: SupabaseClient, code: string): Promise<SourceRow> {
  const { data, error } = await supabase
    .from('recommendation_sources')
    .select('id, code')
    .eq('code', code)
    .single()
  if (error || !data) throw error ?? new Error(`Missing recommendation source ${code}`)
  return data as SourceRow
}

async function requireLicense(supabase: SupabaseClient, code: string): Promise<LicenseRow> {
  const { data, error } = await supabase
    .from('recommendation_licenses')
    .select('id, code')
    .eq('code', code)
    .single()
  if (error || !data) throw error ?? new Error(`Missing recommendation license ${code}`)
  return data as LicenseRow
}

async function startRun(supabase: SupabaseClient, sourceId: string): Promise<string> {
  const { data, error } = await supabase
    .from('recommendation_import_runs')
    .insert({ source_id: sourceId, status: 'running' })
    .select('id')
    .single()
  if (error || !data) throw error ?? new Error('Could not start recommendation import')
  return String(data.id)
}

async function finishRun(
  supabase: SupabaseClient,
  runId: string,
  stats: Omit<ImportStats, 'source'>,
  errorMessage?: string,
): Promise<void> {
  const { error } = await supabase
    .from('recommendation_import_runs')
    .update({
      status: errorMessage ? 'failed' : 'completed',
      records_seen: stats.seen,
      records_upserted: stats.upserted,
      records_rejected: stats.rejected,
      error_message: errorMessage ?? null,
      finished_at: new Date().toISOString(),
    })
    .eq('id', runId)
  if (error) throw error
}

async function upsertRawRecord(options: {
  supabase: SupabaseClient
  sourceId: string
  runId: string
  externalId: string
  payload: Record<string, unknown>
}): Promise<string> {
  const { data, error } = await options.supabase
    .from('recommendation_source_records')
    .upsert(
      {
        source_id: options.sourceId,
        import_run_id: options.runId,
        source_external_id: options.externalId,
        raw_payload: options.payload,
        content_hash: shortHash(options.payload),
        fetched_at: new Date().toISOString(),
      },
      { onConflict: 'source_id,source_external_id' },
    )
    .select('id')
    .single()
  if (error || !data) throw error ?? new Error('Could not store source record')
  return String(data.id)
}

async function insertDraftWork(
  supabase: SupabaseClient,
  row: Record<string, unknown>,
): Promise<string> {
  const { data, error } = await supabase
    .from('recommendation_works')
    .insert(row)
    .select('id')
    .single()
  if (data) return String(data.id)
  if (error?.code !== '23505') throw error ?? new Error('Recommendation work insert failed')

  // A recurring import may refresh the raw provider record, but it must not
  // reset human-reviewed traits, safety flags, copy, or publication status.
  const { data: existing, error: existingError } = await supabase
    .from('recommendation_works')
    .select('id')
    .eq('source_id', row.source_id)
    .eq('source_external_id', row.source_external_id)
    .single()
  if (existingError || !existing) {
    throw existingError ?? new Error('Existing recommendation work not found')
  }
  const { error: touchError } = await supabase
    .from('recommendation_works')
    .update({ source_record_id: row.source_record_id, imported_at: row.imported_at })
    .eq('id', existing.id)
  if (touchError) throw touchError
  return String(existing.id)
}

async function replacePrimaryAsset(options: {
  supabase: SupabaseClient
  workId: string
  sourceId: string
  licenseId: string
  assetType: 'poster' | 'cover'
  url: string
  attribution: string
  providerMetadata: Record<string, unknown>
}): Promise<void> {
  const { error: clearError } = await options.supabase
    .from('recommendation_assets')
    .update({ is_primary: false })
    .eq('work_id', options.workId)
    .eq('asset_type', options.assetType)
  if (clearError) throw clearError

  const { error } = await options.supabase
    .from('recommendation_assets')
    .upsert(
      {
        work_id: options.workId,
        source_id: options.sourceId,
        license_id: options.licenseId,
        asset_type: options.assetType,
        remote_url: options.url,
        attribution_text: options.attribution,
        rights_scope: 'development',
        license_verified: false,
        is_primary: true,
        provider_metadata: options.providerMetadata,
      },
      { onConflict: 'work_id,remote_url' },
    )
  if (error) throw error
}

async function importTmdb(options: {
  supabase: SupabaseClient
  token: string
  pages: number
  fetchImpl: typeof fetch
}): Promise<ImportStats> {
  const source = await requireSource(options.supabase, 'tmdb-development')
  const license = await requireLicense(options.supabase, 'tmdb-api-development')
  const runId = await startRun(options.supabase, source.id)
  const stats = { source: source.code, seen: 0, upserted: 0, rejected: 0 }

  try {
    for (let page = 1; page <= options.pages; page += 1) {
      const discoverUrl = new URL('https://api.themoviedb.org/3/discover/movie')
      discoverUrl.searchParams.set('include_adult', 'false')
      discoverUrl.searchParams.set('include_video', 'false')
      discoverUrl.searchParams.set('language', 'en-US')
      discoverUrl.searchParams.set('sort_by', 'vote_count.desc')
      discoverUrl.searchParams.set('vote_count.gte', '500')
      discoverUrl.searchParams.set('page', String(page))
      const response = await options.fetchImpl(discoverUrl, {
        headers: { Authorization: `Bearer ${options.token}`, Accept: 'application/json' },
      })
      if (!response.ok) throw new Error(`TMDB discover failed (${response.status})`)
      const payload = asRecord(await response.json())
      const results = Array.isArray(payload?.results) ? payload.results : []

      for (const rawItem of results) {
        const item = asRecord(rawItem)
        const id = typeof item?.id === 'number' ? String(item.id) : null
        if (!item || !id || item.adult === true) {
          stats.rejected += 1
          continue
        }
        stats.seen += 1

        const detailsResponse = await options.fetchImpl(
          `https://api.themoviedb.org/3/movie/${id}?language=en-US`,
          { headers: { Authorization: `Bearer ${options.token}`, Accept: 'application/json' } },
        )
        if (!detailsResponse.ok) {
          stats.rejected += 1
          continue
        }
        const details = asRecord(await detailsResponse.json())
        if (!details || details.adult === true) {
          stats.rejected += 1
          continue
        }
        const title = typeof details.title === 'string' ? details.title : null
        const runtime = typeof details.runtime === 'number' && details.runtime > 0 ? details.runtime : null
        if (!title || !runtime) {
          stats.rejected += 1
          continue
        }
        const rawRecordId = await upsertRawRecord({
          supabase: options.supabase,
          sourceId: source.id,
          runId,
          externalId: id,
          payload: details,
        })
        const genres = Array.isArray(details.genres)
          ? details.genres.flatMap((genre) => {
              const record = asRecord(genre)
              return typeof record?.name === 'string' ? [record.name] : []
            })
          : []
        const releaseYear = typeof details.release_date === 'string'
          ? Number(details.release_date.slice(0, 4)) || null
          : null
        const workId = await insertDraftWork(options.supabase, {
              source_id: source.id,
              source_record_id: rawRecordId,
              source_external_id: id,
              source_url: `https://www.themoviedb.org/movie/${id}`,
              media_type: 'movie',
              canonical_title: title,
              original_title: typeof details.original_title === 'string' ? details.original_title : null,
              creator_display: 'Режисьорът предстои да бъде добавен',
              release_year: releaseYear,
              original_language: typeof details.original_language === 'string' ? details.original_language : null,
              description_en: typeof details.overview === 'string' ? details.overview : null,
              tagline_en: typeof details.tagline === 'string' ? details.tagline : null,
              duration_minutes: runtime,
              page_count: null,
              genres,
              traits: inferRecommendationTraits(genres),
              content_flags: {
                explicit_sexual: null,
                graphic_violence: null,
                gross_out: null,
                verified: false,
                providerAdultFlag: details.adult === true,
              },
              age_rating: null,
              safety_status: 'review_required',
              rights_scope: 'development',
              publication_status: 'draft',
              metadata_quality: 60,
              imported_at: new Date().toISOString(),
            })

        if (typeof details.poster_path === 'string') {
          await replacePrimaryAsset({
            supabase: options.supabase,
            workId,
            sourceId: source.id,
            licenseId: license.id,
            assetType: 'poster',
            url: `https://image.tmdb.org/t/p/w780${details.poster_path}`,
            attribution: 'Metadata and poster via TMDB.',
            providerMetadata: { tmdb_path: details.poster_path },
          })
        }
        stats.upserted += 1
      }
    }
    await finishRun(options.supabase, runId, stats)
    return stats
  } catch (error) {
    await finishRun(options.supabase, runId, stats, error instanceof Error ? error.message : String(error))
    throw error
  }
}

async function importOpenLibrary(options: {
  supabase: SupabaseClient
  limit: number
  fetchImpl: typeof fetch
}): Promise<ImportStats> {
  const source = await requireSource(options.supabase, 'open-library-development')
  const license = await requireLicense(options.supabase, 'open-library-cover-unverified')
  const runId = await startRun(options.supabase, source.id)
  const stats = { source: source.code, seen: 0, upserted: 0, rejected: 0 }

  try {
    const url = new URL('https://openlibrary.org/search.json')
    url.searchParams.set('q', 'subject:fiction')
    url.searchParams.set('sort', 'rating')
    url.searchParams.set('limit', String(options.limit))
    url.searchParams.set('fields', 'key,title,author_name,first_publish_year,cover_i,isbn,language,subject,number_of_pages_median')
    const response = await options.fetchImpl(url, {
      headers: { 'User-Agent': 'Stellaeum-development-catalog/1.0' },
    })
    if (!response.ok) throw new Error(`Open Library search failed (${response.status})`)
    const payload = asRecord(await response.json())
    const docs = Array.isArray(payload?.docs) ? payload.docs : []

    for (const rawDoc of docs) {
      const doc = asRecord(rawDoc)
      const key = typeof doc?.key === 'string' ? doc.key : null
      const title = typeof doc?.title === 'string' ? doc.title : null
      const author = asStringArray(doc?.author_name)[0]
      if (!doc || !key || !title || !author) {
        stats.rejected += 1
        continue
      }
      stats.seen += 1
      const rawRecordId = await upsertRawRecord({
        supabase: options.supabase,
        sourceId: source.id,
        runId,
        externalId: key,
        payload: doc,
      })
      const subjects = asStringArray(doc.subject).slice(0, 30)
      const pageCount = typeof doc.number_of_pages_median === 'number' && doc.number_of_pages_median > 0
        ? Math.round(doc.number_of_pages_median)
        : null
      const workId = await insertDraftWork(options.supabase, {
            source_id: source.id,
            source_record_id: rawRecordId,
            source_external_id: key,
            source_url: `https://openlibrary.org${key}`,
            media_type: 'book',
            canonical_title: title,
            original_title: title,
            creator_display: author,
            release_year: typeof doc.first_publish_year === 'number' ? doc.first_publish_year : null,
            original_language: asStringArray(doc.language)[0] ?? null,
            duration_minutes: null,
            page_count: pageCount,
            genres: subjects.slice(0, 10),
            traits: inferRecommendationTraits(subjects),
            content_flags: {
              explicit_sexual: null,
              graphic_violence: null,
              gross_out: null,
              verified: false,
            },
            safety_status: 'review_required',
            rights_scope: 'development',
            publication_status: 'draft',
            metadata_quality: pageCount ? 55 : 45,
            imported_at: new Date().toISOString(),
          })

      const coverId = typeof doc.cover_i === 'number' ? doc.cover_i : null
      if (coverId) {
        await replacePrimaryAsset({
          supabase: options.supabase,
          workId,
          sourceId: source.id,
          licenseId: license.id,
          assetType: 'cover',
          url: `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`,
          attribution: 'Cover delivered by Open Library.',
          providerMetadata: { openLibraryCoverId: coverId },
        })
      }
      stats.upserted += 1
    }
    await finishRun(options.supabase, runId, stats)
    return stats
  } catch (error) {
    await finishRun(options.supabase, runId, stats, error instanceof Error ? error.message : String(error))
    throw error
  }
}

export async function runDevelopmentCatalogImport(
  options: DevelopmentCatalogImportOptions = {},
): Promise<DevelopmentCatalogImportResult> {
  const mode = process.env.RECOMMENDATION_RIGHTS_MODE
    ?? (process.env.NODE_ENV === 'production' ? 'commercial' : 'development')
  if (mode === 'commercial') {
    throw new Error('Development providers cannot run while RECOMMENDATION_RIGHTS_MODE=commercial')
  }
  const supabase = createCoreSupabaseClient()
  const fetchImpl = options.fetchImpl ?? fetch
  const imports: ImportStats[] = []
  if (options.tmdbToken) {
    imports.push(await importTmdb({
      supabase,
      token: options.tmdbToken,
      pages: Math.max(1, Math.min(options.tmdbPages ?? 2, 10)),
      fetchImpl,
    }))
  }
  imports.push(await importOpenLibrary({
    supabase,
    limit: Math.max(10, Math.min(options.openLibraryLimit ?? 100, 500)),
    fetchImpl,
  }))
  return { imports }
}
