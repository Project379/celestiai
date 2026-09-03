/**
 * Regulated consumer-facing Bulgarian copy — kept in one place because a
 * lawyer will need to vet the exact wording, and because several of these
 * strings appear on multiple surfaces and must stay identical.
 *
 * This file is registered as a copy content-home (packages/config/eslint/
 * no-new-bg-strings.cjs → CONTENT_HOME_GLOBS: `**​/lib/legal/*.ts`), so the
 * strings here are tracked by check:copy-lock but do not move the
 * check:bg-lint-baseline ratchet.
 */

// STELLAEUM_PLACEHOLDER: ENTITY-NAME — trader-identification values below
// are placeholders. The founder must supply the real operating-entity
// name, ЕИК, registered address and VAT number before launch.
// See .planning/PLACEHOLDERS.md ENTITY-NAME.
export const LEGAL_ENTITY = {
  name: '[юридическо лице — да се попълни]',
  eik: '[ЕИК — да се попълни]',
  address: '[адрес на управление — да се попълни]',
  vat: '[ДДС номер — да се попълни]',
  contactEmail: 'support@stellaeum.com',
  supervisoryAuthority: 'Комисия за защита на потребителите (КЗП)',
  supervisoryAuthorityUrl: 'https://kzp.bg',
} as const

// STELLAEUM_PLACEHOLDER: AI-ACT-COPY — the Article 50 disclosure wording
// below is shipped on the Oracle + horoscope + pricing surfaces but has
// NOT been reviewed by a lawyer. See .planning/PLACEHOLDERS.md AI-ACT-COPY.
/**
 * EU AI Act, Article 50 — disclosure that content a user reads is
 * AI-generated. Shown on the Oracle panel, the daily-horoscope card and
 * the pricing page.
 */
export const AI_GENERATED_DISCLOSURE_BG =
  'Съдържанието е генерирано от изкуствен интелект.'

// STELLAEUM_PLACEHOLDER: WITHDRAWAL-COPY — CRD immediate-performance /
// 14-day-withdrawal consent wording, shipped at Stripe Checkout but NOT
// lawyer-reviewed. See .planning/PLACEHOLDERS.md WITHDRAWAL-COPY.
/**
 * Consumer Rights Directive — shown at Stripe Checkout in place of the
 * default terms-agreement line: consent to immediate performance of the
 * digital service plus acknowledgement that the 14-day withdrawal right
 * is thereby lost.
 */
export const CHECKOUT_IMMEDIATE_PERFORMANCE_CONSENT_BG =
  'Като продължиш, се съгласяваш предоставянето на дигиталната услуга да започне веднага и потвърждаваш, че губиш правото си на отказ в 14-дневен срок.'

/** Page title / meta for the placeholder /terms route. */
export const TERMS_PAGE_TITLE_BG = 'Условия за ползване'
export const TERMS_PAGE_DESCRIPTION_BG = 'Условия за ползване на Stellaeum'
