'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BirthDataCard } from '../birth-data/BirthDataCard'
import { DailyHoroscope } from '@/components/horoscope/DailyHoroscope'
import { PushNotificationBanner } from '@/components/horoscope/PushNotificationBanner'
import { UpgradePrompt } from '@/components/upgrade/UpgradePrompt'

interface ChartData {
  id: string
  name: string
  birth_date: string
  birth_time_known: boolean
  birth_time: string | null
  approximate_time_range: string | null
  city_name: string
  latitude: number
  longitude: number
  city_id: string | null
}

interface DashboardContentProps {
  firstName: string
  userId: string | null
  initialBirthChart: ChartData | null
  subscriptionTier: string
  priceMonthly: string
}

export function DashboardContent({
  firstName,
  userId,
  initialBirthChart,
  subscriptionTier,
  priceMonthly,
}: DashboardContentProps) {
  const router = useRouter()
  const [birthChart, setBirthChart] = useState<ChartData | null>(initialBirthChart)

  const isPremium = subscriptionTier !== 'free'

  const handleBirthDataUpdate = useCallback(() => {
    // Refresh the page to get updated data from server
    router.refresh()
    // Also refetch client-side for immediate update
    fetch('/api/birth-data')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.length > 0) {
          setBirthChart(data[0])
        }
      })
      .catch((err) => console.error('Error refetching birth data:', err))
  }, [router])

  return (
    <div className="mx-auto max-w-4xl">
      {/* Welcome section */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-slate-100">
            Добре дошли, {firstName}!
          </h1>
          {/* Premium badge — subtle accent for premium users */}
          {isPremium && (
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/20 px-2.5 py-0.5 text-xs font-medium text-purple-300 ring-1 ring-purple-500/30">
              <span aria-hidden>✦</span> Премиум
            </span>
          )}
        </div>
        <p className="mt-2 text-slate-400">
          Вашето табло за астрологични прогнози
        </p>
      </div>

      {/* Birth data section */}
      <div className="mb-8">
        {birthChart ? (
          <BirthDataCard chart={birthChart} onUpdate={handleBirthDataUpdate} />
        ) : (
          /* CTA to add birth data */
          <div className="rounded-xl border border-dashed border-purple-500/50 bg-purple-500/5 p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-purple-500/10">
              <svg
                className="h-7 w-7 text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-slate-200">
              Добавете данни за раждане
            </h3>
            <p className="mb-6 text-sm text-slate-400">
              За да получите персонализирани астрологични прогнози, моля въведете данните си за раждане.
            </p>
            <Link
              href="/birth-data"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-violet-600 px-6 py-3 text-sm font-medium text-white transition-all hover:from-purple-500 hover:to-violet-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Въведете данни за раждане
            </Link>
          </div>
        )}
      </div>

      {/* Upgrade prompt for free users — after birth data, before main content */}
      {!isPremium && (
        <div className="mb-8">
          <UpgradePrompt context="dashboard" priceMonthly={priceMonthly} />
        </div>
      )}

      {/* Daily Horoscope — primary content, shown only when user has a birth chart */}
      {birthChart && (
        <div className="mb-8">
          <DailyHoroscope
            chartId={birthChart.id}
            subscriptionTier={subscriptionTier}
            priceMonthly={priceMonthly}
          />
        </div>
      )}

      {/* Push notification opt-in — shown below horoscope when user has a birth chart */}
      {birthChart && (
        <div className="mb-8">
          <PushNotificationBanner />
        </div>
      )}

      {/* Dashboard cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">

        {/* Birth chart card */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6 backdrop-blur-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
              <svg
                className="h-5 w-5 text-violet-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h2 className="font-semibold text-slate-200">
              Натална карта
            </h2>
          </div>
          <p className="text-sm text-slate-400">
            Скоро: детайлен анализ на раждането ви
          </p>
        </div>

        {/* Transits card */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6 backdrop-blur-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
              <svg
                className="h-5 w-5 text-indigo-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h2 className="font-semibold text-slate-200">
              Транзити
            </h2>
          </div>
          <p className="text-sm text-slate-400">
            Скоро: планетарни влияния за деня
          </p>
        </div>
      </div>

      {/* User info section (for debugging/verification) */}
      <div className="mt-8 rounded-xl border border-slate-700/50 bg-slate-800/20 p-4">
        <p className="text-xs text-slate-500">
          User ID: {userId}
        </p>
      </div>
    </div>
  )
}
