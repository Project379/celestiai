import AsyncStorage from '@react-native-async-storage/async-storage'

// Mirrors CircleHub.tsx's localStorage 'circle.connectionInvites' cache —
// the raw invite token/shareUrl only ever comes back once, in the POST
// /api/circle/invites response (only its hash is persisted server-side),
// so a client that wants to re-show/re-share a link it already created
// has to remember it locally. Same shape, same reason, different storage.
const STORAGE_KEY = 'stellaeum.circle.inviteLinks.v1'

export interface CachedInviteLink {
  shareUrl: string
  expiresAt: string
}

type LinkMap = Record<string, CachedInviteLink>

export async function getCachedInviteLinks(): Promise<LinkMap> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as LinkMap
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

export async function cacheInviteLink(inviteId: string, link: CachedInviteLink): Promise<void> {
  const current = await getCachedInviteLinks()
  current[inviteId] = link
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current))
}

export async function forgetInviteLink(inviteId: string): Promise<void> {
  const current = await getCachedInviteLinks()
  delete current[inviteId]
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current))
}
