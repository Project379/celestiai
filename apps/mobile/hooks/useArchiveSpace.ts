import { useMutation, useQueryClient } from '@tanstack/react-query'

import { CONNECTION_SPACES_KEY } from './useConnectionSpaces'
import { useApiClient } from '@/lib/api/client'

/** POST /api/circle/relationships/[id]/archive — mirrors handleArchive. */
export function useArchiveSpace() {
  const { apiFetch } = useApiClient()
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: async (spaceId) => {
      await apiFetch(`/api/circle/relationships/${spaceId}/archive`, { method: 'POST' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONNECTION_SPACES_KEY })
    },
  })
}
