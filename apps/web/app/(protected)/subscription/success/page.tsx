import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { SuccessContent } from './SuccessContent'
import { ensureUserRecord } from '@/lib/users/ensure-user'

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

  const user = await ensureUserRecord(userId)
  const initialTier = user.subscription_tier

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center px-4">
      <SuccessContent initialTier={initialTier} />
    </div>
  )
}
