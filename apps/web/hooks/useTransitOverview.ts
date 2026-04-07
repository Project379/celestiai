'use client'

import { useEffect, useState } from 'react'
import type { TransitOverview } from '@/lib/horoscope/transit-analysis'

interface UseTransitOverviewResult {
  overview: TransitOverview | null
  isLoading: boolean
  error: string | null
}

export function useTransitOverview(chartId: string | null | undefined): UseTransitOverviewResult {
  const [overview, setOverview] = useState<TransitOverview | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!chartId) {
      setOverview(null)
      setError(null)
      setIsLoading(false)
      return
    }

    let cancelled = false

    async function loadOverview() {
      const safeChartId = chartId
      if (!safeChartId) return

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(
          `/api/transits/overview?chartId=${encodeURIComponent(safeChartId)}`,
          { cache: 'no-store' }
        )

        const data = (await response.json().catch(() => ({}))) as TransitOverview & {
          error?: string
        }

        if (!response.ok) {
          if (!cancelled) {
            setError(data.error ?? 'Failed to load transit overview.')
            setOverview(null)
          }
          return
        }

        if (!cancelled) {
          setOverview(data)
          setError(null)
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load transit overview.')
          setOverview(null)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadOverview()

    return () => {
      cancelled = true
    }
  }, [chartId])

  return { overview, isLoading, error }
}
