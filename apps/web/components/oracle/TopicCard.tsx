'use client'

import { useCallback, type KeyboardEvent } from 'react'

export type OracleTopic = 'general' | 'love' | 'career' | 'health'

interface TopicCardProps {
  topic: OracleTopic
  label: string
  icon: React.ReactNode
  isLocked: boolean
  isActive: boolean
  hasSavedReading: boolean
  onClick: () => void
}

/**
 * Single Oracle topic card.
 *
 * States:
 * - default: clickable, normal muted styling
 * - active: purple glow border, highlighted background
 * - locked: padlock icon overlay, muted colors
 * - has-saved: subtle checkmark indicator in corner
 */
export function TopicCard({
  topic: _topic,
  label,
  icon,
  isLocked,
  isActive,
  hasSavedReading,
  onClick,
}: TopicCardProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onClick()
      }
    },
    [onClick]
  )

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={[
        'group relative flex flex-col items-center gap-2.5 rounded-2xl border px-4 py-5 transition-all duration-300',
        'cursor-pointer select-none outline-none backdrop-blur-sm',
        'focus-visible:ring-1 focus-visible:ring-amber-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08060f]',
        isActive
          ? 'border-amber-300/45 bg-gradient-to-br from-violet-500/[0.10] via-transparent to-amber-400/[0.06] shadow-[0_0_28px_rgba(167,139,250,0.18)]'
          : isLocked
            ? 'border-white/[0.04] bg-white/[0.015] opacity-70'
            : 'border-white/[0.06] bg-white/[0.015] hover:border-violet-300/25 hover:bg-white/[0.03] hover:shadow-[0_0_22px_rgba(167,139,250,0.10)]',
      ].join(' ')}
      aria-pressed={isActive}
      aria-label={`${label}${isLocked ? ' (заключено)' : ''}${hasSavedReading ? ' (записано)' : ''}`}
    >
      {/* Amber corner mark on active */}
      {isActive && (
        <span aria-hidden className="absolute left-3 top-3 h-1 w-1 rotate-45 bg-amber-300/80 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
      )}

      {/* Topic icon */}
      <div
        className={[
          'flex h-9 w-9 items-center justify-center transition-colors duration-300',
          isLocked
            ? 'text-slate-600'
            : isActive
              ? 'text-amber-200'
              : 'text-violet-300/85 group-hover:text-violet-200',
        ].join(' ')}
      >
        {icon}
      </div>

      {/* Label - Cinzel uppercase for editorial rhythm */}
      <span
        className={[
          'font-cinzel text-[10px] font-semibold uppercase tracking-[0.28em] transition-colors duration-300',
          isLocked
            ? 'text-slate-600'
            : isActive
              ? 'text-white'
              : 'text-slate-400 group-hover:text-slate-100',
        ].join(' ')}
      >
        {label}
      </span>

      {/* Lock overlay for premium-gated topics */}
      {isLocked && (
        <div className="absolute right-2.5 top-2.5" aria-hidden>
          <svg
            className="h-3 w-3 text-slate-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}

      {/* Saved-reading indicator - tiny amber diamond */}
      {hasSavedReading && !isLocked && (
        <span
          aria-hidden
          className="absolute right-2.5 top-2.5 h-1 w-1 rotate-45 bg-amber-300/85 shadow-[0_0_6px_rgba(251,191,36,0.55)]"
          title="Записано четене"
        />
      )}
    </div>
  )
}

// Topic metadata: icons and Bulgarian labels
export const TOPIC_META: Record<
  OracleTopic,
  { label: string; icon: React.ReactNode }
> = {
  general: {
    label: 'Личност',
    icon: (
      <svg fill="currentColor" viewBox="0 0 20 20" className="h-5 w-5">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ),
  },
  love: {
    label: 'Любов',
    icon: (
      <svg fill="currentColor" viewBox="0 0 20 20" className="h-5 w-5">
        <path
          fillRule="evenodd"
          d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  career: {
    label: 'Кариера',
    icon: (
      <svg fill="currentColor" viewBox="0 0 20 20" className="h-5 w-5">
        <path
          fillRule="evenodd"
          d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z"
          clipRule="evenodd"
        />
        <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
      </svg>
    ),
  },
  health: {
    label: 'Здраве',
    icon: (
      <svg fill="currentColor" viewBox="0 0 20 20" className="h-5 w-5">
        <path
          fillRule="evenodd"
          d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
}
