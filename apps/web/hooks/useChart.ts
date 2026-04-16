'use client'

import useSWR from 'swr'
import type { ChartData } from '@celestia/astrology/client'

interface UseChartResult {
  /** Calculated chart data */
  chart: ChartData | null
  /** Loading state */
  isLoading: boolean
  /** Error message (in Bulgarian) */
  error: string | null
  /** Refetch the chart calculation */
  refetch: () => void
}

async function fetchChart(chartId: string): Promise<ChartData> {
  const response = await fetch('/api/chart/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chartId }),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || 'Грешка при зареждане на картата')
  }

  return response.json()
}

/**
 * Hook for fetching calculated natal chart data.
 *
 * Uses SWR for automatic deduplication, caching, and revalidation.
 * Calls POST /api/chart/calculate with the chartId to get the full
 * calculated chart with planets, houses, and aspects.
 */
export function useChart(chartId: string | undefined): UseChartResult {
  const { data, error, isLoading, mutate } = useSWR(
    chartId ? ['chart', chartId] : null,
    ([, id]) => fetchChart(id),
    { revalidateOnFocus: false }
  )

  return {
    chart: data ?? null,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch: () => { void mutate() },
  }
}
