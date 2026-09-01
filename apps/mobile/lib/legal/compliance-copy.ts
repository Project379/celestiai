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
