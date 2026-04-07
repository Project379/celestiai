'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { BirthDataCard } from '../birth-data/BirthDataCard'
import { DailyHoroscope } from '@/components/horoscope/DailyHoroscope'
import { PushNotificationBanner } from '@/components/horoscope/PushNotificationBanner'
import { UpgradePrompt } from '@/components/upgrade/UpgradePrompt'
import type { ChartRow } from '@/lib/types/chart'

interface DashboardContentProps {
  firstName: string
  userId: string | null
  initialBirthChart: ChartRow | null
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
  const [birthChart, setBirthChart] = useState<ChartRow | null>(initialBirthChart)

  const isPremium = subscriptionTier !== 'free'

  const handleBirthDataUpdate = useCallback(() => {
    router.refresh()
    fetch('/api/birth-data')
      .then((res) => res.json())
      .then((data) => {
        if (data?.length > 0) {
          setBirthChart(data[0])
        }
      })
      .catch(() => {})
  }, [router])

  return (
    <motion.div
      className="mx-auto max-w-4xl"
      initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.7, ease: [0.22, 0.68, 0.35, 1] }}
    >
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-slate-100">
            Здравей, {firstName}!
          </h1>
          {isPremium && (
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/20 px-2.5 py-0.5 text-xs font-medium text-purple-300 ring-1 ring-purple-500/30">
              <span aria-hidden>*</span> Premium
            </span>
          )}
        </div>
        <p className="mt-2 text-slate-400">
          Ето какво ти казват звездите днес.
        </p>
      </div>

      <div className="mb-8">
        {birthChart ? (
          <BirthDataCard chart={birthChart} onUpdate={handleBirthDataUpdate} />
        ) : (
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
              Добави рождените си данни
            </h3>
            <p className="mb-6 text-sm text-slate-400">
              За да ти покажа какво разкриват звездите за теб, ми трябва датата и часът ти на раждане.
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
              Въведи данни за раждане
            </Link>
          </div>
        )}
      </div>

      {!isPremium && (
        <div className="mb-8">
          <UpgradePrompt context="dashboard" priceMonthly={priceMonthly} />
        </div>
      )}

      {birthChart && (
        <div className="mb-8">
          <DailyHoroscope
            chartId={birthChart.id}
          />
        </div>
      )}

      {birthChart && (
        <div className="mb-8">
          <PushNotificationBanner />
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href={birthChart ? '/chart' : '/birth-data'}
          className="group rounded-xl border border-slate-700/50 bg-slate-800/30 p-6 backdrop-blur-sm transition-colors hover:border-violet-500/40 hover:bg-slate-800/40"
        >
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
            <div className="flex-1">
              <h2 className="font-semibold text-slate-200">Натална карта</h2>
              <p className="text-sm text-slate-400">
                {birthChart
                  ? 'Отвори картата си и разгледай планетите.'
                  : 'Първо добави рождени данни, за да видиш картата си.'}
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-2 text-sm font-medium text-violet-300 transition-colors group-hover:text-violet-200">
            {birthChart ? 'Виж картата' : 'Добави данни'}
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
                d="M9 5l7 7-7 7"
              />
            </svg>
          </span>
        </Link>

        <Link
          href={!birthChart ? '/birth-data' : isPremium ? '/transits' : '/pricing'}
          className="group rounded-xl border border-slate-700/50 bg-slate-800/30 p-6 backdrop-blur-sm transition-colors hover:border-indigo-500/40 hover:bg-slate-800/40"
        >
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
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-slate-200">Транзити</h2>
                {!isPremium && (
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-amber-300">
                    Premium
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400">
                {!birthChart
                  ? 'Първо добави рождени данни, за да отключиш транзитите.'
                  : isPremium
                  ? 'Виж какво ти влияе сега - транзити и лунни фази.'
                  : 'Транзитите са Premium функция. Отключи пълния транзитен анализ.'}
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-2 text-sm font-medium text-indigo-300 transition-colors group-hover:text-indigo-200">
            {!birthChart
              ? 'Добави данни'
              : isPremium
              ? 'Виж транзитите'
              : 'Отключи Premium'}
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
                d="M9 5l7 7-7 7"
              />
            </svg>
          </span>
        </Link>
      </div>

      <div className="mt-8 rounded-xl border border-slate-700/50 bg-slate-800/20 p-4">
        <p className="text-xs text-slate-500">
          User ID: {userId}
        </p>
      </div>
    </motion.div>
  )
}
