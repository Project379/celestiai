import { auth } from '@clerk/nextjs/server'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { PricingContent } from './PricingContent'

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
  if (userId) {
    try {
      const supabase = createServiceSupabaseClient()
      const { data: user } = await supabase
        .from('users')
        .select('subscription_tier')
        .eq('clerk_id', userId)
        .single()
      if (user?.subscription_tier) {
        currentTier = user.subscription_tier
      }
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
        priceMonthly={priceMonthly}
        priceAnnual={priceAnnual}
      />
    </Suspense>
  )
}
