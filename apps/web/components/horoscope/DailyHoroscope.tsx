'use client'

import Link from 'next/link'
import { useDailyHoroscope } from '@/hooks/useDailyHoroscope'
import { HoroscopeStream } from './HoroscopeStream'

interface DailyHoroscopeProps {
  chartId: string
}

/**
 * DailyHoroscope
 *
 * Main daily horoscope card for the dashboard. Shows:
 * - Title "Дневен хороскоп" with today's date in Bulgarian locale
 * - Date navigation tabs: "Днес" (Today) | "Вчера" (Yesterday)
 * - Streaming or cached horoscope text via HoroscopeStream
 * - Loading skeleton while generating
 * - Error state with Bulgarian message
 *
 * Glassmorphism card styling matching existing dashboard cards.
 */
export function DailyHoroscope({ chartId }: DailyHoroscopeProps) {
  const {
    completion,
    isLoading,
    error,
    cachedContent,
    selectedDate,
    setSelectedDate,
    yesterdayUnavailable,
    fetchError,
    getTodayString,
  } = useDailyHoroscope(chartId)

  // Format today's date in Bulgarian locale for the header
  const todayFormatted = new Intl.DateTimeFormat('bg-BG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Sofia',
  }).format(new Date())

  // Determine content to display
  const todayContent = cachedContent.today
  const yesterdayContent = cachedContent.yesterday

  // Current display text:
  // - If today is selected: show streaming completion or cached today content
  // - If yesterday is selected: show cached yesterday content
  const displayText =
    selectedDate === 'today'
      ? (completion || todayContent?.content || '')
      : (yesterdayContent?.content || '')

  // Is the horoscope currently streaming?
  const isStreaming = isLoading && selectedDate === 'today'

  // Combined error message
  const errorMessage = fetchError || (error ? 'Грешка при генериране на хороскопа' : null)

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Дневен хороскоп</h2>
          <p className="mt-0.5 text-sm text-white/50 capitalize">{todayFormatted}</p>
        </div>
        {/* Star icon */}
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10">
          <svg
            className="h-5 w-5 text-purple-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        </div>
      </div>

      {/* Date navigation tabs */}
      <div className="mb-5 flex gap-1 rounded-lg bg-white/5 p-1">
        <button
          type="button"
          onClick={() => setSelectedDate('today')}
          className={[
            'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
            selectedDate === 'today'
              ? 'bg-purple-600/80 text-white shadow-sm'
              : 'text-white/60 hover:text-white/80',
          ].join(' ')}
        >
          Днес
        </button>
        <button
          type="button"
          onClick={() => {
            if (!yesterdayUnavailable) {
              setSelectedDate('yesterday')
            }
          }}
          disabled={yesterdayUnavailable}
          title={yesterdayUnavailable ? 'Не е наличен' : undefined}
          className={[
            'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
            selectedDate === 'yesterday' && !yesterdayUnavailable
              ? 'bg-purple-600/80 text-white shadow-sm'
              : yesterdayUnavailable
              ? 'cursor-not-allowed text-white/30'
              : 'text-white/60 hover:text-white/80',
          ].join(' ')}
        >
          {yesterdayUnavailable ? 'Не е наличен' : 'Вчера'}
        </button>
      </div>

      {/* Content area */}
      <div className="min-h-[120px]">
        {/* Error state */}
        {errorMessage && !isStreaming && !displayText && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
            <p className="text-sm text-red-400">{errorMessage}</p>
          </div>
        )}

        {/* Yesterday unavailable state */}
        {selectedDate === 'yesterday' && yesterdayUnavailable && (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800/80">
              <svg
                className="h-5 w-5 text-slate-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-sm text-white/40">
              Вчерашният хороскоп не е наличен
            </p>
          </div>
        )}

        {/* Loading skeleton — waiting for first stream token while not yet streaming */}
        {!isStreaming && !displayText && !errorMessage && selectedDate === 'today' && (
          <div className="space-y-3 animate-pulse">
            <div className="h-3 w-full rounded-full bg-white/5" />
            <div className="h-3 w-5/6 rounded-full bg-white/5" />
            <div className="h-3 w-4/6 rounded-full bg-white/5" />
            <div className="mt-4 h-3 w-full rounded-full bg-white/5" />
            <div className="h-3 w-3/4 rounded-full bg-white/5" />
          </div>
        )}

        {/* Horoscope text (streaming or cached) */}
        {(displayText || isStreaming) && !(selectedDate === 'yesterday' && yesterdayUnavailable) && (
          <HoroscopeStream text={displayText} isStreaming={isStreaming} />
        )}
      </div>
    </div>
  )
}

/**
 * DailyHoroscopeEmpty
 *
 * Shown on dashboard when user has no birth chart yet.
 * Guides user to add birth data to unlock daily horoscope.
 */
export function DailyHoroscopeEmpty() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Дневен хороскоп</h2>
          <p className="mt-0.5 text-sm text-white/50">
            Добавете данни за раждане
          </p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10">
          <svg
            className="h-5 w-5 text-purple-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center gap-3 py-4 text-center">
        <p className="text-sm text-white/50">
          Първо добавете данни за раждане, за да получите дневен хороскоп
        </p>
        <Link
          href="/birth-data"
          className="mt-2 inline-flex items-center gap-2 rounded-lg bg-purple-600/80 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-600"
        >
          Въведете данни за раждане
        </Link>
      </div>
    </div>
  )
}
