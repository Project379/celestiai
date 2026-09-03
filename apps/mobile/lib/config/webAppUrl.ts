import { logError } from '@/lib/monitoring/logError'

const PLACEHOLDER_PREFIX = 'REPLACE_WITH_'

let warned = false

/**
 * Batch 5: resolves the deployed web app's base URL for the /you/premium
 * free-state CTA (no native purchase flow exists yet — it sends users to
 * web's /pricing instead). Same placeholder-detection shape as
 * RevenueCatProvider's API-key check: an unset or still-placeholder value
 * logs loudly (once, not per-render) and returns null rather than handing
 * back a dead link. Callers must treat null as "don't render this CTA,"
 * not fall back to any default — there is no safe default domain to guess
 * at (web has no confirmed live deployment as of 2026-08-14).
 */
export function getWebAppUrl(): string | null {
  // STELLAEUM_PLACEHOLDER: APP-URL-MOBILE — EXPO_PUBLIC_WEB_APP_URL is
  // unset / still a REPLACE_WITH_ placeholder in every environment, so this
  // guard returns null and the /you/premium web-pricing fallback CTA never
  // renders. The guard itself is real; the value behind it is missing.
  // See .planning/PLACEHOLDERS.md.
  const value = process.env.EXPO_PUBLIC_WEB_APP_URL

  if (!value || value.startsWith(PLACEHOLDER_PREFIX)) {
    if (!warned) {
      warned = true
      logError(
        'ERR-MOB-WEBURL-001',
        new Error(
          `EXPO_PUBLIC_WEB_APP_URL is missing or still a placeholder ("${value}") — the /you/premium free-state "subscribe on web" CTA has nothing to link to and will not render until this is set to the real deployed domain.`,
        ),
      )
    }
    return null
  }

  return value.replace(/\/$/, '')
}

export function getWebPricingUrl(): string | null {
  const base = getWebAppUrl()
  return base ? `${base}/pricing` : null
}
