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
      <div className="flex flex-col items-center justify-center gap-4 py-10">
        {/* Pulsing cosmic star animation */}
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

  // Empty state — no text and not streaming
  if (!text) {
    return null
  }

  // Split on double newlines to form paragraphs
  const paragraphs = text.split(/\n\n+/).filter(Boolean)

  return (
    <div className="space-y-4">
      {paragraphs.map((paragraph, index) => {
        const isLastParagraph = index === paragraphs.length - 1
        const nodes = parseSentinels(paragraph.trim())

        return (
          <p key={index} className="text-sm leading-7 text-white/80">
            {nodes}
            {/* Blinking cursor only at the very end of the last paragraph while streaming */}
            {isStreaming && isLastParagraph && (
              <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-purple-400 align-middle" />
            )}
          </p>
        )
      })}
    </div>
  )
}
