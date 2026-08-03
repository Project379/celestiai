import { useAuth } from '@clerk/expo'
import {
  CrystalOfTheDayResponseSchema,
  type CrystalOfTheDayResponse,
} from '@stellaeum/core/crystals/schemas'
import { useCallback, useEffect, useState } from 'react'

import { useApiClient } from '@/lib/api/client'

interface UseCrystalOfTheDayResult {
  data: CrystalOfTheDayResponse | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

/**
 * Hook for fetching today's lunar-phase-driven crystal for the signed-in user.
 *
 * Calls GET /api/crystals/today (a thin wrapper over getCrystalOfTheDay in
 * @stellaeum/core/crystals/today). Validates the response against
 * CrystalOfTheDayResponseSchema before returning. Auto-fetches on mount and
 * whenever the Clerk auth state changes; consumers can also call refetch()
 * manually.
 *
 * Stale-while-revalidate semantics: previously-loaded data stays visible
 * during a refetch even if the refetch errors. Consumers must handle the
 * (data, error) simultaneous state to render that correctly (e.g. show the
 * old crystal with a subtle "refresh failed" affordance).
 *
 * Side effect to be aware of: each authenticated read auto-collects the
 * crystal into user_daily_crystals via the unique-index idempotent insert
 * pattern documented in @stellaeum/core/crystals/today. First mount of the
 * day creates the row.
 */
export function useCrystalOfTheDay(): UseCrystalOfTheDayResult {
  const { isLoaded, isSignedIn } = useAuth()
  const { apiFetch } = useApiClient()

  const [data, setData] = useState<CrystalOfTheDayResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return
    setIsLoading(true)
    setError(null)
    try {
      const raw = await apiFetch('/api/crystals/today')
      const parsed = CrystalOfTheDayResponseSchema.parse(raw)
      setData(parsed)
    } catch (err) {
      if (__DEV__) console.warn('[useCrystalOfTheDay] fetch failed:', err)
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoading(false)
    }
  }, [isLoaded, isSignedIn, apiFetch])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { data, isLoading, error, refetch }
}
