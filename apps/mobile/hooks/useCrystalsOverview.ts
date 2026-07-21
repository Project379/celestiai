import { useQuery } from '@tanstack/react-query'

import type { CrystalsOverview } from '@stellaeum/core/crystals/overview'

import { useApiClient } from '@/lib/api/client'

/**
 * Premium-gated crystals overview — GET /api/crystals?chartId=...
 * (catalog + user collection + active recommendations + lunar phase).
 * Mirrors apps/web/components/crystals/CrystalCollectionContent.tsx's
 * data fetch. Only enable once the caller knows the user is premium and
 * has a chartId (see useCrystalOfTheDay's `isPremium` field) — a 403
 * PREMIUM_REQUIRED round-trip is otherwise wasted.
 */
export function useCrystalsOverview(chartId: string | null | undefined, enabled: boolean) {
  const { apiFetch } = useApiClient()

  return useQuery<CrystalsOverview>({
    queryKey: ['crystals-overview', chartId],
    enabled: enabled && !!chartId,
    queryFn: async () => {
      const data = await apiFetch(
        `/api/crystals?chartId=${encodeURIComponent(chartId!)}`,
      )
      return data as CrystalsOverview
    },
  })
}
