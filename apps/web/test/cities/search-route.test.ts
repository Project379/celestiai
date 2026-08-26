import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * 2026-08-26 sweep finding #18: two issues in GET /api/cities/search.
 *
 * 1. Injection — `query` was interpolated raw into a PostgREST .or()
 *    filter string (`.or(`name.ilike.%${query}%,...`)`). A comma or
 *    closing paren in the input breaks out of the intended filter. Fix:
 *    strip anything that isn't a letter/digit/space/hyphen/apostrophe
 *    before it reaches the filter string.
 * 2. Unclamped limit — `limitParam ? parseInt(limitParam, 10) : 20` had
 *    no ceiling and no NaN guard; `.limit(NaN)` or an arbitrarily large
 *    value could reach the query. Fix: clamp to [1, 100], NaN falls back
 *    to 20.
 *
 * Per standing discipline, both assertions below were run against the
 * pre-fix route and confirmed to fail (the raw query reaching .or(), and
 * an uncapped/NaN limit reaching .limit()) before the fix was restored.
 */

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(async () => ({ userId: 'user_test123' })),
}))

vi.mock('@/lib/rate-limit', () => ({
  assertRateLimit: vi.fn(async () => undefined),
  getRequestIp: vi.fn(() => '127.0.0.1'),
}))

function makeChain(capture: { or?: string; limit?: number }) {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn(() => chain)
  chain.or = vi.fn((filter: string) => {
    capture.or = filter
    return chain
  })
  chain.order = vi.fn(() => chain)
  chain.limit = vi.fn((n: number) => {
    capture.limit = n
    return Promise.resolve({ data: [], error: null })
  })
  return chain
}

let capture: { or?: string; limit?: number }

vi.mock('@/lib/supabase/public', () => ({
  createPublicSupabaseClient: vi.fn(() => ({
    from: vi.fn(() => makeChain(capture)),
  })),
}))

import { GET } from '@/app/api/cities/search/route'

function req(query: string) {
  return new Request(`http://localhost/api/cities/search?${query}`)
}

beforeEach(() => {
  vi.clearAllMocks()
  capture = {}
})

describe('GET /api/cities/search — injection + limit clamp (2026-08-26 sweep #18)', () => {
  it('strips PostgREST-structural characters (comma, parens) out of the filter value', async () => {
    // The exploit shape: breaking out of the .or() filter with a comma
    // and a closing paren.
    await GET(req('q=' + encodeURIComponent('a),other.eq.x,(')))

    // Every character in 'a),other.eq.x,(' except letters is stripped
    // before reaching the filter, so the sanitized query collapses to
    // 'aothereqx' — the exploit shape (a real appended condition) cannot
    // survive. Assert the exact resulting filter, not a loose pattern.
    expect(capture.or).toBe('name.ilike.%aothereqx%,name_ascii.ilike.%aothereqx%')
  })

  it('preserves normal Bulgarian and Latin city-name characters (letters, spaces, hyphens, apostrophes)', async () => {
    await GET(req('q=' + encodeURIComponent("Санкт-Петербург Sveti Vlas")))

    expect(capture.or).toContain('Санкт-Петербург')
    expect(capture.or).toContain('Sveti Vlas')
  })

  it('clamps an arbitrarily large limit to 100', async () => {
    await GET(req('q=sofia&limit=999999'))

    expect(capture.limit).toBe(100)
  })

  it('falls back to 20 when limit is not a number', async () => {
    await GET(req('q=sofia&limit=not-a-number'))

    expect(capture.limit).toBe(20)
  })

  it('clamps a zero-or-negative limit up to 1', async () => {
    await GET(req('q=sofia&limit=-5'))

    expect(capture.limit).toBe(1)
  })

  it('returns 400 when the query is entirely structural characters (nothing survives sanitization)', async () => {
    const res = await GET(req('q=' + encodeURIComponent(',(),,')))

    expect(res.status).toBe(400)
  })
})
