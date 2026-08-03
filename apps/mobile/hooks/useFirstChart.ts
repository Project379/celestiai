import { useQuery } from '@tanstack/react-query'

import { useApiClient } from '@/lib/api/client'

export interface FirstChartSummary {
  id: string
  birth_date: string
  birth_time_known: boolean
}

/**
 * Hook for fetching the user's first (and currently only) birth chart.
 *
 * GET /api/birth-data returns BirthChartRow[]; this hook narrows to the
 * fields the chart-render path actually needs (id for /api/chart/calculate,
 * birth_date for sun-sign derivation, birth_time_known for the rising-
 * approximate disclaimer in PlanetDetail).
 *
 * Returns:
 *   - data: undefined while resolving
 *   - data: null if user has no chart (CTA → wizard)
 *   - data: FirstChartSummary if chart loaded
 *
 * TanStack defaults from sub-round 5.1 (staleTime Infinity, no auto-
 * revalidate) mean a single fetch covers all consumers per session.
 * Днес index.tsx still uses its own useFocusEffect-based fetcher from
 * sub-round 4.7; refactoring Днес onto this hook is a future polish.
 */
export function useFirstChart() {
  const { apiFetch } = useApiClient()

  return useQuery({
    queryKey: ['first-chart'],
    queryFn: async (): Promise<FirstChartSummary | null> => {
      const raw = await apiFetch('/api/birth-data')
      if (!Array.isArray(raw) || raw.length === 0) return null
      const first = raw[0] as {
        id?: unknown
        birth_date?: unknown
        birth_time_known?: unknown
      }
      if (
        typeof first.id !== 'string' ||
        typeof first.birth_date !== 'string'
      ) {
        return null
      }
      return {
        id: first.id,
        birth_date: first.birth_date,
        birth_time_known:
          typeof first.birth_time_known === 'boolean'
            ? first.birth_time_known
            : true,
      }
    },
  })
}
