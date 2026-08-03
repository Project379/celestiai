'use client'

import { useState, useCallback, useEffect } from 'react'
import useSWR from 'swr'

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

function getTodayString(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Sofia',
  }).format(new Date())
}

function getYesterdayString(): string {
  const todayDate = new Date(getTodayString())
  todayDate.setDate(todayDate.getDate() - 1)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Sofia',
  }).format(todayDate)
}

interface HoroscopeResponse {
  content?: string | null
  cached?: boolean
  generatedAt?: string
  unavailable?: boolean
  error?: string
}

async function fetchHoroscope(
  chartId: string,
  dateValue: string
): Promise<HoroscopeResponse> {
  const params = new URLSearchParams()
  params.set('date', dateValue)
  params.set('format', 'json')

  const res = await fetch(`/api/horoscope/generate?${params.toString()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chartId }),
  })

  const data = (await res.json().catch(() => ({}))) as HoroscopeResponse

  if (!res.ok) {
    throw new Error(data.error ?? 'Failed to load horoscope.')
  }

  return data
}

export function useDailyHoroscope(chartId: string) {
  const [selectedDate, setSelectedDate] = useState<HoroscopeDate>('today')
  const [cachedContent, setCachedContent] = useState<CachedHoroscopeState>({})
  const [yesterdayUnavailable, setYesterdayUnavailable] = useState(false)

  const todayStr = getTodayString()
  const yesterdayStr = getYesterdayString()

  // Hydrate from localStorage on mount
  useEffect(() => {
    if (!chartId) return
    try {
      const todayCached = localStorage.getItem(getStorageKey(chartId, todayStr))
      const yesterdayCached = localStorage.getItem(getStorageKey(chartId, yesterdayStr))

      setCachedContent((prev) => ({
        ...prev,
        today: todayCached ? (JSON.parse(todayCached) as CachedHoroscope) : prev.today,
        yesterday: yesterdayCached
          ? (JSON.parse(yesterdayCached) as CachedHoroscope)
          : prev.yesterday,
      }))
    } catch {}
  }, [chartId, todayStr, yesterdayStr])

  // SWR for today's horoscope
  const {
    error: todayError,
    isLoading: todayLoading,
  } = useSWR(
    chartId ? ['horoscope', chartId, todayStr] : null,
    ([, id, date]) => fetchHoroscope(id, date),
    {
      revalidateOnFocus: false,
      onSuccess(data) {
        if (data.unavailable) return
        if (typeof data.content === 'string') {
          const generatedAt = data.generatedAt ?? new Date().toISOString()
          try {
            localStorage.setItem(
              getStorageKey(chartId, todayStr),
              JSON.stringify({ content: data.content, generatedAt } satisfies CachedHoroscope)
            )
          } catch {}
          setCachedContent((prev) => ({
            ...prev,
            today: { content: data.content!, generatedAt },
          }))
        }
      },
    }
  )

  // SWR for yesterday's horoscope — only fetched when tab is selected
  const {
    error: yesterdayError,
    isLoading: yesterdayLoading,
  } = useSWR(
    chartId && selectedDate === 'yesterday' && !cachedContent.yesterday && !yesterdayUnavailable
      ? ['horoscope', chartId, yesterdayStr]
      : null,
    ([, id, date]) => fetchHoroscope(id, date),
    {
      revalidateOnFocus: false,
      onSuccess(data) {
        if (data.unavailable) {
          setYesterdayUnavailable(true)
          return
        }
        if (typeof data.content === 'string') {
          const generatedAt = data.generatedAt ?? new Date().toISOString()
          try {
            localStorage.setItem(
              getStorageKey(chartId, yesterdayStr),
              JSON.stringify({ content: data.content, generatedAt } satisfies CachedHoroscope)
            )
          } catch {}
          setCachedContent((prev) => ({
            ...prev,
            yesterday: { content: data.content!, generatedAt },
          }))
        }
      },
    }
  )

  const isLoading = selectedDate === 'today' ? todayLoading : yesterdayLoading
  const activeError = selectedDate === 'today' ? todayError : yesterdayError

  const generateHoroscope = useCallback(async () => {
    // SWR handles the initial fetch; this is kept for manual re-trigger compatibility
    const data = await fetchHoroscope(chartId, todayStr)
    if (typeof data.content === 'string') {
      const generatedAt = data.generatedAt ?? new Date().toISOString()
      try {
        localStorage.setItem(
          getStorageKey(chartId, todayStr),
          JSON.stringify({ content: data.content, generatedAt } satisfies CachedHoroscope)
        )
      } catch {}
      setCachedContent((prev) => ({
        ...prev,
        today: { content: data.content!, generatedAt },
      }))
    }
  }, [chartId, todayStr])

  return {
    completion: '',
    isLoading,
    error: activeError ?? null,
    cachedContent,
    selectedDate,
    setSelectedDate,
    yesterdayUnavailable,
    fetchError: activeError ? (activeError as Error).message : null,
    generateHoroscope,
    getTodayString: () => todayStr,
    getYesterdayString: () => yesterdayStr,
  }
}
