'use client'

import { useEffect, useCallback } from 'react'
import { TOPIC_META, type OracleTopic } from './TopicCard'

interface LockedTopicTeaserProps {
  topic: OracleTopic
  teaserContent: string | null
  isLoadingTeaser: boolean
  onRequestTeaser: () => void
}

/** Fallback teaser texts when the API is unavailable */
const FALLBACK_TEASERS: Record<OracleTopic, string> = {
  general: 'Звездите имат какво да ти кажат за характера ти...',
  love: 'Звездите имат какво да ти кажат за любовния ти живот...',
  career: 'Звездите имат какво да ти кажат за кариерата ти...',
  health: 'Звездите имат какво да ти кажат за здравето ти...',
}

/**
 * Blurred teaser display for premium-locked Oracle topics.
 *
 * - Requests a teaser from the server on mount if none exists
 * - Shows blurred text with an upgrade CTA overlay
 * - Shows skeleton while teaser is loading
 * - Falls back to placeholder text on error
 */
export function LockedTopicTeaser({
  topic,
  teaserContent,
  isLoadingTeaser,
  onRequestTeaser,
}: LockedTopicTeaserProps) {
  const { label } = TOPIC_META[topic]

  // Request teaser on mount or when topic changes and no content exists
  const requestIfNeeded = useCallback(() => {
    if (!teaserContent && !isLoadingTeaser) {
      onRequestTeaser()
    }
  }, [teaserContent, isLoadingTeaser, onRequestTeaser])

  useEffect(() => {
    requestIfNeeded()
  }, [requestIfNeeded])

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.05] bg-white/[0.015] px-8 py-10 backdrop-blur-sm">
      {/* Ambient atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 -top-16 h-[240px] w-[240px] rounded-full bg-violet-500/[0.09] blur-[90px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 bottom-0 h-[220px] w-[220px] rounded-full bg-amber-500/[0.06] blur-[85px]"
      />

      {/* Blurred teaser content (visual atmosphere only) */}
      <div className="relative">
        {isLoadingTeaser && !teaserContent ? (
          <div className="space-y-2.5 py-2" aria-hidden="true">
            {[100, 90, 75, 85, 60].map((width, i) => (
              <div
                key={i}
                className="h-3 animate-pulse rounded-full bg-white/[0.05]"
                style={{ width: `${width}%` }}
              />
            ))}
          </div>
        ) : (
          <p
            className="pointer-events-none select-none font-display text-[15px] font-light italic leading-[1.85] text-slate-400/70 blur-[4px]"
            aria-hidden="true"
          >
            {teaserContent ?? FALLBACK_TEASERS[topic]}
          </p>
        )}
      </div>

      {/* Upgrade CTA overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-gradient-to-b from-[#08060f]/40 via-[#08060f]/85 to-[#08060f]/97">
        {/* Editorial eyebrow */}
        <div className="flex items-center gap-3" aria-hidden>
          <span className="h-px w-10 bg-gradient-to-r from-transparent to-amber-300/50" />
          <span className="h-1 w-1 rotate-45 bg-amber-300/90 shadow-[0_0_10px_rgba(251,191,36,0.7)]" />
          <span className="h-px w-10 bg-gradient-to-l from-transparent to-amber-300/50" />
        </div>

        {/* Topic label */}
        <p className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.38em] text-slate-500">
          {label}
        </p>

        {/* Tagline */}
        <p className="max-w-xs text-center font-display text-[14px] font-light italic leading-[1.75] text-slate-400">
          Звездите шепнат нещо само за теб — отключи го.
        </p>

        {/* Upgrade button */}
        <a
          href="/pricing"
          className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full border border-amber-300/40 bg-gradient-to-r from-violet-500/10 via-transparent to-amber-400/10 px-6 py-3 font-cinzel text-[10.5px] font-semibold uppercase tracking-[0.32em] text-amber-200 transition-all hover:border-amber-300/70 hover:text-amber-100 hover:shadow-[0_0_28px_rgba(251,191,36,0.22)] focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300/60"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-amber-200/15 to-transparent transition-transform duration-700 group-hover:translate-x-full"
          />
          <span aria-hidden className="relative h-1 w-1 rotate-45 bg-amber-300/90 shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
          <span className="relative">Отключи с Премиум</span>
          <span aria-hidden className="relative h-1 w-1 rotate-45 bg-amber-300/90 shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
        </a>
      </div>
    </div>
  )
}
