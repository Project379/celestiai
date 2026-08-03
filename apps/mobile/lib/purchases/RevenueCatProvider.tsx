import { useEffect } from 'react'
import { Platform } from 'react-native'
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
 */

const PLACEHOLDER_PREFIX = 'REPLACE_WITH_'

export function RevenueCatProvider({ children }: { children: React.ReactNode }) {
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

  return <>{children}</>
}
