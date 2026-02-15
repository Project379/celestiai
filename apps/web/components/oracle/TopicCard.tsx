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
        'relative flex flex-col items-center gap-2 rounded-xl border p-4 transition-all duration-200',
        'cursor-pointer select-none outline-none',
        'focus-visible:ring-2 focus-visible:ring-purple-500/70 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900',
        isActive
          ? 'border-purple-500/70 bg-slate-800/80 shadow-[0_0_16px_rgba(168,85,247,0.3)]'
          : isLocked
            ? 'border-slate-700/30 bg-slate-800/30 opacity-70'
            : 'border-slate-700/50 bg-slate-800/60 hover:border-slate-600/70 hover:bg-slate-800/80',
        'backdrop-blur',
      ].join(' ')}
      aria-pressed={isActive}
      aria-label={`${label}${isLocked ? ' (заключено)' : ''}${hasSavedReading ? ' (записано)' : ''}`}
    >
      {/* Topic icon */}
      <div
        className={[
          'flex h-8 w-8 items-center justify-center',
          isLocked ? 'text-slate-500' : isActive ? 'text-purple-300' : 'text-slate-300',
        ].join(' ')}
      >
        {icon}
      </div>

      {/* Label */}
      <span
        className={[
          'text-xs font-medium',
          isLocked ? 'text-slate-500' : isActive ? 'text-purple-200' : 'text-slate-300',
        ].join(' ')}
      >
        {label}
      </span>

      {/* Lock overlay for premium-gated topics */}
      {isLocked && (
        <div className="absolute right-2 top-2">
          <svg
            className="h-3.5 w-3.5 text-slate-500"
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
      )}

      {/* Saved reading indicator */}
      {hasSavedReading && !isLocked && (
        <div className="absolute left-2 top-2">
          <svg
            className="h-3 w-3 text-emerald-400/70"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
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
