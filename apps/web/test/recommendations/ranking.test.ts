import { describe, expect, it } from 'vitest'
import {
  buildTasteVector,
  isSafeRecommendationWork,
  rankRecommendationWorks,
  type RankableWork,
} from '@stellaeum/core/recommendations/ranking'
import { recommendationPeriodKey } from '@stellaeum/core/recommendations/service'
import { inferRecommendationTraits } from '@stellaeum/core/recommendations/import'
import { RecommendationFeedbackRequestSchema } from '@stellaeum/core/recommendations/schemas'

function work(
  id: string,
  traits: Record<string, number>,
  flags: Record<string, unknown> = {
    verified: true,
    explicit_sexual: 0,
    graphic_violence: 0,
    gross_out: 0,
  },
): RankableWork {
  return {
    id,
    traits,
    contentFlags: flags,
    metadataQuality: 90,
    tagline: id,
    description: id,
  }
}

describe('media recommendation ranking', () => {
  it('hard-excludes unverified, explicit, graphic, and gross-out works', () => {
    expect(isSafeRecommendationWork(work('safe', {}))).toBe(true)
    expect(isSafeRecommendationWork(work('unverified', {}, { verified: false }))).toBe(false)
    expect(isSafeRecommendationWork(work('explicit', {}, {
      verified: true, explicit_sexual: 1, graphic_violence: 0, gross_out: 0,
    }))).toBe(false)
    expect(isSafeRecommendationWork(work('graphic', {}, {
      verified: true, explicit_sexual: 0, graphic_violence: 1, gross_out: 0,
    }))).toBe(false)
    expect(isSafeRecommendationWork(work('gross', {}, {
      verified: true, explicit_sexual: 0, graphic_violence: 0, gross_out: 1,
    }))).toBe(false)
  })

  it('keeps astrology primary while using taste as a secondary signal', () => {
    const astrologyMatch = work('astrology', { courage: 1, pace: 0.9, renewal: 0.8 })
    const tasteOnly = work('taste', { courage: 0, pace: 0, renewal: 0, comfort: 1 })
    const taste = buildTasteVector([{ traits: { comfort: 1, courage: 0 }, weight: 1 }])
    const ranked = rankRecommendationWorks({
      works: [tasteOnly, astrologyMatch],
      phase: 'first_quarter',
      sunSign: 'Овен',
      taste,
      seed: 'stable-user-period',
    })
    expect(ranked[0]?.work.id).toBe('astrology')
  })

  it('is deterministic for the same user and period seed', () => {
    const works = [work('a', {}), work('b', {}), work('c', {})]
    const first = rankRecommendationWorks({
      works, phase: 'full', sunSign: null, taste: null, seed: 'same-seed',
    }).map((item) => item.work.id)
    const second = rankRecommendationWorks({
      works, phase: 'full', sunSign: null, taste: null, seed: 'same-seed',
    }).map((item) => item.work.id)
    expect(second).toEqual(first)
  })
})

describe('recommendation contracts', () => {
  it('heuristic import annotations remain explicitly pending review', () => {
    const traits = inferRecommendationTraits(['Science Fiction', 'Adventure'])
    expect(traits.wonder).toBeGreaterThan(0.8)
    expect(traits.courage).toBeGreaterThan(0.8)
    expect(traits.annotation).toBe('heuristic_v1_pending_review')
  })

  it('uses Europe/Sofia boundaries for daily and monthly periods', () => {
    expect(recommendationPeriodKey('daily_movie', new Date('2026-08-31T20:59:00Z')))
      .toBe('2026-08-31')
    expect(recommendationPeriodKey('daily_movie', new Date('2026-08-31T21:01:00Z')))
      .toBe('2026-09-01')
    expect(recommendationPeriodKey('monthly_book', new Date('2026-08-31T21:01:00Z')))
      .toBe('2026-09')
  })

  it('does not accept taste sentiment unless the work is marked consumed', () => {
    const invalid = RecommendationFeedbackRequestSchema.safeParse({
      deliveryId: '20000000-0000-4000-8000-000000000001',
      status: 'saved',
      sentiment: 'liked',
    })
    const valid = RecommendationFeedbackRequestSchema.safeParse({
      deliveryId: '20000000-0000-4000-8000-000000000001',
      status: 'consumed',
      sentiment: 'liked',
    })
    expect(invalid.success).toBe(false)
    expect(valid.success).toBe(true)
  })
})
