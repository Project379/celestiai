'use client'

import React from 'react'

/**
 * Planet key to accent color mapping.
 * Matches the English planet keys used in [planet:KEY]...[/planet] sentinel markers.
 * Colors chosen to match the cosmic theme and are legible on dark backgrounds.
 */
const PLANET_COLORS: Record<string, string> = {
  sun: 'text-amber-300',
  moon: 'text-slate-300',
  mercury: 'text-cyan-300',
  venus: 'text-pink-300',
  mars: 'text-red-400',
  jupiter: 'text-orange-300',
  saturn: 'text-yellow-400',
  uranus: 'text-teal-300',
  neptune: 'text-blue-400',
  pluto: 'text-purple-400',
  northNode: 'text-violet-400',
}

/**
 * Parses text with [planet:KEY]...[/planet] sentinel markers into React nodes.
 * Planet names are rendered with their associated accent color.
 * All other text is rendered as plain text.
 *
 * A fresh RegExp is created each call to avoid stateful lastIndex bugs with 'g' flag.
 */
function parseSentinels(text: string): React.ReactNode[] {
  const sentinelRegex = /\[planet:(\w+)\]([\s\S]*?)\[\/planet\]/g
  const nodes: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = sentinelRegex.exec(text)) !== null) {
    const matchStart = match.index

    // Add plain text before this match
    if (matchStart > lastIndex) {
      nodes.push(text.slice(lastIndex, matchStart))
    }

    const planetKey = match[1] ?? ''
    const innerText = match[2] ?? ''
    const colorClass = PLANET_COLORS[planetKey] ?? 'text-violet-300'

    nodes.push(
      <span
        key={`planet-${matchStart}`}
        className={`font-medium ${colorClass}`}
      >
        {innerText}
      </span>
    )

    lastIndex = sentinelRegex.lastIndex
  }

  // Add any remaining plain text after the last match
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return nodes
}

interface HoroscopeStreamProps {
  /** Accumulated text (streaming or cached) */
  text: string
  /** True while the horoscope is currently streaming */
  isStreaming: boolean
}

/**
 * HoroscopeStream
 *
 * Renders daily horoscope text with sentinel marker parsing:
 * - [planet:KEY]BulgarianName[/planet] markers render planet names with accent colors
 * - Paragraphs split on double newlines
 * - Blinking cursor shown while streaming
 * - Prose typography classes for readability on dark background
 */
export function HoroscopeStream({ text, isStreaming }: HoroscopeStreamProps) {
  // Loading state: streaming started but no text yet
  if (isStreaming && !text) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-12">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <span
            aria-hidden
            className="absolute inset-0 animate-ping rounded-full bg-violet-500/15"
            style={{ animationDuration: '2.4s' }}
          />
          <span
            aria-hidden
            className="absolute inset-0 rounded-full border border-amber-300/35"
            style={{
              maskImage:
                'conic-gradient(from 0deg, rgba(0,0,0,0.0) 0%, rgba(0,0,0,1) 40%, rgba(0,0,0,0.0) 75%)',
              WebkitMaskImage:
                'conic-gradient(from 0deg, rgba(0,0,0,0.0) 0%, rgba(0,0,0,1) 40%, rgba(0,0,0,0.0) 75%)',
              animation: 'spin 3.2s linear infinite',
            }}
          />
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
          <p className="font-display text-[14px] font-light italic leading-relaxed text-slate-300">
            консултира звездите…
          </p>
        </div>
      </div>
    )
  }

  // Empty state - no text and not streaming
  if (!text) {
    return null
  }

  const paragraphs = text.split(/\n\n+/).filter(Boolean)

  return (
    <div className="space-y-5">
      {paragraphs.map((paragraph, index) => {
        const isLastParagraph = index === paragraphs.length - 1
        const nodes = parseSentinels(paragraph.trim())

        return (
          <p key={index} className="font-display text-[15px] leading-[1.85] text-slate-300/90">
            {nodes}
            {isStreaming && isLastParagraph && (
              <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-amber-300/85 align-middle shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
            )}
          </p>
        )
      })}
    </div>
  )
}
