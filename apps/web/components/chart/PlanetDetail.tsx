'use client'

import { useEffect, useRef } from 'react'
import type { PlanetPosition, PointData } from '@celestia/astrology/client'
import { PLANETS_BG, ZODIAC_SIGNS_BG } from '@celestia/astrology/client'
import type { Planet, ZodiacSign } from '@celestia/astrology/client'
import {
  getPlanetInterpretation,
  getRisingInterpretation,
} from '@/lib/interpretations/planets'

interface PlanetDetailProps {
  /** Planet data to display (null to hide panel) */
  planet: PlanetPosition | PointData | null
  /** Close handler */
  onClose: () => void
  /** Type for Big Three special handling */
  type?: 'sun' | 'moon' | 'rising' | null
  /** Whether birth time is known (for Rising disclaimer) */
  birthTimeKnown?: boolean
  /** House number for the planet (if available) */
  house?: number
}

/**
 * Planet interpretation panel
 *
 * Displays detailed information about a selected planet/point.
 * Shows position, brief trait, and placeholder text for AI interpretation.
 *
 * Styling: Glassmorphism card matching app theme
 * Animation: Fade in and slide up from below
 */
export function PlanetDetail({
  planet,
  onClose,
  type,
  birthTimeKnown = true,
  house,
}: PlanetDetailProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Focus panel when shown for keyboard accessibility
  useEffect(() => {
    if (planet && panelRef.current) {
      panelRef.current.focus()
    }
  }, [planet])

  // Handle escape key to close
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

  // Don't render if no planet selected
  if (!planet) {
    return null
  }

  // Determine if this is a planet or a point (Ascendant)
  const isPlanetPosition = 'planet' in planet
  const isRising = type === 'rising'

  // Get interpretation data
  let interpretation
  if (isRising) {
    interpretation = getRisingInterpretation(
      planet.sign,
      'degree' in planet ? planet.degree : (planet as PlanetPosition).signDegree,
      !birthTimeKnown
    )
  } else {
    const planetKey = isPlanetPosition
      ? (planet as PlanetPosition).planet
      : type || 'sun'
    const degree = isPlanetPosition
      ? (planet as PlanetPosition).signDegree
      : (planet as PointData).degree

    interpretation = getPlanetInterpretation(
      planetKey,
      planet.sign,
      degree,
      house
    )
  }

  // Get planet color for accent
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
    rising: 'border-cyan-400/50 bg-cyan-400/10',
  }

  const colorKey = isRising
    ? 'rising'
    : isPlanetPosition
      ? (planet as PlanetPosition).planet
      : 'sun'
  const colorClass = planetColors[colorKey] || 'border-purple-500/50 bg-purple-500/10'

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
      {/* Header with title and close button */}
      <div className="mb-4 flex items-start justify-between">
        <div>
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

      {/* Brief trait */}
      {interpretation.brief && (
        <p className="mb-4 text-base font-medium text-slate-200">
          {interpretation.brief.charAt(0).toUpperCase() + interpretation.brief.slice(1)}
        </p>
      )}

      {/* Placeholder interpretation text */}
      <div
        id="planet-detail-desc"
        className="text-sm leading-relaxed text-slate-400"
      >
        {interpretation.placeholder.split('\n\n').map((paragraph, i) => (
          <p key={i} className={i > 0 ? 'mt-3 italic text-slate-500' : ''}>
            {paragraph}
          </p>
        ))}
      </div>

      {/* Unknown birth time note for Rising */}
      {isRising && !birthTimeKnown && (
        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="text-xs text-amber-300">
            Без точен час на раждане, възходящият знак е приблизителен.
          </p>
        </div>
      )}
    </div>
  )
}
