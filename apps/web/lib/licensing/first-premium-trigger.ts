import type { createServiceSupabaseClient } from '@/lib/supabase/service'

type SupabaseClient = ReturnType<typeof createServiceSupabaseClient>

/**
 * Detects the Swiss Ephemeris Professional License revisit trigger: the
 * first genuine premium subscription ever granted. See
 * `docs/licensing.md § Automated first-subscriber trigger` and
 * `.planning/POST_LAUNCH_UPGRADES.md` item 1.
 *
 * Call this BEFORE the grant lands, from every code path that sets
 * `subscription_tier: 'premium'`. Not a distributed lock — a theoretical
 * simultaneous-first-grant race could log twice, which is harmless for a
 * one-time human-actioned purchase trigger.
 */
export async function logIfFirstPremiumSubscription(
  supabase: SupabaseClient
): Promise<void> {
  const { data: existingPremium } = await supabase
    .from('users')
    .select('clerk_id')
    .eq('subscription_tier', 'premium')
    .limit(1)
    .maybeSingle()

  if (existingPremium) return

  console.warn(
    '[Licensing] FIRST EVER PREMIUM SUBSCRIPTION GRANTED — Swiss Ephemeris Professional License revisit trigger has fired. ' +
      'Buy the CHF 700 unlimited/99-year licence now (no retroactivity — contract clause 13): ' +
      'https://www.astro.com/swisseph/swephprice_e.htm — see docs/licensing.md § Revisit triggers and .planning/POST_LAUNCH_UPGRADES.md item 1.'
  )
}
