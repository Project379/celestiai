'use client'

import { useState, useEffect, useCallback } from 'react'

export type HoroscopeDate = 'today' | 'yesterday'

export interface CachedHoroscope {
  content: string
  generatedAt: string
}

export interface CachedHoroscopeState {
  today?: CachedHoroscope
  yesterday?: CachedHoroscope
}

export function useDailyHoroscope(chartId: string) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [selectedDate, setSelectedDate] = useState<HoroscopeDate>('today')
  const [cachedContent, setCachedContent] = useState<CachedHoroscopeState>({})
  const [yesterdayUnavailable, setYesterdayUnavailable] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const getTodayString = useCallback((): string => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Sofia',
    }).format(new Date())
  }, [])

  const getYesterdayString = useCallback((): string => {
    const todayDate = new Date(getTodayString())
    todayDate.setDate(todayDate.getDate() - 1)
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Sofia',
    }).format(todayDate)
  }, [getTodayString])

  const requestHoroscope = useCallback(
    async (date: HoroscopeDate, options?: { forceGenerate?: boolean }) => {
      if (!chartId) return

      const isToday = date === 'today'
      const dateValue = isToday ? getTodayString() : getYesterdayString()
      const params = new URLSearchParams()
      params.set('date', dateValue)
      params.set('format', 'json')

      if (!options?.forceGenerate) {
        params.set('peek', '1')
      }

      setFetchError(null)
      setError(null)
      setIsLoading(true)

      try {
        const res = await fetch(`/api/horoscope/generate?${params.toString()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chartId }),
        })

        const data = (await res.json().catch(() => ({}))) as {
          content?: string | null
          cached?: boolean
          generatedAt?: string
          unavailable?: boolean
          error?: string
        }

        if (!res.ok) {
          const message = data.error ?? 'Failed to load horoscope.'
          setFetchError(message)
          setError(new Error(message))
          return
        }

        if (data.unavailable) {
          setYesterdayUnavailable(true)
          return
        }

        if (!options?.forceGenerate && !data.content && isToday) {
          await requestHoroscope('today', { forceGenerate: true })
          return
        }

        if (typeof data.content === 'string') {
          const generatedAt = data.generatedAt ?? new Date().toISOString()
          setCachedContent((prev) => ({
            ...prev,
            [date]: {
              content: data.content!,
              generatedAt,
            },
          }))
        }
      } catch {
        const message = 'Failed to load horoscope.'
        setFetchError(message)
        setError(new Error(message))
      } finally {
        setIsLoading(false)
      }
    },
    [chartId, getTodayString, getYesterdayString]
  )

  const generateHoroscope = useCallback(async () => {
    await requestHoroscope('today', { forceGenerate: true })
  }, [requestHoroscope])

  useEffect(() => {
    void requestHoroscope('today')
  }, [requestHoroscope])

  useEffect(() => {
    if (selectedDate === 'yesterday' && !cachedContent.yesterday && !yesterdayUnavailable) {
      void requestHoroscope('yesterday')
    }
  }, [selectedDate, cachedContent.yesterday, yesterdayUnavailable, requestHoroscope])

  return {
    completion: '',
    isLoading,
    error,
    cachedContent,
    selectedDate,
    setSelectedDate,
    yesterdayUnavailable,
    fetchError,
    generateHoroscope,
    getTodayString,
    getYesterdayString,
  }
}
