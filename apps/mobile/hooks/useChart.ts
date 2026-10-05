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
 * fetch per chartId runs across all consumers. staleTime Infinity is NOT safe
 * on its own once ANY platform can edit birth data: the server drops the
 * chart_calculations row on an edit, but a client that already cached the chart
 * never learns of it. Two things keep it correct (Batch 8 "b"): a local edit
 * runs invalidateChartDerived (lib/chartDerived.ts), and useChartVersionCheck
 * (mounted in the authed layout) compares the server's birth_data_edited_at on
 * app foreground and runs the same invalidation if an edit happened elsewhere.
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
