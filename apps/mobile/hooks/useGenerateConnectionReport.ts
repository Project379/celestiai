import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { RelationshipType } from '@stellaeum/core/relationships/types'

import { CONNECTION_SPACES_KEY } from './useConnectionSpaces'
import { useApiClient } from '@/lib/api/client'

/**
 * POST /api/circle/relationships/[id]/report — mirrors
 * handleGenerateReport. On success, invalidates the whole spaces list
 * rather than patching one entry in place — useConnectionSpaces already
 * bundles latestReport/weather/compatibility_summary per space via
 * buildCircleSpaceView, so one invalidation keeps everything (headline
 * score, domains, report content) consistent in one round trip instead
 * of updating four derived fields by hand.
 */
export function useGenerateConnectionReport() {
  const { apiFetch } = useApiClient()
  const queryClient = useQueryClient()

  return useMutation<void, Error, { spaceId: string; relationshipType: RelationshipType }>({
    mutationFn: async ({ spaceId, relationshipType }) => {
      await apiFetch(`/api/circle/relationships/${spaceId}/report`, {
        method: 'POST',
        body: JSON.stringify({ relationshipType }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONNECTION_SPACES_KEY })
    },
  })
}
