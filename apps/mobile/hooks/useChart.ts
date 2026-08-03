import { useQuery } from '@tanstack/react-query'
import type { ChartData } from '@stellaeum/astrology/client'

import { useApiClient } from '@/lib/api/client'

/**
 * Hook for fetching the calculated natal chart for a chart UUID.
 *
 * Calls POST /api/chart/calculate with body { chartId } via Clerk-authed
 * apiFetch. Web's useChart (apps/web/hooks/useChart.ts) uses SWR with the
 * same endpoint contract; this is the TanStack Query equivalent.
 *
 * Caching: query key is ['chart', chartId]. With the QueryClientProvider
 * defaults from 5.1 (staleTime Infinity, no auto-revalidate), a single
 * fetch per chartId runs across all consumers. The chart is invalidated
 * server-side when birth data is edited (apps/web/app/api/birth-data/[id]
 * PATCH path deletes chart_calculations row), so a stale-Infinity client
 * cache is safe — birth-data edits aren't currently exposed on mobile.
 *
 * Pass null/undefined chartId to disable the query.
 */
export function useChart(chartId: string | null | undefined) {
  const { apiFetch } = useApiClient()

  return useQuery({
    queryKey: ['chart', chartId],
    enabled: !!chartId,
    queryFn: async () => {
      const raw = await apiFetch('/api/chart/calculate', {
        method: 'POST',
        body: JSON.stringify({ chartId }),
      })
      return raw as ChartData
    },
  })
}
