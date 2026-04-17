import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { CrystalCollectionContent } from '@/components/crystals/CrystalCollectionContent'
import { LoadingAnimation } from '@/components/LoadingAnimation'

export const metadata: Metadata = {
  title: 'Кристали',
  description: 'Твоята колекция от кристали, водена от луната и картата ти',
}

export default async function CrystalsPage() {
  const { userId } = await auth()

  let chartId: string | null = null
  let isPremium = false

  try {
    const supabase = createServiceSupabaseClient()

    const { data: user } = await supabase
      .from('users')
      .select('subscription_tier')
      .eq('clerk_id', userId)
      .single()
    isPremium = user?.subscription_tier === 'premium'

    const { data: chart } = await supabase
      .from('charts')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    chartId = chart?.id ?? null
  } catch (error) {
    console.error('Error preparing crystals page:', error)
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6">
      <div className="mb-8 sm:mb-10">
        <p className="flex items-center gap-2.5 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-400">
          <span
            aria-hidden
            className="h-px w-5 bg-gradient-to-r from-transparent to-slate-300/40"
          />
          Кристали · Лунна колекция
        </p>
        <h1 className="mt-3 font-display text-[1.55rem] font-semibold leading-tight tracking-tight sm:text-[1.9rem]">
          <span className="font-light text-slate-400">Камъни за </span>
          <span className="bg-gradient-to-br from-white via-slate-100 to-amber-200/95 bg-clip-text font-semibold text-transparent drop-shadow-[0_0_18px_rgba(251,191,36,0.2)]">
            твоето небе
          </span>
        </h1>
        <p className="mt-3 max-w-xl font-display text-[14px] font-light leading-[1.75] text-slate-500">
          Камъни, избрани от наталната ти карта и от текущата лунна фаза. Около новолуние, пълнолуние или силен транзит се отварят прозорци — върни се тогава и събери камъка, преди прозорецът да се затвори.
        </p>

        <Link
          href="/crystals/guide"
          className="group mt-5 inline-flex items-center gap-3 rounded-full border border-amber-300/30 bg-amber-400/[0.04] py-2 pl-2 pr-5 transition-all duration-300 hover:border-amber-200/60 hover:bg-amber-400/[0.08]"
        >
          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-amber-300/40 bg-amber-400/[0.08] font-display text-[13px] font-light text-amber-200 transition-transform duration-300 group-hover:scale-105">
            ?
          </span>
          <span className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-amber-200/90">
            Как работи колекцията
          </span>
          <span className="font-cinzel text-[12px] text-amber-300/60 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-amber-200">
            &rarr;
          </span>
        </Link>
      </div>

      {!isPremium && <PremiumGate />}
      {isPremium && !chartId && <MissingChartState />}
      {isPremium && chartId && (
        <Suspense fallback={<div className="flex justify-center py-20"><LoadingAnimation /></div>}>
          <CrystalCollectionContent chartId={chartId} />
        </Suspense>
      )}
    </div>
  )
}

function PremiumGate() {
  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-amber-300/20 bg-amber-400/[0.03] px-6 py-10 text-center sm:px-10">
      <p className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-300/90">
        Премиум функция
      </p>
      <p className="mt-4 font-display text-[17px] font-light leading-[1.8] text-slate-300">
        Личната ти колекция, препоръките по натална карта и лунните събития са част от Премиум достъпа. Без пробен период, без уловки — плащаш, когато камъкът вече те е намерил.
      </p>
      <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/pricing"
          className="rounded-full border border-amber-300/40 bg-gradient-to-b from-amber-400/20 to-amber-500/5 px-7 py-3 font-cinzel text-[11px] font-semibold uppercase tracking-[0.3em] text-amber-200 transition-colors hover:border-amber-200 hover:bg-amber-400/15"
        >
          Научи повече
        </Link>
        <Link
          href="/dashboard"
          className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500 transition-colors hover:text-amber-300"
        >
          &larr; Обратно
        </Link>
      </div>
    </div>
  )
}

function MissingChartState() {
  return (
    <div className="mx-auto max-w-xl">
      <p className="mb-5 font-display text-[17px] font-light leading-[1.85] text-slate-500">
        За да видиш личните си препоръки, първо трябва да имаш натална карта. Въведи рождените си данни.
      </p>
      <Link
        href="/birth-data"
        className="group inline-flex items-center gap-2 font-display text-[12px] font-medium tracking-wide text-slate-400 transition-colors duration-200 hover:text-amber-300"
      >
        <span className="h-px w-6 bg-gradient-to-r from-transparent to-slate-400 transition-all duration-300 group-hover:to-amber-300" />
        Добави натална карта
      </Link>
    </div>
  )
}
