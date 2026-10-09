import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Signed token for the founder's one-click veto link in the monthly review email. It authorises
 * exactly one action (reject this sign's text for this month) and nothing else, so there is no
 * admin role to build: whoever holds the link is the founder. HMAC-SHA256 over «sign:month» with
 * SIGN_MONTH_VETO_SECRET; compared in constant time.
 */
export function signVetoToken(sign: string, month: string, secret: string): string {
  return createHmac('sha256', secret).update(`${sign}:${month}`).digest('hex')
}

export function verifyVetoToken(sign: string, month: string, token: string, secret: string | undefined): boolean {
  if (!secret || !token) return false
  const expected = Buffer.from(signVetoToken(sign, month, secret))
  const provided = Buffer.from(token)
  return expected.length === provided.length && timingSafeEqual(expected, provided)
}
