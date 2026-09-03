import { useQuery } from '@tanstack/react-query'

import type { CrystalsOverview } from '@stellaeum/core/crystals/overview'

import { useApiClient } from '@/lib/api/client'

/**
 * Crystals overview — GET /api/crystals (catalog + collection + active
 * recommendations + lunar phase). Mirrors the web CrystalCollectionContent
 * fetch. Returns 200 for every authed user (tier item 5): a free user gets
 * `locked: true` with an empty collection / no recommendations so the grid
 * can render browse-only; a premium user gets the full personalised
 * payload. `chartId` is optional — the API ignores it for the free tier.
 */
export function useCrystalsOverview(
  chartId: string | null | undefined,
  enabled: boolean = true,
) {
  const { apiFetch } = useApiClient()

  return useQuery<CrystalsOverview>({
    queryKey: ['crystals-overview', chartId ?? null],
    enabled,
    queryFn: async () => {
      const path = chartId
        ? `/api/crystals?chartId=${encodeURIComponent(chartId)}`
        : '/api/crystals'
      return (await apiFetch(path)) as CrystalsOverview
    },
  })
}
