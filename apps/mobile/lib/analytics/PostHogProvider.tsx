import { useEffect, useRef } from 'react'
import { useAuth } from '@clerk/expo'

import { getPostHog, initPostHogClient } from './posthog'

/**
 * Identity + lifecycle wiring for the shared client in `posthog.ts`
 * (cookieless/memory-persistence, EU host, every non-instrumented feature
 * off). One effect, mirroring apps/web/components/analytics/
 * PostHogProvider.tsx exactly:
 *
 * Init is gated on Clerk's `isLoaded`, never eager at import — a
 * signed-in cold launch bootstraps the client directly onto the real
 * Clerk ID (`{ distinctId: userId, isIdentifiedId: true }` — RN's
 * bootstrap option is lowercase-`Id`, unlike web posthog-js's
 * `distinctID`/`isIdentifiedID`), so no throwaway anonymous ID is ever
 * minted or merged in for that case.
 * Before this fix, `posthog.ts` constructed the client eagerly at
 * import time with no bootstrap — memory persistence meant every cold
 * app launch minted a fresh anonymous ID, and the identify() call below
 * merged it onto the person every single launch (a component-instance
 * ref can't survive a cold launch to skip it, unlike a long-lived SPA
 * session). One alias per launch, hundreds a year for a daily user —
 * the same pattern PostHog warned about on web.
 *
 * Past the cold-launch bootstrap, `identify()`/`reset()` handle only a
 * real sign-in or sign-out happening later in the same app session — the
 * same `loggedInUserIdRef` guard pattern as `RevenueCatProvider.tsx`
 * (stops `reset()`/`logOut()` firing on a cold anonymous launch, and
 * stops a shared-device sign-out from leaking the previous account's
 * identity into the next session's events), plus a `getDistinctId()`
 * check before `identify()` so a stale ref (e.g. a remount) can't cause
 * a redundant $identify capture — the same double-check as web.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, userId } = useAuth()
  const loggedInUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!isLoaded) return

    const posthog = getPostHog()
    if (!posthog) {
      const initialized = initPostHogClient(
        isSignedIn && userId ? { distinctId: userId, isIdentifiedId: true } : undefined,
      )
      if (initialized && isSignedIn && userId) {
        loggedInUserIdRef.current = userId
      }
      return
    }

    // Past this point: a real sign-in or sign-out happening later in the
    // same app session, not the cold-launch case bootstrap already covers.
    if (isSignedIn && userId) {
      if (posthog.getDistinctId() === userId) {
        loggedInUserIdRef.current = userId
        return
      }
      posthog.identify(userId)
      loggedInUserIdRef.current = userId
      return
    }

    if (loggedInUserIdRef.current !== null) {
      posthog.reset()
      loggedInUserIdRef.current = null
    }
  }, [isLoaded, isSignedIn, userId])

  return <>{children}</>
}
