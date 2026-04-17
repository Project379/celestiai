'use client'

import { useEffect, useRef, useState } from 'react'
import { stripSentinels, extractPlanetMentions } from '@/lib/oracle/planet-parser'

interface ReadingStreamProps {
  /** Accumulated streaming text from useCompletion */
  completion: string
  /** True while the reading is generating (loading) */
  isLoading: boolean
  /** Callback when a planet reference is detected in the stream */
  onPlanetHighlight: (planet: string) => void
  /** Called when streaming completes */
  onComplete?: () => void
}

/**
 * Streaming reading display with cross-highlight parsing.
 *
 * - Strips [planet:KEY]...[/planet] sentinels for display
 * - Detects new planet mentions and fires onPlanetHighlight
 * - Shows pulsing loading state before first token arrives
 * - Auto-scrolls to bottom as text streams in
 */
export function ReadingStream({
  completion,
  isLoading,
  onPlanetHighlight,
  onComplete,
}: ReadingStreamProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // Track which planets have already triggered highlight to only fire on new ones
  const highlightedPlanetsRef = useRef<Set<string>>(new Set())
  const [hasCompleted, setHasCompleted] = useState(false)

  // Reset tracked planets when a new generation starts (completion resets to empty)
  useEffect(() => {
    if (completion === '') {
      highlightedPlanetsRef.current = new Set()
      setHasCompleted(false)
    }
  }, [completion])

  // Detect new planet mentions as text accumulates
  useEffect(() => {
    if (!completion) return

    const planets = extractPlanetMentions(completion)
    for (const planet of planets) {
      if (!highlightedPlanetsRef.current.has(planet)) {
        highlightedPlanetsRef.current.add(planet)
        onPlanetHighlight(planet)
      }
    }
  }, [completion, onPlanetHighlight])

  // Auto-scroll to bottom as text streams in
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [completion])

  // Detect completion (was loading, now not loading, has content)
  useEffect(() => {
    if (!isLoading && completion && !hasCompleted) {
      setHasCompleted(true)
      onComplete?.()
    }
  }, [isLoading, completion, hasCompleted, onComplete])

  const displayText = stripSentinels(completion)

  // Loading state: pre-first-token - editorial orbiting diamond
  if (isLoading && !completion) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-12">
        <div className="relative flex h-16 w-16 items-center justify-center">
          {/* Outer pulsing violet halo */}
          <span
            aria-hidden
            className="absolute inset-0 animate-ping rounded-full bg-violet-500/15"
            style={{ animationDuration: '2.4s' }}
          />
          {/* Thin spinning amber ring */}
          <span
            aria-hidden
            className="absolute inset-0 rounded-full border border-amber-300/35"
            style={{
              maskImage: 'conic-gradient(from 0deg, rgba(0,0,0,0.0) 0%, rgba(0,0,0,1) 40%, rgba(0,0,0,0.0) 75%)',
              WebkitMaskImage: 'conic-gradient(from 0deg, rgba(0,0,0,0.0) 0%, rgba(0,0,0,1) 40%, rgba(0,0,0,0.0) 75%)',
              animation: 'spin 3.2s linear infinite',
            }}
          />
          {/* Central rotating diamond */}
          <span
            aria-hidden
            className="h-2 w-2 rotate-45 bg-amber-300/90 shadow-[0_0_14px_rgba(251,191,36,0.75)]"
            style={{ animation: 'spin 5s linear infinite' }}
          />
        </div>
        <div className="flex flex-col items-center gap-2">
          <p className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-amber-300/80">
            Celestia
          </p>
          <p className="font-display text-[14px] font-light leading-relaxed text-slate-400">
            консултира звездите…
          </p>
        </div>
      </div>
    )
  }

  // Empty state (no completion yet and not loading)
  if (!completion) {
    return null
  }

  const paragraphs = displayText.split(/\n\n+/).filter(Boolean)

  return (
    <div
      ref={containerRef}
      className="max-h-[60vh] overflow-y-auto overscroll-contain pr-2"
    >
      <div className="space-y-5 text-[15px] leading-[1.85] text-slate-300/90">
        {paragraphs.map((paragraph, index) => (
          <p key={index}>
            {paragraph.trim()}
          </p>
        ))}
        {/* Blinking amber cursor while streaming */}
        {isLoading && (
          <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-amber-300/85 align-middle shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
        )}
      </div>
    </div>
  )
}
