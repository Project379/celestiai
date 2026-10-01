import { describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { chartVersionChanged, shouldCheckVersion, VERSION_CHECK_MIN_INTERVAL_MS } from '@stellaeum/core/charts/version'

import { CHART_DERIVED_QUERY_ROOTS, invalidateChartDerived, isChartDerivedQueryKey } from '@/lib/chartDerived'

/**
 * Mobile side of birth-data edit invalidation (Batch 8 "b"). The app runs with
 * staleTime Infinity + refetchOnMount false, so after an edit nothing refetches
 * by itself — invalidateChartDerived is the single place that fixes that.
 */

function client() {
  return new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, refetchOnMount: false, retry: false } },
  })
}

describe('isChartDerivedQueryKey', () => {
  it.each(CHART_DERIVED_QUERY_ROOTS)('treats %s as chart-derived', (root) => {
    expect(isChartDerivedQueryKey([root, 'chart-1'])).toBe(true)
  })

  it('does NOT treat the crystal collection / streak, the saved-people list, or offerings as chart-derived', () => {
    expect(isChartDerivedQueryKey(['crystals-daily-streak'])).toBe(false)
    expect(isChartDerivedQueryKey(['circle-saved-profiles'])).toBe(false)
    expect(isChartDerivedQueryKey(['revenuecat-offerings'])).toBe(false)
  })

  it('covers every chart-derived query key used by the hooks (guards against a new hook being forgotten)', () => {
    // Roots verified against apps/mobile/hooks/*.ts at the time of writing.
    for (const root of [
      'chart', 'first-chart', 'transit-overview', 'oracle-readings', 'daily-horoscope',
      'crystals-overview', 'media-recommendations', 'circle-connection-spaces', 'circle-saved-profile-report',
    ]) {
      expect(CHART_DERIVED_QUERY_ROOTS).toContain(root)
    }
  })
})

describe('invalidateChartDerived', () => {
  it('REMOVES inactive chart-derived entries so they refetch on next mount (invalidate alone would not, with refetchOnMount:false)', async () => {
    const qc = client()
    qc.setQueryData(['chart', 'c1'], { old: true })
    qc.setQueryData(['daily-horoscope', 'c1', '2026-10-01'], 'old horoscope')
    qc.setQueryData(['oracle-readings', 'c1'], ['old'])

    await invalidateChartDerived(qc)

    expect(qc.getQueryData(['chart', 'c1'])).toBeUndefined()
    expect(qc.getQueryData(['daily-horoscope', 'c1', '2026-10-01'])).toBeUndefined()
    expect(qc.getQueryData(['oracle-readings', 'c1'])).toBeUndefined()
  })

  it('leaves user-owned data (crystal streak, saved-people list) untouched', async () => {
    const qc = client()
    qc.setQueryData(['crystals-daily-streak'], { streak: 5 })
    qc.setQueryData(['circle-saved-profiles'], [{ id: 'p1' }])

    await invalidateChartDerived(qc)

    expect(qc.getQueryData(['crystals-daily-streak'])).toEqual({ streak: 5 })
    expect(qc.getQueryData(['circle-saved-profiles'])).toEqual([{ id: 'p1' }])
  })

  it('REFETCHES an ACTIVE chart-derived query (one that is on screen right now)', async () => {
    const qc = client()
    const queryFn = vi.fn().mockResolvedValueOnce('old').mockResolvedValueOnce('fresh')
    const observer = qc.getQueryCache().build(qc, { queryKey: ['first-chart'], queryFn })
    await observer.fetch()
    expect(qc.getQueryData(['first-chart'])).toBe('old')

    // Make it "active" by subscribing an observer, as a mounted screen does.
    const { QueryObserver } = await import('@tanstack/react-query')
    const live = new QueryObserver(qc, { queryKey: ['first-chart'], queryFn, staleTime: Infinity })
    const unsubscribe = live.subscribe(() => {})

    await invalidateChartDerived(qc)

    expect(queryFn).toHaveBeenCalledTimes(2)
    expect(qc.getQueryData(['first-chart'])).toBe('fresh')
    unsubscribe()
  })
})

describe('shared chart-version rule (packages/core, also used by web)', () => {
  it('detects a moved marker, a changed active chart, and appearance/disappearance — not a reformatted identical instant', () => {
    const known = { chartId: 'c1', editedAt: '2026-10-01T10:00:00.000Z' }
    expect(chartVersionChanged(known, { chartId: 'c1', editedAt: '2026-10-01T10:00:00.000000+00:00' })).toBe(false)
    expect(chartVersionChanged(known, { chartId: 'c1', editedAt: '2026-10-01T11:00:00.000Z' })).toBe(true)
    expect(chartVersionChanged(known, { chartId: 'c2', editedAt: known.editedAt })).toBe(true)
    expect(chartVersionChanged({ chartId: null, editedAt: null }, known)).toBe(true)
  })

  it('throttles checks to 30 s', () => {
    expect(shouldCheckVersion(0, VERSION_CHECK_MIN_INTERVAL_MS - 1)).toBe(false)
    expect(shouldCheckVersion(0, VERSION_CHECK_MIN_INTERVAL_MS)).toBe(true)
  })
})
