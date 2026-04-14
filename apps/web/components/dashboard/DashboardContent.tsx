'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { DailyHoroscope } from '@/components/horoscope/DailyHoroscope'
import { CelestialIcon } from '@/components/icons/CelestialIcons'
import type { ChartRow } from '@/lib/types/chart'

interface DashboardContentProps {
  firstName: string
  initialBirthChart: ChartRow | null
  subscriptionTier: string
}

/**
 * Fade-up with blur. Pass `custom` index to stagger — each step adds 70ms.
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

/* ─── Sun sign from birth date ─────────────────────────────────────── */
function getSunSign(birthDate: string): string {
  const d = new Date(birthDate)
  const m = d.getMonth() + 1
  const day = d.getDate()
  if ((m === 3 && day >= 21) || (m === 4 && day <= 19)) return 'Овен'
  if ((m === 4 && day >= 20) || (m === 5 && day <= 20)) return 'Телец'
  if ((m === 5 && day >= 21) || (m === 6 && day <= 20)) return 'Близнаци'
  if ((m === 6 && day >= 21) || (m === 7 && day <= 22)) return 'Рак'
  if ((m === 7 && day >= 23) || (m === 8 && day <= 22)) return 'Лъв'
  if ((m === 8 && day >= 23) || (m === 9 && day <= 22)) return 'Дева'
  if ((m === 9 && day >= 23) || (m === 10 && day <= 22)) return 'Везни'
  if ((m === 10 && day >= 23) || (m === 11 && day <= 21)) return 'Скорпион'
  if ((m === 11 && day >= 22) || (m === 12 && day <= 21)) return 'Стрелец'
  if ((m === 12 && day >= 22) || (m === 1 && day <= 19)) return 'Козирог'
  if ((m === 1 && day >= 20) || (m === 2 && day <= 18)) return 'Водолей'
  return 'Риби'
}

const SIGN_QUIPS: Record<string, string> = {
  'Овен':      'Марс пак те тласка напред — независимо дали имаш план или не. Поне изглежда убедено.',
  'Телец':     'Венера обещава удоволствие. Сатурн напомня за задълженията. Ти вероятно знаеш кое печели.',
  'Близнаци':  'Два гласа в главата ти не са проблем. Проблемът е, когато и двата са прави едновременно.',
  'Рак':       'Луната е в твоя ъгъл. Усещаш всичко — включително нещата, за които другите нямат думи.',
  'Лъв':       'Слънцето не е само за показ — но трябва да признаем, малко драма никога не е навредила.',
  'Дева':      'Меркурий анализира. Ти анализираш. Разликата е, че Меркурий спира в края на краищата.',
  'Везни':     'Везните са в баланс. За колко дълго — зависи от теб и от онзи имейл, на който все още не отговаряш.',
  'Скорпион':  'Плутон вижда всичко. Ти виждаш всичко. Фактически няма смисъл да крием нищо от никого.',
  'Стрелец':   'Юпитер е щедър. Ти — с добри намерения, непоследователни резултати и неоправдан оптимизъм. Работи.',
  'Козирог':   'Сатурн одобрява усилията ти. Малък, тих знак за одобрение — продължавай без суетене.',
  'Водолей':   'Уран прави нещата интересни. Ти правиш нещата странни. Разбирате се по начин, трудно обясним.',
  'Риби':      'Нептун замъглява. Ти мечтаеш. Понякога е трудно да се каже кое е кое — и не е задължително.',
}

const BG_DATE_FORMAT = new Intl.DateTimeFormat('bg-BG', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'Europe/Sofia',
})

/* ─── Main dashboard ──────────────────────────────────────────────── */
export function DashboardContent({
  firstName,
  initialBirthChart,
  subscriptionTier,
}: DashboardContentProps) {
  const [birthChart] = useState<ChartRow | null>(initialBirthChart)
  const isPremium = subscriptionTier !== 'free'

  const sunSign = birthChart ? getSunSign(birthChart.birth_date) : null
  const todayFormatted = BG_DATE_FORMAT.format(new Date())

  return (
    <div className="mx-auto max-w-2xl">

      {/* ── Hero ──────────────────────────────────────────── */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={0}
        className="relative mb-12 sm:mb-14"
      >
        {/* Ambient atmosphere */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 -top-32 -z-10 h-[460px] w-[460px] rounded-full bg-violet-500/[0.08] blur-[100px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 top-16 -z-10 h-[220px] w-[220px] rounded-full bg-amber-500/[0.045] blur-[80px]"
        />

        {/* Date line */}
        <p className="mb-6 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-500">
          {todayFormatted}
        </p>

        {/* Greeting */}
        <h1 className="font-display flex flex-wrap items-baseline gap-x-3 text-[2.125rem] leading-[1.1] tracking-tight sm:text-[2.75rem]">
          <span className="font-light italic text-slate-400">Здравей,</span>
          <span className="bg-gradient-to-br from-white via-slate-100 to-amber-200/90 bg-clip-text font-semibold text-transparent drop-shadow-[0_0_28px_rgba(251,191,36,0.18)]">
            {firstName}.
          </span>
        </h1>

        {/* Premium indicator */}
        {isPremium && (
          <div className="mt-6">
            <span className="inline-flex items-center gap-3.5 font-cinzel text-[10.5px] font-semibold uppercase tracking-[0.32em] text-slate-200/90">
              <span className="h-px w-12 bg-gradient-to-r from-transparent via-slate-300/40 to-amber-300/70" />
              <span aria-hidden className="h-1 w-1 rotate-45 bg-amber-300/80 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
              Premium
              <span aria-hidden className="h-1 w-1 rotate-45 bg-amber-300/80 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
              <span className="h-px w-12 bg-gradient-to-l from-transparent via-slate-300/40 to-amber-300/70" />
            </span>
          </div>
        )}
      </motion.div>

      {/* ── Editorial teaser (when chart exists) ──────────── */}
      {birthChart && sunSign && (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={1}
          className="mb-12"
        >
          <p className="mb-2 font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.38em] text-slate-500/70">
            {sunSign}
          </p>
          <p className="font-display text-[17px] font-light italic leading-[1.85] text-slate-400 sm:text-[18px]">
            {SIGN_QUIPS[sunSign] ?? 'Звездите са в движение. Вселената е написала нещо за теб.'}
          </p>
        </motion.div>
      )}

      {/* ── Empty state — no birth chart ──────────────────── */}
      {!birthChart && (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={1}
          className="mb-12"
        >
          <p className="mb-5 font-display text-[17px] font-light italic leading-[1.85] text-slate-500">
            Картата ти още не е настроена. Въведи рождените си данни, за да видиш хороскопа, натална карта и транзити.
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
        </motion.div>
      )}

      {/* ── Daily horoscope ───────────────────────────────── */}
      {birthChart && (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={2}
          className="mb-12"
        >
          <DailyHoroscope chartId={birthChart.id} />
        </motion.div>
      )}

    </div>
  )
}
