'use client'

import useSWR from 'swr'
import { useChartEditedAt } from '@/components/birth-data/ChartVersion'
import type { ChartData } from '@stellaeum/astrology/client'

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
  const editedAt = useChartEditedAt()
  const { data, error, isLoading, mutate } = useSWR(
    // editedAt (the chart's birth_data_edited_at) is part of the key: an edit, here or
    // on another device, moves the key so the pre-edit calculation is never reused.
    chartId ? ['chart', chartId, editedAt] : null,
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
