'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import useSWR, { type SWRConfiguration } from 'swr'
import { sanitizeFinalAIOutput } from '@/lib/ai/final-output'

const GENERATION_POLL_INTERVAL_MS = 3_000

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

function readCachedHoroscope(raw: string | null): CachedHoroscope | undefined {
  if (!raw) return undefined

  const parsed = JSON.parse(raw) as CachedHoroscope
  if (typeof parsed.content !== 'string' || typeof parsed.generatedAt !== 'string') {
    return undefined
  }
  const content = sanitizeFinalAIOutput(parsed.content)
  if (!content) return undefined
  return { ...parsed, content }
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
  generating?: boolean
  unavailable?: boolean
  error?: string
  code?: string
}

class HoroscopeRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message)
    this.name = 'HoroscopeRequestError'
  }
}

const horoscopePollingConfig: SWRConfiguration<HoroscopeResponse, HoroscopeRequestError> = {
  revalidateOnFocus: false,
  shouldRetryOnError: false,
  refreshInterval(latestData) {
    return latestData?.generating ? GENERATION_POLL_INTERVAL_MS : 0
  },
}

async function fetchHoroscope(
  chartId: string,
  dateValue: string,
  statusOnly = false,
): Promise<HoroscopeResponse> {
  const params = new URLSearchParams()
  params.set('date', dateValue)
  params.set('format', 'json')
  if (statusOnly) params.set('statusOnly', '1')

  const res = await fetch(`/api/horoscope/generate?${params.toString()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chartId }),
  })

  const data = (await res.json().catch(() => ({}))) as HoroscopeResponse

  if (!res.ok) {
    throw new HoroscopeRequestError(
      data.error ?? 'Failed to load horoscope.',
      res.status,
      data.code,
    )
  }

  return data
}

export function useDailyHoroscope(chartId: string) {
  const [selectedDate, setSelectedDate] = useState<HoroscopeDate>('today')
  const [cachedContent, setCachedContent] = useState<CachedHoroscopeState>({})
  const [yesterdayUnavailable, setYesterdayUnavailable] = useState(false)
  const todayStatusOnlyRef = useRef(false)

  const todayStr = getTodayString()
  const yesterdayStr = getYesterdayString()

  // Hydrate from localStorage on mount
  useEffect(() => {
    if (!chartId) return
    try {
      const todayCached = localStorage.getItem(getStorageKey(chartId, todayStr))
      const yesterdayCached = localStorage.getItem(getStorageKey(chartId, yesterdayStr))
      const cleanTodayCached = readCachedHoroscope(todayCached)
      const cleanYesterdayCached = readCachedHoroscope(yesterdayCached)

      setCachedContent((prev) => ({
        ...prev,
        today: cleanTodayCached ?? prev.today,
        yesterday: cleanYesterdayCached ?? prev.yesterday,
      }))
    } catch {}
  }, [chartId, todayStr, yesterdayStr])

  // SWR for today's horoscope
  const {
    error: todayError,
    isLoading: todayLoading,
  } = useSWR(
    chartId ? ['horoscope', chartId, todayStr] : null,
    async ([, id, date]) => {
      const data = await fetchHoroscope(id, date, todayStatusOnlyRef.current)
      todayStatusOnlyRef.current = data.generating === true
      return data
    },
    {
      ...horoscopePollingConfig,
      onSuccess(data) {
        if (data.generating) return
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
      ...horoscopePollingConfig,
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
    todayStatusOnlyRef.current = false
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
