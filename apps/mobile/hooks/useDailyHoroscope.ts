import { useQuery } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { useApiClient } from '@/lib/api/client'
import { useFeatureFlag } from '@/hooks/useFeatureFlag'

interface DailyHoroscopeResponse {
  content: string | null
  cached?: boolean
  generatedAt?: string
  unavailable?: boolean
}

export type HoroscopeDate = 'today' | 'yesterday'

/**
 * Today's date in Europe/Sofia, YYYY-MM-DD. Used as part of the TanStack
 * Query key + AsyncStorage cache key so the cache naturally invalidates
 * at the next-day boundary (a re-render past midnight Sofia produces a
 * new key, query refetches). Mirrors web's getTodayString in
 * apps/web/hooks/useDailyHoroscope.ts.
 */
function getTodayString(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Sofia',
  }).format(new Date())
}

function getYesterdayString(): string {
  const today = new Date(getTodayString())
  today.setDate(today.getDate() - 1)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Sofia',
  }).format(today)
}

function getCacheKey(chartId: string, date: string): string {
  return `daily-horoscope:${chartId}:${date}`
}

/**
 * Hook for fetching the signed-in user's daily horoscope with Today/Yesterday
 * tab support (item 1.11, P.1-f). Yesterday's horoscope is lazy-fetched —
 * the second TanStack Query only fires when `selectedDate` flips to
 * 'yesterday'. Yesterday-unavailable (clean-install user, or post-midnight
 * rollover before today's reading is generated) drives the «Неналично»
 * disabled-tab state in the UI.
 *
 * AsyncStorage cache strategy mirrors web's localStorage path
 * (apps/web/hooks/useDailyHoroscope.ts):
 * - Each (chartId, date) tuple has its own cache key.
 * - On queryFn fire: AsyncStorage read first; network round-trip only on miss.
 * - On success with real content: persist to AsyncStorage so the next app
 *   cold-start hydrates without a network call.
 * - `unavailable` responses are NOT cached — preserves the path where a
 *   later regenerate (or post-midnight day rollover) can refetch fresh.
 *
 * Server route is /api/horoscope/generate?date=YYYY-MM-DD&format=json. The
 * endpoint defaults to SSE; the &format=json switch forces a single JSON
 * response, which is what both surfaces consume post-item-1.6-close.
 *
 * Pass null/undefined chartId to disable both queries.
 */
export function useDailyHoroscope(chartId: string | null | undefined) {
  const { apiFetch } = useApiClient()
  const ffEnabled = useFeatureFlag('daily_horoscope')
  const [selectedDate, setSelectedDate] = useState<HoroscopeDate>('today')

  const today = getTodayString()
  const yesterday = getYesterdayString()

  const fetchHoroscope = useCallback(
    async (date: string): Promise<DailyHoroscopeResponse> => {
      if (chartId) {
        try {
          const cached = await AsyncStorage.getItem(getCacheKey(chartId, date))
          if (cached) {
            return JSON.parse(cached) as DailyHoroscopeResponse
          }
        } catch {}
      }

      const raw = await apiFetch(
        `/api/horoscope/generate?date=${date}&format=json`,
        {
          method: 'POST',
          body: JSON.stringify({ chartId }),
        },
      )
      const data = raw as DailyHoroscopeResponse

      if (chartId && typeof data.content === 'string') {
        try {
          await AsyncStorage.setItem(getCacheKey(chartId, date), JSON.stringify(data))
        } catch {}
      }

      return data
    },
    [apiFetch, chartId],
  )

  const todayQuery = useQuery({
    queryKey: ['daily-horoscope', chartId, today],
    enabled: !!chartId && ffEnabled,
    queryFn: () => fetchHoroscope(today),
  })

  const yesterdayQuery = useQuery({
    queryKey: ['daily-horoscope', chartId, yesterday],
    enabled: !!chartId && ffEnabled && selectedDate === 'yesterday',
    queryFn: () => fetchHoroscope(yesterday),
  })

  const yesterdayUnavailable = yesterdayQuery.data?.unavailable === true
  const active = selectedDate === 'today' ? todayQuery : yesterdayQuery

  return {
    selectedDate,
    setSelectedDate,
    data: active.data,
    isLoading: active.isLoading,
    isError: active.isError,
    yesterdayUnavailable,
  }
}
