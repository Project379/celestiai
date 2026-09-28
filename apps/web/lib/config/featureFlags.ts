/**
 * Server-side feature flags — request-time env reads inside route handlers
 * / server components, never NEXT_PUBLIC_ (not needed client-side; these
 * gate server behavior, and the client never sees the flag value directly —
 * it only sees the effect, an absent nav entry or a 404).
 *
 * Mirrors apps/mobile/hooks/useFeatureFlag.ts's naming and shape, but the
 * DEFAULT direction is inverted: mobile's flags are cost-control kill
 * switches (default ON, 'false' turns off). This one gates a feature that
 * must stay OFF until RECOMMENDATION-CONTENT-LICENSING resolves — default
 * OFF, the var must be explicitly 'true' to turn it on. See
 * .planning/PLACEHOLDERS.md RECOMMENDATION-CONTENT-LICENSING.
 */
export function isMediaRecommendationsEnabled(): boolean {
  return process.env.FF_MEDIA_RECOMMENDATIONS === 'true'
}
