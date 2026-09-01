import { describe, expect, it, vi, beforeEach } from 'vitest'
import { createMockSupabase, type MockSupabase } from '../mocks/supabase'

/**
 * Tier item 5 (2026-09-01): GET /api/crystals no longer 403s for the free
 * tier. `getCrystalsOverview` returns `{ ok: true, data: { locked: true,
 * catalog, collection: [], recommendations: [] } }` so the client can
 * render the catalog grid browse-only, while collect + chart-derived
 * recommendations stay premium.
 *
 * Pre-change, the free branch returned `{ ok: false, error:
 * 'PREMIUM_REQUIRED' }` before touching the catalog — so `result.ok` was
 * false and there was no `data.locked`. This test fails against that code.
 */

let mockSupabase: MockSupabase

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

import { getCrystalsOverview } from '@stellaeum/core/crystals/overview'

const CATALOG_ROW = {
  id: 'crystal-1',
  slug: 'amethyst',
  name_en: 'Amethyst',
  name_bg: 'Аметист',
  tagline_en: 't',
  tagline_bg: null,
  description_en: 'd',
  description_bg: null,
  planet: null,
  zodiac_signs: [],
  moon_phases: [],
  element: null,
  chakra: null,
  hardness: null,
  color_primary: '#a0f',
  color_secondary: '#70f',
  color_accent: null,
  svg_variant: 'raw',
  rarity: 'common',
  keywords: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSupabase = createMockSupabase()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
})

describe('getCrystalsOverview — free tier (tier item 5)', () => {
  it('returns ok:true with locked:true, the catalog, and no collection / recommendations', async () => {
    // 1. getSubscriptionTier → users row
    mockSupabase.push('users', { data: { subscription_tier: 'free' } })
    // 2. fetchCatalog → crystals rows
    mockSupabase.push('crystals', { data: [CATALOG_ROW] })

    const result = await getCrystalsOverview('user_free', 'chart_1')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.locked).toBe(true)
    expect(result.data.catalog).toHaveLength(1)
    expect(result.data.collection).toEqual([])
    expect(result.data.recommendations).toEqual([])
    expect(result.data.lunarPhase.id).toBeTruthy()
  })

  it('does not read the chart or write recommendations for a free user', async () => {
    mockSupabase.push('users', { data: { subscription_tier: 'free' } })
    mockSupabase.push('crystals', { data: [CATALOG_ROW] })

    await getCrystalsOverview('user_free', 'chart_1')

    const tablesTouched = mockSupabase.from.mock.calls.map((c) => c[0])
    expect(tablesTouched).not.toContain('charts')
    expect(tablesTouched).not.toContain('crystal_recommendations')
  })
})
