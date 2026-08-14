import { useQuery } from '@tanstack/react-query'

import type { ConnectionInviteRow } from '@/lib/circle/types'
import { useApiClient } from '@/lib/api/client'

export const PENDING_INVITES_KEY = ['circle-pending-invites'] as const

/** GET /api/circle/invites — the user's pending connection invites (new route, added this batch). */
export function usePendingInvites() {
  const { apiFetch } = useApiClient()

  return useQuery<ConnectionInviteRow[]>({
    queryKey: PENDING_INVITES_KEY,
    queryFn: async () => {
      const data = await apiFetch('/api/circle/invites')
      return data as ConnectionInviteRow[]
    },
  })
}
