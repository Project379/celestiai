'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { getLunarPhase, type LunarPhase } from '@/lib/moon-phase'
import { getDailyForPhase, getMonthlyArcForSign, MONTHLY_BY_SIGN } from '@stellaeum/core/stories/catalog'
import { useStoryList } from '@/hooks/useStoryList'
import type { RecommendationStatus } from '@stellaeum/core/stories/types'
import { RecommendationCard } from './RecommendationCard'
import { PremiumLock } from '@/components/tier/PremiumLock'
import { RECS_MONTHLY_LOCKED } from '@/lib/tier/locked-copy'

const KIND_SECTION_LABEL: Record<'book' | 'film' | 'series' | 'episode' | 'story', string> = {
  book: 'Книга за месеца',
  film: 'Филм за месеца',
  series: 'Сериал за месеца',
  episode: 'Епизод за месеца',
  story: 'Разказ за месеца',
}

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
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.62,
      delay: i * 0.08,
      ease: [0.22, 0.68, 0.35, 1] as const,
    },
  }),
}

interface StoriesContentProps {
  sunSign: string | null
  /** Free tier (tier item 4): daily pick stays open, monthly arc is locked. */
  isPremium?: boolean
}

export function StoriesContent({ sunSign, isPremium = false }: StoriesContentProps) {
  const monthlyLocked = !isPremium
  const [phase, setPhase] = useState<LunarPhase>(() => getLunarPhase())
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const interval = setInterval(() => {
      const d = new Date()
      setNow(d)
      setPhase(getLunarPhase(d))
    }, 60_000)
    return () => clearInterval(interval)
  }, [])

  const today = useMemo(() => BG_DATE.format(now), [now])
  const thisMonth = useMemo(() => BG_MONTH_YEAR.format(now), [now])

  const daily = getDailyForPhase(phase.id)
  const arc = getMonthlyArcForSign(sunSign)

  const { getStatus, setStatus, isLoaded } = useStoryList()

  return (
    <div className="mx-auto max-w-2xl">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={0}
        className="relative mb-12 sm:mb-14"
      >
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
          Препоръки · За твоето небе
        </p>

        <h1 className="font-display flex flex-wrap items-baseline gap-x-3 pb-2 text-[2.125rem] leading-[1.2] tracking-tight sm:text-[2.75rem]">
          <span className="font-light text-slate-300">
            Кратко днес,
          </span>
          <span className="bg-gradient-to-br from-white via-slate-100 to-amber-200/95 bg-clip-text font-semibold text-transparent drop-shadow-[0_0_28px_rgba(251,191,36,0.22)]">
            дълго през месеца.
          </span>
        </h1>

        <p className="mt-5 max-w-xl font-display text-[15.5px] font-light leading-[1.85] text-slate-300 sm:text-[16.5px]">
          Една препоръка за тази вечер — разказ, епизод или филм, подбран по лунната фаза. И една двойка за целия месец — книга с филм или книга със сериал, водени от слънчевия ти знак.
        </p>

        <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 font-cinzel text-[10px] font-semibold uppercase tracking-[0.38em] text-slate-300">
          <span>{today}</span>
          <span aria-hidden className="h-[3px] w-[3px] rotate-45 bg-slate-400/80" />
          <span className="inline-flex items-center gap-1.5 tracking-[0.28em] text-amber-200/90">
            <span aria-hidden className="text-[12px] leading-none">☾</span>
            {phase.name}
          </span>
        </p>
      </motion.div>

      {/* ── Today's pick ───────────────────────────────── */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={1}
        className="mb-16"
      >
        <div className="mb-5 flex items-baseline gap-4">
          <p className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-200">
            Днес
          </p>
          <span className="h-px flex-1 bg-gradient-to-r from-slate-300/25 via-slate-300/8 to-transparent" />
          <p className="font-cinzel text-[9.5px] uppercase tracking-[0.28em] text-slate-500">
            избор по лунната фаза
          </p>
        </div>

        {isLoaded ? (
          <RecommendationCard
            recommendation={daily}
            status={getStatus(daily.id)}
            onStatusChange={s => setStatus(daily.id, s)}
            variant="daily"
          />
        ) : (
          <p className="py-8 font-display text-[14px] text-slate-500">
            Зареждам препоръката...
          </p>
        )}
      </motion.section>

      {/* ── Monthly arc — book + film/series ───────────── */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={2}
        className="mb-16"
      >
        <div className="mb-5 flex items-baseline gap-4">
          <p className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-200">
            За целия месец · {thisMonth}
          </p>
          <span className="h-px flex-1 bg-gradient-to-r from-slate-300/25 via-slate-300/8 to-transparent" />
        </div>

        {monthlyLocked && isLoaded && (
          <div className="mb-8">
            <PremiumLock title={RECS_MONTHLY_LOCKED.title} sub={RECS_MONTHLY_LOCKED.sub} />
          </div>
        )}

        {arc && isLoaded && (
          <>
            {/* Theme intro — open flow, hairline-led, no box */}
            <div className="mb-12">
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-cinzel text-[10px] font-semibold uppercase tracking-[0.34em] text-amber-300/90">
                <span>{arc.sunSign}</span>
                <span aria-hidden className="h-[3px] w-[3px] rotate-45 bg-amber-300/60" />
                <span className="text-slate-300">{arc.theme}</span>
              </p>
              <p className="mt-4 max-w-xl font-display text-[15.5px] font-light leading-[1.85] text-slate-200/95">
                {arc.themeSummary}
              </p>
            </div>

            <div className="space-y-16">
              <div>
                <SectionLabel text={KIND_SECTION_LABEL[arc.primary.kind]} />
                <RecommendationCard
                  recommendation={arc.primary}
                  status={getStatus(arc.primary.id)}
                  onStatusChange={s => setStatus(arc.primary.id, s)}
                  variant="monthly"
                  locked={monthlyLocked}
                />
              </div>
              <div>
                <SectionLabel text={KIND_SECTION_LABEL[arc.companion.kind]} />
                <RecommendationCard
                  recommendation={arc.companion}
                  status={getStatus(arc.companion.id)}
                  onStatusChange={s => setStatus(arc.companion.id, s)}
                  variant="monthly"
                  locked={monthlyLocked}
                />
              </div>
            </div>
          </>
        )}

        {!arc && isLoaded && (
          <MonthlyPreviewWithoutChart
            getStatus={getStatus}
            setStatus={setStatus}
            locked={monthlyLocked}
          />
        )}
      </motion.section>

      <motion.footer
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={3}
        className="mt-4 border-t border-slate-300/[0.07] pt-8"
      >
        <p className="font-display text-[14px] font-light leading-[1.85] text-slate-500">
          Препоръките са подбрани спрямо лунната фаза и слънчевия ти знак. С времето ще се учат и от цялата ти натална карта, и от текущите транзити.
        </p>
      </motion.footer>
    </div>
  )
}

function SectionLabel({ text }: { text: string }) {
  return (
    <p className="mb-5 flex items-center gap-3 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-200">
      <span aria-hidden className="h-1 w-1 rotate-45 bg-amber-300/80 shadow-[0_0_6px_rgba(251,191,36,0.55)]" />
      <span>{text}</span>
      <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-slate-300/25 via-slate-300/8 to-transparent" />
    </p>
  )
}

/**
 * Preview shown when the user has no birth chart yet. Picks a neutral
 * sample arc so visitors still see the book + film format — and know what
 * they'll unlock once they enter their birth data.
 */
function MonthlyPreviewWithoutChart({
  getStatus,
  setStatus,
  locked = false,
}: {
  getStatus: (id: string) => RecommendationStatus
  setStatus: (id: string, status: RecommendationStatus) => void
  locked?: boolean
}) {
  const sample = MONTHLY_BY_SIGN['Лъв']
  if (!sample) return null

  return (
    <div>
      <div className="mb-10 border-l border-amber-300/40 bg-gradient-to-r from-amber-300/[0.05] via-transparent to-violet-400/[0.04] px-5 py-3">
        <p className="mb-1 font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.34em] text-amber-300/90">
          Пример · Лъв
        </p>
        <p className="font-display text-[14px] font-light leading-[1.75] text-slate-200/95">
          Ето как изглежда една месечна дъга. Въведи рождените си данни и ще получиш своята — съобразена с твоя знак.{' '}
          <Link
            href="/birth-data"
            className="font-medium text-amber-300 underline decoration-amber-300/30 underline-offset-[3px] transition-colors duration-200 hover:text-amber-200 hover:decoration-amber-300/70"
          >
            Въведи рождени данни →
          </Link>
        </p>
      </div>

      <div className="space-y-16">
        <div>
          <SectionLabel text={KIND_SECTION_LABEL[sample.primary.kind]} />
          <RecommendationCard
            recommendation={sample.primary}
            status={getStatus(sample.primary.id)}
            onStatusChange={s => setStatus(sample.primary.id, s)}
            variant="monthly"
            locked={locked}
          />
        </div>
        <div>
          <SectionLabel text={KIND_SECTION_LABEL[sample.companion.kind]} />
          <RecommendationCard
            recommendation={sample.companion}
            status={getStatus(sample.companion.id)}
            onStatusChange={s => setStatus(sample.companion.id, s)}
            variant="monthly"
            locked={locked}
          />
        </div>
      </div>
    </div>
  )
}
