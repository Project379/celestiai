import { useCallback, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

import type {
  RecommendationStatus,
  UserRecommendationState,
} from '@stellaeum/core/stories/types'

/**
 * Mobile useStoryList hook — AsyncStorage-backed per D7 ship-velocity
 * ratification (recommendations stay client-only, NO Supabase backend).
 * Mirrors apps/web/hooks/useStoryList.ts (localStorage-backed) shape and
 * behavior. Cross-device sync migration deferred to Phase C/D per REVISIT-28.
 *
 * Storage key matches web's `stellaeum.stories.state.v1` verbatim per HT 3
 * harmonization ratification — eliminates REVISIT-28 migration asymmetry
 * when the localStorage / AsyncStorage state moves to Supabase. Existing
 * @-prefixed mobile keys (notif_prompted, push_token) are mixed convention;
 * REVISIT-50 captures the broader harmonization sweep.
 */

const STORAGE_KEY = 'stellaeum.stories.state.v1'

export function useStoryList() {
  const [state, setState] = useState<Record<string, UserRecommendationState>>({})
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw) as Record<string, UserRecommendationState>
          if (parsed && typeof parsed === 'object' && !cancelled) {
            setState(parsed)
          }
        }
      } catch {
        // corrupted or read failure — start with empty state, no surface
      } finally {
        if (!cancelled) setIsLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const persist = useCallback(
    async (next: Record<string, UserRecommendationState>) => {
      setState(next)
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // quota / write failure — silent, in-memory state stays current
      }
    },
    [],
  )

  const setStatus = useCallback(
    (id: string, status: RecommendationStatus) => {
      const next = {
        ...state,
        [id]: { id, status, updatedAt: new Date().toISOString() },
      }
      void persist(next)
    },
    [state, persist],
  )

  const getStatus = useCallback(
    (id: string): RecommendationStatus => state[id]?.status ?? 'new',
    [state],
  )

  return { state, isLoaded, setStatus, getStatus }
}
