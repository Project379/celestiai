import * as Sentry from '@sentry/react-native'

/**
 * Mobile Sentry init — side-effect import from app/_layout.tsx.
 *
 * Mirrors the conservative-defaults posture from web's §10 close
 * (apps/web/instrumentation-client.ts + sentry.{server,edge}.config.ts):
 * sendDefaultPii: false, tracesSampleRate: 0, no replay, no logs. Don't
 * expand without evidence of a need (founder feedback memory).
 *
 * DSN is gated explicitly — when EXPO_PUBLIC_SENTRY_DSN is unset (local
 * dev without a configured project) we no-op rather than letting Sentry
 * warn at startup. Production builds set the var via EAS env.
 *
 * Native crash tracking activates only on Dev Client / standalone builds
 * via the @sentry/react-native config plugin (auto-added to app.json on
 * install). Expo Go limits us to JS-side error capture, which is fine for
 * the SR 8 scaffold and verification path.
 */

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    enableAutoPerformanceTracing: false,
  })
}
