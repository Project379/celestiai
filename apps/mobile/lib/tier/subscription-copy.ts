import { Platform } from 'react-native'

/**
 * Bulgarian copy for the subscription status/management screen
 * (`/you/premium`) — the paying-user side, distinct from the free-tier
 * locked-state strings in `./locked-copy.ts`.
 *
 * Content-home (packages/config/eslint/no-new-bg-strings.cjs →
 * CONTENT_HOME_GLOBS: `**​/lib/tier/*.ts`) — tracked by check:copy-lock,
 * does not move the check:bg-lint-baseline ratchet.
 *
 * Store name is platform-aware: "App Store" on iOS, "Google Play" on
 * Android. The full string is composed here (not `${STORE}` at each call
 * site) so check:copy-lock sees one stable entry per platform build.
 */

const STORE = Platform.OS === 'ios' ? 'App Store' : 'Google Play'

/**
 * Deep link to the OS-level subscription management screen. iOS opens the
 * account subscriptions page directly; Android opens Play's subscriptions
 * list. Apple guideline 3.1.1 — an IAP subscription is managed here, never
 * through an in-app Stripe portal.
 */
export const STORE_SUBSCRIPTIONS_URL =
  Platform.OS === 'ios'
    ? 'itms-apps://apps.apple.com/account/subscriptions'
    : 'https://play.google.com/store/account/subscriptions'

/** Status screen for a premium user whose subscription came from IAP. */
export const STORE_MANAGED_SUBSCRIPTION = {
  planName: 'Stellaeum Премиум',
  statusBadge: 'Активен',
  activeUntilLabel: 'Активен до',
  managedNote: `Този абонамент е закупен през ${STORE} и се управлява оттам.`,
  manageButtonLabel: `Управление в ${STORE}`,
} as const
