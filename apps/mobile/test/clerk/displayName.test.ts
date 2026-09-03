import { describe, expect, it } from 'vitest'

import { getDisplayName } from '@/lib/clerk/displayName'

/**
 * Apple Private Relay addresses (a1b2c3d4e5@privaterelay.appleid.com) must
 * never reach the email-username fallback — the local part is a random
 * token, never a name, and unlike the OAuth-transfer timing gap this is
 * permanent. Google rarely triggers the no-name path (Google returns names);
 * Sign in with Apple with "Hide My Email" selected always does.
 */
describe('getDisplayName', () => {
  it('falls back to the placeholder for an Apple private-relay email with no name', () => {
    const user = mockUser({ email: 'a1b2c3d4e5@privaterelay.appleid.com' })
    expect(getDisplayName(user)).toBe('Ти')
  })

  it('does not false-positive on a domain that merely contains "appleid.com"', () => {
    const user = mockUser({ email: 'ivan@notappleid.com' })
    expect(getDisplayName(user)).toBe('ivan')
  })

  it('still uses the email username for an ordinary domain with no name', () => {
    const user = mockUser({ email: 'ivan@gmail.com' })
    expect(getDisplayName(user)).toBe('ivan')
  })

  it('prefers a real name over a relay email', () => {
    const user = mockUser({ firstName: 'Иван', lastName: 'Петров', email: 'x@privaterelay.appleid.com' })
    expect(getDisplayName(user)).toBe('Иван Петров')
  })

  it('returns the placeholder with no user at all', () => {
    expect(getDisplayName(null)).toBe('Ти')
  })
})

function mockUser(opts: { firstName?: string; lastName?: string; email: string }) {
  return {
    firstName: opts.firstName ?? '',
    lastName: opts.lastName ?? '',
    primaryEmailAddress: { emailAddress: opts.email },
  } as unknown as Parameters<typeof getDisplayName>[0]
}
