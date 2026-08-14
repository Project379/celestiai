import { useMutation, useQueryClient } from '@tanstack/react-query'

import { CACHED_INVITE_LINKS_KEY } from './useCachedInviteLinks'
import { PENDING_INVITES_KEY } from './usePendingInvites'
import { forgetInviteLink } from '@/lib/circle/inviteLinks'
import { useApiClient } from '@/lib/api/client'

/** DELETE /api/circle/invites/[inviteId] — mirrors handleCancelInvite. */
export function useCancelInvite() {
  const { apiFetch } = useApiClient()
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: async (inviteId) => {
      await apiFetch(`/api/circle/invites/${inviteId}`, { method: 'DELETE' })
    },
    onSuccess: async (_data, inviteId) => {
      await forgetInviteLink(inviteId)
      queryClient.invalidateQueries({ queryKey: PENDING_INVITES_KEY })
      queryClient.invalidateQueries({ queryKey: CACHED_INVITE_LINKS_KEY })
    },
  })
}
