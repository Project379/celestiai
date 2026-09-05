'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRecommendations } from '@/hooks/useRecommendations'
import { RecommendationCard } from './RecommendationCard'
import { PremiumLock } from '@/components/tier/PremiumLock'
import { RECS_MONTHLY_LOCKED } from '@/lib/tier/locked-copy'

const BG_DATE = new Intl.DateTimeFormat('bg-BG', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'Europe/Sofia',
})

const BG_MONTH_YEAR = new Intl.DateTimeFormat('bg-BG', {
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Sofia',
})

const fadeUp = {
  hidden: { opacity: 0, y: 18, filter: 'blur(8px)' },
  visible: (index: number = 0) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.62, delay: index * 0.08, ease: [0.22, 0.68, 0.35, 1] as const },
  }),
}

interface StoriesContentProps {
  chartId: string | null
  isPremium?: boolean
}

export function StoriesContent({ chartId, isPremium = false }: StoriesContentProps) {
  const [now, setNow] = useState(() => new Date())
  const { data, isLoading, error, mutatingDeliveryId, refetch, setFeedback, reroll } =
    useRecommendations(chartId)

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(interval)
  }, [])

  const today = useMemo(() => BG_DATE.format(now), [now])
  const thisMonth = useMemo(() => BG_MONTH_YEAR.format(now), [now])

  return (
    <div className="mx-auto max-w-2xl">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0} className="relative mb-12 sm:mb-14">
        <div aria-hidden className="pointer-events-none absolute -left-32 -top-32 -z-10 h-[460px] w-[460px] rounded-full bg-violet-500/[0.08] blur-[100px]" />
        <p className="mb-5 flex items-center gap-3 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-300">
          <span aria-hidden className="h-px w-5 bg-slate-300/50" />
          Препоръки · За твоето небе
        </p>
        <h1 className="font-display flex flex-wrap items-baseline gap-x-3 pb-2 text-[2.125rem] leading-[1.2] tracking-tight sm:text-[2.75rem]">
          <span className="font-light text-slate-300">Филм днес,</span>
          <span className="bg-gradient-to-br from-white via-slate-100 to-amber-200/95 bg-clip-text font-semibold text-transparent">
            книга за месеца.
          </span>
        </h1>
        <p className="mt-5 max-w-xl font-display text-[15.5px] font-light leading-[1.85] text-slate-300 sm:text-[16.5px]">
          Подбрани първо според небето ти, а с времето и според това, което запазваш и оценяваш.
        </p>
        <p className="mt-6 flex flex-wrap items-center gap-3 font-cinzel text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-300">
          <span>{today}</span>
          {data && (
            <>
              <span aria-hidden className="h-[3px] w-[3px] rotate-45 bg-slate-400/80" />
              <span className="text-amber-200/90">☾ {data.personalization.lunarPhase.name}</span>
            </>
          )}
        </p>
      </motion.div>

      {!chartId && !isLoading && (
        <div className="mb-8 border-l border-amber-300/40 bg-amber-300/[0.04] px-5 py-3">
          <p className="font-display text-[14px] font-light leading-[1.75] text-slate-300">
            Засега използваме лунната фаза. За по-личен избор{' '}
            <Link href="/birth-data" className="text-amber-300 underline decoration-amber-300/30 underline-offset-4">
              добави рождени данни
            </Link>.
          </p>
        </div>
      )}

      {error && (
        <div role="alert" className="mb-8 rounded-2xl border border-rose-300/15 bg-rose-400/[0.04] p-5">
          <p className="font-display text-[14px] text-slate-300">Не успяхме да заредим препоръките.</p>
          <button type="button" onClick={() => void refetch()} className="mt-3 font-cinzel text-[10px] uppercase tracking-[0.28em] text-amber-300">
            Опитай отново
          </button>
        </div>
      )}

      {isLoading && !data && (
        <p className="py-12 font-display text-[14px] text-slate-500">Подреждаме препоръките...</p>
      )}

      {data && (
        <>
          <RecommendationSection title="Филм за днес" aside="избор по лунната фаза" custom={1}>
            {data.dailyMovie ? (
              <RecommendationCard
                key={data.dailyMovie.deliveryId}
                recommendation={data.dailyMovie}
                onFeedback={setFeedback}
                onReroll={reroll}
                isMutating={mutatingDeliveryId === data.dailyMovie.deliveryId}
                variant="daily"
              />
            ) : (
              <EmptyRecommendation media="филм" />
            )}
          </RecommendationSection>

          <RecommendationSection title={`Книга за месеца · ${thisMonth}`} custom={2}>
            {!isPremium && (
              <div className="mb-8">
                <PremiumLock title={RECS_MONTHLY_LOCKED.title} sub={RECS_MONTHLY_LOCKED.sub} />
              </div>
            )}
            {data.monthlyBook ? (
              <RecommendationCard
                key={data.monthlyBook.deliveryId}
                recommendation={data.monthlyBook}
                onFeedback={setFeedback}
                onReroll={reroll}
                isMutating={mutatingDeliveryId === data.monthlyBook.deliveryId}
                variant="monthly"
                locked={!isPremium}
              />
            ) : (
              <EmptyRecommendation media="книга" />
            )}
          </RecommendationSection>
        </>
      )}

      <motion.footer initial="hidden" animate="visible" variants={fadeUp} custom={3} className="mt-4 border-t border-slate-300/[0.07] pt-8">
        <p className="font-display text-[14px] font-light leading-[1.85] text-slate-500">
          Гледаното и прочетеното не означават автоматично, че са ти харесали. Само изричната ти оценка променя вкусовия профил в тази посока.
        </p>
      </motion.footer>
    </div>
  )
}

function RecommendationSection({
  title,
  aside,
  custom,
  children,
}: {
  title: string
  aside?: string
  custom: number
  children: ReactNode
}) {
  return (
    <motion.section initial="hidden" animate="visible" variants={fadeUp} custom={custom} className="mb-16">
      <div className="mb-5 flex items-baseline gap-4">
        <p className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.4em] text-slate-200">{title}</p>
        <span className="h-px flex-1 bg-gradient-to-r from-slate-300/25 to-transparent" />
        {aside && <p className="font-cinzel text-[9px] uppercase tracking-[0.25em] text-slate-500">{aside}</p>}
      </div>
      {children}
    </motion.section>
  )
}

function EmptyRecommendation({ media }: { media: 'филм' | 'книга' }) {
  return (
    <p className="rounded-2xl border border-slate-300/[0.08] p-6 font-display text-[14px] font-light leading-relaxed text-slate-500">
      В момента няма проверен {media} за този период. Ще покажем такъв след следващия преглед на каталога.
    </p>
  )
}
