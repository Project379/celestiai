'use client'

import { useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PLANETS_BG,
  ZODIAC_SIGNS_BG,
  type AspectData,
  type Planet,
  type PlanetPosition,
  type PointData,
  type ZodiacSign,
} from '@celestia/astrology/client'
import {
  getPlanetInterpretation,
  getRisingInterpretation,
} from '@/lib/interpretations/planets'
import { CelestialIcon } from '@/components/icons/CelestialIcons'

interface PlanetDetailProps {
  planet: PlanetPosition | PointData | null
  onClose: () => void
  type?: 'sun' | 'moon' | 'rising' | null
  birthTimeKnown?: boolean
  house?: number
  aspects?: AspectData[]
}

/* ─── Element → subtle accent tint ────────────────────── */
const SIGN_ELEMENTS: Record<ZodiacSign, 'fire' | 'earth' | 'air' | 'water'> = {
  aries: 'fire', taurus: 'earth', gemini: 'air', cancer: 'water',
  leo: 'fire', virgo: 'earth', libra: 'air', scorpio: 'water',
  sagittarius: 'fire', capricorn: 'earth', aquarius: 'air', pisces: 'water',
}

const ELEMENT_TINT: Record<'fire' | 'earth' | 'air' | 'water', { text: string; dot: string }> = {
  fire:  { text: 'text-rose-300/85',    dot: 'bg-rose-300/90 shadow-[0_0_8px_rgba(253,164,175,0.6)]' },
  earth: { text: 'text-emerald-300/85', dot: 'bg-emerald-300/90 shadow-[0_0_8px_rgba(110,231,183,0.6)]' },
  air:   { text: 'text-cyan-300/85',    dot: 'bg-cyan-300/90 shadow-[0_0_8px_rgba(103,232,249,0.6)]' },
  water: { text: 'text-violet-300/85',  dot: 'bg-violet-300/90 shadow-[0_0_8px_rgba(196,181,253,0.6)]' },
}

const ELEMENT_LABEL: Record<'fire' | 'earth' | 'air' | 'water', string> = {
  fire: 'Огън', earth: 'Земя', air: 'Въздух', water: 'Вода',
}

/* ─── Editorial fade-up ──────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 14, filter: 'blur(6px)' },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.5, delay: i * 0.05, ease: [0.22, 0.68, 0.35, 1] as const },
  }),
}

/* ─── Section with hairline divider and Roman numeral ── */
function Section({
  numeral,
  title,
  tint,
  dot,
  index,
  children,
}: {
  numeral: string
  title: string
  tint: string
  dot: string
  index: number
  children: React.ReactNode
}) {
  return (
    <motion.section
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      custom={index}
      className="border-t border-white/[0.05] pt-5"
    >
      <header className="mb-3 flex items-center gap-3">
        <span className={`font-cinzel text-[10px] font-semibold uppercase tracking-[0.38em] ${tint}`}>
          {numeral}
        </span>
        <span aria-hidden className={`h-1 w-1 rotate-45 ${dot}`} />
        <span className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.34em] text-slate-400">
          {title}
        </span>
      </header>
      <div className="font-display text-[14px] leading-[1.85] text-slate-300/95">
        {children}
      </div>
    </motion.section>
  )
}

/* ─── Main ───────────────────────────────────────────── */
export function PlanetDetail({
  planet,
  onClose,
  type,
  birthTimeKnown = true,
  house,
  aspects = [],
}: PlanetDetailProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  const element = useMemo(() => {
    if (!planet) return 'fire' as const
    return SIGN_ELEMENTS[planet.sign.toLowerCase() as ZodiacSign] || 'fire'
  }, [planet])

  const tint = ELEMENT_TINT[element]

  useEffect(() => {
    if (!planet) return
    panelRef.current?.focus()
  }, [planet])

  useEffect(() => {
    if (!planet) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [planet, onClose])

  const interpretation = useMemo(() => {
    if (!planet) return null
    const isPlanetPosition = 'planet' in planet
    const isRising = type === 'rising'

    return isRising
      ? getRisingInterpretation(
          planet.sign,
          'degree' in planet ? planet.degree : (planet as PlanetPosition).signDegree,
          !birthTimeKnown
        )
      : getPlanetInterpretation(
          isPlanetPosition ? (planet as PlanetPosition).planet : type || 'sun',
          planet.sign,
          isPlanetPosition ? (planet as PlanetPosition).signDegree : (planet as PointData).degree,
          house,
          aspects
        )
  }, [planet, type, birthTimeKnown, house, aspects])

  if (!planet || !interpretation) return null

  const isPlanetPosition = 'planet' in planet
  const isRising = type === 'rising'

  const colorKey: Planet | 'rising' = isRising
    ? 'rising'
    : isPlanetPosition
      ? ((planet as PlanetPosition).planet as Planet)
      : 'sun'

  const signKey = planet.sign.toLowerCase() as ZodiacSign
  const displayTitle = isRising
    ? interpretation.title
    : isPlanetPosition
      ? PLANETS_BG[(planet as PlanetPosition).planet as Planet]
      : interpretation.title
  const titleIconName = colorKey
  const signIconName = signKey
  const signLabel = ZODIAC_SIGNS_BG[signKey] || planet.sign

  const hasOverview = Boolean(interpretation.overview.trim())
  const hasStrengths = interpretation.strengths.length > 0
  const hasChallenges = interpretation.challenges.length > 0
  const hasAspectInsights = interpretation.aspectInsights.length > 0
  const hasGrowth = Boolean(interpretation.growth.trim())

  return (
    <AnimatePresence>
      <motion.div
        key={colorKey + planet.sign}
        className="fixed inset-0 z-[120] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.24 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-[#04030a]/85 backdrop-blur-md"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />

        {/* Panel */}
        <motion.div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-labelledby="planet-detail-title"
          aria-describedby="planet-detail-desc"
          className="mystic-panel relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden focus:outline-none"
          initial={{ opacity: 0, y: 24, scale: 0.96, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: 14, scale: 0.97, filter: 'blur(6px)' }}
          transition={{ duration: 0.5, ease: [0.22, 0.68, 0.35, 1] }}
        >
          {/* Ambient atmosphere */}
          <div
            aria-hidden
            className="pointer-events-none absolute -left-24 -top-24 -z-0 h-[360px] w-[360px] rounded-full bg-violet-500/[0.10] blur-[110px]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 top-20 -z-0 h-[260px] w-[260px] rounded-full bg-amber-500/[0.06] blur-[95px]"
          />

          {/* Header */}
          <div className="relative flex items-start justify-between gap-6 border-b border-white/[0.06] px-8 pb-6 pt-8">
            <div className="min-w-0">
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05 }}
                className="mb-3 flex items-center gap-3 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-amber-300/80"
              >
                <span aria-hidden className="h-1 w-1 rotate-45 bg-amber-300/90 shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
                {isRising ? 'Асцендент' : 'Планета'}
              </motion.p>

              <motion.h3
                id="planet-detail-title"
                className="font-display flex flex-wrap items-baseline gap-x-3 text-[1.625rem] font-semibold leading-[1.15] tracking-tight sm:text-[1.875rem]"
                initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 0.68, 0.35, 1] }}
              >
                <span className="inline-flex items-center gap-2.5 text-slate-200/95">
                  <CelestialIcon name={titleIconName} size={22} className="text-amber-200/85" />
                  <span className="font-light italic text-slate-400">{displayTitle}</span>
                </span>
                <span className="inline-flex items-center gap-2.5">
                  <span className="bg-gradient-to-br from-white via-slate-100 to-amber-200/90 bg-clip-text font-semibold text-transparent drop-shadow-[0_0_22px_rgba(251,191,36,0.18)]">
                    в {signLabel}
                  </span>
                  <CelestialIcon name={signIconName} size={22} className="text-slate-300/85" />
                </span>
              </motion.h3>

              <motion.p
                className="mt-3 font-display text-[13px] font-light italic text-slate-400"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.18 }}
              >
                {interpretation.position}
              </motion.p>

              {/* Meta row: element · house */}
              <motion.div
                className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.24 }}
              >
                <span className={`inline-flex items-center gap-2 font-cinzel text-[9px] font-semibold uppercase tracking-[0.3em] ${tint.text}`}>
                  <span aria-hidden className={`h-1 w-1 rotate-45 ${tint.dot}`} />
                  {ELEMENT_LABEL[element]}
                </span>
                {house !== undefined && (
                  <span className="inline-flex items-center gap-2 font-cinzel text-[9px] font-semibold uppercase tracking-[0.3em] text-slate-500">
                    <span aria-hidden className="h-1 w-1 rotate-45 bg-slate-500/70" />
                    Дом {house}
                  </span>
                )}
              </motion.div>
            </div>

            {/* Close */}
            <motion.button
              onClick={onClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="shrink-0 rounded-full p-2 text-slate-500 transition-colors hover:text-amber-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300/60"
              aria-label="Затвори"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>
          </div>

          {/* Brief interpretation — italic editorial lede */}
          {interpretation.brief && (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={1}
              className="relative px-8 pt-6"
            >
              <p className="max-w-xl border-l border-amber-300/40 pl-6 font-display text-[16px] font-light italic leading-[1.85] text-slate-300/95">
                {interpretation.brief.charAt(0).toUpperCase() + interpretation.brief.slice(1)}
              </p>
            </motion.div>
          )}

          {/* Body — scrollable editorial flow */}
          <div
            id="planet-detail-desc"
            className="relative flex-1 space-y-7 overflow-y-auto px-8 py-7"
          >
            {hasOverview && (
              <Section numeral="I" title="Общ поглед" tint={tint.text} dot={tint.dot} index={2}>
                <p>{interpretation.overview}</p>
              </Section>
            )}

            {hasStrengths && (
              <Section numeral="II" title="Силни страни" tint={tint.text} dot={tint.dot} index={3}>
                <ul className="space-y-2">
                  {interpretation.strengths.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span aria-hidden className={`mt-[10px] h-1 w-1 shrink-0 rotate-45 ${tint.dot}`} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {hasChallenges && (
              <Section numeral="III" title="Предизвикателства" tint={tint.text} dot={tint.dot} index={4}>
                <ul className="space-y-2">
                  {interpretation.challenges.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span aria-hidden className={`mt-[10px] h-1 w-1 shrink-0 rotate-45 ${tint.dot}`} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {hasAspectInsights && (
              <Section numeral="IV" title="Аспекти" tint={tint.text} dot={tint.dot} index={5}>
                <ul className="space-y-2.5">
                  {interpretation.aspectInsights.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span aria-hidden className={`mt-[10px] h-1 w-1 shrink-0 rotate-45 ${tint.dot}`} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {hasGrowth && (
              <Section numeral="V" title="Насока за развитие" tint={tint.text} dot={tint.dot} index={6}>
                <p>{interpretation.growth}</p>
              </Section>
            )}

            {isRising && !birthTimeKnown && (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                custom={7}
                className="border-l border-amber-300/50 bg-gradient-to-r from-amber-300/[0.05] via-transparent to-violet-400/[0.04] px-5 py-3"
              >
                <p className="mb-1 font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-amber-300/80">
                  Забележка
                </p>
                <p className="font-display text-[12.5px] font-light italic leading-relaxed text-amber-100/85">
                  Часът на раждане е приблизителен, затова тълкуването на асцендента е ориентировъчно.
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
