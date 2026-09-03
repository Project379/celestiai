import PostHog from 'posthog-react-native'

/**
 * Shared PostHog client singleton. Deliberately NOT using the library's
 * own `<PostHogProvider>` (posthog-react-native/dist/PostHogProvider) —
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
 */

const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST

function createClient(): PostHog | null {
  if (!POSTHOG_KEY || !POSTHOG_HOST) {
    console.error(
      '[PostHog] Missing EXPO_PUBLIC_POSTHOG_KEY / EXPO_PUBLIC_POSTHOG_HOST — analytics disabled.',
    )
    return null
  }
  return new PostHog(POSTHOG_KEY, {
    host: POSTHOG_HOST,
    persistence: 'memory',
    captureAppLifecycleEvents: false,
    enableSessionReplay: false,
    disableSurveys: true,
    disableRemoteFeatureFlags: true,
    preloadFeatureFlags: false,
    disableGeoip: true,
  })
}

export const posthog: PostHog | null = createClient()
