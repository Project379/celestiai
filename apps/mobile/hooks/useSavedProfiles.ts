import { useQuery } from '@tanstack/react-query'

import type { SavedProfileRow } from '@/lib/circle/types'
import { useApiClient } from '@/lib/api/client'

export const SAVED_PROFILES_KEY = ['circle-saved-profiles'] as const

/**
 * GET /api/circle/profiles — the user's saved crush profiles, newest first.
 * Mirrors apps/web/components/circle/CircleHub.tsx's data.savedProfiles.
 */
export function useSavedProfiles() {
  const { apiFetch } = useApiClient()

  return useQuery<SavedProfileRow[]>({
    queryKey: SAVED_PROFILES_KEY,
    queryFn: async () => {
      const data = await apiFetch('/api/circle/profiles')
      return data as SavedProfileRow[]
    },
  })
}
