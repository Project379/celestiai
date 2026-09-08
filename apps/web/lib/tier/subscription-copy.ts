/**
 * Bulgarian copy for the web account-settings subscription surface
 * (SettingsContent, inside the Clerk profile popover) — the paying-user
 * side, distinct from the free-tier locked-state strings in
 * ./locked-copy.ts.
 *
 * Content-home (packages/config/eslint/no-new-bg-strings.cjs →
 * CONTENT_HOME_GLOBS: `**​/lib/tier/*.ts`) — tracked by check:copy-lock,
 * does not move the check:bg-lint-baseline ratchet.
 *
 * Web cannot tell App Store from Play: `subscription_provider` records
 * only 'revenuecat', not which store. So the store-managed note names
 * both rather than guessing (founder decision A1, 2026-09-08).
 */

/** Status view for a premium user whose subscription came from mobile IAP. */
export const STORE_MANAGED_SUBSCRIPTION = {
  planName: 'Stellaeum Премиум',
  statusBadge: 'Активен',
  activeUntilLabel: 'Активен до',
  managedNote:
    'Този абонамент е закупен през App Store или Google Play и се управлява оттам.',
} as const
