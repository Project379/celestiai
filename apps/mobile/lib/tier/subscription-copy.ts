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

/**
 * Paywall — the offerings-driven purchase surface in `/you/premium`'s
 * free / expired branch. Package name + price-period suffix are keyed by
 * RevenueCat's `PACKAGE_TYPE` string; anything not monthly/annual falls
 * back to no suffix (the price string alone still renders).
 */
export const PAYWALL = {
  packageLabel: {
    MONTHLY: 'Месечен',
    ANNUAL: 'Годишен',
  } as Record<string, string | undefined>,
  pricePeriod: {
    MONTHLY: 'на месец',
    ANNUAL: 'на година',
  } as Record<string, string | undefined>,
  purchaseButton: 'Абонирай се',
  restoreButton: 'Възстанови покупките',
  /** CTA on the Oracle free-cap surface — matches web's ratified label. */
  unlockCta: 'Отключи Премиум',
} as const

/** Purchase-flow status messages (see usePaywall.ts `PurchaseFlowStatus`). */
export const PURCHASE_FLOW_COPY = {
  activating: 'Плащането е успешно. Активираме Премиум…',
  activationTimeout: 'Плащането е успешно. Премиум се активира до няколко минути.',
  error: 'Плащането не беше завършено. Опитай отново.',
  restoreNothingFound: 'Няма покупки за възстановяване с този профил.',
  /** Offerings couldn't load (SDK not configured, network); the web
   *  checkout fallback renders under this. Added 2026-09-08. */
  offeringsUnavailable: 'Плановете не се заредиха.',
} as const
