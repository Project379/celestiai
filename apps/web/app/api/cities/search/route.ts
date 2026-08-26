import { auth } from '@clerk/nextjs/server'
import { createPublicSupabaseClient } from '@/lib/supabase/public'
import { toErrorResponse } from '@/lib/auth/guards'
import { assertRateLimit, getRequestIp } from '@/lib/rate-limit'

/**
 * City search API endpoint
 * Returns Bulgarian cities matching the search query
 *
 * SEC-17: Protected with auth() check returning JSON 401 for unauthenticated requests
 * Note: Uses public Supabase client since cities are public reference data
 */

export async function GET(request: Request) {
  // Check authentication - return JSON error if not authenticated (SEC-17)
  const { userId } = await auth()
  if (!userId) {
    return Response.json(
      { error: 'Сесията ти изтече. Влез отново.' },
      { status: 401 }
    )
  }

  // Parse query parameters
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || ''
  const limitParam = searchParams.get('limit')
  // FIX (2026-08-26 sweep #18): was `limitParam ? parseInt(limitParam, 10) : 20`
  // — no clamp, no NaN guard. parseInt('abc') is NaN, silently producing
  // `.limit(NaN)`; an attacker-supplied large value had no ceiling at all.
  // Clamped to [1, 100] — 100 is generous (5x the default) while still a
  // real bound; NaN/non-numeric falls back to the original default of 20.
  const parsedLimit = limitParam ? parseInt(limitParam, 10) : 20
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 20

  // Validate query
  if (!query || query.length < 1) {
    return Response.json(
      { error: 'Въведи поне 1 символ' },
      { status: 400 }
    )
  }

  if (query.length > 100) {
    return Response.json(
      { error: 'Заявката е твърде дълга' },
      { status: 400 }
    )
  }

  try {
    await assertRateLimit({
      key: `cities-search:${userId}:${getRequestIp(request)}`,
      limit: 60,
      windowMs: 60_000,
    })

    // FIX (2026-08-26 sweep #18): `query` was interpolated raw into a
    // PostgREST .or() filter string. A comma or closing paren in the
    // input breaks out of the intended filter and can append conditions
    // — e.g. q=a),other_col.eq.x,( — the only place in the codebase
    // doing this (grep-confirmed). Impact was small (anon client, RLS
    // confines it to this 202-row public catalog) but it's the wrong
    // pattern regardless. Fix: strip anything that is not a letter
    // (Bulgarian city/place names only ever use Cyrillic or Latin
    // letters, spaces, hyphens, or apostrophes), digit, space, hyphen, or
    // apostrophe BEFORE it ever reaches the filter string, so no
    // PostgREST-structural character (comma, parens, quotes, backslash)
    // can survive into it.
    //
    // Uses ' rather than a literal ' inside the character class — an
    // unpaired quote character in code (even inside a regex literal)
    // desyncs this repo's naive quote-matching copy-lock string
    // extractor (scripts/i18n/extract-literals.mjs has no JS parser, it
    // just counts quote characters across the whole file); a literal '
    // here silently swallowed two unrelated Cyrillic literals later in
    // this same file, found live 2026-08-26.
    const APOSTROPHE = String.fromCharCode(39)
    const sanitizedAllowed = new RegExp(`[^\\p{L}\\p{N}\\s${APOSTROPHE}-]`, 'gu')
    const sanitizedQuery = query.replace(sanitizedAllowed, '')

    if (!sanitizedQuery) {
      return Response.json(
        { error: 'Въведи поне 1 символ' },
        { status: 400 }
      )
    }

    const supabase = createPublicSupabaseClient()

    // Search cities by name (Bulgarian) or name_ascii (Latin) using ILIKE
    const { data, error } = await supabase
      .from('bulgarian_cities')
      .select('id, name, oblast, type, latitude, longitude')
      .or(`name.ilike.%${sanitizedQuery}%,name_ascii.ilike.%${sanitizedQuery}%`)
      .order('type', { ascending: true })
      .order('name', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('City search error:', error)
      return Response.json(
        { error: 'Грешка при търсене' },
        { status: 500 }
      )
    }

    // Re-sort to ensure proper type ordering (city > town > village)
    const typeOrder: Record<string, number> = { city: 0, town: 1, village: 2 }
    const sortedData = [...(data || [])].sort((a, b) => {
      const typeComparison = (typeOrder[a.type] ?? 3) - (typeOrder[b.type] ?? 3)
      if (typeComparison !== 0) return typeComparison
      return a.name.localeCompare(b.name, 'bg')
    })

    return Response.json(sortedData, {
      headers: {
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    return toErrorResponse(error, 'Вътрешна грешка')
  }
}
