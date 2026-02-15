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

  // Loading state: pre-first-token
  if (isLoading && !completion) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-10">
        {/* Pulsing star animation */}
        <div className="relative flex items-center justify-center">
          <div className="absolute h-12 w-12 animate-ping rounded-full bg-purple-500/20" />
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10">
            <svg
              className="h-5 w-5 animate-pulse text-purple-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
        </div>
        <p className="text-sm text-purple-300/80">
          Celestia консултира звездите...
        </p>
      </div>
    )
  }

  // Empty state (no completion yet and not loading)
  if (!completion) {
    return null
  }

  // Split into paragraphs on double newline
  const paragraphs = displayText.split(/\n\n+/).filter(Boolean)

  return (
    <div
      ref={containerRef}
      className="max-h-[60vh] overflow-y-auto overscroll-contain"
    >
      <div className="space-y-4 text-slate-200 leading-relaxed">
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="text-sm leading-7">
            {paragraph.trim()}
          </p>
        ))}
        {/* Blinking cursor while streaming */}
        {isLoading && (
          <span className="inline-block h-4 w-0.5 animate-pulse bg-purple-400 align-middle ml-0.5" />
        )}
      </div>
    </div>
  )
}
