import { Platform } from 'react-native'

/**
 * Regulated consumer-facing Bulgarian copy for the mobile app. Mirrors
 * apps/web/lib/legal/compliance-copy.ts — kept per-platform because web
 * and mobile do not share a strings package.
 *
 * Registered as a copy content-home (packages/config/eslint/
 * no-new-bg-strings.cjs → CONTENT_HOME_GLOBS: `**​/lib/legal/*.ts`), so
 * these strings are tracked by check:copy-lock without moving the
 * check:bg-lint-baseline ratchet.
 */

/**
 * EU AI Act, Article 50 — disclosure that content a user reads is
 * AI-generated. Shown on the Oracle screen and the daily-horoscope block.
 */
export const AI_GENERATED_DISCLOSURE_BG =
  'Съдържанието е генерирано от изкуствен интелект.'

const STORE = Platform.OS === 'ios' ? 'App Store' : 'Google Play'

/**
 * Subscription-disclosure copy for the paywall (Apple guideline 3.1.2 /
 * Schedule 2, Google Play subscriptions policy). `chargedToStore` must
 * render at the point of decision — before the purchase button, not below
 * it. The subscription name and per-period price are rendered live from
 * the RevenueCat package (`STORE_MANAGED_SUBSCRIPTION.planName` +
 * `pkg.product.priceString` + `PAYWALL.pricePeriod`), not restated here.
 * Terms / privacy links are built from `EXPO_PUBLIC_WEB_APP_URL`.
 */
export const PAYWALL_DISCLOSURE = {
  autoRenewal:
    'Абонаментът се подновява автоматично в края на всеки период, освен ако не го откажеш поне 24 часа преди края му.',
  chargedToStore: `Сумата се начислява към акаунта ти в ${STORE} при потвърждаване на покупката.`,
  cancelInstructions: `Можеш да откажеш по всяко време от настройките за абонаменти в ${STORE}.`,
  termsLinkLabel: 'Условия за ползване',
  privacyLinkLabel: 'Политика за поверителност',
} as const
