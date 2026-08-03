import { stripe } from '@/lib/stripe/client'
import {
  ensureUserRecord,
  type SubscriptionStatus,
  type SubscriptionTier,
} from '@/lib/users/ensure-user'

export interface SubscriptionData {
  status: string
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: number
  paymentMethodBrand: string | null
  paymentMethodLast4: string | null
  interval: 'month' | 'year' | null
}

export interface SubscriptionOverview {
  tier: SubscriptionTier
  subscriptionStatus: SubscriptionStatus
  subscriptionData: SubscriptionData | null
  subscriptionExpiresAt: string | null
}

export async function getSubscriptionOverview(userId: string): Promise<SubscriptionOverview> {
  const user = await ensureUserRecord(userId)
  const tier = user.subscription_tier
  const subscriptionStatus = user.subscription_status
  const subscriptionExpiresAt = user.subscription_expires_at

  let subscriptionData: SubscriptionData | null = null

  if (user.stripe_subscription_id) {
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
        const paymentMethod = sub.default_payment_method
        if (paymentMethod.card) {
          brand = paymentMethod.card.brand ?? null
          last4 = paymentMethod.card.last4 ?? null
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
    } catch (error) {
      console.error('[Subscription Overview] Failed to retrieve Stripe subscription:', error)
    }
  }

  return {
    tier,
    subscriptionStatus,
    subscriptionData,
    subscriptionExpiresAt,
  }
}
