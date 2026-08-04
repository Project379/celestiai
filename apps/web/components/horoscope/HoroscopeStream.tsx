'use client'

import React from 'react'
import { parseSentinels } from '@stellaeum/core/oracle/planet-parser'

/**
 * Planet key → Tailwind text-color class. Web-specific presentation map
 * for the shared `parseSentinels` parser in `@stellaeum/core/oracle/planet-parser`.
 * Mobile maintains its own hex equivalent at `apps/mobile/app/(authed)/(tabs)/index.tsx`
 * (NativeWind requires static className strings at scan time, so mobile
 * applies colors via inline `style.color` with hex values).
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
            Stellaeum
          </p>
          <p className="font-display text-[14px] font-light leading-relaxed text-slate-300">
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
        const chunks = parseSentinels(paragraph.trim())

        return (
          <p key={index} className="font-display text-[15px] leading-[1.85] text-slate-300/90">
            {chunks.map((chunk, i) => {
              if (chunk.planet) {
                const colorClass = PLANET_COLORS[chunk.planet] ?? 'text-violet-300'
                return (
                  <span key={i} className={`font-medium ${colorClass}`}>
                    {chunk.text}
                  </span>
                )
              }
              return <React.Fragment key={i}>{chunk.text}</React.Fragment>
            })}
            {isStreaming && isLastParagraph && (
              <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-amber-300/85 align-middle shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
            )}
          </p>
        )
      })}
    </div>
  )
}
