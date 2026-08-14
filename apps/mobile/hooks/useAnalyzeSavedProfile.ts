import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { RelationshipType } from '@stellaeum/core/relationships/types'

import { savedProfileReportKey } from './useSavedProfileReport'
import type { SavedProfileReportRow } from '@/lib/circle/types'
import { useApiClient } from '@/lib/api/client'

interface AnalyzeInput {
  profileId: string
  relationshipType: RelationshipType
}

/**
 * POST /api/circle/profiles/[profileId]/report — generate (or regenerate)
 * the compatibility report. Mirrors handleAnalyzeSavedProfile. Rate-limited
 * server-side to 5/min.
 */
export function useAnalyzeSavedProfile() {
  const { apiFetch } = useApiClient()
  const queryClient = useQueryClient()

  return useMutation<SavedProfileReportRow, Error, AnalyzeInput>({
    mutationFn: async ({ profileId, relationshipType }) => {
      const data = await apiFetch(`/api/circle/profiles/${profileId}/report`, {
        method: 'POST',
        body: JSON.stringify({ relationshipType }),
      })
      return data as SavedProfileReportRow
    },
    onSuccess: (data, { profileId }) => {
      queryClient.setQueryData(savedProfileReportKey(profileId), data)
    },
  })
}
