import { describe, expect, it } from 'vitest'
import { buildTasteVector, isSafeRecommendationWork, rankRecommendationWorks, type RankableWork } from '../../src/recommendations/ranking'

const work: RankableWork = { id: 'safe', traits: {}, metadataQuality: 90, tagline: 'Title', description: 'Description',
  contentFlags: { verified: true, explicit_sexual: 0, graphic_violence: 0, gross_out: 0 } }

describe('ranking safety and exclusions', () => {
  it.each(['explicit_sexual', 'graphic_violence', 'gross_out'])('rejects flagged or unknown %s', flag => {
    for (const value of [1, null, undefined]) {
      expect(isSafeRecommendationWork({ ...work, contentFlags: { ...work.contentFlags, [flag]: value } })).toBe(false)
    }
  })
  it('requires verified safety and excludes previously consumed/saved works', () => {
    expect(isSafeRecommendationWork({ ...work, contentFlags: { ...work.contentFlags, verified: false } })).toBe(false)
    expect(rankRecommendationWorks({ works: [work], phase: 'new', sunSign: null, taste: null, seed: 'user', excludedWorkIds: new Set(['safe']) })).toEqual([])
  })
  it('is deterministic regardless of catalog order and uses the documented weights', () => {
    const works = [work, { ...work, id: 'other', traits: { renewal: 1, courage: 1 } }]
    const options = { phase: 'new' as const, sunSign: null, taste: null, seed: 'user:2026-09' }
    const result = rankRecommendationWorks({ ...options, works })
    expect(rankRecommendationWorks({ ...options, works: [...works].reverse() })).toEqual(result)
    for (const row of result) {
      const d = row.scoreDetail
      expect(row.score).toBeCloseTo(d.astrology * .72 + .5 * .18 + .9 * .07 + d.exploration * .03)
    }
    expect(result[0]!.score).toBeGreaterThanOrEqual(result[1]!.score)
  })
})

describe('taste signals', () => {
  it('treats absent and neutral feedback as no preference', () => {
    expect(buildTasteVector([])).toBeNull()
    expect(buildTasteVector([{ traits: { wonder: 1 }, weight: 0 }])).toBeNull()
  })
  it('inverts dislikes and averages using absolute weights', () => {
    expect(buildTasteVector([{ traits: { wonder: .9 }, weight: -1 }])?.wonder).toBeCloseTo(.1)
    expect(buildTasteVector([{ traits: { wonder: 1 }, weight: 1 }, { traits: { wonder: 1 }, weight: -1 }])?.wonder).toBe(.5)
  })
  it('clamps outliers and treats nonfinite traits as neutral', () => {
    const result = buildTasteVector([{ traits: { wonder: 9, comfort: -4, courage: NaN }, weight: 1 }])
    expect(result).toMatchObject({ wonder: 1, comfort: 0, courage: .5 })
  })
})
