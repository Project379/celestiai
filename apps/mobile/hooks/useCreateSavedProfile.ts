import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { BirthData } from '@stellaeum/core/charts/schemas'

import { SAVED_PROFILES_KEY } from './useSavedProfiles'
import type { SavedProfileRow } from '@/lib/circle/types'
import { useApiClient } from '@/lib/api/client'

/**
 * POST /api/circle/profiles — create a crush profile. Mirrors
 * CircleHub.tsx's handleCreateSavedProfile. Server enforces the free-tier
 * one-profile cap and returns a Bulgarian error message on 403 — surfaced
 * as-is by the caller, not re-worded here.
 */
export function useCreateSavedProfile() {
  const { apiFetch } = useApiClient()
  const queryClient = useQueryClient()

  return useMutation<SavedProfileRow, Error, BirthData>({
    mutationFn: async (payload) => {
      const data = await apiFetch('/api/circle/profiles', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      return data as SavedProfileRow
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SAVED_PROFILES_KEY })
    },
  })
}
