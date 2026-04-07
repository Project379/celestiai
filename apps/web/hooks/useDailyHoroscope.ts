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

function getStorageKey(chartId: string, date: string) {
  return `daily-horoscope:${chartId}:${date}`
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
    async (date: HoroscopeDate) => {
      if (!chartId) return

      const isToday = date === 'today'
      const dateValue = isToday ? getTodayString() : getYesterdayString()
      const params = new URLSearchParams()
      params.set('date', dateValue)
      params.set('format', 'json')

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

        if (typeof data.content === 'string') {
          const generatedAt = data.generatedAt ?? new Date().toISOString()
          try {
            localStorage.setItem(
              getStorageKey(chartId, dateValue),
              JSON.stringify({
                content: data.content,
                generatedAt,
              } satisfies CachedHoroscope)
            )
          } catch {}

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
    await requestHoroscope('today')
  }, [requestHoroscope])

  useEffect(() => {
    if (!chartId) return

    const today = getTodayString()
    const yesterday = getYesterdayString()

    try {
      const todayCached = localStorage.getItem(getStorageKey(chartId, today))
      const yesterdayCached = localStorage.getItem(getStorageKey(chartId, yesterday))

      setCachedContent((prev) => ({
        ...prev,
        today: todayCached ? (JSON.parse(todayCached) as CachedHoroscope) : prev.today,
        yesterday: yesterdayCached
          ? (JSON.parse(yesterdayCached) as CachedHoroscope)
          : prev.yesterday,
      }))
    } catch {}
  }, [chartId, getTodayString, getYesterdayString])

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
