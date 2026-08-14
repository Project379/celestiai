import { useQuery } from '@tanstack/react-query'

import type { SavedProfileReportRow } from '@/lib/circle/types'
import { useApiClient } from '@/lib/api/client'

export function savedProfileReportKey(profileId: string) {
  return ['circle-saved-profile-report', profileId] as const
}

/**
 * GET /api/circle/profiles/[profileId]/report — the latest stored report,
 * or null if the profile has never been analyzed. New route (added this
 * batch, mirrors the existing POST handler) — web never needed a GET here
 * because CircleHub reads latestSavedProfileReports off a direct
 * server-side DB call; mobile only has HTTP, and re-running the POST
 * (rate-limited to 5/min) just to redisplay a report on screen open would
 * be wrong.
 */
export function useSavedProfileReport(profileId: string | null) {
  const { apiFetch } = useApiClient()

  return useQuery<SavedProfileReportRow | null>({
    queryKey: profileId ? savedProfileReportKey(profileId) : ['circle-saved-profile-report', 'none'],
    enabled: !!profileId,
    queryFn: async () => {
      const data = await apiFetch(`/api/circle/profiles/${profileId}/report`)
      return data as SavedProfileReportRow | null
    },
  })
}
