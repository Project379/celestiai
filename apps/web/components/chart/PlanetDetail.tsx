'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
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

// Glyphs now use <CelestialIcon> components from icons/CelestialIcons

/* ─── Element-specific visual config ─── */
const SIGN_ELEMENTS: Record<ZodiacSign, 'fire' | 'earth' | 'air' | 'water'> = {
  aries: 'fire', taurus: 'earth', gemini: 'air', cancer: 'water',
  leo: 'fire', virgo: 'earth', libra: 'air', scorpio: 'water',
  sagittarius: 'fire', capricorn: 'earth', aquarius: 'air', pisces: 'water',
}

const ELEMENT_THEMES = {
  fire: {
    bgGradient: 'from-red-950/40 via-orange-950/30 to-transparent',
    glowColor: 'rgba(239, 68, 68, 0.25)',
    accentColor: 'rgba(251, 146, 60, 0.6)',
    symbolColor: 'rgba(251, 146, 60, 0.8)',
  },
  earth: {
    bgGradient: 'from-emerald-950/40 via-stone-950/30 to-transparent',
    glowColor: 'rgba(16, 185, 129, 0.2)',
    accentColor: 'rgba(180, 160, 100, 0.6)',
    symbolColor: 'rgba(16, 185, 129, 0.7)',
  },
  air: {
    bgGradient: 'from-cyan-950/40 via-indigo-950/30 to-transparent',
    glowColor: 'rgba(34, 211, 238, 0.2)',
    accentColor: 'rgba(125, 211, 252, 0.6)',
    symbolColor: 'rgba(125, 211, 252, 0.7)',
  },
  water: {
    bgGradient: 'from-blue-950/40 via-purple-950/30 to-transparent',
    glowColor: 'rgba(59, 130, 246, 0.25)',
    accentColor: 'rgba(147, 130, 246, 0.6)',
    symbolColor: 'rgba(147, 130, 246, 0.8)',
  },
}


const PLANET_AURA_COLORS: Record<string, string> = {
  sun: 'rgba(250, 204, 21, 0.35)',
  moon: 'rgba(148, 163, 184, 0.3)',
  mercury: 'rgba(167, 139, 250, 0.3)',
  venus: 'rgba(244, 114, 182, 0.3)',
  mars: 'rgba(239, 68, 68, 0.35)',
  jupiter: 'rgba(251, 146, 60, 0.3)',
  saturn: 'rgba(120, 113, 108, 0.25)',
  uranus: 'rgba(34, 211, 238, 0.3)',
  neptune: 'rgba(59, 130, 246, 0.3)',
  pluto: 'rgba(107, 33, 168, 0.3)',
  northNode: 'rgba(168, 85, 247, 0.25)',
  rising: 'rgba(34, 211, 238, 0.3)',
}



/* ═══════════════════════════════════════════════════════════════
   GIANT GLYPH REVEAL — Luminous fade-in with scale pulse
   Icon materializes at center from blur, sharpens, then gentle
   scale bounce before fading out.
   ═══════════════════════════════════════════════════════════════ */

function GiantGlyphReveal({ iconName, element }: { iconName: string; element: 'fire' | 'earth' | 'air' | 'water' }) {
  const theme = ELEMENT_THEMES[element]

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
      aria-hidden="true"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.8, delay: 1.4, ease: 'easeIn' }}
    >
      {/* Soft glow behind icon */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 280,
          height: 280,
          background: `radial-gradient(circle, ${theme.glowColor}, transparent 70%)`,
        }}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{
          scale: [0.5, 1.1, 1],
          opacity: [0, 0.5, 0.25],
        }}
        transition={{ duration: 1.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      />
      {/* Main icon — fades in from blur, settles gently */}
      <motion.div
        className="absolute select-none"
        style={{ color: theme.symbolColor }}
        initial={{ scale: 1.08, opacity: 0, filter: 'blur(20px)' }}
        animate={{
          scale: [1.08, 1.02, 1],
          opacity: [0, 0.9, 0.75],
          filter: ['blur(20px)', 'blur(2px)', 'blur(0px)'],
        }}
        transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <CelestialIcon name={iconName} size={180} />
      </motion.div>
    </motion.div>
  )
}

export function PlanetDetail({
  planet,
  onClose,
  type,
  birthTimeKnown = true,
  house,
  aspects = [],
}: PlanetDetailProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [revealPhase, setRevealPhase] = useState(0) // 0=hidden, 1=vignette, 2=glyph, 3=panel, 4=content

  const element = useMemo(() => {
    if (!planet) return 'fire' as const
    return SIGN_ELEMENTS[planet.sign.toLowerCase() as ZodiacSign] || 'fire'
  }, [planet])

  const theme = ELEMENT_THEMES[element]

  // Orchestrate the multi-phase reveal sequence — slow, premium pacing
  useEffect(() => {
    if (planet) {
      setRevealPhase(1) // Subtle vignette
      const t1 = setTimeout(() => setRevealPhase(2), 200)   // Glyph luminous reveal
      const t2 = setTimeout(() => setRevealPhase(3), 800)   // Panel fade-in
      const t3 = setTimeout(() => setRevealPhase(4), 1400)  // Content cascade
      if (panelRef.current) panelRef.current.focus()
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
    } else {
      setRevealPhase(0)
    }
  }, [planet])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (planet) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
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
  const auraColor = PLANET_AURA_COLORS[colorKey] || PLANET_AURA_COLORS.sun
  const signKey = planet.sign.toLowerCase() as ZodiacSign
  const displayTitle = isRising
    ? interpretation.title
    : isPlanetPosition
      ? PLANETS_BG[(planet as PlanetPosition).planet as Planet]
      : interpretation.title
  const titleIconName = colorKey // 'sun', 'moon', 'rising', etc.
  const signIconName = signKey   // 'aries', 'taurus', etc.
  const signLabel = ZODIAC_SIGNS_BG[signKey] || planet.sign

  const hasOverview = Boolean(interpretation.overview.trim())
  const hasStrengths = interpretation.strengths.length > 0
  const hasChallenges = interpretation.challenges.length > 0
  const hasAspectInsights = interpretation.aspectInsights.length > 0
  const hasGrowth = Boolean(interpretation.growth.trim())

  return (
    <AnimatePresence mode="wait">
      <div key={colorKey + planet.sign}>
        {/* ═══ PHASE 1: Subtle vignette ═══ */}
        <motion.div
          className="pointer-events-none fixed inset-0 z-50"
          style={{
            background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.4) 100%)`,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.6, ease: 'easeInOut' }}
        />

        {/* ═══ PHASE 2: Giant glyph reveal ═══ */}
        {revealPhase >= 2 && (
          <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
            <GiantGlyphReveal iconName={titleIconName} element={element} />
          </div>
        )}

        {/* ═══ PHASE 3: The panel — elegant fade-in ═══ */}
        <motion.div
          ref={panelRef}
          tabIndex={-1}
          initial={{ opacity: 0, y: 24 }}
          animate={{
            opacity: revealPhase >= 3 ? 1 : 0,
            y: revealPhase >= 3 ? 0 : 24,
          }}
          exit={{ opacity: 0, y: 16 }}
          transition={{
            duration: 0.8,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          className="mt-6 relative overflow-hidden backdrop-blur-md p-5 focus:outline-none"
          style={{
            '--aura-color': auraColor,
            background: 'linear-gradient(135deg, rgba(8, 12, 28, 0.92), rgba(15, 23, 42, 0.85))',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))',
          } as React.CSSProperties}
          role="dialog"
          aria-labelledby="planet-detail-title"
          aria-describedby="planet-detail-desc"
        >
          {/* Corner accent cuts */}
          <motion.div
            className="pointer-events-none absolute top-0 right-0 w-[20px] h-[20px]"
            style={{
              background: `linear-gradient(225deg, ${theme.accentColor}, transparent)`,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          />
          <motion.div
            className="pointer-events-none absolute bottom-0 left-0 w-[20px] h-[20px]"
            style={{
              background: `linear-gradient(45deg, ${theme.accentColor}, transparent)`,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          />

          {/* Element-colored background wash */}
          <motion.div
            className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${theme.bgGradient}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            transition={{ duration: 1.6, ease: 'easeOut' }}
          />

          {/* Breathing aura glow — slow, subtle */}
          <motion.div
            className="pointer-events-none absolute inset-0"
            animate={{
              boxShadow: [
                `inset 0 0 30px ${theme.glowColor.replace(/[\d.]+\)$/, '0.04)')}`,
                `inset 0 0 50px ${theme.glowColor.replace(/[\d.]+\)$/, '0.09)')}`,
                `inset 0 0 30px ${theme.glowColor.replace(/[\d.]+\)$/, '0.04)')}`,
              ],
            }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Edge accent lines — slow draw */}
          <motion.div
            className="pointer-events-none absolute left-0 top-0 bottom-0 w-[1px]"
            style={{ background: `linear-gradient(to bottom, ${theme.accentColor.replace(/[\d.]+\)$/, '0.4)')}, transparent 70%)` }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
          />
          <motion.div
            className="pointer-events-none absolute top-0 left-0 right-0 h-[1px]"
            style={{ background: `linear-gradient(to right, ${theme.accentColor.replace(/[\d.]+\)$/, '0.4)')}, transparent 60%)` }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1, delay: 0.4, ease: 'easeOut' }}
          />

          {/* ═══ PHASE 4: Content — staggered dramatic reveal ═══ */}
          <div className="relative z-10">
            <div className="mb-4 flex items-start justify-between">
              <div className="min-w-0">
                {/* Title badge row — gentle fade from left */}
                <motion.div
                  className="mb-3 flex flex-wrap items-center gap-2"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{
                    x: revealPhase >= 4 ? 0 : -20,
                    opacity: revealPhase >= 4 ? 1 : 0,
                  }}
                  transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  <motion.span
                    className="inline-flex items-center gap-2 px-3 py-1 text-sm font-bold tracking-wide"
                    style={{
                      background: `linear-gradient(135deg, ${theme.glowColor}, ${theme.glowColor.replace(/[\d.]+\)$/, '0.05)')})`,
                      border: `1px solid ${theme.accentColor.replace(/[\d.]+\)$/, '0.4)')}`,
                      color: 'rgba(255,255,255,0.95)',
                      clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
                    }}
                  >
                    {/* Planet glyph — luminous fade-in */}
                    <motion.span
                      className="text-lg leading-none"
                      initial={{ scale: 1.3, opacity: 0, filter: 'blur(4px)' }}
                      animate={{
                        scale: revealPhase >= 4 ? [1.3, 1.05, 1] : 1.3,
                        opacity: revealPhase >= 4 ? [0, 1, 1] : 0,
                        filter: revealPhase >= 4 ? ['blur(4px)', 'blur(0px)', 'blur(0px)'] : 'blur(4px)',
                      }}
                      transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                      style={{ textShadow: `0 0 12px ${theme.glowColor}` }}
                    >
                      <CelestialIcon name={titleIconName} size={18} />
                    </motion.span>
                    <span>{displayTitle}</span>
                  </motion.span>
                  <motion.span
                    className="inline-flex items-center gap-2 border border-white/10 bg-slate-900/60 px-3 py-1 text-sm text-slate-300"
                    style={{
                      clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
                    }}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{
                      opacity: revealPhase >= 4 ? 1 : 0,
                      x: revealPhase >= 4 ? 0 : -12,
                    }}
                    transition={{ delay: 0.15, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                  >
                    <motion.span
                      className="text-base leading-none"
                      initial={{ opacity: 0 }}
                      animate={revealPhase >= 4 ? { opacity: 1 } : { opacity: 0 }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                    >
                      <CelestialIcon name={signIconName} size={18} />
                    </motion.span>
                    <span>{signLabel}</span>
                  </motion.span>
                  {house !== undefined && (
                    <motion.span
                      className="inline-flex items-center border border-white/10 bg-slate-900/60 px-3 py-1 text-sm text-slate-400"
                      style={{
                        clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
                      }}
                      initial={{ opacity: 0 }}
                      animate={{
                        opacity: revealPhase >= 4 ? 1 : 0,
                      }}
                      transition={{ delay: 0.3, duration: 0.6 }}
                    >
                      Дом {house}
                    </motion.span>
                  )}
                </motion.div>

                <motion.h3
                  id="planet-detail-title"
                  className="text-lg font-bold text-slate-100"
                  style={{ textShadow: `0 0 20px ${theme.glowColor}` }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{
                    opacity: revealPhase >= 4 ? 1 : 0,
                    y: revealPhase >= 4 ? 0 : 8,
                  }}
                  transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  {interpretation.title}
                </motion.h3>
                <motion.p
                  className="mt-1 text-sm text-slate-400"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: revealPhase >= 4 ? 1 : 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  {interpretation.position}
                </motion.p>
              </div>

              {/* Close button */}
              <motion.button
                onClick={onClose}
                className="-mr-2 -mt-1 p-2 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                style={{
                  clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)',
                }}
                aria-label="Затвори"
                initial={{ opacity: 0 }}
                animate={{ opacity: revealPhase >= 4 ? 1 : 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
            </div>

            {/* Brief interpretation */}
            {interpretation.brief && (
              <motion.div
                className="mb-4 relative"
                initial={{ opacity: 0, y: 8 }}
                animate={{
                  opacity: revealPhase >= 4 ? 1 : 0,
                  y: revealPhase >= 4 ? 0 : 8,
                }}
                transition={{ duration: 0.8, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <p
                  className="text-base font-medium leading-relaxed"
                  style={{
                    color: 'rgba(255, 255, 255, 0.9)',
                    textShadow: `0 0 20px ${theme.glowColor}`,
                  }}
                >
                  {interpretation.brief.charAt(0).toUpperCase() + interpretation.brief.slice(1)}
                </p>
                {/* Underline sweep */}
                <motion.div
                  className="mt-2 h-[1px]"
                  style={{
                    background: `linear-gradient(90deg, ${theme.accentColor.replace(/[\d.]+\)$/, '0.4)')}, transparent)`,
                    transformOrigin: 'left',
                  }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: revealPhase >= 4 ? 1 : 0 }}
                  transition={{ duration: 1.2, delay: 0.6, ease: 'easeOut' }}
                />
              </motion.div>
            )}

            {/* Content sections — staggered cascade with left accent bars */}
            <motion.div
              id="planet-detail-desc"
              className="space-y-4 text-sm leading-relaxed text-slate-300"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: revealPhase >= 4 ? 1 : 0, y: revealPhase >= 4 ? 0 : 10 }}
              transition={{ duration: 0.9, delay: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {hasOverview && (
                <motion.section
                  className="relative pl-3 border-l-2"
                  style={{ borderColor: theme.accentColor.replace(/[\d.]+\)$/, '0.3)') }}
                  initial={{ opacity: 0, y: 20, x: -15 }}
                  animate={{
                    opacity: revealPhase >= 4 ? 1 : 0,
                    y: revealPhase >= 4 ? 0 : 20,
                    x: revealPhase >= 4 ? 0 : -15,
                  }}
                  transition={{ delay: 0.5, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <h4
                    className="mb-1 text-xs font-bold uppercase tracking-[0.25em]"
                    style={{ color: theme.accentColor, textShadow: `0 0 8px ${theme.glowColor}` }}
                  >
                    Общ поглед
                  </h4>
                  <p>{interpretation.overview}</p>
                </motion.section>
              )}

              {hasStrengths && (
                <motion.section
                  className="relative pl-3 border-l-2"
                  style={{ borderColor: theme.accentColor.replace(/[\d.]+\)$/, '0.3)') }}
                  initial={{ opacity: 0, y: 20, x: -15 }}
                  animate={{
                    opacity: revealPhase >= 4 ? 1 : 0,
                    y: revealPhase >= 4 ? 0 : 20,
                    x: revealPhase >= 4 ? 0 : -15,
                  }}
                  transition={{ delay: 0.6, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <h4
                    className="mb-2 text-xs font-bold uppercase tracking-[0.25em]"
                    style={{ color: theme.accentColor, textShadow: `0 0 8px ${theme.glowColor}` }}
                  >
                    Силни страни
                  </h4>
                  <ul className="space-y-1">
                    {interpretation.strengths.map((item, i) => (
                      <motion.li
                        key={item}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{
                          opacity: revealPhase >= 4 ? 1 : 0,
                          x: revealPhase >= 4 ? 0 : -20,
                        }}
                        transition={{ delay: 0.65 + i * 0.07, duration: 0.3 }}
                      >
                        <span style={{ color: theme.accentColor }}>&#x25C8;</span> {item}
                      </motion.li>
                    ))}
                  </ul>
                </motion.section>
              )}

              {hasChallenges && (
                <motion.section
                  className="relative pl-3 border-l-2"
                  style={{ borderColor: theme.accentColor.replace(/[\d.]+\)$/, '0.3)') }}
                  initial={{ opacity: 0, y: 20, x: -15 }}
                  animate={{
                    opacity: revealPhase >= 4 ? 1 : 0,
                    y: revealPhase >= 4 ? 0 : 20,
                    x: revealPhase >= 4 ? 0 : -15,
                  }}
                  transition={{ delay: 0.7, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <h4
                    className="mb-2 text-xs font-bold uppercase tracking-[0.25em]"
                    style={{ color: theme.accentColor, textShadow: `0 0 8px ${theme.glowColor}` }}
                  >
                    Предизвикателства
                  </h4>
                  <ul className="space-y-1">
                    {interpretation.challenges.map((item, i) => (
                      <motion.li
                        key={item}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{
                          opacity: revealPhase >= 4 ? 1 : 0,
                          x: revealPhase >= 4 ? 0 : -20,
                        }}
                        transition={{ delay: 0.75 + i * 0.07, duration: 0.3 }}
                      >
                        <span style={{ color: theme.accentColor }}>&#x25C8;</span> {item}
                      </motion.li>
                    ))}
                  </ul>
                </motion.section>
              )}

              {hasAspectInsights && (
                <motion.section
                  className="relative pl-3 border-l-2"
                  style={{ borderColor: theme.accentColor.replace(/[\d.]+\)$/, '0.3)') }}
                  initial={{ opacity: 0, y: 20, x: -15 }}
                  animate={{
                    opacity: revealPhase >= 4 ? 1 : 0,
                    y: revealPhase >= 4 ? 0 : 20,
                    x: revealPhase >= 4 ? 0 : -15,
                  }}
                  transition={{ delay: 0.8, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <h4
                    className="mb-2 text-xs font-bold uppercase tracking-[0.25em]"
                    style={{ color: theme.accentColor, textShadow: `0 0 8px ${theme.glowColor}` }}
                  >
                    Аспекти
                  </h4>
                  <ul className="space-y-2">
                    {interpretation.aspectInsights.map((item, i) => (
                      <motion.li
                        key={item}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{
                          opacity: revealPhase >= 4 ? 1 : 0,
                          x: revealPhase >= 4 ? 0 : -20,
                        }}
                        transition={{ delay: 0.85 + i * 0.07, duration: 0.3 }}
                      >
                        <span style={{ color: theme.accentColor }}>&#x25C8;</span> {item}
                      </motion.li>
                    ))}
                  </ul>
                </motion.section>
              )}

              {hasGrowth && (
                <motion.section
                  className="relative pl-3 border-l-2"
                  style={{ borderColor: theme.accentColor.replace(/[\d.]+\)$/, '0.3)') }}
                  initial={{ opacity: 0, y: 20, x: -15 }}
                  animate={{
                    opacity: revealPhase >= 4 ? 1 : 0,
                    y: revealPhase >= 4 ? 0 : 20,
                    x: revealPhase >= 4 ? 0 : -15,
                  }}
                  transition={{ delay: 0.9, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <h4
                    className="mb-1 text-xs font-bold uppercase tracking-[0.25em]"
                    style={{ color: theme.accentColor, textShadow: `0 0 8px ${theme.glowColor}` }}
                  >
                    Насока за развитие
                  </h4>
                  <p>{interpretation.growth}</p>
                </motion.section>
              )}
            </motion.div>

            {isRising && !birthTimeKnown && (
              <div className="mt-4 border border-amber-500/30 bg-amber-500/10 p-3"
                style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }}
              >
                <p className="text-xs text-amber-300">
                  Часът на раждане е приблизителен, затова и тълкуването на възходящия знак е ориентировъчно.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
