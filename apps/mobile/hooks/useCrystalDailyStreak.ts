import { useQuery } from '@tanstack/react-query'

import type { DailyCrystalEntry, Streak } from '@stellaeum/core/crystals/schemas'

import { useApiClient } from '@/lib/api/client'

interface DailyStreakPayload {
  streak: Streak
  days: DailyCrystalEntry[]
  today: string
}

/**
 * GET /api/crystals/daily-streak — 60-day history + computed streak.
 * Separate from useCrystalOfTheDay: that hook drives the free-tier daily
 * hero and deliberately skips the history payload to keep its round-trip
 * cheap; this hook is only for the Дневна серия tab, which needs the
 * per-day dot strip.
 */
export function useCrystalDailyStreak(enabled: boolean) {
  const { apiFetch } = useApiClient()

  return useQuery<DailyStreakPayload>({
    queryKey: ['crystals-daily-streak'],
    enabled,
    queryFn: async () => {
      const data = await apiFetch('/api/crystals/daily-streak')
      return data as DailyStreakPayload
    },
  })
}
