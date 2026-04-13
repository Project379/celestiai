import { auth } from '@clerk/nextjs/server'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { PricingContent } from './PricingContent'
import { ensureUserRecord } from '@/lib/users/ensure-user'

export const metadata: Metadata = {
  title: 'Цени',
  description: 'Избери план, който ти подхожда — без скрити такси',
}

/**
 * /pricing — Subscription plan comparison page.
 *
 * Server component: fetches current user tier and passes price IDs to client.
 * Free users see an upgrade button that redirects to Stripe Checkout.
 * Premium users see their active plan badge and a manage subscription link.
 */
export default async function PricingPage() {
  const { userId } = await auth()

  let currentTier = 'free'
  let currentStatus = 'inactive'
  let trialEligible = false
  if (userId) {
    try {
      const user = await ensureUserRecord(userId)
      currentTier = user.subscription_tier
      currentStatus = user.subscription_status
      trialEligible = !user.trial_claimed_at && user.subscription_tier !== 'premium'
    } catch {
      // Default to free tier if lookup fails
    }
  }

  const priceMonthly = process.env.STRIPE_PRICE_MONTHLY ?? ''
  const priceAnnual = process.env.STRIPE_PRICE_ANNUAL ?? ''

  return (
    <Suspense fallback={<div className="px-4 py-16 text-center text-white/40">Зареждане...</div>}>
      <PricingContent
        currentTier={currentTier}
        currentStatus={currentStatus}
        trialEligible={trialEligible}
        priceMonthly={priceMonthly}
        priceAnnual={priceAnnual}
      />
    </Suspense>
  )
}
