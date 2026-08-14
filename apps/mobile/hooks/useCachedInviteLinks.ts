import { useQuery } from '@tanstack/react-query'

import { getCachedInviteLinks } from '@/lib/circle/inviteLinks'

export const CACHED_INVITE_LINKS_KEY = ['circle-cached-invite-links'] as const

/** Locally-cached {inviteId: {shareUrl, expiresAt}} — see lib/circle/inviteLinks.ts. */
export function useCachedInviteLinks() {
  return useQuery({
    queryKey: CACHED_INVITE_LINKS_KEY,
    queryFn: getCachedInviteLinks,
  })
}
