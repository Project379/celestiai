import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockSupabase, type MockSupabase } from '../mocks/supabase'

/**
 * TIER-ITEM-4 / TIER-DEFINITION-2026-09-01 §11: free users get the daily
 * pick in full and the monthly arc as identity + tagline only — the server
 * must not put howItConnects / whyNow / whatItGives on the wire for a free
 * user, and must refuse a free-tier reroll of the locked monthly slot.
 *
 * Prove-red discipline: check out Petko's original service.ts —
 *   git show 24c83e7:packages/core/src/recommendations/service.ts > packages/core/src/recommendations/service.ts
 * — and re-run this file. Both tests below fail against it:
 *   - "free tier gets identity + tagline only" FAILS: pre-fix
 *     `explanationFromRow` always returns the full explanation regardless
 *     of tier, so `monthlyBook.explanation.howItConnects` is non-empty for
 *     a free user.
 *   - "free tier cannot reroll the monthly arc" FAILS: pre-fix
 *     `rerollRecommendation` has no tier check at all, so the reroll
 *     succeeds (ok: true) for a free user on the monthly slot.
 * Restore the fixed file afterward (git checkout it back to this branch's
 * version) before committing anything.
 */

let mockSupabase: MockSupabase

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockSupabase = createMockSupabase()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
})

const MOVIE_ROW = {
  id: 'work-movie-1',
  source_id: 'src-1',
  source_external_id: 'ext-1',
  source_url: null,
  media_type: 'movie',
  canonical_title: 'Test Movie',
  title_bg: 'Тестов филм',
  original_title: null,
  creator_display: 'Test Director',
  release_year: 2020,
  description_en: 'A test movie.',
  description_bg: null,
  tagline_en: 'A tagline.',
  tagline_bg: null,
  duration_minutes: 100,
  page_count: null,
  genres: ['drama'],
  traits: {},
  content_flags: { verified: true, explicit_sexual: 0, graphic_violence: 0, gross_out: 0 },
  metadata_quality: 90,
}

const MOVIE_ROW_2 = {
  ...MOVIE_ROW,
  id: 'work-movie-2',
  source_id: 'src-3',
  source_external_id: 'ext-3',
  canonical_title: 'Second Test Movie',
  title_bg: 'Втори тестов филм',
}

const BOOK_ROW = {
  id: 'work-book-1',
  source_id: 'src-2',
  source_external_id: 'ext-2',
  source_url: null,
  media_type: 'book',
  canonical_title: 'Test Book',
  title_bg: 'Тестова книга',
  original_title: null,
  creator_display: 'Test Author',
  release_year: 2019,
  description_en: 'A test book.',
  description_bg: null,
  tagline_en: 'A book tagline.',
  tagline_bg: null,
  duration_minutes: null,
  page_count: 200,
  genres: ['fiction'],
  traits: {},
  content_flags: { verified: true, explicit_sexual: 0, graphic_violence: 0, gross_out: 0 },
  metadata_quality: 90,
}

function deliveryRow(overrides: Record<string, unknown>) {
  return {
    id: 'delivery-1',
    user_id: 'user_free',
    chart_id: null,
    work_id: 'work-movie-1',
    slot: 'daily_movie',
    period_key: '2026-09-05',
    revision: 0,
    status: 'active',
    explanation: {
      howItConnects: 'Connects to your chart in a specific way.',
      whyNow: 'Because of the current lunar phase.',
      whatItGives: 'A feeling of renewal.',
    },
    score_detail: {},
    context_snapshot: {},
    created_at: '2026-09-05T00:00:00.000Z',
    ...overrides,
  }
}

/** Queues the full read sequence getRecommendationsOverview makes for one user. */
function queueOverviewReads(tier: 'free' | 'premium') {
  mockSupabase.push('charts', { data: null }) // resolveChart: no chart
  mockSupabase.push('users', { data: { subscription_tier: tier } }) // getSubscriptionTier
  mockSupabase.push('recommendation_works', { data: [MOVIE_ROW] }) // fetchCatalog(movie)
  mockSupabase.push('recommendation_works', { data: [BOOK_ROW] }) // fetchCatalog(book)
  mockSupabase.push('user_recommendation_work_states', { data: [] }) // fetchStates
  mockSupabase.push('recommendation_deliveries', { data: [] }) // fetchRecentDeliveryIds
  mockSupabase.push(
    'recommendation_deliveries',
    { data: deliveryRow({ slot: 'daily_movie', period_key: '2026-09-05', work_id: 'work-movie-1' }) },
  ) // fetchActiveDelivery(daily_movie) — existing
  mockSupabase.push(
    'recommendation_deliveries',
    { data: deliveryRow({ id: 'delivery-2', slot: 'monthly_book', period_key: '2026-09', work_id: 'work-book-1' }) },
  ) // fetchActiveDelivery(monthly_book) — existing
  mockSupabase.push('recommendation_assets', { data: [] }) // fetchAssets
}

describe('recommendations tier gating (tier item 4)', () => {
  it('free tier gets identity + tagline only for the monthly arc — daily pick stays full', async () => {
    queueOverviewReads('free')
    const { getRecommendationsOverview } = await import('@stellaeum/core/recommendations/service')

    const result = await getRecommendationsOverview('user_free', null, new Date('2026-09-05T12:00:00Z'))

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.data.dailyMovie?.locked).toBe(false)
    expect(result.data.dailyMovie?.explanation.howItConnects).not.toBe('')

    expect(result.data.monthlyBook?.locked).toBe(true)
    expect(result.data.monthlyBook?.explanation.howItConnects).toBe('')
    expect(result.data.monthlyBook?.explanation.whyNow).toBe('')
    expect(result.data.monthlyBook?.explanation.whatItGives).toBe('')
    // Identity + tagline survive the trim.
    expect(result.data.monthlyBook?.work.title).toBe('Тестова книга')
    expect(result.data.monthlyBook?.work.tagline).toBeTruthy()
  })

  it('premium tier gets the full monthly explanation', async () => {
    queueOverviewReads('premium')
    const { getRecommendationsOverview } = await import('@stellaeum/core/recommendations/service')

    const result = await getRecommendationsOverview('user_premium', null, new Date('2026-09-05T12:00:00Z'))

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.monthlyBook?.locked).toBe(false)
    expect(result.data.monthlyBook?.explanation.howItConnects).not.toBe('')
  })

  it('free tier cannot reroll the monthly arc — server refuses with PREMIUM_REQUIRED', async () => {
    mockSupabase.push(
      'recommendation_deliveries',
      { data: deliveryRow({ id: 'delivery-2', slot: 'monthly_book', period_key: '2026-09', work_id: 'work-book-1' }) },
    ) // reroll's current-delivery lookup
    mockSupabase.push('users', { data: { subscription_tier: 'free' } }) // getSubscriptionTier gate

    const { rerollRecommendation } = await import('@stellaeum/core/recommendations/service')
    const result = await rerollRecommendation('user_free', 'delivery-2', 'not_interested')

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toBe('PREMIUM_REQUIRED')
  })

  it('free tier can still reroll the daily pick', async () => {
    mockSupabase.push(
      'recommendation_deliveries',
      { data: deliveryRow({ id: 'delivery-1', slot: 'daily_movie', period_key: '2026-09-05', work_id: 'work-movie-1' }) },
    ) // reroll's current-delivery lookup — no tier check follows for daily_movie
    mockSupabase.push('charts', { data: null }) // resolveChart inside reroll
    mockSupabase.push('recommendation_works', { data: [MOVIE_ROW, MOVIE_ROW_2] }) // fetchCatalog(movie)
    mockSupabase.push('user_recommendation_work_states', { data: [] }) // fetchStates
    mockSupabase.push('recommendation_deliveries', { data: [] }) // fetchRecentDeliveryIds
    mockSupabase.pushRpc('reroll_media_recommendation', {
      data: deliveryRow({ id: 'delivery-1', slot: 'daily_movie', period_key: '2026-09-05', work_id: 'work-movie-1' }),
    })
    mockSupabase.push('recommendation_assets', { data: [] }) // fetchAssets for replacement

    const { rerollRecommendation } = await import('@stellaeum/core/recommendations/service')
    const result = await rerollRecommendation('user_free', 'delivery-1', 'not_interested')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.locked).toBe(false)
  })
})
