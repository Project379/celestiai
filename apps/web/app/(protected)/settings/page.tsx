import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getSubscriptionOverview } from '@/lib/stripe/subscription-overview'
import { SettingsContent } from './SettingsContent'

export const metadata: Metadata = {
  title: 'Настройки',
  description: 'Управлявай абонамента и акаунта си',
}

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
      subscriptionStatus={overview.subscriptionStatus}
      subscriptionData={overview.subscriptionData}
      subscriptionExpiresAt={overview.subscriptionExpiresAt}
    />
  )
}
