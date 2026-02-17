import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { stripe } from '@/lib/stripe/client'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { SettingsContent } from './SettingsContent'

interface SubscriptionData {
  status: string
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: number
  paymentMethodBrand: string | null
  paymentMethodLast4: string | null
  interval: 'month' | 'year' | null
}

/**
 * /settings — Subscription management page.
 * Server component: fetches user + Stripe subscription data, passes to client.
 */
export default async function SettingsPage() {
  const { userId } = await auth()
  if (!userId) {
    redirect('/auth')
  }

  // Fetch user from Supabase
  const supabase = createServiceSupabaseClient()
  const { data: user } = await supabase
    .from('users')
    .select('subscription_tier, stripe_subscription_id, subscription_expires_at, stripe_customer_id')
    .eq('clerk_id', userId)
    .single()

  const tier = user?.subscription_tier ?? 'free'
  const subscriptionExpiresAt = user?.subscription_expires_at ?? null

  // If user has a subscription ID, fetch full details from Stripe
  let subscriptionData: SubscriptionData | null = null
  if (user?.stripe_subscription_id) {
    try {
      const sub = await stripe.subscriptions.retrieve(user.stripe_subscription_id, {
        expand: ['default_payment_method'],
      })

      const item = sub.items.data[0]
      const periodEnd = item?.current_period_end ?? 0
      const priceInterval = item?.price?.recurring?.interval ?? null

      let brand: string | null = null
      let last4: string | null = null

      if (sub.default_payment_method && typeof sub.default_payment_method !== 'string') {
        const pm = sub.default_payment_method
        if (pm.card) {
          brand = pm.card.brand ?? null
          last4 = pm.card.last4 ?? null
        }
      }

      subscriptionData = {
        status: sub.status,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        currentPeriodEnd: periodEnd,
        paymentMethodBrand: brand,
        paymentMethodLast4: last4,
        interval: priceInterval as 'month' | 'year' | null,
      }
    } catch (err) {
      console.error('[Settings] Failed to retrieve Stripe subscription:', err)
      // Proceed with null subscriptionData — settings page handles gracefully
    }
  }

  return (
    <SettingsContent
      tier={tier}
      subscriptionData={subscriptionData}
      subscriptionExpiresAt={subscriptionExpiresAt}
    />
  )
}
