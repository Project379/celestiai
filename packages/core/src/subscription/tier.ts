import { createCoreSupabaseClient } from '../lib/supabase'

export type SubscriptionTier = 'free' | 'premium'

/**
 * Core function: read the user's current subscription tier from the DB.
 *
 * Pure database lookup — no Stripe SDK, no framework coupling. Keeps the
 * core package free of payment-provider code so mobile bundles (which use
 * RevenueCat for IAP) don't pull in the Stripe Node SDK.
 *
 * Returns 'free' when the user row is missing or the DB query errors.
 * Provider-specific activation lives at the web call site
 * (apps/web/lib/stripe/activate-from-session.ts for Checkout-success flows,
 * webhooks for async events) and is expected to have written to
 * users.subscription_tier before this read.
 */
export async function getSubscriptionTier(
  userId: string,
): Promise<SubscriptionTier> {
  const supabase = createCoreSupabaseClient()

  const { data, error } = await supabase
    .from('users')
    .select('subscription_tier')
    .eq('clerk_id', userId)
    .maybeSingle()

  if (error) {
    console.error('[core/subscription/tier] DB fetch failed:', error.message)
    return 'free'
  }

  if (!data) return 'free'

  return data.subscription_tier === 'premium' ? 'premium' : 'free'
}
