import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { SuccessContent } from './SuccessContent'

/**
 * /subscription/success
 *
 * Server component wrapper — fetches initial subscription tier,
 * then delegates to SuccessContent for the polling UI.
 *
 * This page is reached after Stripe redirects from checkout.
 * The webhook may not have fired yet, so SuccessContent polls
 * /api/stripe/status until tier becomes 'premium' or times out.
 */
export default async function SubscriptionSuccessPage() {
  const { userId } = await auth()
  if (!userId) {
    redirect('/auth')
  }

  const supabase = createServiceSupabaseClient()
  const { data: user } = await supabase
    .from('users')
    .select('subscription_tier')
    .eq('clerk_id', userId)
    .single()

  const initialTier = user?.subscription_tier ?? 'free'

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center px-4">
      <SuccessContent initialTier={initialTier} />
    </div>
  )
}
