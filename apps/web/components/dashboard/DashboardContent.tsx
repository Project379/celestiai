'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { DailyHoroscope } from '@/components/horoscope/DailyHoroscope'
import { CelestialIcon } from '@/components/icons/CelestialIcons'
import {
  CircleTile,
  CrystalTile,
  LunarTile,
  TransitTile,
} from '@/components/dashboard/tiles'
import { getLunarPhase } from '@/lib/moon-phase'
import {
  composeWelcome,
  getActiveMeteorShower,
  getSunSign,
} from '@stellaeum/core/welcome'
import type { ChartRow } from '@/lib/types/chart'

import type { CrystalOfTheDayResponse } from '@stellaeum/core'

interface DashboardContentProps {
  firstName: string
  initialBirthChart: ChartRow | null
  subscriptionTier: string
  initialCrystalOfTheDay: CrystalOfTheDayResponse | null
}

/**
 * Днес hybrid dashboard — three-layer layout per
 * .planning/research/MOBILE_UX_RESEARCH.md §2.1:
 *
 *   A  Ambient header — date + lunar phase + premium badge. Scan in 2s.
 *   B  Editorial hero — greeting + Небесен ритъм + sign quip + daily stream.
 *      One bundled block, no card chrome, hairline separators.
 *   C  Bento launchpad — 2×2 tiles (Crystal / Moon / Transit / Кръг).
 *   D  Streak footer — subtle, shown only when a streak exists.
 *
 * Deliberate inversion vs the old linear stream: the hero now dominates
 * above the fold, everything else is an entry point to its destination.
 */

const fadeUp = {
  hidden: { opacity: 0, y: 18, filter: 'blur(8px)' },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.62,
      delay: i * 0.07,
      ease: [0.22, 0.68, 0.35, 1] as const,
    },
  }),
}

const SIGN_QUIPS: Record<string, string> = {
  'Овен':      'Марс пак те тласка напред - независимо дали имаш план или не. Поне изглежда убедено.',
  'Телец':     'Венера обещава удоволствие. Сатурн напомня за задълженията. Ти вероятно знаеш кое печели.',
  'Близнаци':  'Два гласа в главата ти не са проблем. Проблемът е, когато и двата са прави едновременно.',
  'Рак':       'Луната е в твоя ъгъл. Усещаш всичко - включително нещата, за които другите нямат думи.',
  'Лъв':       'Слънцето не е само за показ - но трябва да признаем, малко драма никога не е навредила.',
  'Дева':      'Меркурий анализира. Ти анализираш. Разликата е, че Меркурий спира в края на краищата.',
  'Везни':     'Везните са в баланс. За колко дълго - зависи от теб и от онзи имейл, на който все още не отговаряш.',
  'Скорпион':  'Плутон вижда всичко. Ти виждаш всичко. Фактически няма смисъл да крием нищо от никого.',
  'Стрелец':   'Юпитер е щедър. Ти - с добри намерения, непоследователни резултати и неоправдан оптимизъм. Работи.',
  'Козирог':   'Сатурн одобрява усилията ти. Малък, тих знак за одобрение - продължавай без суетене.',
  'Водолей':   'Уран прави нещата интересни. Ти правиш нещата странни. Разбирате се по начин, трудно обясним.',
  'Риби':      'Нептун замъглява. Ти мечтаеш. Понякога е трудно да се каже кое е кое - и не е задължително.',
}

const BG_DATE_FORMAT = new Intl.DateTimeFormat('bg-BG', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'Europe/Sofia',
})

export function DashboardContent({
  firstName,
  initialBirthChart,
  subscriptionTier,
  initialCrystalOfTheDay,
}: DashboardContentProps) {
  const [birthChart] = useState<ChartRow | null>(initialBirthChart)
  const isPremium = subscriptionTier !== 'free'

  const sunSign = birthChart ? getSunSign(birthChart.birth_date) : null

  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(interval)
  }, [])

  const todayFormatted = BG_DATE_FORMAT.format(now)
  const lunarPhase = getLunarPhase(now)
  const meteorShower = getActiveMeteorShower(now)
  const welcome = composeWelcome({
    firstName,
    sunSign,
    lunarPhase,
    meteorShower,
    hour: now.getHours(),
  })

  return (
    <div className="mx-auto max-w-2xl">
      {/* ── Layer A · Ambient header ─────────────────────────
         Scan in 2s: what day is it, what's the moon doing, am I Premium.
      */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={0}
        className="relative mb-10"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 -top-32 -z-10 h-[460px] w-[460px] rounded-full bg-violet-500/[0.08] blur-[100px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 top-16 -z-10 h-[220px] w-[220px] rounded-full bg-amber-500/[0.045] blur-[80px]"
        />

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-300">
            <span>{todayFormatted}</span>
            <span aria-hidden className="h-[3px] w-[3px] rotate-45 bg-slate-400/80" />
            <span className="inline-flex items-center gap-1.5 tracking-[0.24em] text-slate-200">
              <span aria-hidden className="text-[12px] leading-none text-amber-300/90">☾</span>
              {lunarPhase.name}
            </span>
          </p>

          {isPremium && (
            <span className="inline-flex items-center gap-2.5 font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.32em] text-amber-200/90">
              <span aria-hidden className="h-px w-8 bg-gradient-to-r from-transparent via-amber-300/40 to-amber-300/70" />
              <span aria-hidden className="h-1 w-1 rotate-45 bg-amber-300/90 shadow-[0_0_8px_rgba(251,191,36,0.65)]" />
              Premium
            </span>
          )}
        </div>
      </motion.div>

      {/* ── Layer B · Editorial hero ─────────────────────────
         One bundled block: greeting + Небесен ритъм + sign quip + daily
         horoscope stream. No card chrome, hairlines between sub-sections.
      */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={1}
        aria-label="Днешното четене"
        className="mb-12"
      >
        {/* Greeting: time-aware ("Добро утро, Алекс.") */}
        <h1 className="font-display mb-8 flex flex-wrap items-baseline gap-x-3 pb-2 text-[2.125rem] leading-[1.2] tracking-tight sm:text-[2.75rem]">
          <span className="font-light text-slate-300">
            {welcome.greeting.split(',')[0]},
          </span>
          <span className="bg-gradient-to-br from-white via-slate-100 to-amber-200/95 bg-clip-text font-semibold text-transparent drop-shadow-[0_0_28px_rgba(251,191,36,0.22)]">
            {firstName}.
          </span>
        </h1>

        {birthChart && sunSign ? (
          <>
            {/* Небесен ритъм — dynamic lunar/meteor line */}
            <div className="mb-8">
              <p className="mb-2 flex items-center gap-3 font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.38em] text-amber-300/90">
                <span>Небесен ритъм</span>
                <span aria-hidden className="h-px flex-1 max-w-[4rem] bg-gradient-to-r from-amber-300/40 via-slate-300/10 to-transparent" />
              </p>
              <p className="font-display text-[15.5px] font-light leading-[1.8] text-slate-200 sm:text-[16.5px]">
                {welcome.summary}
              </p>
            </div>

            {/* Sign quip */}
            <div className="mb-10">
              <p className="mb-2 flex items-center gap-3 font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.38em] text-slate-300">
                <span>{sunSign}</span>
                <span aria-hidden className="h-px flex-1 max-w-[4rem] bg-gradient-to-r from-slate-300/35 via-slate-300/10 to-transparent" />
              </p>
              <p className="font-display text-[17px] font-light leading-[1.85] text-slate-200/95 sm:text-[18px]">
                {SIGN_QUIPS[sunSign] ?? 'Звездите са в движение. Вселената е написала нещо за теб.'}
              </p>
            </div>

            {/* Daily horoscope stream — the reading you came here to read */}
            <DailyHoroscope chartId={birthChart.id} />
          </>
        ) : (
          /* No chart yet — keep Небесен ритъм + a single CTA. */
          <>
            <div className="mb-8">
              <p className="mb-2 flex items-center gap-3 font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.38em] text-amber-300/90">
                <span>Небесен ритъм</span>
                <span aria-hidden className="h-px flex-1 max-w-[4rem] bg-gradient-to-r from-amber-300/40 via-slate-300/10 to-transparent" />
              </p>
              <p className="font-display text-[15.5px] font-light leading-[1.8] text-slate-200 sm:text-[16.5px]">
                {welcome.summary}
              </p>
            </div>

            <p className="mb-4 font-display text-[17px] font-light leading-[1.85] text-slate-200/90">
              Картата ти още не е настроена. Въведи рождените си данни, за да видиш хороскопа, наталната карта и транзитите.
            </p>
            <Link
              href="/birth-data"
              className="group inline-flex items-center gap-2 font-display text-[12px] font-medium tracking-wide text-slate-300 transition-colors duration-200 hover:text-amber-300"
            >
              <CelestialIcon name="rising" size={13} className="transition-colors duration-200 group-hover:text-amber-300" />
              Въведи рождени данни
              <svg className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </>
        )}
      </motion.section>

      {/* ── Layer C · Bento launchpad ────────────────────────
         2×2 grid of scannable tiles. Each tile leads to its deep
         destination: Crystal → /you/crystals (full card + collection),
         Lunar → /rhythm (full lunar card + meteor + transits),
         Transit → /rhythm (same, transit-focused scroll),
         Кръг → /circle (people-graph + premium wedge per §4 Rule 1).
         The tiles are intentionally compact — deep content lives at
         the destination, not on the home scan.
      */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={2}
        aria-label="Бързи връзки"
        className="mb-10"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CrystalTile initialData={initialCrystalOfTheDay} />
          <LunarTile />
          <TransitTile />
          <CircleTile />
        </div>
      </motion.section>

      {/* ── Layer D · Streak footer ── */}
      {birthChart && (
        <motion.p
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={3}
          className="text-center font-cinzel text-[9px] uppercase tracking-[0.32em] text-slate-600"
        >
          · небесен ритъм ·
        </motion.p>
      )}
    </div>
  )
}
