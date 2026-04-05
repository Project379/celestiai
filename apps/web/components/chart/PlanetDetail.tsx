'use client'

import { useEffect, useRef } from 'react'
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

interface PlanetDetailProps {
  planet: PlanetPosition | PointData | null
  onClose: () => void
  type?: 'sun' | 'moon' | 'rising' | null
  birthTimeKnown?: boolean
  house?: number
  aspects?: AspectData[]
}

const PLANET_GLYPHS: Record<Planet | 'rising', string> = {
  sun: '☉︎',
  moon: '☽︎',
  mercury: '☿︎',
  venus: '♀︎',
  mars: '♂︎',
  jupiter: '♃︎',
  saturn: '♄︎',
  uranus: '♅︎',
  neptune: '♆︎',
  pluto: '♇︎',
  northNode: '☊︎',
  rising: '↗',
}

const ZODIAC_GLYPHS: Record<ZodiacSign, string> = {
  aries: '♈︎',
  taurus: '♉︎',
  gemini: '♊︎',
  cancer: '♋︎',
  leo: '♌︎',
  virgo: '♍︎',
  libra: '♎︎',
  scorpio: '♏︎',
  sagittarius: '♐︎',
  capricorn: '♑︎',
  aquarius: '♒︎',
  pisces: '♓︎',
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

  useEffect(() => {
    if (planet && panelRef.current) {
      panelRef.current.focus()
    }
  }, [planet])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (planet) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [planet, onClose])

  if (!planet) {
    return null
  }

  const isPlanetPosition = 'planet' in planet
  const isRising = type === 'rising'

  const interpretation = isRising
    ? getRisingInterpretation(
        planet.sign,
        'degree' in planet ? planet.degree : (planet as PlanetPosition).signDegree,
        !birthTimeKnown
      )
    : getPlanetInterpretation(
        isPlanetPosition ? (planet as PlanetPosition).planet : type || 'sun',
        planet.sign,
        isPlanetPosition
          ? (planet as PlanetPosition).signDegree
          : (planet as PointData).degree,
        house,
        aspects
      )

  const planetColors: Record<string, string> = {
    sun: 'border-yellow-500/50 bg-yellow-500/10',
    moon: 'border-slate-400/50 bg-slate-400/10',
    mercury: 'border-purple-400/50 bg-purple-400/10',
    venus: 'border-pink-400/50 bg-pink-400/10',
    mars: 'border-red-500/50 bg-red-500/10',
    jupiter: 'border-orange-400/50 bg-orange-400/10',
    saturn: 'border-stone-400/50 bg-stone-400/10',
    uranus: 'border-cyan-400/50 bg-cyan-400/10',
    neptune: 'border-blue-500/50 bg-blue-500/10',
    pluto: 'border-purple-600/50 bg-purple-600/10',
    northNode: 'border-violet-400/50 bg-violet-400/10',
    rising: 'border-cyan-400/50 bg-cyan-400/10',
  }

  const colorKey: Planet | 'rising' = isRising
    ? 'rising'
    : isPlanetPosition
      ? ((planet as PlanetPosition).planet as Planet)
      : 'sun'
  const colorClass = planetColors[colorKey] || 'border-purple-500/50 bg-purple-500/10'
  const signKey = planet.sign.toLowerCase() as ZodiacSign
  const displayTitle = isRising
    ? interpretation.title
    : isPlanetPosition
      ? PLANETS_BG[(planet as PlanetPosition).planet as Planet]
      : interpretation.title
  const titleGlyph = PLANET_GLYPHS[colorKey] || '✦'
  const signGlyph = ZODIAC_GLYPHS[signKey]
  const signLabel = ZODIAC_SIGNS_BG[signKey] || planet.sign

  const hasOverview = Boolean(interpretation.overview.trim())
  const hasStrengths = interpretation.strengths.length > 0
  const hasChallenges = interpretation.challenges.length > 0
  const hasAspectInsights = interpretation.aspectInsights.length > 0
  const hasGrowth = Boolean(interpretation.growth.trim())

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      className={`
        mt-6 animate-in fade-in slide-in-from-bottom-4 duration-300
        rounded-xl border backdrop-blur-sm
        ${colorClass}
        p-5
        focus:outline-none focus:ring-2 focus:ring-purple-500/50
      `}
      role="dialog"
      aria-labelledby="planet-detail-title"
      aria-describedby="planet-detail-desc"
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-sm font-medium text-slate-100">
              <span className="text-base leading-none">{titleGlyph}</span>
              <span>{displayTitle}</span>
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/60 px-3 py-1 text-sm text-slate-300">
              <span className="text-base leading-none">{signGlyph}</span>
              <span>{signLabel}</span>
            </span>
            {house !== undefined && (
              <span className="inline-flex items-center rounded-full border border-white/10 bg-slate-900/60 px-3 py-1 text-sm text-slate-400">
                Дом {house}
              </span>
            )}
          </div>
          <h3
            id="planet-detail-title"
            className="text-lg font-semibold text-slate-100"
          >
            {interpretation.title}
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            {interpretation.position}
          </p>
        </div>
        <button
          onClick={onClose}
          className="
            -mr-2 -mt-1 rounded-lg p-2
            text-slate-400 transition-colors
            hover:bg-slate-700/50 hover:text-slate-200
            focus:outline-none focus:ring-2 focus:ring-purple-500/50
          "
          aria-label="Затвори"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {interpretation.brief && (
        <p className="mb-4 text-base font-medium text-slate-200">
          {interpretation.brief.charAt(0).toUpperCase() + interpretation.brief.slice(1)}
        </p>
      )}

      <div id="planet-detail-desc" className="space-y-4 text-sm leading-relaxed text-slate-300">
        {hasOverview && (
          <section>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Общ поглед
            </h4>
            <p>{interpretation.overview}</p>
          </section>
        )}

        {hasStrengths && (
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Силни страни
            </h4>
            <ul className="space-y-1">
              {interpretation.strengths.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </section>
        )}

        {hasChallenges && (
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Предизвикателства
            </h4>
            <ul className="space-y-1">
              {interpretation.challenges.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </section>
        )}

        {hasAspectInsights && (
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Аспекти
            </h4>
            <ul className="space-y-2">
              {interpretation.aspectInsights.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </section>
        )}

        {hasGrowth && (
          <section>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Насока за развитие
            </h4>
            <p>{interpretation.growth}</p>
          </section>
        )}
      </div>

      {isRising && !birthTimeKnown && (
        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="text-xs text-amber-300">
            Часът на раждане е приблизителен, затова и тълкуването на възходящия знак е ориентировъчно.
          </p>
        </div>
      )}
    </div>
  )
}
