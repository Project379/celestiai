import { useQuery } from '@tanstack/react-query'

import type { CircleSpaceView } from '@/lib/circle/types'
import { useApiClient } from '@/lib/api/client'

export const CONNECTION_SPACES_KEY = ['circle-connection-spaces'] as const

/**
 * GET /api/circle/relationships — the user's connection spaces, each
 * bundled with members/latestReport/weather (new route, added this
 * batch — mirrors CircleHub.tsx's data.spaces, which web reads off a
 * direct server-side DB call mobile doesn't have).
 */
export function useConnectionSpaces() {
  const { apiFetch } = useApiClient()

  return useQuery<CircleSpaceView[]>({
    queryKey: CONNECTION_SPACES_KEY,
    queryFn: async () => {
      const data = await apiFetch('/api/circle/relationships')
      return data as CircleSpaceView[]
    },
  })
}
