import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getSubscriptionOverview } from '@/lib/stripe/subscription-overview'
import { SettingsContent } from './SettingsContent'

/**
 * /settings - Subscription management page.
 * Server component: fetches user + Stripe subscription data, passes to client.
 */
export default async function SettingsPage() {
  const { userId } = await auth()
  if (!userId) {
    redirect('/auth')
  }

  const overview = await getSubscriptionOverview(userId)

  return (
    <SettingsContent
      tier={overview.tier}
      subscriptionData={overview.subscriptionData}
      subscriptionExpiresAt={overview.subscriptionExpiresAt}
    />
  )
}
