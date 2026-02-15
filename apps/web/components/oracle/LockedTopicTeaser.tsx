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
  general: 'Открийте какво звездите разкриват за вашата личност...',
  love: 'Открийте какво звездите разкриват за вашата любов...',
  career: 'Открийте какво звездите разкриват за вашата кариера...',
  health: 'Открийте какво звездите разкриват за вашето здраве...',
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
    <div className="relative overflow-hidden rounded-lg">
      {/* Blurred teaser content */}
      {isLoadingTeaser && !teaserContent ? (
        /* Skeleton loading state */
        <div className="space-y-2 py-2">
          {[100, 90, 75, 85, 60].map((width, i) => (
            <div
              key={i}
              className="h-3.5 animate-pulse rounded-full bg-slate-700/60"
              style={{ width: `${width}%` }}
            />
          ))}
        </div>
      ) : (
        /* Blurred text */
        <p
          className="select-none text-sm leading-7 text-slate-300 blur-sm pointer-events-none"
          aria-hidden="true"
        >
          {teaserContent ?? FALLBACK_TEASERS[topic]}
        </p>
      )}

      {/* Upgrade CTA overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-transparent via-slate-900/80 to-slate-900/95">
        {/* Lock icon */}
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-purple-500/30 bg-purple-500/10">
          <svg
            className="h-5 w-5 text-purple-400"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        {/* Topic label */}
        <p className="text-xs text-slate-400">{label}</p>

        {/* Upgrade button */}
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-violet-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:from-purple-500 hover:to-violet-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 3l14 9-14 9V3z"
            />
          </svg>
          Отключете с Premium
        </button>
      </div>
    </div>
  )
}
