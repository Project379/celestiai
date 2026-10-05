'use client'

import { useState, useCallback, useEffect } from 'react'
import useSWR from 'swr'
import { useChartEditedAt } from '@/components/birth-data/ChartVersion'
import { horoscopeStorageKey, sweepStaleHoroscopesInBrowser } from '@/lib/birth-data/chart-version'

export type HoroscopeDate = 'today' | 'yesterday'

export interface CachedHoroscope {
  content: string
  generatedAt: string
}

export interface CachedHoroscopeState {
  today?: CachedHoroscope
  yesterday?: CachedHoroscope
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
  // The chart's birth_data_edited_at is part of every cache key below (SWR and
  // localStorage): a horoscope cached before a birth-data edit describes the old
  // chart and must never be hydrated or reused after it.
  const editedAt = useChartEditedAt()
  const [selectedDate, setSelectedDate] = useState<HoroscopeDate>('today')
  const [cachedContent, setCachedContent] = useState<CachedHoroscopeState>({})
  const [yesterdayUnavailable, setYesterdayUnavailable] = useState(false)

  const todayStr = getTodayString()
  const yesterdayStr = getYesterdayString()

  // The chart was edited (here or on another device): drop in-memory content and
  // remove entries cached under any older marker. Runs before the hydrate effect.
  useEffect(() => {
    setCachedContent({})
    setYesterdayUnavailable(false)
    if (chartId) sweepStaleHoroscopesInBrowser(chartId, editedAt)
  }, [chartId, editedAt])

  // Hydrate from localStorage on mount
  useEffect(() => {
    if (!chartId) return
    try {
      const todayCached = localStorage.getItem(horoscopeStorageKey(chartId, editedAt, todayStr))
      const yesterdayCached = localStorage.getItem(horoscopeStorageKey(chartId, editedAt, yesterdayStr))

      setCachedContent((prev) => ({
        ...prev,
        today: todayCached ? (JSON.parse(todayCached) as CachedHoroscope) : prev.today,
        yesterday: yesterdayCached
          ? (JSON.parse(yesterdayCached) as CachedHoroscope)
          : prev.yesterday,
      }))
    } catch {}
  }, [chartId, editedAt, todayStr, yesterdayStr])

  // SWR for today's horoscope
  const {
    error: todayError,
    isLoading: todayLoading,
  } = useSWR(
    chartId ? ['horoscope', chartId, editedAt, todayStr] : null,
    ([, id, , date]) => fetchHoroscope(id, date),
    {
      revalidateOnFocus: false,
      onSuccess(data) {
        if (data.unavailable) return
        if (typeof data.content === 'string') {
          const generatedAt = data.generatedAt ?? new Date().toISOString()
          try {
            localStorage.setItem(
              horoscopeStorageKey(chartId, editedAt, todayStr),
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
      ? ['horoscope', chartId, editedAt, yesterdayStr]
      : null,
    ([, id, , date]) => fetchHoroscope(id, date),
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
              horoscopeStorageKey(chartId, editedAt, yesterdayStr),
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
          horoscopeStorageKey(chartId, editedAt, todayStr),
          JSON.stringify({ content: data.content, generatedAt } satisfies CachedHoroscope)
        )
      } catch {}
      setCachedContent((prev) => ({
        ...prev,
        today: { content: data.content!, generatedAt },
      }))
    }
  }, [chartId, editedAt, todayStr])

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
