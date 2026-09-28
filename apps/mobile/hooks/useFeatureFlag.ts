/**
 * Feature-flag kill switches for AI features.
 *
 * Closes Phase A DOD §13.5 "Feature-flag kill switches for every AI
 * feature (Днес hero, Oracle, notifications) — if costs spike, turn it
 * off without redeploying." Three flags scoped per founder D4
 * ratification:
 *
 *   - daily_horoscope → EXPO_PUBLIC_FF_DAILY_HOROSCOPE  (Днес hero)
 *   - oracle          → EXPO_PUBLIC_FF_ORACLE           (Oracle screen)
 *   - push            → EXPO_PUBLIC_FF_PUSH             (push permission scaffold, SR 8.3)
 *
 * Default behavior: any flag is ON unless its env var is explicitly set
 * to the string 'false'. Founder flips the var via EAS build env or
 * .env.local, rebuilds, ships — the EXPO_PUBLIC_ prefix means the value
 * is inlined at bundle time, so a flip requires a fresh JS bundle to
 * propagate. That's expected for an emergency cost-control switch (not
 * a runtime A/B toggle).
 *
 * A fourth flag, media_recommendations, is DIFFERENT SHAPE on purpose —
 * default OFF, 'true' turns it on — gating a feature that must stay off
 * until RECOMMENDATION-CONTENT-LICENSING resolves (TMDB/Open Library
 * content has no confirmed commercial redistribution rights). See
 * apps/web/lib/config/featureFlags.ts for the server-side twin and
 * .planning/PLACEHOLDERS.md for the tracked row.
 *
 * Vendor swap path (post-launch, REVISIT when a flagging vendor lands):
 * replace this module's body with a call to PostHog / GrowthBook / etc.
 * Consumer call sites use the hook pattern and will not need to change.
 *
 * Hook (not function) on purpose — vendor SDKs typically need Suspense
 * or async resolution; naming it `useFeatureFlag` upfront means the
 * call-site refactor is zero LOC at vendor-swap time.
 */

export type FeatureFlag = 'daily_horoscope' | 'oracle' | 'push' | 'media_recommendations'

export function useFeatureFlag(flag: FeatureFlag): boolean {
  switch (flag) {
    case 'daily_horoscope':
      return process.env.EXPO_PUBLIC_FF_DAILY_HOROSCOPE !== 'false'
    case 'oracle':
      return process.env.EXPO_PUBLIC_FF_ORACLE !== 'false'
    case 'push':
      return process.env.EXPO_PUBLIC_FF_PUSH !== 'false'
    case 'media_recommendations':
      return process.env.EXPO_PUBLIC_FF_MEDIA_RECOMMENDATIONS === 'true'
  }
}
