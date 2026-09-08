import { useCallback, useState } from 'react'
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
 * So on a successful purchase this hook does NOT set any local "isPremium"
 * — it invalidates the subscription query and refetches it on a bounded
 * poll until the server itself reports `tier === 'premium'`. The caller
 * renders a distinct "activating" state for that window, and a
 * "still activating" state if the poll times out (the purchase still
 * succeeded — never an error). `isPremium` everywhere else in the app
 * stays derived from `useSubscription()`, i.e. the server.
 */

const ACTIVATION_POLL_ATTEMPTS = 10
const ACTIVATION_POLL_INTERVAL_MS = 3000

export type PurchaseFlowStatus =
  | 'idle'
  | 'purchasing' // native purchase sheet is up / request in flight
  | 'activating' // purchase succeeded, waiting for the server tier to flip
  | 'active' // server now reports premium — caller should re-render unlocked
  | 'cancelled' // user dismissed the native sheet — NOT an error
  | 'activation-timeout' // purchase succeeded but the webhook has not landed yet
  | 'error' // a real failure — network, store problem, invalid product

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

  const reset = useCallback(() => setStatus('idle'), [])

  /**
   * Refetch the server subscription overview until it reports premium, or
   * until the bounded attempts run out. Returns true if the server flipped.
   */
  const waitForServerPremium = useCallback(async (): Promise<boolean> => {
    for (let attempt = 0; attempt < ACTIVATION_POLL_ATTEMPTS; attempt++) {
      await queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_KEY })
      try {
        const overview = (await apiFetch('/api/stripe/subscription')) as SubscriptionOverview
        queryClient.setQueryData(SUBSCRIPTION_KEY, overview)
        if (overview.tier === 'premium') return true
      } catch {
        // transient — keep polling
      }
      await delay(ACTIVATION_POLL_INTERVAL_MS)
    }
    return false
  }, [apiFetch, queryClient])

  const purchase = useCallback(
    async (pkg: PurchasesPackage) => {
      setStatus('purchasing')
      try {
        await Purchases.purchasePackage(pkg)
      } catch (err) {
        if (isPurchasesError(err) && err.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
          setStatus('cancelled')
          return
        }
        logError('ERR-MOB-RC-008', err)
        setStatus('error')
        return
      }
      // Purchase accepted by the store. Do NOT unlock on the SDK
      // entitlement — wait for the server tier.
      setStatus('activating')
      const flipped = await waitForServerPremium()
      setStatus(flipped ? 'active' : 'activation-timeout')
    },
    [waitForServerPremium],
  )

  /**
   * App Store requires a restore control. After a restore, apply the same
   * server-tier wait: a restored entitlement still has to reach the DB via
   * the webhook (RevenueCat fires a transfer/renewal event). Returns
   * whether an active `premium` entitlement was found at all, so the caller
   * can distinguish "nothing to restore" from "restored, now activating".
   */
  const restore = useCallback(async (): Promise<boolean> => {
    setStatus('purchasing')
    try {
      const customerInfo = await Purchases.restorePurchases()
      const hasPremium = customerInfo.entitlements.active['premium'] != null
      if (!hasPremium) {
        setStatus('idle')
        return false
      }
      setStatus('activating')
      const flipped = await waitForServerPremium()
      setStatus(flipped ? 'active' : 'activation-timeout')
      return true
    } catch (err) {
      if (isPurchasesError(err) && err.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
        setStatus('idle')
        return false
      }
      logError('ERR-MOB-RC-009', err)
      setStatus('error')
      return false
    }
  }, [waitForServerPremium])

  return { status, purchase, restore, reset }
}
