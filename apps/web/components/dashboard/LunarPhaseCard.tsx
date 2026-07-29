'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { getLunarPhase, type LunarPhase } from '@/lib/moon-phase'
import {
  getActiveMeteorShower,
  getNextMeteorShower,
  daysUntilPeak,
  type MeteorShower,
} from '@stellaeum/core/welcome'
import { formatDaysHours, pluralizeBg } from '@stellaeum/core/i18n/bg-grammar'

/**
 * Free-tier dashboard card: current lunar phase + manifesting guidance.
 * Live-updates every 60 seconds so the moon progresses without a reload.
 * Includes an active meteor shower callout when one is in its window.
 */
export function LunarPhaseCard() {
  // Live state: moon phase + meteor shower update on a minute interval
  const [phase, setPhase] = useState<LunarPhase>(() => getLunarPhase())
  const [shower, setShower] = useState<MeteorShower | null>(() => getActiveMeteorShower())
  const [upcoming, setUpcoming] = useState(() => getNextMeteorShower())
  const [expanded, setExpanded] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setPhase(getLunarPhase(now))
      setShower(getActiveMeteorShower(now))
      setUpcoming(getNextMeteorShower(now))
    }
    // Re-tick every 60 seconds so illumination, phase buckets, and
    // meteor-shower windows stay fresh without a reload.
    const interval = setInterval(tick, 60_000)
    return () => clearInterval(interval)
  }, [])

  const next = phase.nextMajor
  const countdown =
    next.daysAway < 1 / 24
      ? 'съвсем скоро'
      : formatDaysHours(next.daysAway)

  const showerPeakDays = shower ? daysUntilPeak(shower) : null

  return (
    <section aria-label="Лунна фаза" className="relative">
      {/* Ambient atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 top-4 -z-10 h-[280px] w-[280px] rounded-full bg-violet-500/[0.08] blur-[90px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 bottom-0 -z-10 h-[180px] w-[180px] rounded-full bg-amber-500/[0.05] blur-[70px]"
      />

      {/* Eyebrow */}
      <p className="mb-5 font-cinzel text-[10px] font-semibold uppercase tracking-[0.38em] text-slate-300/90">
        Лунна фаза · Манифестация
      </p>

      {/* Main row: moon disc + current phase info */}
      <div className="flex items-start gap-6 sm:gap-8">
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          aria-expanded={expanded}
          aria-label={`${phase.name}, ${phase.illumination} процента осветление. Натисни за манифест.`}
          className="group relative flex-shrink-0 transition-transform duration-500 hover:scale-[1.04] focus:outline-none"
        >
          <MoonDisc phaseFraction={phase.phaseFraction} size={108} />
        </button>

        <div className="min-w-0 flex-1 pt-1">
          <h2 className="font-display text-[1.55rem] font-semibold leading-tight sm:text-[1.8rem]">
            <span className="bg-gradient-to-br from-white via-slate-100 to-amber-200/95 bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(251,191,36,0.2)]">
              {phase.name}
            </span>
          </h2>
          <p className="mt-1.5 font-cinzel text-[10px] font-medium uppercase tracking-[0.32em] text-slate-300/90">
            {phase.latin} · {phase.illumination}% осветление
          </p>
          <p className="mt-4 font-display text-[16px] font-light leading-[1.8] text-slate-200/95 sm:text-[17px]">
            {phase.intention}.
          </p>

          {/* Reveal toggle */}
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            aria-expanded={expanded}
            className="group mt-4 inline-flex items-center gap-2 font-cinzel text-[10.5px] font-semibold uppercase tracking-[0.32em] text-slate-200 transition-colors duration-200 hover:text-amber-300"
          >
            <span className="h-px w-6 bg-gradient-to-r from-transparent to-slate-300/80 transition-all duration-300 group-hover:to-amber-300/90" />
            {expanded ? 'Скрий манифеста' : 'Разкрий как да манифестираш'}
          </button>
        </div>
      </div>

      {/* Active meteor shower banner (always visible when a shower is in window) */}
      {shower && (
        <div className="mt-7 rounded-xl border border-amber-300/15 bg-gradient-to-r from-amber-400/[0.05] via-transparent to-violet-400/[0.04] px-5 py-4">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.32em] text-amber-300/90">
            <span>Активен метеорен поток</span>
            <span aria-hidden className="h-px w-8 bg-gradient-to-r from-amber-300/60 to-transparent" />
            <span className="text-slate-300/90">
              {shower.name} · {shower.latin}
            </span>
          </p>
          <p className="mt-2 font-display text-[14.5px] leading-[1.8] text-slate-200/95">
            {shower.description}
          </p>
          <p className="mt-2 font-cinzel text-[9.5px] uppercase tracking-[0.28em] text-slate-300/85">
            Върхова нощ: {formatMonthDay(shower.peakMonth, shower.peakDay)}
            {showerPeakDays !== null && (
              <>
                <span className="mx-2 text-slate-500">·</span>
                <span>
                  {showerPeakDays === 0
                    ? 'тази нощ'
                    : showerPeakDays > 0
                    ? `след ${showerPeakDays} ${pluralizeBg(showerPeakDays, 'ден', 'дни')}`
                    : `${Math.abs(showerPeakDays)} ${pluralizeBg(Math.abs(showerPeakDays), 'ден', 'дни')} след върха`}
                </span>
              </>
            )}
            <span className="mx-2 text-slate-500">·</span>
            <span>до {shower.zhr} {pluralizeBg(shower.zhr, 'метеор', 'метеора')} на час</span>
          </p>
        </div>
      )}

      {/* Expanded guidance panel */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="guidance"
            initial={{ opacity: 0, height: 0, filter: 'blur(6px)' }}
            animate={{ opacity: 1, height: 'auto', filter: 'blur(0px)' }}
            exit={{ opacity: 0, height: 0, filter: 'blur(6px)' }}
            transition={{ duration: 0.5, ease: [0.22, 0.68, 0.35, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-7 space-y-7 border-t border-slate-300/[0.08] pt-7">
              <ManifestField
                label="Физическо изражение"
                body={phase.physicalAppearance}
              />

              <div className="grid gap-7 sm:grid-cols-2">
                <ManifestField label="Подходящо за" body={phase.bestFor} />
                <ManifestField
                  label="Афирмация"
                  body={`„${phase.affirmation}"`}
                />
                <ManifestField label="Кристал" body={phase.crystal} />
                <ManifestField label="Ритуал" body={phase.ritual} />
              </div>

              <ManifestField
                label="Въпрос за дневника"
                body={phase.journalPrompt}
              />

              {/* Next major event countdown */}
              <div>
                <div className="mb-2 flex items-baseline gap-3">
                  <span className="font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.32em] text-amber-300/85">
                    Следваща повратна точка
                  </span>
                  <span className="h-px flex-1 bg-gradient-to-r from-slate-400/35 via-slate-400/10 to-transparent" />
                </div>
                <p className="font-display text-[15px] text-slate-200/95">
                  <span aria-hidden className="mr-2 text-amber-300/70">☾</span>
                  <span className="font-normal text-slate-100">{next.name}</span>
                  <span className="mx-2 text-slate-500">·</span>
                  <span>след {countdown}</span>
                </p>
              </div>

              {/* Next upcoming meteor shower (only if none currently active) */}
              {!shower && upcoming && upcoming.daysAway <= 60 && (
                <div>
                  <div className="mb-2 flex items-baseline gap-3">
                    <span className="font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.32em] text-amber-300/85">
                      Следващ метеорен поток
                    </span>
                    <span className="h-px flex-1 bg-gradient-to-r from-slate-400/35 via-slate-400/10 to-transparent" />
                  </div>
                  <p className="font-display text-[15px] text-slate-200/95">
                    <span className="font-normal text-slate-100">
                      {upcoming.shower.name}
                    </span>
                    <span className="mx-2 text-slate-500">·</span>
                    <span>
                      връх {formatMonthDay(upcoming.shower.peakMonth, upcoming.shower.peakDay)}, след {upcoming.daysAway}{' '}
                      {pluralizeBg(upcoming.daysAway, 'ден', 'дни')}
                    </span>
                  </p>
                </div>
              )}

              {/* Guide link */}
              <p className="font-display text-[14px] leading-[1.8] text-slate-300/90">
                Научи повече за манифестирането с луната в{' '}
                <Link
                  href="/astrology-guide"
                  className="font-medium text-amber-300 underline decoration-amber-300/40 underline-offset-[3px] transition-colors duration-200 hover:text-amber-200 hover:decoration-amber-300/80"
                >
                  Ръководството
                </Link>
                .
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info "i" toggle at bottom */}
      <div className="mt-6 flex items-center justify-end">
        <button
          type="button"
          onClick={() => setInfoOpen(v => !v)}
          aria-expanded={infoOpen}
          aria-label="За лунните фази"
          className="group inline-flex items-center gap-2 font-cinzel text-[9.5px] font-medium uppercase tracking-[0.3em] text-slate-300 transition-colors duration-200 hover:text-amber-300"
        >
          <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-slate-300/40 font-display text-[11px] text-slate-200 transition-colors duration-200 group-hover:border-amber-300/60 group-hover:text-amber-300">
            i
          </span>
          За лунните фази
        </button>
      </div>

      <AnimatePresence initial={false}>
        {infoOpen && (
          <motion.div
            key="info"
            initial={{ opacity: 0, height: 0, filter: 'blur(4px)' }}
            animate={{ opacity: 1, height: 'auto', filter: 'blur(0px)' }}
            exit={{ opacity: 0, height: 0, filter: 'blur(4px)' }}
            transition={{ duration: 0.4, ease: [0.22, 0.68, 0.35, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-4 rounded-xl border border-slate-300/[0.08] bg-slate-900/30 px-5 py-4 backdrop-blur-sm">
              <p className="font-display text-[14px] leading-[1.85] text-slate-200/95">
                Лунните фази са осемте етапа от цикъла на Луната, който продължава около 29 дни и 12 часа. Нарастващата половина (от новолуние до пълнолуние) подкрепя изграждането; намаляващата половина (от пълнолуние до следващото новолуние) освобождаването.
              </p>

              {/* Simpler two-column legend: waxing vs waning, phase names only */}
              <div className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-2">
                <div>
                  <p className="mb-2 font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-amber-300/85">
                    Нарастваща
                  </p>
                  <ul className="space-y-1 font-display text-[13.5px] text-slate-200/90">
                    <li>Новолуние</li>
                    <li>Изгряващ полумесец</li>
                    <li>Първа четвърт</li>
                    <li>Растяща луна</li>
                  </ul>
                </div>
                <div>
                  <p className="mb-2 font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-indigo-300/85">
                    Намаляваща
                  </p>
                  <ul className="space-y-1 font-display text-[13.5px] text-slate-200/90">
                    <li>Пълнолуние</li>
                    <li>Намаляваща луна</li>
                    <li>Последна четвърт</li>
                    <li>Залязващ полумесец</li>
                  </ul>
                </div>
              </div>

              <p className="mt-4 font-display text-[13px] leading-[1.7] text-slate-300/90">
                Цялата глава за лунните фази с ритуали и астрономическо описание намираш в{' '}
                <Link
                  href="/astrology-guide"
                  className="font-medium text-amber-300 underline decoration-amber-300/40 underline-offset-[3px] transition-colors duration-200 hover:text-amber-200 hover:decoration-amber-300/80"
                >
                  Ръководството
                </Link>
                .
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────── */

function ManifestField({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <p className="mb-1.5 font-cinzel text-[9px] font-semibold uppercase tracking-[0.34em] text-amber-300/85">
        {label}
      </p>
      <p className="font-display text-[14.5px] font-light leading-[1.85] text-slate-200/95">
        {body}
      </p>
    </div>
  )
}

const BG_MONTHS = ['януари', 'февруари', 'март', 'април', 'май', 'юни', 'юли', 'август', 'септември', 'октомври', 'ноември', 'декември']

function formatMonthDay(month: number, day: number): string {
  return `${day} ${BG_MONTHS[month - 1]}`
}

/* ─────────────────────────────────────────────────────────────────── */
/*  SVG moon disc — semicircle + ellipse overlay                        */
/* ─────────────────────────────────────────────────────────────────── */

interface MoonDiscProps {
  phaseFraction: number // 0 → 1
  size: number
}

function MoonDisc({ phaseFraction, size }: MoonDiscProps) {
  const r = size / 2
  // Round rx to 2 decimal places so SSR and client hydration (which run
  // getLunarPhase() at slightly different moments) produce the same SVG
  // string. Sub-pixel precision, visually identical, no hydration warning.
  const rx = Math.round(Math.abs(Math.cos(2 * Math.PI * phaseFraction)) * r * 100) / 100
  const isWaxing = phaseFraction < 0.5
  const isCrescent = phaseFraction < 0.25 || phaseFraction >= 0.75

  const gradId = `moon-lit-${size}`
  const glowId = `moon-glow-${size}`
  const litFill = `url(#${gradId})`
  const darkFill = '#0d0b18'

  const rightSemi = `M 0,${-r} A ${r},${r} 0 0 1 0,${r} Z`
  const leftSemi = `M 0,${-r} A ${r},${r} 0 0 0 0,${r} Z`

  return (
    <svg
      width={size}
      height={size}
      viewBox={`${-size / 2 - 10} ${-size / 2 - 10} ${size + 20} ${size + 20}`}
      aria-hidden
    >
      <defs>
        <radialGradient id={gradId} cx="52%" cy="42%" r="62%">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="55%" stopColor="#f5e6c8" />
          <stop offset="100%" stopColor="#d4b97f" />
        </radialGradient>
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(251, 191, 36, 0.38)" />
          <stop offset="60%" stopColor="rgba(251, 191, 36, 0.08)" />
          <stop offset="100%" stopColor="rgba(251, 191, 36, 0)" />
        </radialGradient>
      </defs>

      <circle cx="0" cy="0" r={r + 7} fill={`url(#${glowId})`} />
      <circle cx="0" cy="0" r={r} fill={darkFill} />
      <path d={isWaxing ? rightSemi : leftSemi} fill={litFill} />
      <ellipse
        cx="0"
        cy="0"
        rx={rx}
        ry={r}
        fill={isCrescent ? darkFill : litFill}
      />
      <circle
        cx="0"
        cy="0"
        r={r}
        fill="none"
        stroke="rgba(226, 232, 240, 0.18)"
        strokeWidth="0.7"
      />
    </svg>
  )
}
