import { timingSafeEqual } from 'node:crypto'

/**
 * Constant-time comparison for the CRON_SECRET bearer check shared by both
 * cron routes (Batch 5.5 #22). Plain `!==` on the raw strings permits a
 * timing side-channel that could in principle let an attacker recover the
 * secret byte-by-byte; low real-world exploitability given normal network
 * jitter, but the fix is cheap and this is the exact class of comparison
 * timingSafeEqual exists for. Length-checked first — timingSafeEqual
 * throws on mismatched buffer lengths rather than returning false.
 */
export function verifyCronSecret(authHeader: string | null, cronSecret: string | undefined): boolean {
  if (!cronSecret || !authHeader) return false

  const expected = Buffer.from(`Bearer ${cronSecret}`)
  const provided = Buffer.from(authHeader)

  // Non-revealing diagnostic marker (SMOKE-TEST): the three cron probes were
  // returning 401 with nothing in the runtime logs to say whether the secret
  // VALUE differed or just its length (a trailing newline in a pasted secret
  // fails the length check below before timingSafeEqual runs). warn, not
  // Sentry — these are public routes and take unauthorized internet traffic.
  // Never logs the values, a prefix, or a hash — only which check failed and
  // the two byte lengths (each = secret length + 7 for "Bearer ").
  if (expected.length !== provided.length) {
    console.warn(
      `[cron-auth] secret mismatch: length (expected ${expected.length}, provided ${provided.length})`,
    )
    return false
  }

  if (!timingSafeEqual(expected, provided)) {
    console.warn(`[cron-auth] secret mismatch: value (both length ${expected.length})`)
    return false
  }

  return true
}
