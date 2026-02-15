'use client'

import { useCompletion } from '@ai-sdk/react'
import { useState, useEffect, useCallback, useRef } from 'react'

export type HoroscopeDate = 'today' | 'yesterday'

export interface CachedHoroscope {
  content: string
  generatedAt: string
}

export interface CachedHoroscopeState {
  today?: CachedHoroscope
  yesterday?: CachedHoroscope
}

/**
 * useDailyHoroscope
 *
 * Client hook that drives the daily horoscope experience:
 * - Streams a horoscope via POST /api/horoscope/generate using useCompletion
 * - Manages cached horoscope content per date (today / yesterday)
 * - Handles date switching between today and yesterday
 * - Tracks unavailability of yesterday's horoscope (not generated at the time)
 *
 * @param chartId - The chart UUID to generate the horoscope for
 */
export function useDailyHoroscope(chartId: string) {
  const [selectedDate, setSelectedDate] = useState<HoroscopeDate>('today')
  const [cachedContent, setCachedContent] = useState<CachedHoroscopeState>({})
  const [yesterdayUnavailable, setYesterdayUnavailable] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Track previous isLoading to detect transition from true -> false
  const wasLoadingRef = useRef(false)
  // Track selectedDate in a ref to access in isLoading effect without stale closure
  const selectedDateRef = useRef<HoroscopeDate>(selectedDate)
  selectedDateRef.current = selectedDate

  const { completion, isLoading, error, complete, setCompletion } =
    useCompletion({
      api: '/api/horoscope/generate',
      // Use 'text' protocol to match toTextStreamResponse() on the server
      // AI SDK v6 removed the 'data' stream protocol for useCompletion
      streamProtocol: 'text',
    })

  /**
   * Returns the date string (YYYY-MM-DD) for today in Sofia timezone.
   */
  const getTodayString = useCallback((): string => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Sofia',
    }).format(new Date())
  }, [])

  /**
   * Returns the date string (YYYY-MM-DD) for yesterday in Sofia timezone.
   */
  const getYesterdayString = useCallback((): string => {
    const todayDate = new Date(getTodayString())
    todayDate.setDate(todayDate.getDate() - 1)
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Sofia',
    }).format(todayDate)
  }, [getTodayString])

  /**
   * Triggers generation of today's horoscope via streaming.
   * Clears previous completion and initiates the streaming POST.
   */
  const generateHoroscope = useCallback(async () => {
    if (!chartId) return
    setFetchError(null)
    setCompletion('')

    try {
      await complete('', {
        body: { chartId },
      })
    } catch {
      // Error is surfaced via the `error` state from useCompletion
    }
  }, [chartId, complete, setCompletion])

  /**
   * Fetches yesterday's horoscope from the server.
   * If no cache exists for yesterday, marks it as unavailable.
   */
  const fetchYesterday = useCallback(async () => {
    if (!chartId) return
    setFetchError(null)

    const yesterdayStr = getYesterdayString()

    try {
      const res = await fetch('/api/horoscope/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chartId, date: yesterdayStr }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setFetchError(data.error ?? 'Грешка при зареждане на хороскопа')
        return
      }

      // Check Content-Type — cached horoscopes return JSON, not a stream
      const contentType = res.headers.get('content-type') ?? ''
      if (contentType.includes('application/json')) {
        const data = await res.json() as {
          content?: string | null
          unavailable?: boolean
          cached?: boolean
          generatedAt?: string
        }

        if (data.unavailable) {
          setYesterdayUnavailable(true)
          return
        }

        if (data.content && data.generatedAt) {
          setCachedContent((prev) => ({
            ...prev,
            yesterday: {
              content: data.content as string,
              generatedAt: data.generatedAt as string,
            },
          }))
        }
      }
    } catch {
      setFetchError('Грешка при зареждане на хороскопа')
    }
  }, [chartId, getYesterdayString])

  /**
   * Checks if there is a cached horoscope for today.
   * If cached, loads it; otherwise triggers streaming generation.
   */
  const initializeToday = useCallback(async () => {
    if (!chartId) return
    setFetchError(null)

    try {
      const res = await fetch('/api/horoscope/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chartId }),
      })

      if (!res.ok) {
        // If 404 (no chart calculation), show error but don't crash
        const data = await res.json().catch(() => ({}))
        setFetchError(data.error ?? 'Грешка при зареждане на хороскопа')
        return
      }

      const contentType = res.headers.get('content-type') ?? ''
      if (contentType.includes('application/json')) {
        const data = await res.json() as {
          content?: string | null
          cached?: boolean
          generatedAt?: string
        }

        if (data.content && data.generatedAt) {
          // Cached horoscope available — store it
          setCachedContent((prev) => ({
            ...prev,
            today: {
              content: data.content as string,
              generatedAt: data.generatedAt as string,
            },
          }))
        }
        // If content is null, we need to stream — handled below
        return
      }

      // Response is a stream (no cache yet) — let useCompletion handle it
      // However initializeToday uses fetch directly, so we just trigger streaming
    } catch {
      setFetchError('Грешка при зареждане на хороскопа')
    }

    // No cached content found — trigger streaming generation
    await generateHoroscope()
  }, [chartId, generateHoroscope])

  // On mount: check for cached today horoscope or start generation
  useEffect(() => {
    void initializeToday()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartId])

  // When selectedDate changes to 'yesterday', fetch that day's data
  useEffect(() => {
    if (selectedDate === 'yesterday' && !cachedContent.yesterday && !yesterdayUnavailable) {
      void fetchYesterday()
    }
  }, [selectedDate, cachedContent.yesterday, yesterdayUnavailable, fetchYesterday])

  // After streaming completes (isLoading true -> false), cache the completed text
  useEffect(() => {
    if (wasLoadingRef.current && !isLoading && completion) {
      const date = selectedDateRef.current
      const now = new Date().toISOString()
      setCachedContent((prev) => ({
        ...prev,
        [date]: {
          content: completion,
          generatedAt: now,
        },
      }))
    }
    wasLoadingRef.current = isLoading
  }, [isLoading, completion])

  return {
    /** Streaming text from the current generation (resets each call) */
    completion,
    /** True while generation is in progress */
    isLoading,
    /** Error from the streaming API, if any */
    error,
    /** Cached horoscope content keyed by date */
    cachedContent,
    /** Currently selected date tab */
    selectedDate,
    /** Switch between 'today' and 'yesterday' */
    setSelectedDate,
    /** Whether yesterday's horoscope is unavailable (not generated at the time) */
    yesterdayUnavailable,
    /** Error from fetching, if any */
    fetchError,
    /** Manually trigger today's horoscope generation */
    generateHoroscope,
    /** Today's date string in Sofia timezone */
    getTodayString,
    /** Yesterday's date string in Sofia timezone */
    getYesterdayString,
  }
}
