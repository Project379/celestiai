'use client'

import useSWR from 'swr'
import type { TransitOverview } from '@/lib/horoscope/transit-analysis'

interface UseTransitOverviewResult {
  overview: TransitOverview | null
  isLoading: boolean
  error: string | null
}

async function fetchTransitOverview(chartId: string): Promise<TransitOverview> {
  const response = await fetch(
    `/api/transits/overview?chartId=${encodeURIComponent(chartId)}`,
    { cache: 'no-store' }
  )

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error ?? 'Failed to load transit overview.')
  }

  return data as TransitOverview
}

/**
 * Hook for fetching transit overview data.
 *
 * Uses SWR for automatic deduplication and caching.
 * Multiple components using the same chartId will share a single request.
 */
export function useTransitOverview(chartId: string | null | undefined): UseTransitOverviewResult {
  const { data, error, isLoading } = useSWR(
    chartId ? ['transit-overview', chartId] : null,
    ([, id]) => fetchTransitOverview(id),
    { revalidateOnFocus: false }
  )

  return {
    overview: data ?? null,
    isLoading,
    error: error ? (error as Error).message : null,
  }
}
