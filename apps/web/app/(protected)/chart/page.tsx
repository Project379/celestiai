import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import type { ChartRow } from '@/lib/types/chart'
import { ChartView } from '@/components/chart/ChartView'
import { CelestialIcon } from '@/components/icons/CelestialIcons'
import { LoadingAnimation } from '@/components/LoadingAnimation'

export const metadata: Metadata = {
  title: 'Натална карта',
  description: 'Твоята натална карта с интерактивна визуализация и AI Оракул',
}

export default async function ChartPage() {
  const { userId } = await auth()

  let chart: Pick<ChartRow, 'id' | 'name'> | null = null
  let subscriptionTier: 'free' | 'premium' = 'free'

  if (userId) {
    try {
      const supabase = createServiceSupabaseClient()
      const [chartResult, userResult] = await Promise.all([
        supabase
          .from('charts')
          .select('id, name')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single(),
        supabase
          .from('users')
          .select('subscription_tier')
          .eq('clerk_id', userId)
          .single(),
      ])

      if (!chartResult.error && chartResult.data) {
        chart = chartResult.data as Pick<ChartRow, 'id' | 'name'>
      }
      if (!userResult.error && userResult.data?.subscription_tier === 'premium') {
        subscriptionTier = 'premium'
      }
    } catch (error) {
      console.error('Error fetching chart page data:', error)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6">
      {/* Editorial hero — matches /manifest + /recommendations pattern */}
      <div className="relative mb-12 sm:mb-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 -top-32 -z-10 h-[460px] w-[460px] rounded-full bg-violet-500/[0.08] blur-[100px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 top-16 -z-10 h-[220px] w-[220px] rounded-full bg-amber-500/[0.045] blur-[80px]"
        />

        <p className="mb-5 flex items-center gap-3 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-300">
          <span aria-hidden className="h-px w-5 bg-gradient-to-r from-transparent to-slate-300/50" />
          Натална карта · Твоята небесна подпис
        </p>

        <h1 className="font-display flex flex-wrap items-baseline gap-x-3 pb-2 text-[2.125rem] leading-[1.2] tracking-tight sm:text-[2.75rem]">
          <span className="font-light text-slate-300">
            Твоята
          </span>
          <span className="bg-gradient-to-br from-white via-slate-100 to-amber-200/95 bg-clip-text font-semibold text-transparent drop-shadow-[0_0_28px_rgba(251,191,36,0.22)]">
            небесна карта.
          </span>
        </h1>

        <p className="mt-5 max-w-xl font-display text-[15.5px] font-light leading-[1.85] text-slate-300 sm:text-[16.5px]">
          Натисни на планета или знак, за да видиш какво означава за теб.
        </p>
      </div>

      {chart ? (
        <Suspense fallback={<div className="flex justify-center py-20"><LoadingAnimation /></div>}>
          <ChartView chartId={chart.id} subscriptionTier={subscriptionTier} />
        </Suspense>
      ) : (
        <EmptyChartState />
      )}

      <div className="mt-12 text-center">
        <Link
          href="/dashboard"
          className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500 transition-colors hover:text-amber-300"
        >
          &larr; Обратно към таблото
        </Link>
      </div>
    </div>
  )
}

function EmptyChartState() {
  return (
    <div className="mx-auto max-w-xl">
      <p className="mb-5 font-display text-[17px] font-light leading-[1.85] text-slate-300">
        Картата ти още не е настроена. Въведи рождените си данни, за да видиш наталната си карта.
      </p>
      <Link
        href="/birth-data"
        className="group inline-flex items-center gap-2 font-display text-[12px] font-medium tracking-wide text-slate-400 transition-colors duration-200 hover:text-amber-300"
      >
        <CelestialIcon name="rising" size={13} className="transition-colors duration-200 group-hover:text-amber-300" />
        Въведи рождени данни
        <svg className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  )
}
