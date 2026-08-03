import { useEffect, useRef } from 'react'
import { Platform } from 'react-native'
import { useAuth } from '@clerk/expo'
import Purchases from 'react-native-purchases'

import { logError } from '@/lib/monitoring/logError'

/**
 * P.15 scaffold (closes REVISIT-25's ~60 LOC lift) — SDK install +
 * configure() only. No offerings/purchase/entitlement reads here; that's
 * P.11 (paywall UI) and P.9 (status display), which also depend on
 * REVISIT-62 (the RevenueCat -> users.subscription_tier sync webhook)
 * existing before a mobile purchase can mean anything server-side.
 *
 * Verifying this actually configured, not silently no-opping: react-native-
 * purchases logs "Expo Go app detected. Using RevenueCat in Browser Mode."
 * to console at MODULE LOAD time (before this component even mounts) when
 * running in Expo Go — that's the SDK's own environment-detection log, not
 * proof this component's configure() call ran. This component adds its own
 * explicit logging on top: a breadcrumb/log right after `configure()`
 * resolves, plus an `isConfigured()` read-back — that's the SDK's own
 * internal state, not just "my function call didn't throw." Both signals
 * should be checked together when verifying this on-device or in Expo Go.
 *
 * Identity (REVISIT-62 sub-commit B): `configure()` is called once, with no
 * `appUserID` — RevenueCat starts anonymous. A separate effect below watches
 * Clerk's auth state and calls `Purchases.logIn(clerkUserId)` /
 * `Purchases.logOut()` as it changes, rather than passing `appUserID` to
 * `configure()` directly. `configure()` fires at root-layout mount, before
 * Clerk's session has necessarily resolved (this provider sits inside
 * ClerkProvider, but auth state is still async) — a user signing in some
 * time after launch needs `logIn()`, not a one-shot `appUserID` that would
 * already be stale or absent at configure time. This is RevenueCat's own
 * documented pattern for apps whose auth system Purchases isn't the source
 * of truth for. Without this, no webhook can ever associate a purchase with
 * a Clerk user — RevenueCat would only ever know its own anonymous
 * `$RCAnonymousID`, not who that maps to in `users.clerk_id`.
 *
 * Sign-out (the cross-account leak this exists to prevent): on a shared
 * device, if `logOut()` is never called, the next person to sign in
 * inherits the previous Clerk user's RevenueCat identity — their purchase
 * history, entitlements, everything. The identity effect tracks the last
 * `userId` it successfully logged in via `loggedInUserIdRef`; when Clerk
 * reports `isSignedIn: false` and that ref is non-null (a real sign-out,
 * not just "never signed in yet"), it calls `logOut()` and clears the ref.
 * `logOut()` is guarded by the ref rather than called unconditionally,
 * because the native SDK rejects with `LogOutWithAnonymousUserError` if
 * called while already anonymous — calling it on every render or on first
 * cold launch (never having logged in) would throw needlessly.
 */

const PLACEHOLDER_PREFIX = 'REPLACE_WITH_'

export function RevenueCatProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, userId } = useAuth()
  const loggedInUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    const apiKey = Platform.select({
      ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
      android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
    })

    if (!apiKey) {
      logError(
        'ERR-MOB-RC-001',
        new Error(`Missing RevenueCat API key env var for platform "${Platform.OS}"`),
      )
      return
    }

    if (apiKey.startsWith(PLACEHOLDER_PREFIX)) {
      // Loud, not silent: this is expected pre-dashboard-config, but must
      // never pass unnoticed once real purchases matter. Doesn't block
      // configure() below — Expo Go's Browser Mode mocks the call
      // regardless of key validity, so continuing here doesn't risk
      // anything in dev; a real Dev Client build with this same
      // placeholder would fail loudly inside the try/catch below instead.
      logError(
        'ERR-MOB-RC-002',
        new Error(
          `RevenueCat configured with a placeholder API key (${apiKey}) for platform "${Platform.OS}" — replace it with a real key from the RevenueCat dashboard before purchases can work.`,
        ),
      )
    }

    try {
      Purchases.configure({ apiKey })
      console.log(`[RevenueCat] configure() called for platform "${Platform.OS}"`)
      void Purchases.isConfigured().then((configured) => {
        console.log(`[RevenueCat] isConfigured() -> ${configured}`)
      })
    } catch (err) {
      logError('ERR-MOB-RC-003', err)
    }
  }, [])

  // Identity — runs after the configure() effect above on every render
  // where Clerk's auth state changes. Declared second so the initial
  // mount always configures before attempting logIn/logOut (both throw
  // if configure() hasn't run yet).
  useEffect(() => {
    if (!isLoaded) return

    if (isSignedIn && userId) {
      if (loggedInUserIdRef.current === userId) return
      Purchases.logIn(userId)
        .then(({ created }) => {
          loggedInUserIdRef.current = userId
          // Verification checkpoint (REVISIT-62): confirm this exact Clerk
          // userId matches what you see for your account in the app, and
          // that it appears in RevenueCat's dashboard under this same ID.
          // Remove once verified — not meant to stay long-term.
          console.log(`[RevenueCat][VERIFY] logIn() succeeded — Clerk userId="${userId}", created=${created}`)
        })
        .catch((err) => logError('ERR-MOB-RC-004', err))
      return
    }

    // isSignedIn === false. Only log out if we previously identified
    // someone — an anonymous cold launch that never signed in has nothing
    // to log out of, and logOut() rejects in that case.
    if (loggedInUserIdRef.current !== null) {
      const previousUserId = loggedInUserIdRef.current
      Purchases.logOut()
        .then(() => {
          loggedInUserIdRef.current = null
          console.log(`[RevenueCat] logOut() -> cleared userId=${previousUserId}`)
        })
        .catch((err) => logError('ERR-MOB-RC-005', err))
    }
  }, [isLoaded, isSignedIn, userId])

  return <>{children}</>
}
