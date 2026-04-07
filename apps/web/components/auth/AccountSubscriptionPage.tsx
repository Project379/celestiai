'use client'

import { useEffect, useState } from 'react'
import { SettingsContent } from '@/app/(protected)/settings/SettingsContent'
import type { SubscriptionOverview } from '@/lib/stripe/subscription-overview'

const fallbackOverview: SubscriptionOverview = {
  tier: 'free',
  subscriptionData: null,
  subscriptionExpiresAt: null,
}

export function AccountSubscriptionPage() {
  const [overview, setOverview] = useState<SubscriptionOverview>(fallbackOverview)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadOverview() {
      try {
        const response = await fetch('/api/stripe/subscription', {
          method: 'GET',
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error(`Failed to load subscription overview: ${response.status}`)
        }

        const data = (await response.json()) as SubscriptionOverview
        if (isMounted) {
          setOverview(data)
          setHasError(false)
        }
      } catch (error) {
        console.error('[Account Subscription Page] Failed to load subscription overview:', error)
        if (isMounted) {
          setHasError(true)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadOverview()

    return () => {
      isMounted = false
    }
  }, [])

  if (isLoading) {
    return (
      <div className="px-1 py-4 text-sm text-white/70">
        Зареждане на абонамента...
      </div>
    )
  }

  if (hasError) {
    return (
      <div className="space-y-3 px-1 py-4">
        <p className="text-sm text-red-300">
          Не успяхме да заредим информацията за абонамента.
        </p>
        <a
          href="/settings"
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition-all hover:bg-white/10 hover:text-white"
        >
          Отвори настройките
        </a>
      </div>
    )
  }

  return (
    <div className="-mx-4 -my-6 sm:-mx-6">
      <SettingsContent
        tier={overview.tier}
        subscriptionData={overview.subscriptionData}
        subscriptionExpiresAt={overview.subscriptionExpiresAt}
      />
    </div>
  )
}
