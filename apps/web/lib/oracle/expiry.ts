import type { ReadingTopic } from './prompts'

/**
 * Reading-expiry policy for `ai_readings.expires_at`.
 *
 * Extracted from `app/api/oracle/generate/route.ts` (2026-09-01): Next.js
 * rejects any non-route export from a `route.ts` file
 * ("NEVER_EXPIRES_AT is not a valid Route export field"), which broke the
 * Vercel production build. The route and its tests import from here now;
 * the route file exports only Next.js-permitted fields.
 *
 * EXPIRY (2026-09-01): a free account's one `general` reading must stay
 * readable forever — it is the whole free tier, not a cache entry. It is
 * written with `expires_at = NEVER_EXPIRES_AT` so neither the route's
 * step-5 cache check nor GET /api/oracle/readings (both filter
 * `expires_at > now`) can ever drop it. Every other reading — all four
 * topics for premium, and love/career/health for anyone — keeps the
 * 7-day cache window. A row already marked non-expiring stays that way
 * across a tier change (see resolveReadingExpiry).
 */

/**
 * Far-future sentinel for a reading that must never expire — the FREE
 * tier's one lifetime `general` reading. `ai_readings.expires_at` is NOT
 * NULL and every read path filters `expires_at > now`, so "never" is a
 * fixed timestamp, not NULL. Exported so a data-restore script and any
 * future migration use the identical literal (`WHERE expires_at =
 * NEVER_EXPIRES_AT` also enumerates the lifetime readings). The exact
 * year is immaterial; it just has to outlast the product.
 *
 * STELLAEUM_PLACEHOLDER: NEVER-EXPIRES-SENTINEL — this literal is also
 * hand-copied into the restore SQL in TIER-DEFINITION-2026-09-01.md §12.
 * The two must stay byte-identical; if this constant changes, that SQL
 * silently stops matching and lifetime readings expire. See
 * .planning/PLACEHOLDERS.md.
 */
export const NEVER_EXPIRES_AT = '2999-12-31T00:00:00.000Z'

const PREMIUM_READING_TTL_DAYS = 7

/**
 * When does the reading we're about to upsert expire?
 *  - Free user + `general`  → NEVER_EXPIRES_AT (the free tier itself).
 *  - A row already at NEVER_EXPIRES_AT stays there, whatever the caller's
 *    current tier — a free→premium→free churn (regenerate while premium,
 *    then downgrade with free_oracle_used_at already set) must not leave
 *    the general reading unreadable.
 *  - Everything else            → generatedAt + 7 days (the cache window).
 */
export function resolveReadingExpiry(
  generatedAt: Date,
  opts: {
    isPremium: boolean
    topic: ReadingTopic
    /** expires_at of the row being replaced, if step 5 found one. */
    previousExpiresAt: string | null
  },
): string {
  if (opts.previousExpiresAt === NEVER_EXPIRES_AT) return NEVER_EXPIRES_AT

  const isFreeLifetimeReading = !opts.isPremium && opts.topic === 'general'
  if (isFreeLifetimeReading) return NEVER_EXPIRES_AT

  const expiresAt = new Date(generatedAt)
  expiresAt.setDate(expiresAt.getDate() + PREMIUM_READING_TTL_DAYS)
  return expiresAt.toISOString()
}
