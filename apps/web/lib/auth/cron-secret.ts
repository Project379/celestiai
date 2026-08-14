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

  return expected.length === provided.length && timingSafeEqual(expected, provided)
}
