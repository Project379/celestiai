import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import type { ChartRow } from '@/lib/types/chart'
import { ChartView } from '@/components/chart/ChartView'
import { CelestialIcon } from '@/components/icons/CelestialIcons'

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
    <div className="mx-auto max-w-7xl">
      {/* Editorial hero */}
      <div className="mb-10 sm:mb-12">
        <p className="mb-3 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-500">
          Натална карта
        </p>
        <h1 className="font-display flex flex-wrap items-baseline gap-x-3 text-[2rem] leading-[1.15] tracking-tight text-slate-100 sm:text-[2.5rem]">
          <span className="font-light italic text-slate-400">Твоята</span>
          <span className="bg-gradient-to-br from-white via-slate-100 to-amber-200/90 bg-clip-text font-semibold text-transparent">
            небесна карта
          </span>
        </h1>
        <p className="mt-3 max-w-xl font-display text-[15px] font-light italic leading-relaxed text-slate-500">
          Натисни на планета или знак, за да видиш какво означава за теб.
        </p>
      </div>

      {chart ? (
        <ChartView chartId={chart.id} subscriptionTier={subscriptionTier} />
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
      <p className="mb-5 font-display text-[17px] font-light italic leading-[1.85] text-slate-500">
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
