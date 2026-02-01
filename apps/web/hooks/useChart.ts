'use client'

import { useState, useEffect, useCallback } from 'react'
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

/**
 * Hook for fetching calculated natal chart data
 *
 * Calls POST /api/chart/calculate with the chartId to get the full
 * calculated chart with planets, houses, and aspects.
 *
 * @param chartId The chart ID to calculate (from charts table)
 * @returns Chart data, loading state, and error
 */
export function useChart(chartId: string | undefined): UseChartResult {
  const [chart, setChart] = useState<ChartData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchChart = useCallback(async () => {
    if (!chartId) {
      setChart(null)
      setError(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/chart/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chartId }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        const errorMessage = data.error || 'Грешка при зареждане на картата'
        setError(errorMessage)
        setChart(null)
        return
      }

      const data: ChartData = await response.json()
      setChart(data)
      setError(null)
    } catch (err) {
      console.error('Error fetching chart:', err)
      setError('Грешка при зареждане на картата')
      setChart(null)
    } finally {
      setIsLoading(false)
    }
  }, [chartId])

  useEffect(() => {
    fetchChart()
  }, [fetchChart])

  return {
    chart,
    isLoading,
    error,
    refetch: fetchChart,
  }
}
