'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { getLunarPhase, type LunarPhase } from '@/lib/moon-phase'
import { useManifestEntries } from '@/hooks/useManifestEntries'
import { ManifestEntryForm } from './ManifestEntryForm'
import { ManifestHistory } from './ManifestHistory'

const BG_DATE = new Intl.DateTimeFormat('bg-BG', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'Europe/Sofia',
})

function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

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

export function ManifestDiaryContent() {
  // Live phase state, refreshed every minute so the prompt follows the sky
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

  const today = useMemo(() => isoDate(now), [now])
  const todayFormatted = BG_DATE.format(now)

  const { entries, isLoaded, error, saveEntry, findByDate, clearError } = useManifestEntries()
  const existingToday = findByDate(today)

  const handleSave = (intentions: [string, string, string]) => {
    saveEntry({
      date: today,
      phaseId: phase.id,
      phaseName: phase.name,
      intentions,
    })
  }

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
          className="pointer-events-none absolute right-0 top-16 -z-10 h-[220px] w-[220px] rounded-full bg-amber-500/[0.05] blur-[80px]"
        />

        <p className="mb-5 flex items-center gap-3 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-300">
          <span aria-hidden className="h-px w-5 bg-gradient-to-r from-transparent to-slate-300/50" />
          Лунен дневник · Манифестация
        </p>

        <h1 className="font-display flex flex-wrap items-baseline gap-x-3 pb-2 text-[2.125rem] leading-[1.2] tracking-tight sm:text-[2.75rem]">
          <span className="font-light text-slate-300">
            Три реда,
          </span>
          <span className="bg-gradient-to-br from-white via-slate-100 to-amber-200/95 bg-clip-text font-semibold text-transparent drop-shadow-[0_0_28px_rgba(251,191,36,0.22)]">
            един цикъл.
          </span>
        </h1>

        <p className="mt-5 max-w-xl font-display text-[15.5px] font-light leading-[1.85] text-slate-300 sm:text-[16.5px]">
          Стара практика, пренаписана за този цикъл: ден след ден, по три реда, водени от луната. Нарастващата половина сее намерения; намаляващата освобождава и благодари.
        </p>

        <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 font-cinzel text-[10px] font-semibold uppercase tracking-[0.38em] text-slate-300">
          <span>{todayFormatted}</span>
          <span aria-hidden className="h-[3px] w-[3px] rotate-45 bg-slate-400/80" />
          <span className="inline-flex items-center gap-1.5 tracking-[0.28em] text-amber-200/90">
            <span aria-hidden className="text-[12px] leading-none">☾</span>
            {phase.name} · {phase.illumination}%
          </span>
        </p>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div
            key={error.code}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            role="alert"
            className="mb-8 flex items-start gap-3 rounded-xl border border-rose-400/15 bg-rose-500/[0.04] px-5 py-4"
          >
            <p className="flex-1 font-display text-[13px] leading-[1.7] text-rose-300/90">
              {error.message}
            </p>
            <button
              type="button"
              onClick={clearError}
              aria-label="Затвори"
              className="shrink-0 rounded-full px-2 py-1 font-cinzel text-[11px] text-rose-300/70 transition-colors hover:text-rose-200"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.section
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={1}
        className="relative mb-14"
      >
        {!isLoaded ? (
          <p className="font-display text-[14px] text-slate-500">
            Разгръщам дневника...
          </p>
        ) : (
          <ManifestEntryForm
            phase={phase}
            today={todayFormatted}
            existing={existingToday}
            onSave={handleSave}
          />
        )}
      </motion.section>

      <motion.section
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={2}
      >
        <div className="mb-6 flex items-baseline gap-4">
          <p className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-300">
            Предишни страници
          </p>
          <span className="h-px flex-1 bg-gradient-to-r from-slate-300/25 via-slate-300/8 to-transparent" />
          <p className="font-cinzel text-[9.5px] text-slate-500">
            {entries.length} {entries.length === 1 ? 'запис' : 'записа'}
          </p>
        </div>

        {isLoaded && (
          <ManifestHistory entries={entries} currentDate={today} />
        )}
      </motion.section>

      <motion.footer
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={3}
        className="mt-16 border-t border-slate-300/[0.07] pt-8"
      >
        <p className="font-display text-[14px] font-light leading-[1.85] text-slate-500">
          За повече за лунните фази и ритуалите към тях виж{' '}
          <Link
            href="/astrology-guide"
            className="font-medium text-amber-300 underline decoration-amber-300/30 underline-offset-[3px] transition-colors duration-200 hover:text-amber-200 hover:decoration-amber-300/70"
          >
            Ръководството
          </Link>
          .
        </p>
      </motion.footer>
    </div>
  )
}
