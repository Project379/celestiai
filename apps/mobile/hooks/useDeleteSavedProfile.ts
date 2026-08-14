import { useMutation, useQueryClient } from '@tanstack/react-query'

import { SAVED_PROFILES_KEY } from './useSavedProfiles'
import { useApiClient } from '@/lib/api/client'

/** DELETE /api/circle/profiles/[profileId] — mirrors handleDeleteSavedProfile. */
export function useDeleteSavedProfile() {
  const { apiFetch } = useApiClient()
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: async (profileId) => {
      await apiFetch(`/api/circle/profiles/${profileId}`, { method: 'DELETE' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SAVED_PROFILES_KEY })
    },
  })
}
