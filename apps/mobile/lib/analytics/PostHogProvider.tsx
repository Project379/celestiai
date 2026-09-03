import { useEffect, useRef } from 'react'
import { useAuth } from '@clerk/expo'

import { posthog } from './posthog'

/**
 * Identity wiring only — the client itself is the module-level singleton
 * in `posthog.ts` (already configured cookieless/memory-persistence,
 * EU host, and with every non-instrumented feature off). Mirrors
 * `lib/purchases/RevenueCatProvider.tsx`'s identity pattern exactly: the
 * same Clerk user id is the distinct_id here that RevenueCat already
 * uses as `appUserID` — never email, never name — and the same
 * `loggedInUserIdRef` guard that stops `reset()`/`logOut()` firing on a
 * cold anonymous launch, and stops a shared-device sign-out from leaking
 * the previous account's identity into the next session's events.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, userId } = useAuth()
  const loggedInUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!isLoaded || !posthog) return

    if (isSignedIn && userId) {
      if (loggedInUserIdRef.current === userId) return
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
