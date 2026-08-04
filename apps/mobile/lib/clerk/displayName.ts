import type { useUser } from '@clerk/expo'

/**
 * Resolves a human-facing display name from a Clerk user: firstName +
 * lastName when both are set, falling back to the email username, then a
 * generic placeholder. Several accounts predate B.0g-2's required-name-
 * fields signup change and will hit the fallback path — an email username
 * reads warmer there than a hardcoded placeholder.
 */
export function getDisplayName(user: ReturnType<typeof useUser>['user'], placeholder = 'Ти'): string {
  if (!user) return placeholder
  const first = user.firstName?.trim() ?? ''
  const last = user.lastName?.trim() ?? ''
  const full = [first, last].filter(Boolean).join(' ')
  if (full) return full
  const email = user.primaryEmailAddress?.emailAddress ?? ''
  const username = email.split('@')[0]
  return username || placeholder
}
