import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Purchases, {
  PURCHASES_ERROR_CODE,
  type PurchasesError,
  type PurchasesPackage,
} from 'react-native-purchases'

import { useApiClient } from '@/lib/api/client'
import { logError } from '@/lib/monitoring/logError'
import { SUBSCRIPTION_KEY, type SubscriptionOverview } from '@/hooks/useSubscription'

/**
 * Phase 2 paywall — offerings, purchase, restore, and the
 * purchase→webhook activation window.
 *
 * SERVER TIER IS THE GATE. A purchase that RevenueCat accepts flips
 * `customerInfo.entitlements.active.premium` locally *immediately*, but
 * `users.subscription_tier` only flips once the RevenueCat webhook reaches
 * `/api/webhooks/revenuecat` and updates the row. Every server route gates
 * on the DB tier, so trusting the SDK entitlement to unlock the UI would
 * show a premium app whose every API call 403s.
 *
 * On a successful purchase this hook does NOT set any local "isPremium".
 * It refetches the subscription overview until the *server* itself reports
 * `tier === 'premium'`: a short fast phase ('activating', spinner-worthy),
 * then a longer quiet phase where the caller shows a "coming in a few
 * minutes" message but polling continues silently so it self-heals with
 * no user gesture. `isPremium` everywhere else stays derived from the
 * server via `useSubscription()`.
 *
 * MUST be mounted somewhere that outlives the paywall itself (e.g. the
 * screen, not the free-tier branch) — when the server tier flips, the
 * branch that renders the paywall unmounts, and an in-flight poll whose
 * state lived in that branch would be setting state on a dead component.
 */

const FAST_POLL_ATTEMPTS = 6
const FAST_POLL_INTERVAL_MS = 3000
const SLOW_POLL_ATTEMPTS = 12
const SLOW_POLL_INTERVAL_MS = 6000

export type PurchaseFlowStatus =
  | 'idle'
  | 'purchasing' // native purchase / restore sheet is up
  | 'activating' // purchase succeeded, first poll for the server tier
  | 'activation-timeout' // still polling, quietly — server tier not flipped yet
  | 'active' // server now reports premium — the screen re-renders unlocked
  | 'cancelled' // user dismissed the native sheet — NOT an error
  | 'error' // a real failure — network, store problem, invalid product

export type RestoreResult = 'restored' | 'none' | 'cancelled' | 'error'

export interface PaywallPackage {
  /** The RevenueCat package. Passed straight back to `purchase()`. */
  pkg: PurchasesPackage
  /** `MONTHLY` | `ANNUAL` | … — the identifier is deliberately not used. */
  packageType: PurchasesPackage['packageType']
  /** Localized price string from the store (e.g. "6,99 €"). Never hardcoded. */
  priceString: string
  /** Numeric price + currency, for anything that needs to compute. */
  price: number
  currencyCode: string
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

function isPurchasesError(err: unknown): err is PurchasesError {
  return typeof err === 'object' && err !== null && 'code' in err && 'message' in err
}

function isCancel(err: unknown): boolean {
  return isPurchasesError(err) && err.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
}

/**
 * `offerings.current` — never `offerings.all['<identifier>']`. The offering
 * identifier ("default1") is not load-bearing; "current" is whatever the
 * dashboard marks current.
 */
export function useOfferings() {
  return useQuery<PaywallPackage[]>({
    queryKey: ['revenuecat-offerings'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const offerings = await Purchases.getOfferings()
      const current = offerings.current
      if (!current || current.availablePackages.length === 0) {
        throw new Error('No current RevenueCat offering / no available packages')
      }
      return current.availablePackages.map((pkg) => ({
        pkg,
        packageType: pkg.packageType,
        priceString: pkg.product.priceString,
        price: pkg.product.price,
        currencyCode: pkg.product.currencyCode,
      }))
    },
  })
}

export function usePurchaseFlow() {
  const queryClient = useQueryClient()
  const { apiFetch } = useApiClient()
  const [status, setStatus] = useState<PurchaseFlowStatus>('idle')

  // Guards against a late poll iteration setting state after this hook's
  // owner unmounts (leaving the screen entirely).
  const aliveRef = useRef(true)
  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
    }
  }, [])
  const set = useCallback((s: PurchaseFlowStatus) => {
    if (aliveRef.current) setStatus(s)
  }, [])

  const reset = useCallback(() => set('idle'), [set])

  /** One server-tier check. Returns true once the DB reports premium. */
  const serverIsPremium = useCallback(async (): Promise<boolean> => {
    try {
      const overview = (await apiFetch('/api/stripe/subscription')) as SubscriptionOverview
      queryClient.setQueryData(SUBSCRIPTION_KEY, overview)
      return overview.tier === 'premium'
    } catch {
      return false
    }
  }, [apiFetch, queryClient])

  /**
   * Poll until the server flips. Fast phase reports 'activating'; if that
   * runs out it drops to 'activation-timeout' and keeps polling quietly.
   */
  const waitForServerPremium = useCallback(async () => {
    for (let i = 0; i < FAST_POLL_ATTEMPTS; i++) {
      if (!aliveRef.current) return
      if (await serverIsPremium()) return set('active')
      await delay(FAST_POLL_INTERVAL_MS)
    }
    set('activation-timeout')
    for (let i = 0; i < SLOW_POLL_ATTEMPTS; i++) {
      if (!aliveRef.current) return
      await delay(SLOW_POLL_INTERVAL_MS)
      if (await serverIsPremium()) return set('active')
    }
    // Give up polling; leave the status at 'activation-timeout'. The
    // purchase still succeeded — useSubscription's own refetch (focus /
    // reconnect) will eventually surface premium and re-render the screen.
  }, [serverIsPremium, set])

  const purchase = useCallback(
    async (pkg: PurchasesPackage) => {
      set('purchasing')
      try {
        await Purchases.purchasePackage(pkg)
      } catch (err) {
        if (isCancel(err)) return set('cancelled')
        logError('ERR-MOB-RC-008', err)
        return set('error')
      }
      set('activating')
      await waitForServerPremium()
    },
    [set, waitForServerPremium],
  )

  /**
   * App Store requires a restore control. A restored entitlement still has
   * to reach the DB via the webhook, so it gets the same server-tier wait.
   * The result is discriminated so the caller shows "nothing to restore"
   * ONLY for `'none'` — not for a cancel or an error.
   */
  const restore = useCallback(async (): Promise<RestoreResult> => {
    set('purchasing')
    try {
      const customerInfo = await Purchases.restorePurchases()
      if (customerInfo.entitlements.active['premium'] == null) {
        set('idle')
        return 'none'
      }
      set('activating')
      await waitForServerPremium()
      return 'restored'
    } catch (err) {
      if (isCancel(err)) {
        set('idle')
        return 'cancelled'
      }
      logError('ERR-MOB-RC-009', err)
      set('error')
      return 'error'
    }
  }, [set, waitForServerPremium])

  return { status, purchase, restore, reset }
}
