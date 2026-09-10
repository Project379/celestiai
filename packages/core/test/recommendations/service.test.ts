import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createCoreSupabaseClient } from '../../src/lib/supabase'
import { getSubscriptionTier } from '../../src/subscription/tier'
import { getRecommendationsOverview, recommendationPeriodKey } from '../../src/recommendations/service'
import { mockSupabase } from '../helpers/supabase'

vi.mock('../../src/lib/supabase', () => ({ createCoreSupabaseClient: vi.fn() }))
vi.mock('../../src/subscription/tier', () => ({ getSubscriptionTier: vi.fn() }))

const now = new Date('2026-08-31T21:00:00Z')
const secret = { howItConnects: 'private connection', whyNow: 'private timing', whatItGives: 'private benefit' }
function setup(options: { existing?: boolean; empty?: boolean; error?: boolean; onlyMovie?: boolean } = {}) {
  const db = mockSupabase((q) => {
    if (q.table === 'charts') return { data: { id: 'chart', birth_date: '1990-04-10' } }
    if (q.table === 'recommendation_works') {
      if (options.error) return { error: new Error('database unavailable') }
      const type = q.filters.media_type
      return { data: options.empty || (options.onlyMovie && type === 'book') ? [] : [{
        id: type, media_type: type, canonical_title: `A ${type}`, creator_display: 'Author',
        genres: [], traits: {}, metadata_quality: 90, tagline_en: 'Public tagline',
        content_flags: { verified: true, explicit_sexual: 0, graphic_violence: 0, gross_out: 0 },
      }] }
    }
    if (q.table === 'recommendation_deliveries') {
      if (q.operation === 'insert') return { data: { ...q.values, id: 'new', created_at: now.toISOString() } }
      if (q.columns === 'work_id') return { data: [] }
      if (!options.existing) return { data: null }
      return { data: { id: 'existing', chart_id: 'old-chart', work_id: q.filters.slot === 'daily_movie' ? 'movie' : 'book',
        slot: q.filters.slot, period_key: q.filters.period_key, revision: 0, explanation: secret } }
    }
    return { data: [] }
  })
  vi.mocked(createCoreSupabaseClient).mockReturnValue(db as unknown as ReturnType<typeof createCoreSupabaseClient>)
  return db
}

beforeEach(() => {
  vi.stubEnv('RECOMMENDATION_RIGHTS_MODE', undefined)
  vi.stubEnv('NODE_ENV', 'test')
  vi.mocked(getSubscriptionTier).mockResolvedValue('free')
})
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks() })

describe('recommendation periods in Sofia', () => {
  it.each([
    ['2026-08-31T20:59:59.999Z', '2026-08', '2026-08-31'],
    ['2026-08-31T21:00:00.000Z', '2026-09', '2026-09-01'],
    ['2026-12-31T21:59:59.999Z', '2026-12', '2026-12-31'],
    ['2026-12-31T22:00:00.000Z', '2027-01', '2027-01-01'],
  ])('%s uses the local calendar', (instant, month, day) => {
    expect(recommendationPeriodKey('monthly_book', new Date(instant))).toBe(month)
    expect(recommendationPeriodKey('daily_movie', new Date(instant))).toBe(day)
  })
})

describe('overview', () => {
  it.each([true, false])('redacts monthly content for free users (existing=%s)', async (existing) => {
    setup({ existing })
    const result = await getRecommendationsOverview('user', null, now)
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(result.error)
    expect(result.data.monthlyBook?.locked).toBe(true)
    expect(result.data.monthlyBook?.explanation).toEqual({ howItConnects: '', whyNow: '', whatItGives: '' })
    expect(result.data.dailyMovie?.locked).toBe(false)
    expect(result.data.dailyMovie?.explanation.howItConnects).toBeTruthy()
    expect(result.data.monthlyBook?.work.tagline).toBe('Public tagline')
    expect(JSON.stringify(result.data.monthlyBook)).not.toContain('private')
  })
  it('returns stored monthly explanations to premium users', async () => {
    setup({ existing: true })
    vi.mocked(getSubscriptionTier).mockResolvedValue('premium')
    const result = await getRecommendationsOverview('user', null, now)
    expect(result.ok && result.data.monthlyBook?.explanation).toEqual(secret)
    expect(result.ok && result.data.monthlyBook?.locked).toBe(false)
  })
  it.each([
    ['production', undefined, ['commercial', 'both']],
    ['test', undefined, ['development', 'both']],
    [undefined, undefined, ['development', 'both']],
    ['production', 'development', ['development', 'both']],
    ['test', 'commercial', ['commercial', 'both']],
    ['production', 'invalid', ['commercial', 'both']],
  ])('filters works and assets with env=%s mode=%s', async (env, mode, scopes) => {
    vi.stubEnv('NODE_ENV', env)
    vi.stubEnv('RECOMMENDATION_RIGHTS_MODE', mode)
    const db = setup({ existing: true })
    await getRecommendationsOverview('user', null, now)
    const queries = db.queries.filter(q => ['recommendation_works', 'recommendation_assets'].includes(q.table))
    expect(queries).toHaveLength(3)
    for (const q of queries) expect(q.filters.rights_scope).toEqual(scopes)
  })
  it('reports NO_ELIGIBLE_CATALOG when neither slot can be filled', async () => {
    const db = setup({ empty: true })
    expect(await getRecommendationsOverview('user', null, now)).toEqual({ ok: false, error: 'NO_ELIGIBLE_CATALOG' })
    expect(db.queries.every(q => q.operation === 'select')).toBe(true)
  })
  it('keeps a partial overview when only movies are eligible', async () => {
    setup({ onlyMovie: true })
    const result = await getRecommendationsOverview('user', null, now)
    expect(result.ok && result.data.dailyMovie).toBeTruthy()
    expect(result.ok && result.data.monthlyBook).toBeNull()
  })
  it('distinguishes a database failure from an empty catalog', async () => {
    setup({ error: true })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await getRecommendationsOverview('user', null, now)).toEqual({ ok: false, error: 'INTERNAL' })
  })
  it('documents that a delivery from another chart is reused within the same period', async () => {
    const db = setup({ existing: true })
    const result = await getRecommendationsOverview('user', 'chart', now)
    expect(result.ok && result.data.monthlyBook?.deliveryId).toBe('existing')
    expect(db.queries.filter(q => q.table === 'recommendation_deliveries').every(q => q.operation === 'select')).toBe(true)
  })
})
