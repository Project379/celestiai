import { useQuery } from '@tanstack/react-query'

import type { TransitOverview } from '@stellaeum/core/horoscope/transit-analysis'

import { useApiClient } from '@/lib/api/client'

/**
 * Transit overview hook — fetches /api/transits/overview?chartId=... via
 * TanStack Query. Mirrors web's apps/web/hooks/useTransitOverview.ts
 * (SWR-based) on the mobile TanStack-standard stack.
 *
 * staleTime: 15 minutes — matches the server's Cache-Control:
 * private, max-age=900 on the route handler. Same chartId resolves from
 * cache during a session.
 */
export function useTransitOverview(chartId: string | null | undefined) {
  const { apiFetch } = useApiClient()

  return useQuery<TransitOverview>({
    queryKey: ['transit-overview', chartId],
    enabled: !!chartId,
    staleTime: 15 * 60 * 1000,
    queryFn: async () => {
      const data = await apiFetch(
        `/api/transits/overview?chartId=${encodeURIComponent(chartId!)}`,
      )
      return data as TransitOverview
    },
  })
}
