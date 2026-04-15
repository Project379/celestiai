'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getLunarPhase, type LunarPhase } from '@/lib/moon-phase'

/**
 * Free-tier dashboard card: current lunar phase + manifesting guidance.
 * Click the moon disc or "Разкрий как да манифестираш" to expand the full
 * guidance panel with affirmation, crystal, ritual, journal prompt, and
 * next turning point countdown. Includes an (i) info toggle at the bottom
 * with a short explanation of what lunar phases are.
 */
export function LunarPhaseCard() {
  const phase: LunarPhase = useMemo(() => getLunarPhase(), [])
  const [expanded, setExpanded] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)

  const next = phase.nextMajor
  const countdown =
    next.daysAway < 1 / 24
      ? 'съвсем скоро'
      : formatDaysHours(next.daysAway)

  return (
    <section aria-label="Лунна фаза" className="relative">
      {/* Ambient atmosphere, matches hero treatment */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 top-4 -z-10 h-[280px] w-[280px] rounded-full bg-violet-500/[0.08] blur-[90px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 bottom-0 -z-10 h-[180px] w-[180px] rounded-full bg-amber-500/[0.05] blur-[70px]"
      />

      {/* Eyebrow */}
      <p className="mb-5 font-cinzel text-[10px] font-semibold uppercase tracking-[0.38em] text-slate-400/85">
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
          <p className="mt-1.5 font-cinzel text-[10px] font-medium uppercase tracking-[0.32em] text-slate-400/95">
            {phase.latin} · {phase.illumination}% осветление
          </p>
          <p className="mt-4 font-display text-[16px] font-light italic leading-[1.8] text-slate-200/90 sm:text-[17px]">
            {phase.intention}.
          </p>

          {/* Reveal toggle */}
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            aria-expanded={expanded}
            className="group mt-4 inline-flex items-center gap-2 font-cinzel text-[10.5px] font-semibold uppercase tracking-[0.32em] text-slate-300/90 transition-colors duration-200 hover:text-amber-300"
          >
            <span className="h-px w-6 bg-gradient-to-r from-transparent to-slate-300/70 transition-all duration-300 group-hover:to-amber-300/90" />
            {expanded ? 'Скрий манифеста' : 'Разкрий как да манифестираш'}
          </button>
        </div>
      </div>

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
              {/* Physical appearance */}
              <ManifestField
                label="Физическо изражение"
                body={phase.physicalAppearance}
              />

              <div className="grid gap-7 sm:grid-cols-2">
                <ManifestField label="Подходящо за" body={phase.bestFor} />
                <ManifestField
                  label="Афирмация"
                  body={`„${phase.affirmation}"`}
                  italic
                />
                <ManifestField label="Кристал" body={phase.crystal} />
                <ManifestField label="Ритуал" body={phase.ritual} />
              </div>

              <ManifestField
                label="Въпрос за дневника"
                body={phase.journalPrompt}
                italic
              />

              {/* Next major event countdown */}
              <div>
                <div className="mb-2 flex items-baseline gap-3">
                  <span className="font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.32em] text-amber-300/80">
                    Следваща повратна точка
                  </span>
                  <span className="h-px flex-1 bg-gradient-to-r from-slate-400/35 via-slate-400/10 to-transparent" />
                </div>
                <p className="font-display text-[15px] italic text-slate-200/90">
                  <span aria-hidden className="mr-2 text-amber-300/70">☾</span>
                  <span className="font-normal not-italic text-slate-100">{next.name}</span>
                  <span className="mx-2 text-slate-500">·</span>
                  <span>след {countdown}</span>
                </p>
              </div>
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
          className="group inline-flex items-center gap-2 font-cinzel text-[9.5px] font-medium uppercase tracking-[0.3em] text-slate-400/90 transition-colors duration-200 hover:text-amber-300"
        >
          <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-slate-300/30 font-display text-[11px] italic text-slate-300/90 transition-colors duration-200 group-hover:border-amber-300/60 group-hover:text-amber-300">
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
              <p className="font-display text-[14px] leading-[1.8] text-slate-200/95">
                Лунните фази са осемте етапа от цикъла на Луната, който продължава около 29 дни и 12 часа. Всяка фаза носи различна енергия за манифестация: <span className="text-slate-100">нарастващата</span> половина (от новолуние до пълнолуние) подкрепя изграждането, а <span className="text-slate-100">намаляващата</span> (от пълнолуние до новолуние) освобождаването.
              </p>
              <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-1.5 font-cinzel text-[10px] uppercase tracking-[0.24em] text-slate-300/90 sm:grid-cols-2">
                {[
                  'Новолуние',
                  'Изгряващ полумесец',
                  'Първа четвърт',
                  'Растяща луна',
                  'Пълнолуние',
                  'Намаляваща луна',
                  'Последна четвърт',
                  'Залязващ полумесец',
                ].map((n) => (
                  <li key={n} className="flex items-center gap-2">
                    <span aria-hidden className="text-amber-300/60">☾</span>
                    <span>{n}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────── */

function ManifestField({ label, body, italic = false }: { label: string; body: string; italic?: boolean }) {
  return (
    <div>
      <p className="mb-1.5 font-cinzel text-[9px] font-semibold uppercase tracking-[0.34em] text-amber-300/80">
        {label}
      </p>
      <p
        className={`font-display text-[14.5px] leading-[1.85] text-slate-200/95 ${
          italic ? 'font-light italic' : ''
        }`}
      >
        {body}
      </p>
    </div>
  )
}

/**
 * Format a fractional day count as "X дни Y часа" / "X часа" / "X дни".
 * Strips either unit when it rounds to zero.
 */
function formatDaysHours(daysFrac: number): string {
  const totalHours = Math.max(0, Math.round(daysFrac * 24))
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24

  const dayStr = days === 0 ? '' : days === 1 ? '1 ден' : `${days} дни`
  const hourStr =
    hours === 0 ? '' : hours === 1 ? '1 час' : `${hours} часа`

  if (dayStr && hourStr) return `${dayStr} и ${hourStr}`
  if (dayStr) return dayStr
  if (hourStr) return hourStr
  return 'по-малко от час'
}

/* ─────────────────────────────────────────────────────────────────── */
/*  SVG moon disc - semicircle + ellipse overlay                        */
/* ─────────────────────────────────────────────────────────────────── */

interface MoonDiscProps {
  phaseFraction: number // 0 → 1
  size: number
}

/**
 * Renders the moon using a reliable two-shape composition:
 *   1. A lit semicircle on the appropriate side (right for waxing, left
 *      for waning).
 *   2. An ellipse in the middle that either covers (dark, during crescent)
 *      or extends (lit, during gibbous) the semicircle.
 *
 * The ellipse horizontal radius = r·|cos(2π·phase)|. This scheme renders
 * every phase correctly without fragile SVG arc sweep flags.
 *
 * Verified illumination percentages:
 *   phase 0.125 → 14.7% (thin right crescent)
 *   phase 0.25  → 50%   (right half lit, first quarter)
 *   phase 0.375 → 85.3% (waxing gibbous)
 *   phase 0.5   → 100%  (full)
 *   phase 0.625 → 85.3% (waning gibbous)
 *   phase 0.75  → 50%   (left half lit, last quarter)
 *   phase 0.875 → 14.7% (thin left crescent)
 */
function MoonDisc({ phaseFraction, size }: MoonDiscProps) {
  const r = size / 2
  const rx = Math.abs(Math.cos(2 * Math.PI * phaseFraction)) * r
  const isWaxing = phaseFraction < 0.5
  // Crescent phases (<25% or >75%) use dark overlay; gibbous phases use lit overlay.
  const isCrescent = phaseFraction < 0.25 || phaseFraction >= 0.75

  const gradId = `moon-lit-${size}`
  const glowId = `moon-glow-${size}`
  const litFill = `url(#${gradId})`
  const darkFill = '#0d0b18'

  // Right semicircle via arc (sweep=1 in SVG = clockwise = right half from top to bottom)
  const rightSemi = `M 0,${-r} A ${r},${r} 0 0 1 0,${r} Z`
  // Left semicircle (sweep=0)
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

      {/* Outer amber glow */}
      <circle cx="0" cy="0" r={r + 7} fill={`url(#${glowId})`} />

      {/* Dark base */}
      <circle cx="0" cy="0" r={r} fill={darkFill} />

      {/* Lit semicircle: right for waxing, left for waning */}
      <path d={isWaxing ? rightSemi : leftSemi} fill={litFill} />

      {/* Modifier ellipse - dark (crescent) or lit (gibbous) */}
      <ellipse
        cx="0"
        cy="0"
        rx={rx}
        ry={r}
        fill={isCrescent ? darkFill : litFill}
      />

      {/* Thin rim */}
      <circle
        cx="0"
        cy="0"
        r={r}
        fill="none"
        stroke="rgba(226, 232, 240, 0.15)"
        strokeWidth="0.7"
      />
    </svg>
  )
}
