import { useQuery } from '@tanstack/react-query'

import { stripSentinels } from '@stellaeum/core/oracle/planet-parser'

import { useApiClient } from '@/lib/api/client'

interface DailyHoroscopeResponse {
  content: string | null
  cached?: boolean
  generatedAt?: string
  unavailable?: boolean
}

/**
 * Today's date in Europe/Sofia, formatted YYYY-MM-DD. Used as part of the
 * query key so the cache naturally invalidates at the next-day boundary
 * (a re-render past midnight Sofia produces a new key, TanStack fires a
 * fresh fetch). Mirrors web's getTodayString in apps/web/hooks/useDailyHoroscope.ts.
 */
function getTodayString(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Sofia',
  }).format(new Date())
}

/**
 * Hook for fetching today's daily horoscope for the signed-in user's chart.
 *
 * Calls POST /api/horoscope/generate?date=YYYY-MM-DD&format=json with body
 * { chartId } via Clerk-authed apiFetch. The endpoint streams by default;
 * the &format=json switch forces a single non-streaming JSON response, which
 * is what mobile consumes for sub-round 5 (streaming-text upgrade is
 * REVISIT-TRIGGERS item 20).
 *
 * Caching: query key includes chartId + today's Sofia-local date. With the
 * QueryClientProvider defaults (staleTime Infinity, no auto-revalidate),
 * a single fetch per (chartId, date) pair runs across all consumers.
 *
 * Server-side, the same endpoint also auto-bootstraps chart_calculations
 * if a row doesn't exist yet (calculateNatalChart inline path), so first
 * call after wizard submit can take longer (~5-15s) before cache hit.
 *
 * Pass null/undefined chartId to disable the query (e.g. while still
 * resolving whether a chart exists).
 */
export function useDailyHoroscope(chartId: string | null | undefined) {
  const { apiFetch } = useApiClient()
  const today = getTodayString()

  return useQuery({
    queryKey: ['daily-horoscope', chartId, today],
    enabled: !!chartId,
    queryFn: async () => {
      const raw = await apiFetch(
        `/api/horoscope/generate?date=${today}&format=json`,
        {
          method: 'POST',
          body: JSON.stringify({ chartId }),
        },
      )
      return raw as DailyHoroscopeResponse
    },
  })
}

/**
 * Re-export of the shared sentinel stripper. Source of truth lives at
 * @stellaeum/core/oracle/planet-parser (lifted in SR 7.0a). Web parses
 * sentinels into colored spans via PLANET_COLORS; mobile renders plain
 * text — colored sentinels are REVISIT-TRIGGERS item 22.
 */
export const stripPlanetSentinels = stripSentinels
