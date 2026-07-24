import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'

import type { CrystalRecommendationRow, UserCrystalRow } from '@stellaeum/core/crystals/queries'

import { useApiClient } from '@/lib/api/client'

interface CollectResult {
  userCrystal: UserCrystalRow
  recommendation: CrystalRecommendationRow
}

/**
 * POST /api/crystals/collect — claim an active recommendation into the
 * user's collection. Mirrors CrystalCollectionContent.tsx's handleCollect:
 * no optimistic update on web, so this doesn't add one either — on
 * success it just invalidates the overview query so the collection/
 * windows tabs refetch with the new state.
 */
export function useCollectCrystal(chartId: string | null | undefined) {
  const { apiFetch } = useApiClient()
  const queryClient = useQueryClient()

  return useMutation<CollectResult, Error, string>({
    mutationFn: async (recommendationId: string) => {
      const data = await apiFetch('/api/crystals/collect', {
        method: 'POST',
        body: JSON.stringify({ recommendationId }),
      })
      return data as CollectResult
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crystals-overview', chartId] })
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    },
    onError: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    },
  })
}
