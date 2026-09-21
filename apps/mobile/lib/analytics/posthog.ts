import PostHog from 'posthog-react-native'

/**
 * Shared PostHog client. Deliberately NOT using the library's own
 * `<PostHogProvider>` (posthog-react-native/dist/PostHogProvider) —
 * that component's `autocapture` default turns on `captureScreens: true`
 * and `captureAppLifecycleEvents: true`, which would violate "five
 * events, no more." A plain instance, imported wherever a capture()/
 * identify()/reset() call is needed, keeps every option explicit here
 * instead of split across a Provider prop and client options.
 *
 * `persistence: 'memory'` — RN has no cookies to begin with (its
 * built-in persistence is a JSON file / AsyncStorage, never a browser
 * cookie), so the COOKIE-CONSENT argument is web-only. Memory persistence
 * here is chosen for parity with the web config and because it's the
 * cheapest "leaves nothing behind between app launches" option, not
 * because mobile needed a cookie fix.
 *
 * `captureAppLifecycleEvents: false` is the one default that would
 * otherwise silently add three more event types (Application Installed /
 * Opened / Updated) on top of the five this app instruments.
 *
 * Construction is deliberately NOT eager at module import — `PostHogProvider`
 * calls `initPostHogClient()` exactly once, gated on Clerk's `isLoaded`, so a
 * signed-in cold launch can bootstrap directly onto the real Clerk ID
 * instead of minting a throwaway anonymous ID every launch and merging it
 * in via identify() on every one. That merge-per-launch churn (one alias
 * per cold launch, hundreds a year for a daily user) is exactly the pattern
 * PostHog warned about on web before apps/web/components/analytics/
 * PostHogProvider.tsx was fixed the same way — see that file for the
 * mirrored logic. Every other call site reaches the client through
 * `getPostHog()`, never a module-level eager singleton, so it's `null`
 * (and every `getPostHog()?.capture(...)` call site a safe no-op) until
 * `PostHogProvider` has actually initialized it.
 */

const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST

// NOTE the casing: posthog-react-native's bootstrap option (@posthog/core's
// PostHogCoreOptions) uses `distinctId`/`isIdentifiedId` — lowercase `Id`,
// NOT web posthog-js's `distinctID`/`isIdentifiedID`. Caught by `tsc`, not
// by inspection — the two SDKs' bootstrap shapes genuinely differ.
export interface PostHogBootstrap {
  distinctId: string
  isIdentifiedId: true
}

let client: PostHog | null = null
let didInit = false

/**
 * Constructs the shared client exactly once. A second call is a no-op
 * that returns the already-constructed client (mirrors the `didInit`
 * guard in apps/web's PostHogProvider.tsx) — PostHogProvider's effect
 * calls this on every isLoaded/isSignedIn/userId change, not just once,
 * so this function itself has to be the idempotency boundary.
 */
export function initPostHogClient(bootstrap?: PostHogBootstrap): PostHog | null {
  if (didInit) return client
  didInit = true

  if (!POSTHOG_KEY || !POSTHOG_HOST) {
    console.error(
      '[PostHog] Missing EXPO_PUBLIC_POSTHOG_KEY / EXPO_PUBLIC_POSTHOG_HOST — analytics disabled.',
    )
    return null
  }

  client = new PostHog(POSTHOG_KEY, {
    host: POSTHOG_HOST,
    persistence: 'memory',
    captureAppLifecycleEvents: false,
    enableSessionReplay: false,
    disableSurveys: true,
    disableRemoteFeatureFlags: true,
    preloadFeatureFlags: false,
    disableGeoip: true,
    ...(bootstrap ? { bootstrap } : {}),
  })
  return client
}

/** The client, or `null` before `PostHogProvider` has initialized it. */
export function getPostHog(): PostHog | null {
  return client
}
