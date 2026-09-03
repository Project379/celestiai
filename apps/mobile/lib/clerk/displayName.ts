import type { useUser } from '@clerk/expo'

// Apple Private Relay addresses (Hide My Email, SIWA) look like
// a1b2c3d4e5@privaterelay.appleid.com. Their local part is a random token,
// never a name — unlike the OAuth-transfer timing gap, this is permanent,
// so it must be excluded from the email-username fallback entirely rather
// than just handled by retrying later.
const RELAY_EMAIL_HOST = 'appleid.com'

function isPrivateRelayEmail(email: string): boolean {
  const host = email.split('@')[1]?.toLowerCase() ?? ''
  // Exact host or subdomain match ONLY — never string-contains/includes()
  // or a bare endsWith('appleid.com') on the full email. A substring check
  // on the host still matches an attacker-registered domain like
  // privaterelay.appleid.com.evil.tld, and checking the email instead of
  // the host lets user@evil.tld?x=@appleid.com-style local-part tricks in.
  // Do not "simplify" this back to includes() — that's the bug this guards.
  return host === RELAY_EMAIL_HOST || host.endsWith(`.${RELAY_EMAIL_HOST}`)
}

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
  if (isPrivateRelayEmail(email)) return placeholder
  const username = email.split('@')[0]
  return username || placeholder
}
