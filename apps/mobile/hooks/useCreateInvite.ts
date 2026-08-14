import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { RelationshipType } from '@stellaeum/core/relationships/types'

import { CACHED_INVITE_LINKS_KEY } from './useCachedInviteLinks'
import { PENDING_INVITES_KEY } from './usePendingInvites'
import { cacheInviteLink } from '@/lib/circle/inviteLinks'
import { useApiClient } from '@/lib/api/client'

interface CreateInviteInput {
  label?: string
  relationshipType: RelationshipType
  existingSpaceId?: string
}

interface CreateInviteResult {
  inviteId: string
  expiresAt: string
  shareUrl: string
  token: string
  relationshipType: RelationshipType
}

/**
 * POST /api/circle/invites — mirrors CircleHub.tsx's handleCreateInvite.
 * The raw shareUrl only ever comes back in this response (server only
 * persists the token's hash), so it's cached locally on success — same
 * reason web keeps it in localStorage instead of re-fetching it.
 */
export function useCreateInvite() {
  const { apiFetch } = useApiClient()
  const queryClient = useQueryClient()

  return useMutation<CreateInviteResult, Error, CreateInviteInput>({
    mutationFn: async (input) => {
      const data = await apiFetch('/api/circle/invites', {
        method: 'POST',
        body: JSON.stringify(input),
      })
      return data as CreateInviteResult
    },
    onSuccess: async (result) => {
      await cacheInviteLink(result.inviteId, { shareUrl: result.shareUrl, expiresAt: result.expiresAt })
      queryClient.invalidateQueries({ queryKey: PENDING_INVITES_KEY })
      queryClient.invalidateQueries({ queryKey: CACHED_INVITE_LINKS_KEY })
    },
  })
}
